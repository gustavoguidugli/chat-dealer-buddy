CREATE OR REPLACE FUNCTION public.aceitar_convite(p_convite_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_convite public.convites%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Usuário não identificado');
  END IF;

  SELECT * INTO v_convite FROM public.convites
  WHERE id = p_convite_id AND ativo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Convite não encontrado ou inativo');
  END IF;
  IF v_convite.expira_em IS NOT NULL AND v_convite.expira_em < now() THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Convite expirado');
  END IF;
  IF v_convite.max_usos IS NOT NULL AND v_convite.usos_atuais >= v_convite.max_usos THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Convite esgotado');
  END IF;

  INSERT INTO public.user_empresa (user_id, empresa_id, convite_id, role)
  VALUES (v_user_id, v_convite.empresa_id, p_convite_id, COALESCE(v_convite.role, 'member'))
  ON CONFLICT (user_id, empresa_id) DO NOTHING;

  INSERT INTO public.user_permissions (user_id, is_admin)
  VALUES (v_user_id, false)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.convites
  SET usos_atuais = usos_atuais + 1,
      ativo = CASE
        WHEN max_usos IS NOT NULL AND (usos_atuais + 1) >= max_usos THEN false
        ELSE true
      END
  WHERE id = p_convite_id;

  RETURN jsonb_build_object(
    'ok', true,
    'empresa_id', v_convite.empresa_id,
    'role', COALESCE(v_convite.role, 'member')
  );
END;
$$;