

# Plano: Corrigir Fallback SDR e Alinhamento de Chaves

## Mudança 1: Fallback SDR per-field

**Arquivo**: `src/hooks/useLeadRealtime.ts`, linha 90

**Atual**:
```typescript
const hasMissingSdrData = !dados.cidade && !dados.tipo_uso && !dados.consumo_mensal && !dados.gasto_mensal && !dados.dias_semana
```

**Novo**:
```typescript
const needsSdrFallback = !dados.cidade || !dados.tipo_uso || dados.consumo_mensal == null || dados.gasto_mensal == null || dados.dias_semana == null
```

E substituir `if (hasMissingSdrData)` por `if (needsSdrFallback)`. O merge campo-a-campo já existente (`dados.x = dados.x || sdr.x`) garante que campos já preenchidos não são sobrescritos.

## Mudança 2: Alinhar chave de escrita em handleSaveField

**Arquivo**: `src/components/crm/LeadDrawer.tsx`, linha 705

**Atual**:
```typescript
const handleSaveField = async (slug: string) => {
    if (!lead) return;
    const newExtras = { ...(lead.campos_extras || {}), [slug]: editingValue };
```

**Novo**:
```typescript
const handleSaveField = async (keyOrSlug: string) => {
    if (!lead) return;
    const newExtras = { ...(lead.campos_extras || {}), [keyOrSlug]: editingValue };
```

A função já recebe `storageKey` nas chamadas (linhas 1388, 1399). O parâmetro `slug` na assinatura é enganoso, mas a lógica funciona porque `storageKey` já é passado como argumento. A variável `slug` na linha 714 (`sdrFields.includes(slug)`) também precisa usar o mesmo valor para que o sync SDR funcione com a chave correta.

Verificar se `sdrFields` inclui as chaves corretas (`tipo_uso`, não `tipo_de_uso`) — já inclui na linha 714.

## Escopo total

- 1 linha alterada em `useLeadRealtime.ts` (AND → OR)
- Renomear parâmetro em `handleSaveField` para clareza (sem mudança funcional, já recebe storageKey)

## Risco

Mínimo. O merge campo-a-campo já protege contra sobrescrita. A mudança apenas amplia quando o fallback SDR é consultado.

