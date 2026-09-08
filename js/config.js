/**
 * Configuração de conexão com o Supabase.
 *
 * Preencha os dois valores abaixo com os dados do SEU projeto:
 *   Painel do Supabase > Project Settings > API
 *     - "Project URL"       -> SUPABASE_URL
 *     - "anon" "public" key -> SUPABASE_ANON_KEY
 *
 * A "anon key" é feita para ser pública — ela fica visível no navegador de
 * qualquer pessoa que abrir o site. Isso é seguro porque o acesso real aos
 * dados é controlado pelas regras de Row Level Security definidas em
 * supabase/schema.sql (só usuários logados conseguem ler ou gravar).
 * Nunca cole aqui a "service_role key" — essa sim é secreta.
 */
window.SUPABASE_CONFIG = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'COLE_AQUI_A_ANON_PUBLIC_KEY',
};
