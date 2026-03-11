
# Diagnóstico do CRM Realtime — Resultado da Auditoria

## Status Atual dos Channels

Todos os hooks de realtime foram auditados. Aqui está o resultado:

| Hook / Arquivo | Tabela | Filtro | Status |
|---|---|---|---|
| `useFunilRealtime` | `leads_crm` | `id_empresa=eq.${empresaId}` | OK |
| `useFunilRealtime` | `atividades` | `id_empresa=eq.${empresaId}` | OK |
| `useFunilRealtime` | **`lead_etiquetas`** | **NENHUM** | **QUEBRADO** |
| `useLeadRealtime` | `leads_crm` | `id=eq.${leadId}` | OK |
| `useLeadRealtime` | `anotacoes_lead` | `id_empresa=eq.${empresaId}` | OK |
| `useLeadRealtime` | `atividades` | `id_empresa=eq.${empresaId}` | OK |
| `useLeadRealtime` | `historico_lead` | `id_empresa=eq.${empresaId}` | OK |
| `useLeadRealtime` | `contatos_geral` | `empresa_id=eq.${empresaId}` | OK |
| `useLeadRealtime` | `contatos_sdr_maquinagelo` | `id_empresa=eq.${empresaId}` | OK |
| `useLeadRealtime` | `contatos_sdr_purificador` | `id_empresa=eq.${empresaId}` | OK |
| `useLeadRealtime` | `anexos_anotacao` | `id_empresa=eq.${empresaId}` | OK |
| `useAtividadesRealtime` | `atividades` | `id_empresa=eq.${empresaId}` | OK |
| `ActivityIconBar` | `icones_atividades` | `id_empresa=eq.${empresaId}` | OK |
| `useMotivosPerda` | `motivos_perda` | `empresa_id=eq.${empresaId}` | OK |

## Problema Encontrado

A tabela `lead_etiquetas` **não possui coluna `id_empresa`** — sua RLS usa um subquery via `leads_crm.id_empresa`. O Supabase Realtime exige filtro direto em coluna da própria tabela, então o channel atual (sem filtro) nunca entrega eventos.

**Impacto**: quando um usuário adiciona/remove etiquetas de um lead no Kanban, as bolinhas coloridas no card não atualizam em tempo real para outros usuários.

## Solução Proposta

1. **Migração SQL**: adicionar coluna `id_empresa` à tabela `lead_etiquetas` e preenchê-la a partir de `leads_crm`
2. **Atualizar RLS**: adicionar/ajustar policy para usar a coluna direta
3. **Atualizar `useFunilRealtime.ts`**: adicionar `filter: id_empresa=eq.${empresaId}` ao channel de `lead_etiquetas`
4. **Atualizar inserts**: garantir que ao inserir em `lead_etiquetas`, o `id_empresa` seja incluído

### Detalhes técnicos

**Migração:**
```sql
ALTER TABLE lead_etiquetas ADD COLUMN id_empresa bigint;
UPDATE lead_etiquetas SET id_empresa = (SELECT id_empresa FROM leads_crm WHERE leads_crm.id = lead_etiquetas.id_lead);
ALTER TABLE lead_etiquetas ALTER COLUMN id_empresa SET NOT NULL;
```

**Hook (`useFunilRealtime.ts`):**
```typescript
// Antes (quebrado)
.on('postgres_changes', { event: '*', schema: 'public', table: 'lead_etiquetas' }, ...)

// Depois (correto)
.on('postgres_changes', { event: '*', schema: 'public', table: 'lead_etiquetas', filter: `id_empresa=eq.${empresaId}` }, ...)
```

**Arquivos a editar:**
- Migração SQL (nova)
- `src/hooks/useFunilRealtime.ts`
- `src/components/crm/EtiquetaSelector.tsx` (incluir `id_empresa` nos inserts)

Todos os demais channels do CRM estão funcionando corretamente com os filtros de empresa.
