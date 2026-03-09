
## Plano: Simplificar Gerenciamento de Motivos de Perda

### Contexto
Atualmente, o sistema tem **duas camadas de realtime**:
1. `ManageMotivosModal.tsx` - modal de gerenciamento (linhas 58-81)
2. `useMotivosPerda.ts` - hook usado nos dialogs de perda

Isso cria **overhead desnecessário** com múltiplas conexões Realtime abertas.

---

### Abordagem Híbrida (Recomendada)

**Modal de Gerenciamento (`ManageMotivosModal`)**
- ❌ **REMOVER** subscripção realtime
- ✅ **MANTER** refetch manual após cada ação (já implementado)
- Comportamento: Salvar → Atualizar lista localmente

**Hook de Consumo (`useMotivosPerda`)**
- ✅ **MANTER** subscripção realtime
- Usado em: `CrmFunil.tsx` (drag-to-lost) e `LeadDrawer.tsx` (botão perdido)
- Comportamento: Recebe atualizações instantâneas quando admin edita motivos

---

### Benefícios

1. **Menos conexões Realtime** (-1 por usuário admin gerenciando motivos)
2. **Dados sempre frescos** nos dialogs de perda (via `useMotivosPerda`)
3. **UX consistente** com outros modais de gerenciamento do sistema
4. **Menor custo** de infraestrutura Supabase

---

### Mudança Técnica

**Arquivo:** `src/components/crm/ManageMotivosModal.tsx`

**Remover linhas 58-81:**
```typescript
// Realtime subscription
useEffect(() => {
  if (!isOpen) return;
  const channel = supabase
    .channel(`manage_motivos_perda_${empresaId}`)
    .on('postgres_changes', {...})
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [isOpen, empresaId, fetchMotivos]);
```

**Resultado:** Apenas 1 `useEffect` que faz fetch ao abrir o modal (linha 54-56).

---

### Fluxo de Dados Após Mudança

```text
Admin abre "Gerenciar motivos"
  → fetchMotivos() carrega lista
  
Admin edita "Preço alto"
  → handleSave() → UPDATE no DB
  → fetchMotivos() recarrega lista localmente
  
Vendedor abre dialog "Marcar como perdido"
  → useMotivosPerda hook conecta Realtime
  → Lista atualizada instantaneamente ✓
```

---

### Critério de Aceite

1. Modal de gerenciamento: salvar/deletar atualiza lista imediatamente (local)
2. Dialog de perda: recebe mudanças em realtime de outros usuários
3. Apenas 1 canal Realtime ativo por usuário usando dialogs de perda
