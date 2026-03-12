-- 1. Update RLS on contatos_sdr_maquinagelo to allow same-company users SELECT
DROP POLICY IF EXISTS "select_contatos_sdr_maquinagelo" ON public.contatos_sdr_maquinagelo;
CREATE POLICY "select_contatos_sdr_maquinagelo"
  ON public.contatos_sdr_maquinagelo FOR SELECT
  TO authenticated
  USING (
    is_admin((SELECT auth.uid())) 
    OR (id_empresa IN (SELECT ue.empresa_id FROM user_empresa ue WHERE ue.user_id = (SELECT auth.uid())))
  );

-- 2. Update RLS on contatos_sdr_purificador to allow same-company users SELECT
DROP POLICY IF EXISTS "select_contatos_sdr_purificador" ON public.contatos_sdr_purificador;
CREATE POLICY "select_contatos_sdr_purificador"
  ON public.contatos_sdr_purificador FOR SELECT
  TO authenticated
  USING (
    is_admin((SELECT auth.uid())) 
    OR (id_empresa IN (SELECT ue.empresa_id FROM user_empresa ue WHERE ue.user_id = (SELECT auth.uid())))
  );

-- 3. Add SDR tables and contatos_geral to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE contatos_sdr_maquinagelo;
ALTER PUBLICATION supabase_realtime ADD TABLE contatos_sdr_purificador;
ALTER PUBLICATION supabase_realtime ADD TABLE contatos_geral;

-- 4. Set REPLICA IDENTITY FULL for proper realtime events
ALTER TABLE contatos_sdr_maquinagelo REPLICA IDENTITY FULL;
ALTER TABLE contatos_sdr_purificador REPLICA IDENTITY FULL;

-- 5. Trigger to auto-assign etiqueta (frio/morno/quente) based on consumo_mensal
CREATE OR REPLACE FUNCTION public.trigger_etiqueta_consumo_mensal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead RECORD;
  v_etiqueta_nome TEXT;
  v_etiqueta_id BIGINT;
  v_empresa_id BIGINT;
BEGIN
  IF NEW.consumo_mensal IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.consumo_mensal <= 800 THEN
    v_etiqueta_nome := 'Frio';
  ELSIF NEW.consumo_mensal <= 1200 THEN
    v_etiqueta_nome := 'Morno';
  ELSE
    v_etiqueta_nome := 'Quente';
  END IF;

  FOR v_lead IN
    SELECT l.id, l.id_empresa
    FROM leads_crm l
    WHERE l.whatsapp = NEW.whatsapp
      AND l.ativo = true
  LOOP
    v_empresa_id := v_lead.id_empresa;

    SELECT id INTO v_etiqueta_id
    FROM etiquetas_card
    WHERE id_empresa = v_empresa_id
      AND LOWER(nome) = LOWER(v_etiqueta_nome)
      AND ativo = true
    LIMIT 1;

    IF v_etiqueta_id IS NULL THEN
      CONTINUE;
    END IF;

    DELETE FROM lead_etiquetas
    WHERE id_lead = v_lead.id
      AND id_etiqueta IN (
        SELECT id FROM etiquetas_card 
        WHERE id_empresa = v_empresa_id 
          AND LOWER(nome) IN ('frio', 'morno', 'quente')
      );

    INSERT INTO lead_etiquetas (id_lead, id_etiqueta, id_empresa, aplicada_automaticamente)
    VALUES (v_lead.id, v_etiqueta_id, v_empresa_id, true)
    ON CONFLICT (id_lead, id_etiqueta) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_etiqueta_consumo_mensal ON contatos_sdr_maquinagelo;
CREATE TRIGGER trg_etiqueta_consumo_mensal
  AFTER INSERT OR UPDATE OF consumo_mensal ON contatos_sdr_maquinagelo
  FOR EACH ROW
  EXECUTE FUNCTION trigger_etiqueta_consumo_mensal();