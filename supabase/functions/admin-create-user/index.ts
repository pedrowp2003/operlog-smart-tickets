import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerRoles } = await admin.from('user_roles').select('role').eq('user_id', callerId);
    const isAnalista = callerRoles?.some((r: { role: string }) => r.role === 'analista');
    if (!isAnalista) {
      return new Response(JSON.stringify({ error: 'Apenas analistas podem criar usuários' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { email, username, role, nome, sobrenome, telefone, foto_url, unidade, armazem, area } = body;

    if (!email || !username || !role || !telefone) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (role === 'analista') {
      return new Response(JSON.stringify({ error: 'Analistas não podem criar outros analistas por aqui' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Random temporary password — user will be forced to change on first login.
    const tempPassword = `Temp_${crypto.randomUUID().slice(0, 8)}A1!`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        username,
        role,
        nome,
        sobrenome,
        telefone,
        foto_url,
        unidade,
        armazem,
        area,
        must_change_password: 'true',
      },
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, user_id: created.user?.id, temp_password: tempPassword }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});