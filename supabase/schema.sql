-- ============================================================================
-- Torre de Controle — schema do banco (Supabase / Postgres)
--
-- Como usar:
--   1. Abra o painel do seu projeto em supabase.com
--   2. Vá em "SQL Editor" > "New query"
--   3. Cole este arquivo inteiro e clique em "Run"
--
-- O script é seguro para rodar mais de uma vez (usa "if not exists" e
-- recria triggers/policies antes de criá-los de novo).
-- ============================================================================

create extension if not exists pgcrypto;

-- Função utilitária: mantém "updated_at" sempre atualizado em qualquer UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas — uma por módulo do sistema
-- ---------------------------------------------------------------------------

create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  patrimonio text,
  hostname text,
  unidade text,
  categoria text,
  marca text,
  modelo text,
  numero_serie text,
  cpu text,
  ram text,
  so text,
  serial_so text,
  office text,
  serial_office text,
  pacote_adobe text,
  usuario text,
  status text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque (
  id uuid primary key default gen_random_uuid(),
  equipamento text,
  marca text,
  modelo text,
  patrimonio text,
  quantidade integer,
  status text,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locados (
  id uuid primary key default gen_random_uuid(),
  equipamento text,
  marca text,
  patrimonio text,
  proposta text,
  unidade text,
  centro_custo text,
  departamento text,
  colaborador text,
  data_entrega date,
  data_devolucao date,
  valor numeric,
  status text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  descricao_item text,
  sci text,
  oc text,
  qtde integer,
  unidade text,
  centro_custo text,
  data_pedido date,
  valor numeric,
  solicitante text,
  comprador text,
  status_sci text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compras add column if not exists valor numeric;

-- Nenhuma coluna acima (fora id/created_at/updated_at) deve ser obrigatória —
-- garante isso mesmo se alguém marcou "NOT NULL" sem querer pelo Table Editor.
alter table public.compras alter column descricao_item drop not null;
alter table public.compras alter column sci drop not null;
alter table public.compras alter column oc drop not null;
alter table public.compras alter column qtde drop not null;
alter table public.compras alter column unidade drop not null;
alter table public.compras alter column centro_custo drop not null;
alter table public.compras alter column data_pedido drop not null;
alter table public.compras alter column valor drop not null;
alter table public.compras alter column solicitante drop not null;
alter table public.compras alter column comprador drop not null;
alter table public.compras alter column status_sci drop not null;

create table if not exists public.licencas (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  licenca text,
  versao text,
  numero_serie text,
  hostname text,
  patrimonio text,
  unidade text,
  colaborador text,
  nf text,
  sci text,
  oc text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transporte (
  id uuid primary key default gen_random_uuid(),
  descricao_envio text,
  origem text,
  destino text,
  unidade text,
  centro_custo text,
  transportadora text,
  codigo_rastreio text,
  data_envio date,
  data_entrega date,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.impressoras (
  id uuid primary key default gen_random_uuid(),
  unidade text,
  impressora text,
  serie text,
  ip text,
  contador_mono integer,
  contador_color integer,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teamviewer (
  id uuid primary key default gen_random_uuid(),
  unidade text,
  hostname text,
  id_teamviewer text,
  senha text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.depreciacao (
  id uuid primary key default gen_random_uuid(),
  identificador text,
  modelo text,
  processador text,
  unidade text,
  ano_aquisicao integer,
  valor_aquisicao numeric,
  vida_util_anos integer,
  anos_uso integer,
  deprec_anual numeric,
  deprec_acumulada numeric,
  valor_residual numeric,
  recomendar_substituicao text,
  prioridade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.linhas (
  id uuid primary key default gen_random_uuid(),
  tipo_linha text,
  empresa text,
  ddd text,
  numero text,
  unidade text,
  usuario text,
  funcao text,
  depto text,
  conta text,
  plano text,
  cnpj text,
  valor numeric,
  valor_gasto numeric,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Colunas adicionadas depois da primeira versão do schema — seguro rodar
-- de novo mesmo se a tabela já existir com as colunas antigas apenas.
alter table public.depreciacao add column if not exists anos_uso integer;
alter table public.depreciacao add column if not exists deprec_anual numeric;
alter table public.depreciacao add column if not exists deprec_acumulada numeric;
alter table public.depreciacao add column if not exists valor_residual numeric;
alter table public.depreciacao add column if not exists recomendar_substituicao text;
alter table public.depreciacao add column if not exists prioridade text;

-- ---------------------------------------------------------------------------
-- PERFIS DE ACESSO
--   admin  — tudo: cadastra, edita, exclui, restaura da lixeira e gerencia usuários
--   editor — consulta, cadastra e edita; NÃO exclui
--   leitor — somente consulta
-- Todo usuário novo entra como "leitor"; um admin muda o perfil na tela
-- "Usuários" do sistema. As regras valem no banco (não dá para burlar pelo
-- navegador).
-- ---------------------------------------------------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  papel text not null default 'leitor' check (papel in ('admin','editor','leitor')),
  created_at timestamptz not null default now()
);
alter table public.perfis enable row level security;

create or replace function public.meu_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select papel from public.perfis where id = auth.uid()), 'leitor');
$$;

drop policy if exists "perfis_ler" on public.perfis;
create policy "perfis_ler" on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.meu_papel() = 'admin');

drop policy if exists "perfis_editar" on public.perfis;
create policy "perfis_editar" on public.perfis
  for update to authenticated
  using (public.meu_papel() = 'admin')
  with check (public.meu_papel() = 'admin');

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, email, papel)
  values (new.id, new.email, 'leitor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
after insert on auth.users
for each row execute function public.criar_perfil_novo_usuario();

-- Usuários que já existem: o primeiro a ser criado (quem montou o sistema)
-- vira admin; os demais entram como leitor. Confira depois na tela "Usuários".
insert into public.perfis (id, email, papel)
select id, email, case when rn = 1 then 'admin' else 'leitor' end
from (
  select id, email, row_number() over (order by created_at) as rn
  from auth.users
) u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- LIXEIRA: tudo que for excluído de qualquer tabela é copiado para cá antes
-- de sumir (inclusive exclusões feitas direto pelo SQL Editor) e pode ser
-- restaurado por um admin.
-- ---------------------------------------------------------------------------
create table if not exists public.lixeira (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  dados jsonb not null,
  excluido_por uuid,
  excluido_por_email text,
  excluido_em timestamptz not null default now(),
  restaurado_em timestamptz,
  restaurado_por_email text
);
alter table public.lixeira enable row level security;

drop policy if exists "lixeira_ler" on public.lixeira;
create policy "lixeira_ler" on public.lixeira
  for select to authenticated
  using (public.meu_papel() = 'admin');

create or replace function public.mover_para_lixeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lixeira (tabela, registro_id, dados, excluido_por, excluido_por_email)
  values (tg_table_name, old.id, to_jsonb(old), auth.uid(), auth.jwt() ->> 'email');
  return old;
end;
$$;

create or replace function public.restaurar_da_lixeira(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.lixeira%rowtype;
begin
  if public.meu_papel() <> 'admin' then
    raise exception 'Apenas administradores podem restaurar itens da lixeira';
  end if;

  select * into r from public.lixeira where id = p_id and restaurado_em is null;
  if not found then
    raise exception 'Item não encontrado na lixeira (ou já foi restaurado)';
  end if;

  if r.tabela <> all (array[
    'inventario','estoque','locados','compras','licencas',
    'transporte','impressoras','teamviewer','depreciacao','linhas'
  ]) then
    raise exception 'Tabela inválida: %', r.tabela;
  end if;

  execute format(
    'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)',
    r.tabela, r.tabela
  ) using r.dados;

  update public.lixeira
     set restaurado_em = now(), restaurado_por_email = auth.jwt() ->> 'email'
   where id = p_id;
end;
$$;

revoke all on function public.restaurar_da_lixeira(uuid) from public, anon;
grant execute on function public.restaurar_da_lixeira(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger de updated_at + lixeira + Row Level Security por perfil, aplicados
-- igualmente a todas as tabelas de módulos:
--   ler      — qualquer usuário logado
--   cadastrar/editar — admin e editor
--   excluir  — somente admin (e o item vai para a lixeira)
-- Como o cadastro público fica desativado (ver README, passo 3), só a equipe
-- convidada consegue entrar.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'inventario','estoque','locados','compras','licencas',
      'transporte','impressoras','teamviewer','depreciacao','linhas'
    ])
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
    execute format('drop trigger if exists trg_lixeira on public.%I', t);
    execute format(
      'create trigger trg_lixeira before delete on public.%I for each row execute function public.mover_para_lixeira()',
      t
    );
    execute format('alter table public.%I enable row level security', t);

    -- política antiga (todo mundo fazia tudo) sai de cena
    execute format('drop policy if exists "authenticated_full_access" on public.%I', t);

    execute format('drop policy if exists "ler_todos" on public.%I', t);
    execute format(
      'create policy "ler_todos" on public.%I for select to authenticated using (true)', t
    );
    execute format('drop policy if exists "cadastrar_editor" on public.%I', t);
    execute format(
      'create policy "cadastrar_editor" on public.%I for insert to authenticated with check (public.meu_papel() in (''admin'',''editor''))', t
    );
    execute format('drop policy if exists "editar_editor" on public.%I', t);
    execute format(
      'create policy "editar_editor" on public.%I for update to authenticated using (public.meu_papel() in (''admin'',''editor'')) with check (public.meu_papel() in (''admin'',''editor''))', t
    );
    execute format('drop policy if exists "excluir_admin" on public.%I', t);
    execute format(
      'create policy "excluir_admin" on public.%I for delete to authenticated using (public.meu_papel() = ''admin'')', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ative a atualização em tempo real (opcional, mas recomendado — é o que faz
-- a tela atualizar sozinha quando outra pessoa da equipe edita um registro).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'inventario','estoque','locados','compras','licencas',
      'transporte','impressoras','teamviewer','depreciacao','linhas'
    ])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- já estava adicionada, ignora
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Restringe a criação de contas a e-mails @grupowish.com, direto no banco.
-- Isso funciona independente da configuração de "cadastro público" do painel
-- Authentication do Supabase (que em algumas versões do painel liga cadastro
-- e login na mesma chave) — nenhuma conta com outro domínio consegue ser
-- criada, seja por autocadastro ou por convite feito por engano.
-- Pessoas de fora do domínio (ex: prestadores de serviço) só entram se o e-mail
-- completo estiver na lista "externos_permitidos" abaixo. Para liberar mais
-- alguém, acrescente o e-mail na lista e rode este trecho de novo.
-- ---------------------------------------------------------------------------
create or replace function public.restrict_signup_domain()
returns trigger
language plpgsql
security definer
as $$
declare
  externos_permitidos text[] := array[
    'adriano.candido@alliedit.com.br'
  ];
begin
  if new.email is null
     or (new.email !~* '@grupowish\.com$'
         and lower(new.email) <> all (externos_permitidos)) then
    raise exception 'Cadastro permitido apenas para e-mails @grupowish.com ou externos autorizados';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restrict_signup_domain on auth.users;
create trigger trg_restrict_signup_domain
before insert on auth.users
for each row execute function public.restrict_signup_domain();
