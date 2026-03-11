CREATE OR REPLACE FUNCTION public.trigger_criar_lead_apos_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM criar_lead_triagem(NEW.whatsapp, NEW.empresa_id, NEW.whatsapp_padrao_pipedrive);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_criar_lead_apos_contato falhou para contato %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_criar_lead_apos_contato
  AFTER INSERT ON contatos_geral
  FOR EACH ROW
  EXECUTE FUNCTION trigger_criar_lead_apos_contato();