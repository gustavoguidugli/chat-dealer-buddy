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
    const { convite_id, action } = body;

    if (!convite_id) {
      return new Response(JSON.stringify({ error: 'convite_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: convite, error } = await supabaseAdmin
      .from('convites')
      .select('*')
      .eq('id', convite_id)
      .single();

    if (error || !convite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), { status: 404, headers: corsHeaders });
    }

    // Action: get_role — return the role without sending email
    if (action === 'get_role') {
      return new Response(
        JSON.stringify({ role: convite.role || 'user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Default action: send email
    if (convite.status_convite !== 'pending') {
      return new Response(JSON.stringify({ error: 'Convite não está pendente' }), { status: 400, headers: corsHeaders });
    }

    const link = `https://chat-dealer-buddy.lovable.app/onboarding?token=${convite.token}`;

    const emailPayload = {
      to: convite.email_destino,
      subject: 'Você foi convidado para o Ecoice',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f;">❄️ Eco Ice</h1>
          </div>
          <h2 style="color: #333;">Bem-vindo ao Ecoice!</h2>
          <p>Você foi convidado para participar de um time no Ecoice.</p>
          <p>Este convite é válido por <strong>72 horas</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Aceitar convite
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Caso o botão não funcione, copie e cole este link no navegador:</p>
          <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">${link}</p>
        </div>
      `,
    };

    // TODO: Resend não configurado — descomentar quando conta estiver ativa
    // const resendRes = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ from: 'noreply@ecoice.com.br', ...emailPayload }),
    // });

    console.log('Email que seria enviado:', JSON.stringify(emailPayload, null, 2));

    return new Response(
      JSON.stringify({ success: true, message: 'Email stub - Resend não configurado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
