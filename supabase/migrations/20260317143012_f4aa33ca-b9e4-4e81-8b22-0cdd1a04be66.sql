
-- Etapa 1: Provisionar campos padrão para TODAS as empresas existentes que não os possuem
-- Etapa 2: Alterar trigger a_criar_funis_padrao para criar campos padrão automaticamente

-- =============================================
-- 1. Inserir campos padrão para empresas existentes
-- =============================================
-- Usamos um INSERT ... SELECT com anti-join para não duplicar

INSERT INTO public.campos_customizados (id_empresa, id_funil, nome, slug, tipo, ordem, ativo, obrigatorio)
SELECT e.id, NULL, campo.nome, campo.slug, campo.tipo, campo.ordem, true, false
FROM public.empresas_geral e
CROSS JOIN (
  VALUES 
    ('Interesse',      'interesse',      'texto',  0),
    ('Cidade',         'cidade',         'texto',  1),
    ('Tipo de Uso',    'tipo_uso',       'texto',  2),
    ('Consumo Mensal', 'consumo_mensal', 'numero', 3),
    ('Gasto Mensal',   'gasto_mensal',   'numero', 4),
    ('Dias por Semana','dias_semana',    'numero', 5)
) AS campo(nome, slug, tipo, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.campos_customizados cc
  WHERE cc.id_empresa = e.id
    AND cc.slug = campo.slug
    AND cc.ativo = true
);

-- =============================================
-- 2. Alterar trigger para provisionar campos padrão em novas empresas
-- =============================================
CREATE OR REPLACE FUNCTION public.a_criar_funis_padrao()
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
  -- Criar funil Triagem
  INSERT INTO funis (id_empresa, nome, tipo, ordem)
  VALUES (NEW.id, 'Sem interesse', 'triagem', 0)
  RETURNING id INTO v_funil_triagem_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem) VALUES
    (v_funil_triagem_id, 'Novos', 0),
    (v_funil_triagem_id, 'Em atendimento', 1);

  -- Criar funil Máquina de Gelo
  INSERT INTO funis (id_empresa, nome, tipo, ordem)
  VALUES (NEW.id, 'Máquina de Gelo', 'maquina_gelo', 1)
  RETURNING id INTO v_funil_maquina_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem) VALUES
    (v_funil_maquina_id, 'Novo', 0),
    (v_funil_maquina_id, 'Qualificação', 1),
    (v_funil_maquina_id, 'Proposta', 2),
    (v_funil_maquina_id, 'Fechamento', 3);

  -- Criar funil Purificador
  INSERT INTO funis (id_empresa, nome, tipo, ordem)
  VALUES (NEW.id, 'Purificador', 'purificador', 2)
  RETURNING id INTO v_funil_purificador_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem) VALUES
    (v_funil_purificador_id, 'Novo', 0),
    (v_funil_purificador_id, 'Qualificação', 1),
    (v_funil_purificador_id, 'Proposta', 2),
    (v_funil_purificador_id, 'Fechamento', 3);

  -- Criar funil Outros
  INSERT INTO funis (id_empresa, nome, tipo, ordem)
  VALUES (NEW.id, 'Outros interesses', 'outros', 3)
  RETURNING id INTO v_funil_outros_id;

  INSERT INTO etapas_funil (id_funil, nome, ordem) VALUES
    (v_funil_outros_id, 'Novo', 0),
    (v_funil_outros_id, 'Em atendimento', 1);

  -- Criar campos padrão (globais, sem vínculo com funil específico)
  INSERT INTO campos_customizados (id_empresa, id_funil, nome, slug, tipo, ordem, ativo, obrigatorio) VALUES
    (NEW.id, NULL, 'Interesse',       'interesse',      'texto',  0, true, false),
    (NEW.id, NULL, 'Cidade',          'cidade',         'texto',  1, true, false),
    (NEW.id, NULL, 'Tipo de Uso',     'tipo_uso',       'texto',  2, true, false),
    (NEW.id, NULL, 'Consumo Mensal',  'consumo_mensal', 'numero', 3, true, false),
    (NEW.id, NULL, 'Gasto Mensal',    'gasto_mensal',   'numero', 4, true, false),
    (NEW.id, NULL, 'Dias por Semana', 'dias_semana',    'numero', 5, true, false);

  RETURN NEW;
END;
$$;
