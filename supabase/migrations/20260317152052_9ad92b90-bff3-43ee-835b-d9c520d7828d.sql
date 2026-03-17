
-- 1a. Deactivate duplicate lead #2 (old format without 55 prefix)
UPDATE leads_crm 
SET ativo = false, status = 'perdido', motivo_perda = 'Duplicata por formato de whatsapp'
WHERE id = 2;

-- 1b. Close ghost leads (ativo=false but status=aberto)
UPDATE leads_crm 
SET status = 'perdido', motivo_perda = 'Lead fantasma removido em limpeza'
WHERE ativo = false AND status = 'aberto';

-- 2. Normalize WhatsApp in criar_lead_triagem to prevent future duplicates
CREATE OR REPLACE FUNCTION criar_lead_triagem(p_whatsapp TEXT, p_id_empresa BIGINT, p_nome TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id BIGINT; v_funil_id BIGINT; v_etapa_id BIGINT;
  v_contato_geral_id BIGINT; v_nome_lead TEXT;
  v_whatsapp_raw TEXT;
  v_whatsapp_with55 TEXT;
  v_whatsapp_without55 TEXT;
BEGIN
  -- Normalize: strip non-digits
  v_whatsapp_raw := regexp_replace(p_whatsapp, '\D', '', 'g');
  
  -- Build both variants for matching
  IF left(v_whatsapp_raw, 2) = '55' THEN
    v_whatsapp_with55 := v_whatsapp_raw;
    v_whatsapp_without55 := substr(v_whatsapp_raw, 3);
  ELSE
    v_whatsapp_without55 := v_whatsapp_raw;
    v_whatsapp_with55 := '55' || v_whatsapp_raw;
  END IF;

  -- Find contato_geral with any variant
  SELECT id, COALESCE(nome_lead, whatsapp_padrao_pipedrive) INTO v_contato_geral_id, v_nome_lead
  FROM contatos_geral 
  WHERE regexp_replace(whatsapp, '\D', '', 'g') IN (v_whatsapp_raw, v_whatsapp_with55, v_whatsapp_without55)
    AND empresa_id = p_id_empresa
  LIMIT 1;

  IF v_contato_geral_id IS NULL THEN 
    RAISE NOTICE 'Contato geral não encontrado: %', p_whatsapp; 
    RETURN NULL; 
  END IF;

  v_nome_lead := COALESCE(p_nome, v_nome_lead, p_whatsapp);

  SELECT id INTO v_funil_id FROM funis WHERE tipo = 'triagem' AND id_empresa = p_id_empresa AND ativo = true LIMIT 1;
  IF v_funil_id IS NULL THEN RAISE EXCEPTION 'Funil de triagem não encontrado para empresa: %', p_id_empresa; END IF;

  SELECT id INTO v_etapa_id FROM etapas_funil WHERE id_funil = v_funil_id AND ativo = true ORDER BY ordem ASC LIMIT 1;
  IF v_etapa_id IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada para funil: %', v_funil_id; END IF;

  -- Check for existing lead with any WhatsApp variant (normalized comparison)
  SELECT id INTO v_lead_id FROM leads_crm 
  WHERE regexp_replace(whatsapp, '\D', '', 'g') IN (v_whatsapp_raw, v_whatsapp_with55, v_whatsapp_without55)
    AND id_empresa = p_id_empresa 
    AND ativo = true 
  LIMIT 1;

  IF v_lead_id IS NOT NULL THEN 
    RAISE NOTICE 'Lead já existe: %', v_lead_id; 
    RETURN v_lead_id; 
  END IF;

  INSERT INTO leads_crm (id_empresa, id_contato_geral, nome, whatsapp, id_funil, id_etapa_atual, origem, status, ativo)
  VALUES (p_id_empresa, v_contato_geral_id, v_nome_lead, p_whatsapp, v_funil_id, v_etapa_id, 'whatsapp', 'aberto', true)
  RETURNING id INTO v_lead_id;

  RAISE NOTICE 'Lead criado no funil de triagem: %', v_lead_id; 
  RETURN v_lead_id;
END;
$$;
