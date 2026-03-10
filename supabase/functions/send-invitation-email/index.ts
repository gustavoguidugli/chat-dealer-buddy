import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { convite_id, email_destino, empresa_nome, role } = body;

    if (!convite_id) {
      return new Response(JSON.stringify({ error: 'convite_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch token from convite
    const { data: convite, error } = await supabaseAdmin
      .from('convites')
      .select('token, email_destino, role')
      .eq('id', convite_id)
      .single();

    if (error || !convite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), { status: 404, headers: corsHeaders });
    }

    const recipientEmail = email_destino || convite.email_destino;
    const recipientRole = role || convite.role || 'user';
    const companyName = empresa_nome || 'Eco Ice';
    const link = `https://eco-ice.app.br/onboarding?token=${convite.token}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <a href="https://eco-ice.app.br" style="color:#1e3a5f;font-size:22px;font-weight:bold;text-decoration:none;">❄️ Eco Ice</a>
        </td></tr>
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#000000;">Seu convite</h1>
          <p style="margin:0 0 8px;font-size:16px;color:#374151;line-height:1.6;">
            ${companyName} convidou você para fazer parte da plataforma <a href="https://eco-ice.app.br" style="color:#3b82f6;text-decoration:none;">Eco Ice</a>.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;line-height:1.6;">
            Este convite expira em <strong>72 horas</strong>.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${link}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Aceitar convite
            </a>
          </td></tr></table>
          <p style="margin:32px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
            Se o botão não funcionar, <a href="${link}" style="color:#3b82f6;text-decoration:underline;">clique aqui</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: corsHeaders });
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Eco Ice <invitations@eco-ice.app.br>',
        to: [recipientEmail],
        subject: 'Você foi convidado para o Eco Ice',
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('Resend error:', errBody);
      return new Response(JSON.stringify({ error: 'Falha ao enviar e-mail', details: errBody }), { status: 500, headers: corsHeaders });
    }

    const resendData = await resendRes.json();
    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
