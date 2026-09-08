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
  solicitante text,
  comprador text,
  status_sci text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Trigger de updated_at + Row Level Security, aplicados igualmente a todas
-- as tabelas acima: só usuários autenticados (que fizeram login) podem ler
-- ou gravar. Como o cadastro público fica desativado (ver README, passo 3),
-- só a equipe convidada consegue entrar.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'inventario','estoque','locados','compras','licencas',
      'transporte','impressoras','teamviewer','depreciacao'
    ])
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I', t);
    execute format(
      'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true)',
      t
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
      'transporte','impressoras','teamviewer','depreciacao'
    ])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- já estava adicionada, ignora
    end;
  end loop;
end $$;
