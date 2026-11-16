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
-- IMPRESSORAS — contrato de outsourcing de impressão
-- O cadastro do equipamento fica em public.impressoras (dados que não mudam
-- todo mês). O que muda a cada mês (locação, páginas) fica em
-- public.impressoras_mensal, uma linha por equipamento por competência, e os
-- totais cobrados no descritivo do fornecedor ficam em
-- public.impressoras_competencias. Importar uma nova competência NÃO mexe nas
-- anteriores. Nada é calculado ou estimado aqui: só os valores informados.
-- ---------------------------------------------------------------------------
alter table public.impressoras add column if not exists patrimonio text;
alter table public.impressoras add column if not exists cnpj text;
alter table public.impressoras add column if not exists endereco text;
alter table public.impressoras add column if not exists observacao text;
alter table public.impressoras add column if not exists tipo_equipamento text;
alter table public.impressoras add column if not exists contrato text;
alter table public.impressoras add column if not exists chave_origem text;
create unique index if not exists impressoras_chave_origem_uq
  on public.impressoras (chave_origem) where chave_origem is not null;
create index if not exists impressoras_contrato_idx on public.impressoras (contrato);

create table if not exists public.impressoras_competencias (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique check (extract(day from competencia) = 1),
  total_pb integer,
  total_color integer,
  excedente_pb numeric,      -- R$ de excedente PB cobrado na competência
  excedente_color numeric,   -- R$ de excedente colorido cobrado na competência
  franquia_pb integer,       -- vazio = não informado pelo fornecedor (pendência)
  franquia_color integer,    -- vazio = não informado pelo fornecedor (pendência)
  desconto numeric,          -- vazio = não informado (pendência)
  arquivo_origem text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.impressoras_mensal (
  id uuid primary key default gen_random_uuid(),
  competencia date not null references public.impressoras_competencias (competencia)
    on delete restrict on update cascade,
  impressora_id uuid not null references public.impressoras (id) on delete restrict,
  unidade text,              -- hotel onde o equipamento estava NESTA competência
  valor_locacao numeric,     -- vazio = não informado (pendência)
  paginas_pb integer,
  paginas_color integer,
  observacao text,
  linha_origem integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competencia, impressora_id)
);
create index if not exists impressoras_mensal_competencia_idx on public.impressoras_mensal (competencia);
create index if not exists impressoras_mensal_impressora_idx on public.impressoras_mensal (impressora_id);

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

-- E-mails convidados pelo botão "Adicionar usuário" do sistema (função
-- convidar-usuario). Serve para duas coisas: liberar e-mails de fora do domínio
-- (prestadores) e já definir o perfil da pessoa. Sem políticas de propósito:
-- só funções do servidor mexem aqui.
create table if not exists public.usuarios_autorizados (
  email text primary key,
  papel text not null default 'leitor' check (papel in ('admin','editor','leitor')),
  convidado_por text,
  created_at timestamptz not null default now()
);
alter table public.usuarios_autorizados enable row level security;

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, email, papel)
  values (
    new.id,
    new.email,
    coalesce(
      (select papel from public.usuarios_autorizados where lower(email) = lower(new.email)),
      'leitor'
    )
  )
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
    'transporte','impressoras','teamviewer','depreciacao','linhas',
    'impressoras_competencias','impressoras_mensal'
  ]) then
    raise exception 'Tabela inválida: %', r.tabela;
  end if;

  -- avisa o registro de atividades que este insert é uma restauração
  perform set_config('app.restaurando', '1', true);

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
-- REGISTRO DE ATIVIDADES (auditoria): quem acessou e quem criou, editou,
-- excluiu ou restaurou o quê, e quando.
--   · Feito por gatilhos no banco — não depende do navegador e não pode ser
--     burlado nem apagado por quem usa o sistema.
--   · Leve: 1 gravação pequena por alteração. Nas edições guarda só os campos
--     que mudaram (de → para). Senhas nunca são gravadas no registro.
--   · Só administradores conseguem ler (tela Administração → Atividades).
-- ---------------------------------------------------------------------------
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  usuario_id uuid,
  usuario_email text,
  tabela text,
  registro_id uuid,
  acao text not null check (acao in ('acessou','criou','editou','excluiu','restaurou')),
  rotulo text,
  detalhes jsonb
);
create index if not exists auditoria_em_idx on public.auditoria (em desc);
create index if not exists auditoria_tabela_em_idx on public.auditoria (tabela, em desc);
create index if not exists auditoria_usuario_em_idx on public.auditoria (usuario_id, em desc);
alter table public.auditoria enable row level security;

