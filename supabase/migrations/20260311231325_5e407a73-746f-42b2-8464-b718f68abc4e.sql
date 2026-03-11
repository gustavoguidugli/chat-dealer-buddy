-- Desativar todos os leads duplicados (manter o mais antigo de cada grupo)
UPDATE leads_crm SET ativo = false WHERE id IN (4, 65, 49);

-- Criar índice único parcial para prevenir duplicatas futuras
CREATE UNIQUE INDEX idx_leads_crm_whatsapp_empresa_unique 
ON leads_crm (whatsapp, id_empresa) 
WHERE ativo = true AND whatsapp IS NOT NULL;

-- Melhorar o trigger com verificação prévia
CREATE OR REPLACE FUNCTION public.trigger_criar_lead_apos_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;