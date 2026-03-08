
CREATE OR REPLACE FUNCTION public.avancar_lead_qualificado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead RECORD;
  v_proxima_etapa RECORD;
BEGIN
  -- Só executa quando stage muda para 'qualificado'
  IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage = 'qualificado' THEN
    -- Buscar lead ativo pelo whatsapp
    SELECT l.id, l.id_funil, l.id_etapa_atual, e.ordem
    INTO v_lead
    FROM leads_crm l
    INNER JOIN etapas_funil e ON e.id = l.id_etapa_atual
    WHERE l.whatsapp = NEW.whatsapp
      AND l.ativo = true
    LIMIT 1;

    IF v_lead.id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Buscar próxima etapa (ordem + 1) no mesmo funil
    SELECT id INTO v_proxima_etapa
    FROM etapas_funil
    WHERE id_funil = v_lead.id_funil
      AND ativo = true
      AND ordem > v_lead.ordem
    ORDER BY ordem ASC
    LIMIT 1;

    -- Se existe próxima etapa, mover o lead
    IF v_proxima_etapa.id IS NOT NULL THEN
      UPDATE leads_crm
      SET id_etapa_atual = v_proxima_etapa.id,
          data_entrada_etapa_atual = now(),
          updated_at = now()
      WHERE id = v_lead.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_avancar_lead_qualificado
AFTER UPDATE ON contatos_sdr_maquinagelo
FOR EACH ROW
EXECUTE FUNCTION public.avancar_lead_qualificado();
