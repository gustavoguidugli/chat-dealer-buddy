
CREATE OR REPLACE FUNCTION sync_contato_sdr_to_lead_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id BIGINT;
  v_empresa_id BIGINT;
  v_interesse TEXT;
  v_whatsapp_padrao TEXT;
  v_etiqueta_id BIGINT;
  v_etiqueta_nome TEXT;
BEGIN
  -- Match lead via contatos_geral.whatsapp (no empresa filter on leads_crm)
  SELECT l.id, c.interesse, c.whatsapp_padrao_pipedrive, l.id_empresa
  INTO v_lead_id, v_interesse, v_whatsapp_padrao, v_empresa_id
  FROM leads_crm l
  INNER JOIN contatos_geral c ON c.id = l.id_contato_geral
  WHERE c.whatsapp = NEW.whatsapp
    AND l.ativo = true
  LIMIT 1;

  IF v_lead_id IS NULL THEN RETURN NEW; END IF;

  -- Update lead name if missing
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
