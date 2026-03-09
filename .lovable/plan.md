

## Plano: Sistema de Motivos de Perda Padronizados

### Contexto Atual
- O modal de "Marcar como perdido" usa um `Textarea` livre em dois lugares:
  - `CrmFunil.tsx` (drag-to-lost)
  - `LeadDrawer.tsx` (botão "Perdido")
- O campo `motivo_perda` é salvo como texto em `leads_crm`

### Mudanças Necessárias

---

### 1. Banco de Dados

**Nova tabela: `motivos_perda`**
```sql
CREATE TABLE motivos_perda (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  empresa_id BIGINT NOT NULL REFERENCES empresas_geral(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE motivos_perda ENABLE ROW LEVEL SECURITY;

-- Policy: usuários da empresa podem ler
CREATE POLICY "users_select_motivos_perda" ON motivos_perda
  FOR SELECT USING (empresa_id IN (
    SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid()
  ));

-- Policy: usuários da empresa podem gerenciar
CREATE POLICY "users_manage_motivos_perda" ON motivos_perda
  FOR ALL USING (empresa_id IN (
    SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid()
  ));

-- Policy: admins podem tudo
CREATE POLICY "admins_all_motivos_perda" ON motivos_perda
  FOR ALL USING (is_admin(auth.uid()));
```

**Semear motivos padrão** (ao criar empresa ou manualmente):
- "Preço acima do orçamento"
- "Optou pela concorrência"
- "Sem resposta / Sumiu"
- "Não tinha perfil"
- "Desistiu da compra"

---

### 2. Componente: `ManageMotivosModal`

Criar `src/components/crm/ManageMotivosModal.tsx` seguindo o padrão de `ManageLabelsModal`:
- Lista de motivos existentes com drag-to-reorder (GripVertical)
- Botão "+ Novo Motivo"
- Formulário inline: nome + descrição (opcional)
- Editar/Excluir cada motivo
- Subscripção realtime na tabela `motivos_perda`

---

### 3. Hook: `useMotivosPerda`

Criar `src/hooks/useMotivosPerda.ts`:
- Buscar motivos ativos da empresa
- Subscripção realtime (INSERT/UPDATE/DELETE)
- Retornar `{ motivos, loading, refetch }`

---

### 4. Atualizar Modal de Perda

**Substituir Textarea por lista de checkboxes:**

Em `CrmFunil.tsx` e `LeadDrawer.tsx`:
- Estado: `motivosSelecionados: number[]` (IDs)
- Renderizar badges/chips clicáveis para cada motivo
- Permitir múltipla seleção
- Ao confirmar: salvar `motivo_perda` como texto concatenado (ex: "Preço acima do orçamento, Sem resposta")
- Botão "Gerenciar motivos" para abrir `ManageMotivosModal`

```text
┌────────────────────────────────────────┐
│  Marcar como perdido?                  │
│  Selecione o(s) motivo(s) da perda     │
├────────────────────────────────────────┤
│  ☑ Preço acima do orçamento           │
│  ☐ Optou pela concorrência            │
│  ☑ Sem resposta / Sumiu               │
│  ☐ Não tinha perfil                   │
│  ☐ Desistiu da compra                 │
│                                        │
│  [⚙ Gerenciar motivos]                │
├────────────────────────────────────────┤
│         [Cancelar]  [Confirmar]        │
└────────────────────────────────────────┘
```

---

### 5. Realtime

- `useMotivosPerda` escuta `motivos_perda` com filtro `empresa_id`
- Ao adicionar/editar/excluir motivo, todos os usuários da empresa veem instantaneamente

---

### Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `motivos_perda` + RLS |
| `src/hooks/useMotivosPerda.ts` | **Criar** - hook com realtime |
| `src/components/crm/ManageMotivosModal.tsx` | **Criar** - CRUD de motivos |
| `src/pages/CrmFunil.tsx` | **Editar** - substituir Textarea por checkboxes |
| `src/components/crm/LeadDrawer.tsx` | **Editar** - substituir Textarea por checkboxes |

---

### Critério de Aceite
1. Cada empresa tem seus próprios motivos de perda
2. Admin/usuário pode adicionar, editar, excluir e reordenar motivos
3. Ao marcar lead como perdido, exibe lista de múltipla escolha
4. Mudanças nos motivos aparecem em tempo real para todos
5. O campo `motivo_perda` no lead continua sendo texto (nomes concatenados)

