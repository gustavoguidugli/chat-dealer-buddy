-- Fix 1: Corrigir tipo do funil "Sem interesse" da empresa 2 para 'triagem'
UPDATE funis SET tipo = 'triagem' WHERE id = 4 AND id_empresa = 2;

-- Fix 2: Reativar interesses desativados da empresa 2
UPDATE lista_interesses SET ativo = true WHERE empresa_id = 2 AND ativo = false;