
-- Create triagem funnels for companies missing them
DO $$
DECLARE
  v_empresa RECORD;
  v_funil_id bigint;
BEGIN
  FOR v_empresa IN
    SELECT eg.id
    FROM empresas_geral eg
    WHERE eg.ativo = true
      AND NOT EXISTS (
        SELECT 1 FROM funis f WHERE f.id_empresa = eg.id AND f.tipo = 'triagem'
      )
  LOOP
    INSERT INTO funis (id_empresa, nome, tipo, ordem, cor)
    VALUES (v_empresa.id, 'Sem interesse', 'triagem', 0, '#6B7280')
    RETURNING id INTO v_funil_id;

    INSERT INTO etapas_funil (id_funil, nome, ordem, cor) VALUES
      (v_funil_id, 'Novos', 1, '#3B82F6'),
      (v_funil_id, 'Em atendimento', 2, '#F59E0B');
  END LOOP;
END;
$$;
