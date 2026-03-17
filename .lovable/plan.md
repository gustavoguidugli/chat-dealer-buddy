

## Diagnóstico e Plano de Correção: Espelhamento de Leads no CRM

---

### BLOCO 1 — Diagnóstico do problema

**O que está acontecendo:** Quando um usuário altera o interesse de um lead pelo card no Kanban, o lead é movido de funil **duas vezes** — uma pelo frontend e outra pelo trigger do banco. Isso causa uma condição de corrida onde o estado intermediário é capturado pelo Realtime e renderizado como se fossem dois leads.

**Hipótese principal: Double-move (frontend + trigger)**

O fluxo em `LeadCardComponent.handleInteresseChange` (linha 87-165) executa:
1. Atualiza `campos_extras` no `leads_crm` (com o interesse)
2. Atualiza `contatos_geral.interesse` (linha 126)
3. Move o lead para o funil correto via UPDATE direto em `leads_crm` (linhas 148-152)

Porém, o passo 2 dispara o trigger `trigger_mover_lead_interesse` (na tabela `contatos_geral`), que executa `mover_lead_por_interesse()` — que **também** faz UPDATE no `leads_crm` para mover o lead.

Resultado: dois UPDATEs concorrentes no `leads_crm`, gerando dois eventos Realtime. O `useFunilRealtime` processa ambos, e durante o intervalo entre eles o lead pode aparecer em dois funis/etapas.

**Hipóteses secundárias:**
- O Realtime captura o primeiro UPDATE (campos_extras) antes do segundo (move), fazendo o lead "piscar" na etapa antiga
- Se o frontend move primeiro e o trigger move depois, eles competem e o estado pode oscilar

---

### BLOCO 2 — Mapeamento do fluxo atual (AS-IS)

```text
Usuário clica "Definir interesse" no card Kanban
  │
  ├─ 1. Frontend: UPDATE leads_crm SET campos_extras = {interesse: X}
  │     → Realtime: evento UPDATE (lead ainda no funil antigo)
  │
  ├─ 2. Frontend: UPDATE contatos_geral SET interesse = X
  │     → Trigger DB: mover_lead_por_interesse()
  │       → UPDATE leads_crm SET id_funil, id_etapa_atual (move o lead)
  │       → Realtime: evento UPDATE (lead agora no funil novo)
  │
  └─ 3. Frontend: UPDATE leads_crm SET id_funil, id_etapa_atual (move o lead DE NOVO)
        → Realtime: evento UPDATE (mesmo resultado, mas gera um 3º evento)
```

O `useFunilRealtime` no handler de UPDATE (linha 99-123):
- Remove o lead de todas as listas
- Se `id_funil !== funilId`, não re-adiciona → lead "desaparece" do funil atual
- Mas o funil de **destino** recebe o INSERT via Realtime e adiciona

O problema de "espelhamento" ocorre porque:
- O evento 1 mantém o lead no funil original (apenas campos_extras mudou)
- O evento 2 (trigger) move para o novo funil
- O evento 3 (frontend) tenta mover novamente

Entre os eventos 1 e 2, o lead é renderizado no funil antigo. O funil novo recebe via evento 2. O funil antigo pode não processar a remoção a tempo.

**Propriedades:** As propriedades padrão (cidade, tipo_uso, consumo_mensal, etc.) estão misturadas entre `campos_extras` (JSONB), tabelas SDR e `contatos_geral`. Não há separação clara entre propriedades globais obrigatórias e customizadas por empresa.

---

### BLOCO 3 — Estado correto esperado (TO-BE)

1. **Um lead = um estado ativo por vez.** Coluna `ativo=true` + `status='aberto'` + `id_funil` + `id_etapa_atual` define univocamente onde o lead está.

2. **Movimentação por interesse deve acontecer em UM único lugar** — ou o frontend move, ou o trigger move. Nunca ambos.

3. **Ao mudar interesse:**
   - Frontend atualiza `contatos_geral.interesse` (para sincronizar com o chatbot/SDR)
   - Trigger `mover_lead_por_interesse` faz o move no `leads_crm`
   - Frontend **não** faz UPDATE adicional em `id_funil`/`id_etapa_atual`
   - O Realtime propaga a mudança e o board atualiza naturalmente

4. **Propriedades padrão** devem ser campos explícitos em `leads_crm` ou um schema fixo dentro de `campos_extras`, não dependendo de tabelas SDR para dados essenciais.

---

### BLOCO 4 — Plano de correção em etapas

**Etapa 1: Eliminar o double-move no frontend**

