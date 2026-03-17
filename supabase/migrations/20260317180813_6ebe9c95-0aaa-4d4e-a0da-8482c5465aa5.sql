
-- ============================================================
-- AquaSampa (empresa_id=4) — Correção estrutural de funis
-- ============================================================

-- Step 1: Create 6 funnels for AquaSampa's interests
-- Máquina de Gelo (4 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Máquina de Gelo', 'custom', true, 2);

-- Purificador (4 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Purificador', 'custom', true, 3);

-- Refil (2 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Refil', 'custom', true, 4);

-- Assistência Técnica (2 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Assistência Técnica', 'custom', true, 5);

-- Financeiro (2 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Financeiro', 'custom', true, 6);

-- Outros (2 etapas)
INSERT INTO funis (id_empresa, nome, tipo, ativo, ordem)
VALUES (4, 'Outros Interesses', 'custom', true, 7);

-- Step 2: Create stages for each new funnel
-- Máquina de Gelo stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Máquina de Gelo' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Qualificação', 2, true, 30 FROM funis WHERE id_empresa = 4 AND nome = 'Máquina de Gelo' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Proposta', 3, true, 60 FROM funis WHERE id_empresa = 4 AND nome = 'Máquina de Gelo' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Fechamento', 4, true, 90 FROM funis WHERE id_empresa = 4 AND nome = 'Máquina de Gelo' AND tipo = 'custom';

-- Purificador stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Purificador' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Qualificação', 2, true, 30 FROM funis WHERE id_empresa = 4 AND nome = 'Purificador' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Proposta', 3, true, 60 FROM funis WHERE id_empresa = 4 AND nome = 'Purificador' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Fechamento', 4, true, 90 FROM funis WHERE id_empresa = 4 AND nome = 'Purificador' AND tipo = 'custom';

-- Refil stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Refil' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Em atendimento', 2, true, 50 FROM funis WHERE id_empresa = 4 AND nome = 'Refil' AND tipo = 'custom';

-- Assistência Técnica stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Assistência Técnica' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Em atendimento', 2, true, 50 FROM funis WHERE id_empresa = 4 AND nome = 'Assistência Técnica' AND tipo = 'custom';

-- Financeiro stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Financeiro' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Em atendimento', 2, true, 50 FROM funis WHERE id_empresa = 4 AND nome = 'Financeiro' AND tipo = 'custom';

-- Outros Interesses stages
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Novo', 1, true, 10 FROM funis WHERE id_empresa = 4 AND nome = 'Outros Interesses' AND tipo = 'custom';
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo, probabilidade_fechamento)
SELECT id, 'Em atendimento', 2, true, 50 FROM funis WHERE id_empresa = 4 AND nome = 'Outros Interesses' AND tipo = 'custom';

-- Step 3: Link interests to their new funnels
UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Máquina de Gelo' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'maquina_gelo';

UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Purificador' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'purificador';

UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Refil' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'refil';

UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Assistência Técnica' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'assistencia_tecnica';

UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Financeiro' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'financeiro';

UPDATE lista_interesses SET funil_id = (SELECT id FROM funis WHERE id_empresa = 4 AND nome = 'Outros Interesses' AND tipo = 'custom' LIMIT 1)
WHERE empresa_id = 4 AND nome = 'outros';
