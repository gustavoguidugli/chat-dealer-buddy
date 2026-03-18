

# Plano: Deduplicação defensiva de campos customizados no LeadDrawer

## Problema
Campos como "Tipo de Uso" e "Dias por semana" podem aparecer duplicados quando existem registros tanto globais (`id_funil = null`) quanto vinculados a um funil específico na tabela `campos_customizados`.

## Mudança necessária

**Arquivo**: `src/components/crm/LeadDrawer.tsx`, linha 417

**Atual**:
```typescript
setCampos((camposRes.data || []) as CampoCustomizado[]);
```

**Novo**:
```typescript
// Deduplicação defensiva: priorizar campo do funil sobre global
const camposRaw = (camposRes.data || []) as CampoCustomizado[];
const camposUnicos = new Map<string, CampoCustomizado>();
const normNome = (n: string) =>
  n.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
for (const c of camposRaw) {
  const key = normNome(c.nome);
  const existing = camposUnicos.get(key);
  if (!existing || (c.id_funil !== null && existing.id_funil === null)) {
    camposUnicos.set(key, c);
  }
}
setCampos(Array.from(camposUnicos.values()));
```

## Lógica
- Normaliza nomes (lowercase, sem acentos) para comparação
- Se dois campos têm o mesmo nome normalizado, mantém o do funil (`id_funil != null`) e descarta o global
- Se ambos são do mesmo escopo, mantém o primeiro encontrado
- Zero impacto em performance (iteração única sobre array pequeno)

## Risco
Mínimo. Apenas filtra duplicatas antes de setar estado. Campos únicos passam inalterados.

