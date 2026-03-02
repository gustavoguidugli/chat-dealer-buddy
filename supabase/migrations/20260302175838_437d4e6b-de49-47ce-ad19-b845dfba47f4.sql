
CREATE OR REPLACE FUNCTION public.inserir_interesses_padrao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO lista_interesses (empresa_id, nome, label, palavras_chave, mensagem_resposta, ordem, ativo)
  VALUES
    (NEW.id, 'maquina_gelo', 'Máquinas de gelo', ARRAY['maquina', 'máquina', 'gelo', 'ice maker', 'EGC', 'compra', 'alugar', 'máquina de gelo'], 'Ótimo! Vamos encontrar a máquina de gelo ideal para você. 🧊', 1, true),
    (NEW.id, 'purificador', 'Purificadores de água', ARRAY['purificador', 'bebedouro', 'filtro', 'agua', 'água', 'purificador de água'], 'Perfeito! Vou te ajudar a escolher o purificador ideal. 💧', 2, true),
    (NEW.id, 'outros', 'Outros assuntos', ARRAY['outros', 'outros assuntos', 'outro assunto'], 'Entendi. Vou te conectar com nossa equipe para te ajudar melhor! 👥', 3, true);

  RETURN NEW;
END;
$function$;
