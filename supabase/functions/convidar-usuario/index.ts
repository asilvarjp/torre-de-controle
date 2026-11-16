// Edge Function "convidar-usuario"
//
// Chamada pelo botão "Adicionar usuário" do sistema. Só aceita pedidos de quem
// é ADMINISTRADOR (confere o perfil pelo token de quem chamou) e então:
//   1. registra o e-mail + perfil em public.usuarios_autorizados
//   2. envia o convite por e-mail (Supabase Auth)
//
// A chave administrativa (service role) fica só aqui, no servidor do Supabase —
// ela é injetada automaticamente e nunca vai para o navegador.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;

    // Chave pública: a mesma que o navegador já mandou no cabeçalho "apikey".
    const chavePublica = req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Chave administrativa: o Supabase injeta uma destas (dependendo de o projeto
    // usar as chaves antigas ou as novas "sb_secret"). Se nenhuma existir, crie o
    // segredo "CHAVE_ADMIN" em Edge Functions → Secrets.
    let chaveAdmin = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('CHAVE_ADMIN') ?? '';
    if (!chaveAdmin) {
      try {
        const segredos = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
        chaveAdmin = String(Object.values(segredos)[0] ?? '');
      } catch (_) { /* segue sem chave */ }
    }
    if (!chaveAdmin) {
      return json({ erro: 'Chave administrativa não encontrada. Crie o segredo CHAVE_ADMIN em Edge Functions → Secrets.' }, 500);
    }

    // 1) Quem está chamando precisa ser administrador.
    const quem = createClient(url, chavePublica, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: papelDeQuemChama, error: erroPapel } = await quem.rpc('meu_papel');
    if (erroPapel || papelDeQuemChama !== 'admin') {
      return json({ erro: 'Apenas administradores podem adicionar usuários.' }, 403);
    }
    const { data: dadosQuem } = await quem.auth.getUser();

    // 2) Valida o pedido.
    const corpo = await req.json().catch(() => ({}));
    const email = String(corpo.email ?? '').trim().toLowerCase();
    const papel = String(corpo.papel ?? 'leitor');
    const redirectTo = typeof corpo.redirectTo === 'string' ? corpo.redirectTo : undefined;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ erro: 'E-mail inválido.' }, 400);
    }
    if (!['admin', 'editor', 'leitor'].includes(papel)) {
      return json({ erro: 'Perfil inválido.' }, 400);
    }

    // 3) Com a chave administrativa: autoriza o e-mail e envia o convite.
    const admin = createClient(url, chaveAdmin);

    const { error: erroAut } = await admin.from('usuarios_autorizados').upsert({
      email,
      papel,
      convidado_por: dadosQuem?.user?.email ?? null,
    });
    if (erroAut) return json({ erro: 'Falha ao autorizar o e-mail: ' + erroAut.message }, 500);

    const { error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (erroConvite) {
      const jaExiste = /already|registered|exists/i.test(erroConvite.message);
      return json(
        { erro: jaExiste ? 'Este e-mail já tem cadastro no sistema.' : erroConvite.message },
        jaExiste ? 409 : 400,
      );
    }

    return json({ ok: true });
  } catch (e) {
    return json({ erro: String(e) }, 500);
  }
});
