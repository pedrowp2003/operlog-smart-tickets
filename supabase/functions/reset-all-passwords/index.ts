import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ADMIN_PASSWORD = 'admin123@';
const NEW_PASSWORD = 'Pipoca123#';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { admin_password } = await req.json();
    if (admin_password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Senha de administrador inválida' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    let page = 1;
    let updated = 0;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      if (!data.users.length) break;
      for (const u of data.users) {
        await admin.auth.admin.updateUserById(u.id, { password: NEW_PASSWORD });
        updated++;
      }
      if (data.users.length < 1000) break;
      page++;
    }

    await admin.from('profiles').update({ must_change_password: true }).neq('id', '00000000-0000-0000-0000-000000000000');

    return new Response(JSON.stringify({ ok: true, updated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});