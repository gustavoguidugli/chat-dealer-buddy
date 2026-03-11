
-- FIX 1: Drop e recriar criar_lead_triagem com filtro id_empresa
DROP FUNCTION IF EXISTS public.criar_lead_triagem(text, bigint, text);

CREATE FUNCTION public.criar_lead_triagem(
  p_whatsapp TEXT,
  p_id_empresa BIGINT,
  p_nome TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id BIGINT; v_funil_id BIGINT; v_etapa_id BIGINT;
  v_contato_geral_id BIGINT; v_nome_lead TEXT;
BEGIN
  SELECT id, whatsapp_padrao_pipedrive INTO v_contato_geral_id, v_nome_lead
  FROM contatos_geral WHERE whatsapp = p_whatsapp LIMIT 1;
  IF v_contato_geral_id IS NULL THEN RAISE NOTICE 'Contato geral não encontrado: %', p_whatsapp; RETURN NULL; END IF;
  v_nome_lead := COALESCE(p_nome, v_nome_lead, p_whatsapp);
  SELECT id INTO v_funil_id FROM funis WHERE tipo = 'triagem' AND id_empresa = p_id_empresa AND ativo = true LIMIT 1;
  IF v_funil_id IS NULL THEN RAISE EXCEPTION 'Funil de triagem não encontrado para empresa: %', p_id_empresa; END IF;
  SELECT id INTO v_etapa_id FROM etapas_funil WHERE id_funil = v_funil_id AND ativo = true ORDER BY ordem ASC LIMIT 1;
  IF v_etapa_id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada para funil: %', v_funil_id; END IF;
  -- FIX: filtro por id_empresa
  SELECT id INTO v_lead_id FROM leads_crm WHERE whatsapp = p_whatsapp AND id_empresa = p_id_empresa AND ativo = true LIMIT 1;
  IF v_lead_id IS NOT NULL THEN RAISE NOTICE 'Lead já existe: %', v_lead_id; RETURN v_lead_id; END IF;
  INSERT INTO leads_crm (id_empresa, id_contato_geral, nome, whatsapp, id_funil, id_etapa_atual, origem, status, ativo)
  VALUES (p_id_empresa, v_contato_geral_id, v_nome_lead, p_whatsapp, v_funil_id, v_etapa_id, 'whatsapp', 'aberto', true)
  RETURNING id INTO v_lead_id;
  RAISE NOTICE 'Lead criado no funil de triagem: %', v_lead_id; RETURN v_lead_id;
END;
$$;

-- FIX 2: avancar_lead_qualificado com filtro id_empresa
CREATE OR REPLACE FUNCTION public.avancar_lead_qualificado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lead RECORD; v_proxima_etapa RECORD;
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage = 'qualificado' THEN
    SELECT l.id, l.id_funil, l.id_etapa_atual, e.ordem INTO v_lead
    FROM leads_crm l INNER JOIN etapas_funil e ON e.id = l.id_etapa_atual
    WHERE l.whatsapp = NEW.whatsapp AND l.id_empresa = NEW.id_empresa AND l.ativo = true LIMIT 1;
    IF v_lead.id IS NULL THEN RETURN NEW; END IF;
    SELECT id INTO v_proxima_etapa FROM etapas_funil
    WHERE id_funil = v_lead.id_funil AND ativo = true AND ordem > v_lead.ordem ORDER BY ordem ASC LIMIT 1;
    IF v_proxima_etapa.id IS NOT NULL THEN
      UPDATE leads_crm SET id_etapa_atual = v_proxima_etapa.id, data_entrada_etapa_atual = now(), updated_at = now() WHERE id = v_lead.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- FIX 3: REPLICA IDENTITY FULL
ALTER TABLE public.leads_crm REPLICA IDENTITY FULL;
ALTER TABLE public.anotacoes_lead REPLICA IDENTITY FULL;
ALTER TABLE public.historico_lead REPLICA IDENTITY FULL;
ALTER TABLE public.anexos_anotacao REPLICA IDENTITY FULL;
ALTER TABLE public.contatos_geral REPLICA IDENTITY FULL;
ALTER TABLE public.lead_etiquetas REPLICA IDENTITY FULL;

-- FIX 4: sync_contato_sdr_to_lead_crm — merge campos_extras
CREATE OR REPLACE FUNCTION public.sync_contato_sdr_to_lead_crm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id BIGINT; v_empresa_id BIGINT; v_interesse TEXT;
  v_whatsapp_padrao TEXT; v_etiqueta_id BIGINT; v_etiqueta_nome TEXT;
BEGIN
  v_empresa_id := NEW.id_empresa;
  SELECT l.id, c.interesse, c.whatsapp_padrao_pipedrive INTO v_lead_id, v_interesse, v_whatsapp_padrao
  FROM leads_crm l INNER JOIN contatos_geral c ON c.id = l.id_contato_geral
  WHERE c.whatsapp = NEW.whatsapp AND l.id_empresa = v_empresa_id LIMIT 1;
  IF v_lead_id IS NULL THEN RETURN NEW; END IF;
  UPDATE leads_crm SET nome = COALESCE(v_whatsapp_padrao, NEW.whatsapp), updated_at = NOW()
  WHERE id = v_lead_id AND (nome IS NULL OR nome = '' OR nome = NEW.whatsapp);

  IF TG_TABLE_NAME = 'contatos_sdr_maquinagelo' THEN
    UPDATE leads_crm SET
      campos_extras = COALESCE(campos_extras, '{}'::jsonb) || jsonb_build_object(
        'cidade', NEW.cidade, 'tipo_uso', NEW.tipo_uso, 'consumo_mensal', NEW.consumo_mensal,
        'gasto_mensal', NEW.gasto_mensal, 'dias_semana', NEW.dias_semana, 'interesse', v_interesse),
      tipo_contato_sdr = 'maquina_gelo', updated_at = NOW()
    WHERE id = v_lead_id;

    IF NEW.gasto_mensal IS NOT NULL THEN
      IF NEW.gasto_mensal >= 2000 THEN v_etiqueta_nome := 'Quente';
      ELSIF NEW.gasto_mensal >= 800 THEN v_etiqueta_nome := 'Morno';
      ELSE v_etiqueta_nome := 'Frio'; END IF;
      SELECT id INTO v_etiqueta_id FROM etiquetas_card
      WHERE nome = v_etiqueta_nome AND tipo = 'temperatura' AND id_empresa = v_empresa_id LIMIT 1;
      IF v_etiqueta_id IS NOT NULL THEN
        DELETE FROM lead_etiquetas WHERE id_lead = v_lead_id
          AND id_etiqueta IN (SELECT id FROM etiquetas_card WHERE tipo = 'temperatura' AND id_empresa = v_empresa_id);
        INSERT INTO lead_etiquetas (id_lead, id_etiqueta, aplicada_automaticamente)
        VALUES (v_lead_id, v_etiqueta_id, true) ON CONFLICT (id_lead, id_etiqueta) DO NOTHING;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'contatos_sdr_purificador' THEN
    UPDATE leads_crm SET
      campos_extras = COALESCE(campos_extras, '{}'::jsonb) || jsonb_build_object(
        'cidade', NEW.cidade, 'tipo_uso', NEW.tipo_uso, 'interesse', v_interesse),
      tipo_contato_sdr = 'purificador', updated_at = NOW()
    WHERE id = v_lead_id;
  END IF;
  RETURN NEW;
END;
$$;
