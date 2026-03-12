
CREATE OR REPLACE FUNCTION public.mover_lead_por_interesse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id BIGINT;
  v_funil_atual_id BIGINT;
  v_novo_funil_id BIGINT;
  v_nova_etapa_id BIGINT;
  v_interesse TEXT;
  v_empresa_id BIGINT;
BEGIN
  v_empresa_id := NEW.empresa_id;

  -- Find the active lead for this whatsapp + company
  SELECT l.id, l.id_funil
  INTO v_lead_id, v_funil_atual_id
  FROM leads_crm l
  WHERE l.whatsapp = NEW.whatsapp
    AND l.id_empresa = v_empresa_id
    AND l.ativo = true
  LIMIT 1;

  IF v_lead_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.interesse IS NOT NULL AND NEW.interesse != '' THEN
    v_interesse := NEW.interesse;

    -- Dynamically lookup the target funnel from lista_interesses
    SELECT funil_id INTO v_novo_funil_id
    FROM lista_interesses
    WHERE nome = v_interesse
      AND empresa_id = v_empresa_id
      AND ativo = true
    LIMIT 1;

    -- If no funil_id mapped for this interest, do nothing
    IF v_novo_funil_id IS NULL THEN RETURN NEW; END IF;

    -- Already in the correct funnel? Skip
    IF v_funil_atual_id = v_novo_funil_id THEN RETURN NEW; END IF;

    -- Find the first stage of the target funnel
    SELECT id INTO v_nova_etapa_id
    FROM etapas_funil
    WHERE id_funil = v_novo_funil_id AND ativo = true
    ORDER BY ordem ASC LIMIT 1;

    IF v_nova_etapa_id IS NOT NULL THEN
      UPDATE leads_crm SET
        id_funil               = v_novo_funil_id,
        id_etapa_atual         = v_nova_etapa_id,
        data_entrada_funil     = now(),
        data_entrada_etapa_atual = now(),
        tipo_contato_sdr       = v_interesse,
        updated_at             = now()
      WHERE id = v_lead_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
