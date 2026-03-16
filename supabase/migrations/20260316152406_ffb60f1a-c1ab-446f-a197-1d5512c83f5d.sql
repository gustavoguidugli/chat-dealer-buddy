
-- Function: criar_funis_padrao
-- Creates default funnels + stages when a new company is inserted
-- Must run BEFORE inserir_interesses_padrao (alphabetical ordering guarantees this)
CREATE OR REPLACE FUNCTION public.criar_funis_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funil_triagem_id bigint;
  v_funil_maquina_id bigint;
  v_funil_purificador_id bigint;
  v_funil_outros_id bigint;
BEGIN
  -- 1. Triagem (Sem interesse)
  INSERT INTO funis (id_empresa, nome, tipo, ordem, cor)
  VALUES (NEW.id, 'Sem interesse', 'triagem', 0, '#6B7280')
  RETURNING id INTO v_funil_triagem_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem, cor) VALUES
    (v_funil_triagem_id, 'Novos', 1, '#3B82F6'),
    (v_funil_triagem_id, 'Em atendimento', 2, '#F59E0B');

  -- 2. Máquina de Gelo
  INSERT INTO funis (id_empresa, nome, tipo, ordem, cor)
  VALUES (NEW.id, 'Máquina de Gelo', 'maquina_gelo', 1, '#3B82F6')
  RETURNING id INTO v_funil_maquina_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem, cor) VALUES
    (v_funil_maquina_id, 'Novo', 1, '#3B82F6'),
    (v_funil_maquina_id, 'Qualificação', 2, '#F59E0B'),
    (v_funil_maquina_id, 'Proposta', 3, '#8B5CF6'),
    (v_funil_maquina_id, 'Fechamento', 4, '#10B981');

  -- 3. Purificador
  INSERT INTO funis (id_empresa, nome, tipo, ordem, cor)
  VALUES (NEW.id, 'Purificador', 'purificador', 2, '#10B981')
  RETURNING id INTO v_funil_purificador_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem, cor) VALUES
    (v_funil_purificador_id, 'Novo', 1, '#3B82F6'),
    (v_funil_purificador_id, 'Qualificação', 2, '#F59E0B'),
    (v_funil_purificador_id, 'Proposta', 3, '#8B5CF6'),
    (v_funil_purificador_id, 'Fechamento', 4, '#10B981');

  -- 4. Outros interesses
  INSERT INTO funis (id_empresa, nome, tipo, ordem, cor)
  VALUES (NEW.id, 'Outros interesses', 'outros', 3, '#F59E0B')
  RETURNING id INTO v_funil_outros_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem, cor) VALUES
    (v_funil_outros_id, 'Novo', 1, '#3B82F6'),
    (v_funil_outros_id, 'Em atendimento', 2, '#F59E0B');

  RETURN NEW;
END;
$$;

-- Trigger name starts with "a_" to guarantee it runs BEFORE "inserir_interesses_padrao"
CREATE TRIGGER a_criar_funis_padrao
  AFTER INSERT ON empresas_geral
  FOR EACH ROW
  EXECUTE FUNCTION criar_funis_padrao();
