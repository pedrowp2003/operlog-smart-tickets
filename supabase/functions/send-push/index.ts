import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const APP_ID = Deno.env.get('ONESIGNAL_APP_ID')?.trim();
    const REST_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')?.trim();
    if (!APP_ID || !REST_KEY) throw new Error('OneSignal env vars missing');

    const { user_id, title, message, url } = await req.json();
    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: 'user_id, title, message required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = {
      app_id: APP_ID,
      include_aliases: { external_id: [user_id] },
      target_channel: 'push',
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
    };
    if (url) payload.url = url;

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('send-push error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});