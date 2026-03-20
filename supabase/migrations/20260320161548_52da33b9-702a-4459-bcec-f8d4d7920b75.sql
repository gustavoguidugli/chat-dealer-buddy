
CREATE OR REPLACE FUNCTION public.delete_empresa_completa(p_empresa_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. anexos_anotacao (FK -> anotacoes_lead)
  DELETE FROM anexos_anotacao WHERE id_empresa = p_empresa_id;

  -- 2. atividade_participantes (FK -> atividades)
  DELETE FROM atividade_participantes WHERE id_atividade IN (
    SELECT id FROM atividades WHERE id_empresa = p_empresa_id
  );

  -- 3. lead_etiquetas (FK -> leads_crm, etiquetas_card)
  DELETE FROM lead_etiquetas WHERE id_empresa = p_empresa_id;

  -- 4. anotacoes_lead (FK -> leads_crm)
  DELETE FROM anotacoes_lead WHERE id_empresa = p_empresa_id;

  -- 5. historico_lead (FK -> leads_crm, etapas_funil)
  DELETE FROM historico_lead WHERE id_empresa = p_empresa_id;

  -- 6. atividades (FK -> leads_crm)
  DELETE FROM atividades WHERE id_empresa = p_empresa_id;

  -- 7. conversas_whatsapp (FK -> leads_crm)
  DELETE FROM conversas_whatsapp WHERE id_empresa = p_empresa_id;

  -- 8. leads_crm
  DELETE FROM leads_crm WHERE id_empresa = p_empresa_id;

  -- 9. etiquetas_card
  DELETE FROM etiquetas_card WHERE id_empresa = p_empresa_id;

  -- 10. motivos_perda
  DELETE FROM motivos_perda WHERE id_empresa = p_empresa_id;

  -- 11. icones_atividades
  DELETE FROM icones_atividades WHERE id_empresa = p_empresa_id;

  -- 12. campos_customizados (FK -> funis)
  DELETE FROM campos_customizados WHERE id_empresa = p_empresa_id;

  -- 13. etapas_funil (FK -> funis)
  DELETE FROM etapas_funil WHERE id_funil IN (
    SELECT id FROM funis WHERE id_empresa = p_empresa_id
  );

  -- 14. funis
  DELETE FROM funis WHERE id_empresa = p_empresa_id;

  -- 15. lista_interesses
  DELETE FROM lista_interesses WHERE id_empresa = p_empresa_id;

  -- 16. faq_labels (FK -> faqs)
  DELETE FROM faq_labels WHERE faq_id IN (
    SELECT id FROM faqs WHERE id_empresa = p_empresa_id
  );

  -- 17. faqs
  DELETE FROM faqs WHERE id_empresa = p_empresa_id;

  -- 18. document_labels (FK -> documents)
  DELETE FROM document_labels WHERE document_id IN (
    SELECT id FROM documents WHERE id_empresa = p_empresa_id
  );

  -- 19. documents
  DELETE FROM documents WHERE id_empresa = p_empresa_id;

  -- 20. contatos_geral
  DELETE FROM contatos_geral WHERE empresa_id = p_empresa_id;

  -- 21. buffer_supabase
  DELETE FROM buffer_supabase WHERE id_empresa = p_empresa_id;

  -- 22. convites
  DELETE FROM convites WHERE empresa_id = p_empresa_id;

  -- 23. user_empresa
  DELETE FROM user_empresa WHERE empresa_id = p_empresa_id;

  -- 24. config_empresas_geral
  DELETE FROM config_empresas_geral WHERE id_empresa = p_empresa_id;

  -- 25. faq_empresa
  DELETE FROM faq_empresa WHERE empresa_id = p_empresa_id;

  -- 26. empresas_geral (final)
  DELETE FROM empresas_geral WHERE id = p_empresa_id;
END;
$$;
