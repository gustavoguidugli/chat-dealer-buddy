
CREATE OR REPLACE FUNCTION public.trigger_criar_lead_apos_contato()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_crm_ativo BOOLEAN;
BEGIN
  -- Check if CRM is enabled for this company
  SELECT crm_is_ativo INTO v_crm_ativo
  FROM config_empresas_geral
  WHERE id_empresa = NEW.empresa_id
  LIMIT 1;

  IF v_crm_ativo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM leads_crm 
    WHERE whatsapp = NEW.whatsapp 
    AND id_empresa = NEW.empresa_id 
    AND ativo = true
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM criar_lead_triagem(NEW.whatsapp, NEW.empresa_id, NEW.whatsapp_padrao_pipedrive);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_criar_lead_apos_contato falhou para contato %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
