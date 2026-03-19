import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FAQ_FIELD_MAP: Record<string, string> = {
  qualificacao_maquina: "faq_qualificacao_maquina",
  pos_qualificacao_maquina: "faq_pos_qualificacao_maquina",
  purificador: "faq_purificador",
  geral_maquina: "faq_geral_maquina",
};

function parseFaqBlocks(texto: string) {
  const blocks = texto.split(/\n\n+/).filter((b) => b.trim());
  const faqs: { contexto: string; pergunta: string; resposta: string; tags: string[] }[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    let contexto = "", pergunta = "", resposta = "";
    const tags: string[] = [];
    let currentField: string | null = null;
    const currentContent: string[] = [];

    const flushField = () => {
      if (!currentField) return;
      const val = currentContent.join("\n");
      if (currentField === "contexto") contexto = val;
      else if (currentField === "pergunta") pergunta = val;
      else if (currentField === "resposta") resposta = val;
    };

    for (const line of lines) {
      if (/^Contexto:/i.test(line)) {
        flushField(); currentField = "contexto"; currentContent.length = 0;
        currentContent.push(line.replace(/^Contexto:\s*/i, ""));
      } else if (/^Pergunta:/i.test(line)) {
        flushField(); currentField = "pergunta"; currentContent.length = 0;
        currentContent.push(line.replace(/^Pergunta:\s*/i, ""));
      } else if (/^Resposta/i.test(line)) {
        flushField(); currentField = "resposta"; currentContent.length = 0;
        currentContent.push(line.replace(/^Resposta.*?:\s*/i, ""));
      } else if (/^Tags:/i.test(line)) {
        flushField(); currentField = null;
        const tagLine = line.replace(/^Tags:\s*/i, "").replace(/#/g, "");
        tags.push(...tagLine.split(/\s+/).filter(Boolean));
      } else if (currentField) {
        currentContent.push(line);
      }
    }
    flushField();
    if (pergunta.trim() && resposta.trim()) {
      faqs.push({ contexto: contexto.trim(), pergunta: pergunta.trim(), resposta: resposta.trim(), tags });
    }
  }
  return faqs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const { empresa_id, tipo } = await req.json();
    if (!empresa_id || !tipo || !FAQ_FIELD_MAP[tipo]) {
      return new Response(JSON.stringify({ error: "empresa_id and valid tipo required", valid_tipos: Object.keys(FAQ_FIELD_MAP) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const field = FAQ_FIELD_MAP[tipo];

    const { data: config, error: configErr } = await supabase
      .from("config_empresas_geral")
      .select(field)
      .eq("id_empresa", empresa_id)
      .single();

    if (configErr || !config) {
      return new Response(JSON.stringify({ error: "Config not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const texto = (config as Record<string, string>)[field];
    if (!texto || !texto.trim()) {
      return new Response(JSON.stringify({ error: `Field ${field} is empty` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const faqs = parseFaqBlocks(texto);
    let count = 0;

    for (const faq of faqs) {
      const textoEmbed = `Contexto: ${faq.contexto}\nPergunta: ${faq.pergunta}\nResposta: ${faq.resposta}`;

      const embResp = await fetch(`${SUPABASE_URL}/functions/v1/gerar-embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoEmbed }),
      });

      if (!embResp.ok) {
        console.error(`Embedding failed: ${faq.pergunta.substring(0, 50)}`, await embResp.text());
        continue;
      }

      const { embedding } = await embResp.json();

      const { error: insertErr } = await supabase.from("faq_empresa").insert({
        empresa_id, tipo, contexto: faq.contexto, pergunta: faq.pergunta,
        resposta: faq.resposta, tags: faq.tags, embedding, ordem: count + 1,
      });
      if (insertErr) { console.error("faq_empresa insert err:", insertErr); continue; }

      await supabase.from("documents").insert({
        id_empresa: empresa_id, content: textoEmbed,
        metadata: { tipo_faq: tipo, pergunta: faq.pergunta }, embedding,
      });

      count++;
    }

    return new Response(JSON.stringify({ success: true, tipo, total_parsed: faqs.length, inserted: count }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
