-- Add email_destino column to convites table
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS email_destino text;

-- Recreate validar_convite to return email_destino
DROP FUNCTION IF EXISTS public.validar_convite(text);

CREATE OR REPLACE FUNCTION public.validar_convite(p_token text)
 RETURNS TABLE(valido boolean, empresa_id bigint, convite_id uuid, erro text, email_destino text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_convite RECORD;
BEGIN
  SELECT * INTO v_convite
  FROM convites
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::BIGINT, NULL::UUID, 'Convite não encontrado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  IF NOT v_convite.ativo THEN
    RETURN QUERY SELECT false, NULL::BIGINT, NULL::UUID, 'Convite desativado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_convite.expira_em IS NOT NULL AND v_convite.expira_em < NOW() THEN
    RETURN QUERY SELECT false, NULL::BIGINT, NULL::UUID, 'Convite expirado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_convite.usos_atuais >= v_convite.max_usos THEN
    RETURN QUERY SELECT false, NULL::BIGINT, NULL::UUID, 'Convite já foi utilizado'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, v_convite.empresa_id, v_convite.id, NULL::TEXT, v_convite.email_destino;
END;
$function$;