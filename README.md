# Torre de Controle

Sistema interno da Sustentação para controle de **inventário, estoque, equipamentos
locados, compras, licenças, transporte, impressoras e acessos TeamViewer** das
unidades GJP Hotels & Resorts (Wish / Prodigy).

Site estático (HTML/CSS/JS, sem build) + banco de dados [Supabase](https://supabase.com)
(Postgres gratuito, com login e atualização em tempo real). Feito para rodar no
GitHub Pages.

O acesso exige login — só quem for convidado pela equipe consegue entrar (ver
passo 3 abaixo). Isso é importante porque o sistema guarda senhas de acesso
remoto (TeamViewer) e outros dados internos.

## Passo a passo para publicar

### 1. Criar o projeto no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) (dá pra entrar
   direto com sua conta do GitHub).
2. Clique em **New project** — escolha um nome (ex: `torre-de-controle`), uma
   senha forte para o banco (guarde-a num lugar seguro, você não precisa dela
   no dia a dia) e a região mais próxima (ex: `South America (São Paulo)`).
3. Aguarde uns 2 minutos até o projeto ficar pronto.

### 2. Criar as tabelas

1. No menu lateral do projeto, abra **SQL Editor** → **New query**.
2. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste
   repositório, copie todo o conteúdo, cole no editor e clique em **Run**.
3. Isso cria as 9 tabelas do sistema, ativa a atualização em tempo real e
   configura as regras de segurança (só usuários logados leem/gravam dados).

### 3. Restringir o acesso só à equipe

Por padrão o Supabase permite que qualquer pessoa se cadastre sozinha. Para
este sistema, o recomendado é **desativar o autocadastro** e você (admin)
convidar cada pessoa da equipe:

1. Vá em **Authentication** → **Providers** → **Email** e desative a opção
   **"Allow new users to sign up"**.
2. Para dar acesso a alguém: **Authentication** → **Users** → **Invite user**,
   digite o e-mail da pessoa (ex: `nome@grupowish.com`) e envie. A pessoa
   recebe um e-mail com um link para criar a própria senha — na primeira vez
   que abrir o link, o site vai mostrar a tela "Defina sua senha".

### 4. Conectar o site ao seu projeto

1. No painel do Supabase, vá em **Project Settings** → **API**.
2. Copie o valor de **Project URL** e da chave **anon public**.
3. Abra [`js/config.js`](js/config.js) neste repositório e cole os dois
   valores:
   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://xxxxxxxxxxxx.supabase.co',
     anonKey: 'eyJhbGciOi...',
   };
   ```
4. Salve e envie (`git commit` + `git push`) — veja o passo 5.

> A "anon key" é feita para ser pública (fica visível no código do site). Isso
> é seguro porque o acesso real aos dados é controlado pelas regras de Row
> Level Security do banco (passo 2), amarradas ao login de cada pessoa. Nunca
> use a "service_role key" aqui — essa sim é secreta.

### 5. Subir para o GitHub

Se ainda não tem um repositório no GitHub, crie um vazio (sem README) em
[github.com/new](https://github.com/new) e depois rode, dentro desta pasta:

```bash
git remote add origin https://github.com/SEU-USUARIO/torre-de-controle.git
git branch -M main
git push -u origin main
```

### 6. Publicar no GitHub Pages

1. No repositório, vá em **Settings** → **Pages**.
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `main` e a pasta `/ (root)`. Salve.
4. Em 1–2 minutos o site fica no ar em:
   `https://SEU-USUARIO.github.io/torre-de-controle/`

> ⚠️ GitHub Pages gratuito só publica sites de repositórios **públicos** — o
> HTML/CSS/JS ficam visíveis para qualquer um. Isso não expõe seus dados (eles
> ficam no Supabase, atrás do login), mas expõe o código-fonte do sistema. Se
> isso for um problema, use um repositório privado + GitHub Pages de
> organização (planos pagos) ou hospede em Vercel/Netlify com o repositório
> privado.

## Testar localmente antes de publicar

Como o navegador bloqueia `fetch`/módulos ao abrir `index.html` direto como
arquivo, use um servidor local simples. No Windows, sem precisar instalar
nada, rode em um PowerShell dentro desta pasta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Depois abra `http://localhost:8973` no navegador. Se você tiver Python ou
Node instalados, `python -m http.server 8973` ou `npx serve` também
funcionam.

## Estrutura do projeto

```
index.html          página única (estrutura + estilos)
js/config.js         suas credenciais do Supabase (edite este arquivo)
js/app.js             toda a lógica do sistema (módulos, telas, login)
supabase/schema.sql   script que cria as tabelas e as regras de acesso
serve.ps1              servidor local só para testes (não é usado no GitHub Pages)
```

## Módulos

| Módulo | O que controla |
|---|---|
| Inventário | Equipamentos de TI por unidade (hostname, patrimônio, configuração) |
| Estoque | Equipamentos disponíveis, ainda não alocados a uma unidade |
| Locados | Equipamentos locados a colaboradores (entrega, devolução, valor) |
| Compras | Solicitações de compra (SCI, OC, status) |
| Licenças | Office, Sistema Operacional, Adobe e outras licenças |
| Transporte | Envios entre unidades (Correios, transportadoras, rastreio) |
| Impressoras | Impressoras por unidade (série, IP, contadores A4) |
| TeamViewer | ID e senha de acesso remoto por máquina (senha oculta por padrão) |
| Depreciação | Vida útil, valor residual e recomendação de substituição de ativos |

## Segurança — leia antes de usar em produção

- As senhas do TeamViewer ficam **ocultas na tela por padrão**, mas são
  salvas em texto simples no banco — qualquer pessoa com login no sistema e
  acesso ao botão "mostrar" consegue vê-las. Isto não é um cofre de senhas
  dedicado (tipo 1Password/Bitwarden); é apenas mais discreto que a planilha
  Excel original.
- O acesso ao sistema inteiro depende do login do Supabase estar configurado
  corretamente (autocadastro desativado, só convites). Confira o passo 3
  antes de divulgar o link do site.
- Adicione novas pessoas apenas convidando pelo painel do Supabase — não
  compartilhe a senha do banco (a senha que você criou no passo 1) com
  ninguém, ela não é necessária no uso normal do sistema.
