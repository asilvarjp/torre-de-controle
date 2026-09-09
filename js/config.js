/**
 * Configuração de conexão com o Supabase.
 *
 * Painel do Supabase > Project Settings > API Keys
 *   - "Project URL"                          -> SUPABASE_URL
 *   - "Publishable key" (ou "anon" "public")  -> SUPABASE_ANON_KEY
 *
 * (Projetos mais novos do Supabase chamam essa chave de "Publishable key" em
 * vez de "anon key" — é a mesma ideia, feita para ser pública.)
 *
 * Essa chave fica visível no navegador de qualquer pessoa que abrir o site.
 * Isso é seguro porque o acesso real aos dados é controlado pelas regras de
 * Row Level Security definidas em supabase/schema.sql (só usuários logados
 * conseguem ler ou gravar). Nunca cole aqui a "secret key" / "service_role
 * key" — essa sim é secreta e nunca deve ir para código de navegador.
 */
window.SUPABASE_CONFIG = {
  url: 'https://eluswvbxjimpfzlcralb.supabase.co',
  anonKey: 'sb_publishable_e_xok5JaHKdysm_gWXSZPg_Ztfuvn13',
};
