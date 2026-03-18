
-- Backfill campos_extras for lead 106
UPDATE leads_crm SET
  campos_extras = COALESCE(campos_extras, '{}'::jsonb) || jsonb_build_object(
    'cidade', 'sao paulo', 'tipo_uso', 'comercial', 'consumo_mensal', 4000,
    'gasto_mensal', 5600, 'dias_semana', 7, 'interesse', 'maquina_gelo'),
  updated_at = NOW()
WHERE id = 106;

-- Backfill campos_extras for lead 126
UPDATE leads_crm SET
  campos_extras = COALESCE(campos_extras, '{}'::jsonb) || jsonb_build_object(
    'cidade', 'Londrina', 'tipo_uso', 'comercial', 'consumo_mensal', 1000,
    'gasto_mensal', 1400, 'dias_semana', 5, 'interesse', 'maquina_gelo'),
  updated_at = NOW()
WHERE id = 126;
