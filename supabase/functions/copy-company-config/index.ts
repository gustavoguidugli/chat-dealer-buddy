import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin
    const { data: perm } = await supabaseAdmin
      .from("user_permissions")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();

    if (!perm?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Only admins can copy company config" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { source_company_id, target_company_id } = await req.json();

    if (!source_company_id || !target_company_id) {
      return new Response(
        JSON.stringify({ error: "source_company_id and target_company_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = {
      faqs_copied: 0,
      labels_copied: 0,
      faq_labels_copied: 0,
      config_copied: false,
      interests_copied: 0,
    };

    // 1. Copy FAQs and their labels
    const { data: sourceFaqs } = await supabaseAdmin
      .from("faqs")
      .select("id, pergunta, resposta, contexto, tipo_faq, tags, observacoes, ativo")
      .eq("id_empresa", source_company_id);

    // We'll need a map from old FAQ id -> new FAQ id for faq_labels
    const faqIdMap: Record<number, number> = {};

    if (sourceFaqs && sourceFaqs.length > 0) {
      const newFaqs = sourceFaqs.map(({ id, ...faq }) => ({
        ...faq,
        id_empresa: target_company_id,
      }));
      const { data: inserted, error: faqErr } = await supabaseAdmin
        .from("faqs")
        .insert(newFaqs)
        .select("id");

      if (faqErr) {
        console.error("Error copying FAQs:", faqErr);
      } else {
        results.faqs_copied = inserted?.length ?? 0;
        // Build the id map (inserted order matches sourceFaqs order)
        if (inserted) {
          sourceFaqs.forEach((src, idx) => {
            if (inserted[idx]) {
              faqIdMap[src.id] = inserted[idx].id;
            }
          });
        }
      }
    }

    // 2. Copy Labels
    const { data: sourceLabels } = await supabaseAdmin
      .from("labels")
      .select("id, nome, cor, icone, ordem, ativo")
      .eq("empresa_id", source_company_id);

    const labelIdMap: Record<string, string> = {};

    if (sourceLabels && sourceLabels.length > 0) {
      const newLabels = sourceLabels.map(({ id, ...label }) => ({
        ...label,
        empresa_id: target_company_id,
      }));
      const { data: insertedLabels, error: labelErr } = await supabaseAdmin
        .from("labels")
        .insert(newLabels)
        .select("id");

      if (labelErr) {
        console.error("Error copying labels:", labelErr);
      } else {
        results.labels_copied = insertedLabels?.length ?? 0;
        if (insertedLabels) {
          sourceLabels.forEach((src, idx) => {
            if (insertedLabels[idx]) {
              labelIdMap[src.id] = insertedLabels[idx].id;
            }
          });
        }
      }
    }

    // 3. Copy faq_labels (mapping old IDs to new IDs)
    const sourceFaqIds = Object.keys(faqIdMap).map(Number);
    if (sourceFaqIds.length > 0 && Object.keys(labelIdMap).length > 0) {
      const { data: sourceFaqLabels } = await supabaseAdmin
        .from("faq_labels")
        .select("faq_id, label_id")
        .in("faq_id", sourceFaqIds);

      if (sourceFaqLabels && sourceFaqLabels.length > 0) {
        const newFaqLabels = sourceFaqLabels
          .filter((fl) => faqIdMap[fl.faq_id] && labelIdMap[fl.label_id])
          .map((fl) => ({
            faq_id: faqIdMap[fl.faq_id],
            label_id: labelIdMap[fl.label_id],
          }));

        if (newFaqLabels.length > 0) {
          const { data: insertedFL, error: flErr } = await supabaseAdmin
            .from("faq_labels")
            .insert(newFaqLabels)
            .select("faq_id");

          if (flErr) {
            console.error("Error copying faq_labels:", flErr);
          } else {
            results.faq_labels_copied = insertedFL?.length ?? 0;
          }
        }
      }
    }

    // 4. Copy config_empresas_geral
    const { data: sourceConfig } = await supabaseAdmin
      .from("config_empresas_geral")
      .select(
        "faq_geral_maquina, faq_purificador, faq_qualificacao_maquina, faq_pos_qualificacao_maquina, horarios_funcionamento, mensagem_triagem, triagem_is_ativo, wait_segundos"
      )
      .eq("id_empresa", source_company_id)
      .maybeSingle();

    if (sourceConfig) {
      const { error: configErr } = await supabaseAdmin
        .from("config_empresas_geral")
        .upsert(
          { ...sourceConfig, id_empresa: target_company_id },
          { onConflict: "id_empresa" }
        );

      if (configErr) {
        console.error("Error copying config:", configErr);
      } else {
        results.config_copied = true;
      }
    }

    // 5. Copy lista_interesses
    const { data: sourceInterests } = await supabaseAdmin
      .from("lista_interesses")
      .select("nome, label, palavras_chave, mensagem_resposta, ordem, ativo")
      .eq("empresa_id", source_company_id);

    if (sourceInterests && sourceInterests.length > 0) {
      const newInterests = sourceInterests.map((i) => ({
        ...i,
        empresa_id: target_company_id,
      }));
      const { data: insertedInterests, error: intErr } = await supabaseAdmin
        .from("lista_interesses")
        .insert(newInterests)
        .select("id");

      if (intErr) {
        console.error("Error copying interests:", intErr);
      } else {
        results.interests_copied = insertedInterests?.length ?? 0;
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