- **Objetivo:** Remover a lógica de move duplicada do frontend, delegando ao trigger
- **Arquivos:** `src/components/crm/LeadCardComponent.tsx` (linhas 132-155), `src/components/crm/LeadDrawer.tsx` (lógica equivalente de interesse)
- **Mudança:** Remover o bloco "4. Move to matching funnel" do `handleInteresseChange`. O trigger `mover_lead_por_interesse` já faz isso quando `contatos_geral.interesse` é atualizado.
- **Risco:** Baixo. O trigger já funciona corretamente e é a fonte de verdade.
- **Validação:** Alterar interesse de um lead no card → lead aparece apenas no funil destino, sem piscar no funil de origem.

**Etapa 2: Garantir ordem correta das operações no frontend**

- **Objetivo:** Garantir que `campos_extras` e `contatos_geral` são atualizados na ordem certa
- **Arquivos:** `LeadCardComponent.tsx`, `LeadDrawer.tsx`
- **Mudança:** Primeiro atualizar `contatos_geral.interesse` (dispara o trigger que move o lead), depois atualizar `campos_extras` (que é meramente informativo). Ou melhor: atualizar `contatos_geral` e deixar o trigger sincronizar `campos_extras` via `sync_contato_sdr_to_lead_crm`.
- **Risco:** Baixo.
- **Validação:** Verificar que apenas 1 evento Realtime de mudança de funil é gerado.

**Etapa 3: Verificar e corrigir a lógica de renderização no board**

- **Objetivo:** Garantir que o `useFunilRealtime` lida corretamente com o lead saindo do funil
- **Arquivos:** `src/hooks/useFunilRealtime.ts`
- **Mudança:** No handler de UPDATE, quando `newData.id_funil !== funilId`, o lead já é removido (linha 107). Isso está correto. Apenas validar que não há re-adição indevida.
- **Risco:** Nenhum — é validação.
- **Validação:** Log temporário para confirmar que o lead é removido uma única vez.

**Etapa 4: Padronizar propriedades obrigatórias**

- **Objetivo:** Definir um schema fixo de propriedades padrão que toda empresa/lead deve ter
- **Arquivos:** `campos_customizados` (tabela), `LeadDrawer.tsx`, `NovoNegocioModal.tsx`
- **Mudança:** Criar campos_customizados padrão no trigger `a_criar_funis_padrao` para toda nova empresa. No frontend, sempre renderizar esses campos independentemente da configuração.
- **Risco:** Médio — afeta empresas existentes que podem não ter os campos.
- **Validação:** Nova empresa criada deve ter campos obrigatórios visíveis no drawer do lead.

**Etapa 5: Testes e validação**

- **Objetivo:** Confirmar que o espelhamento foi eliminado
- **Validação:**
  - Lead na triagem → escolher interesse → lead sai da triagem e aparece APENAS no funil correto
  - Mudar interesse novamente → lead move para o novo funil, sem duplicata
  - Verificar no banco: `SELECT count(*) FROM leads_crm WHERE whatsapp = X AND ativo = true` deve retornar 1

---

### BLOCO 5 — Regras de aceite

1. Lead sem interesse definido aparece apenas na etapa inicial do funil de triagem
2. Após escolher interesse, o lead **desaparece** do funil de triagem e aparece **apenas** no funil vinculado ao interesse
3. Lead não pode aparecer simultaneamente em dois funis/etapas com `status='aberto'` e `ativo=true`
4. Mudança de interesse move o **mesmo** lead (mesmo `id`), sem criar registro novo
5. No banco: `SELECT count(*) FROM leads_crm WHERE whatsapp = ? AND id_empresa = ? AND ativo = true` sempre retorna ≤ 1
6. O fluxo gera no máximo 1 evento Realtime de mudança de `id_funil` por operação de interesse

---

### BLOCO 6 — Recomendação de implementação

**Recomendo: Correção mínima (Etapas 1-3)**

Justificativa:
- A causa raiz é **clara e localizada**: o frontend faz um move que o trigger já faz. Basta remover as linhas 132-155 do `LeadCardComponent.tsx` e a lógica equivalente no `LeadDrawer.tsx`.
- O trigger `mover_lead_por_interesse` já funciona corretamente — não precisa ser alterado.
- O `useFunilRealtime` já trata corretamente leads que saem do funil (remove quando `id_funil !== funilId`).
- A padronização de propriedades (Etapa 4) é uma melhoria separada e pode ser feita depois sem risco.

**Esforço estimado:** Remover ~25 linhas de código em 2 arquivos. Risco muito baixo. Resolução imediata do espelhamento.

