

# Bug 1 Fix: Políticas RLS conflitantes em `lead_etiquetas`

## Problema

A tabela `lead_etiquetas` possui **5 políticas RLS** simultâneas:
- 1 policy `ALL` (`isolamento_via_lead`) — usa subquery pesado via `leads_crm`
- 4 policies per-command (SELECT, INSERT, UPDATE, DELETE) — usam `id_empresa` direto

No PostgreSQL, políticas PERMISSIVE do mesmo comando são combinadas com **OR**. Isso significa que para INSERT, tanto a policy ALL quanto a policy INSERT são avaliadas. A policy ALL tem um WITH CHECK que exige que `id_lead` E `id_etiqueta` pertençam à empresa, enquanto a per-command INSERT só exige `id_empresa`. Como são OR, basta passar em **uma** delas — o que enfraquece a validação da policy ALL.

Além disso, a policy ALL causa um subquery desnecessário em `leads_crm` para cada operação, degradando performance.

## Correção

Remover a policy `isolamento_via_lead` (ALL) e manter apenas as 4 per-command, que usam a coluna `id_empresa` diretamente — mais eficiente e sem conflito lógico.

## Alteração

**1 nova migration SQL:**
```sql
DROP POLICY IF EXISTS "isolamento_via_lead" ON public.lead_etiquetas;
```

Nenhuma mudança no frontend.

