
-- Step 1: Add "Novos" etapa to triagem funnel (id_funil=25)
INSERT INTO etapas_funil (id_funil, nome, ordem, ativo)
VALUES (25, 'Novos', 0, true);

-- Step 1b: Adjust "Descobrir interesse" to ordem 1
UPDATE etapas_funil SET ordem = 1 WHERE id = 74;

-- Step 2: Clean up inactive duplicate campos_customizados for empresa 25
DELETE FROM campos_customizados
WHERE id_empresa = 25 AND ativo = false;