drop policy if exists "auditoria_ler" on public.auditoria;
create policy "auditoria_ler" on public.auditoria
  for select to authenticated
  using (public.meu_papel() = 'admin');

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acao text;
  v_reg uuid;
  v_row jsonb;
  v_old jsonb;
  v_det jsonb;
  v_chg jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_reg := new.id;
    v_acao := case when current_setting('app.restaurando', true) = '1' then 'restaurou' else 'criou' end;
    v_det := v_row - 'senha' - 'id' - 'created_at' - 'updated_at';
  elsif tg_op = 'UPDATE' then
    v_row := to_jsonb(new);
    v_old := to_jsonb(old);
    v_reg := new.id;
    v_acao := 'editou';
    for k in select key from jsonb_each(v_row) loop
      continue when k in ('updated_at', 'created_at');
      if (v_row -> k) is distinct from (v_old -> k) then
        if k = 'senha' then
          v_chg := v_chg || jsonb_build_object(k, jsonb_build_object('de', '***', 'para', '***'));
        else
          v_chg := v_chg || jsonb_build_object(k, jsonb_build_object('de', v_old -> k, 'para', v_row -> k));
        end if;
      end if;
    end loop;
    if v_chg = '{}'::jsonb then
      return null;  -- nada mudou de verdade: não registra
    end if;
    v_det := v_chg;
  else
    v_row := to_jsonb(old);
    v_reg := old.id;
    v_acao := 'excluiu';
    v_det := null;  -- o conteúdo completo fica na Lixeira
  end if;

  insert into public.auditoria (usuario_id, usuario_email, tabela, registro_id, acao, rotulo, detalhes)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'SQL Editor / sistema'),
    tg_table_name,
    v_reg,
    v_acao,
    coalesce(
      v_row ->> 'hostname', v_row ->> 'patrimonio', v_row ->> 'descricao_item',
      v_row ->> 'equipamento', v_row ->> 'identificador', v_row ->> 'numero',
      v_row ->> 'impressora', v_row ->> 'licenca', v_row ->> 'descricao_envio',
      v_row ->> 'serie', v_row ->> 'competencia'
    ),
    v_det
  );
  return null;
end;
$$;

-- Chamada pelo sistema quando alguém entra. Ignora se a mesma pessoa já foi
-- registrada nos últimos 30 minutos (recarregar a página não enche o registro).
create or replace function public.registrar_acesso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if exists (
    select 1 from public.auditoria
    where usuario_id = auth.uid() and acao = 'acessou' and em > now() - interval '30 minutes'
  ) then
    return;
  end if;
  insert into public.auditoria (usuario_id, usuario_email, acao, detalhes)
  values (auth.uid(), auth.jwt() ->> 'email', 'acessou', jsonb_build_object('perfil', public.meu_papel()));
end;
$$;

revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;

-- Limpeza opcional (só admin): apaga registros mais antigos que N dias.
--   select public.limpar_auditoria(365);
create or replace function public.limpar_auditoria(p_dias integer default 365)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if public.meu_papel() <> 'admin' then
    raise exception 'Apenas administradores podem limpar o registro de atividades';
  end if;
  delete from public.auditoria where em < now() - make_interval(days => p_dias);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.limpar_auditoria(integer) from public, anon;
grant execute on function public.limpar_auditoria(integer) to authenticated;

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
      'transporte','impressoras','teamviewer','depreciacao','linhas',
      'impressoras_competencias','impressoras_mensal'
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
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I for each row execute function public.registrar_auditoria()',
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
-- estiver em public.usuarios_autorizados — o que acontece quando um
-- administrador usa o botão "Adicionar usuário" no sistema.
-- ---------------------------------------------------------------------------
create or replace function public.restrict_signup_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or (new.email !~* '@grupowish\.com$'
         and not exists (
           select 1 from public.usuarios_autorizados where lower(email) = lower(new.email)
         )) then
    raise exception 'Cadastro permitido apenas para e-mails @grupowish.com ou convidados por um administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restrict_signup_domain on auth.users;
create trigger trg_restrict_signup_domain
before insert on auth.users
for each row execute function public.restrict_signup_domain();
