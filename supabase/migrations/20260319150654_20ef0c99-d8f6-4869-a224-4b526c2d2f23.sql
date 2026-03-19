
-- No purificador FAQs yet, just re-invoking will create duplicates for the first two types.
-- Delete existing records so we can re-run cleanly, OR just manually process purificador.
-- Let's just delete and re-run to be clean.
DELETE FROM faq_empresa WHERE empresa_id = 25;
DELETE FROM documents WHERE id_empresa = 25;
