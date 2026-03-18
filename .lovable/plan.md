
## Audit — Block 1 ✅ (Completed)

1. **Trigger `mover_lead_por_interesse()`** — Rewritten to use `lista_interesses.funil_id` dynamically
2. **Trigger `inserir_interesses_padrao()`** — Now associates `funil_id` after inserting defaults
3. **`GerenciarFaqs.tsx`** — Tabs now dynamic from `lista_interesses`
4. **`copy-company-config`** — Now copies and remaps `funil_id`

## Audit — Block 2 ✅ (Completed)

1. **`useLeadRealtime.ts`** — Refactored to use `campos_extras` as primary SDR data source, SDR tables as fallback only. Removed hardcoded `if interesse === 'purificador'` logic.

### Accepted Architectural Limitations (SDR Tables)

The following items are tied to the separate SDR table architecture (`contatos_sdr_maquinagelo` / `contatos_sdr_purificador`). They function correctly for the two existing products but won't automatically support new product types without schema changes:

- `sync_contato_sdr_to_lead_crm()` — Uses `TG_TABLE_NAME` to determine product type
- `update_contato_sdr_field()` — Uses `IF p_interesse = 'purificador'` to route to correct table
- `resetar_lead_completo()` — Deletes from both SDR tables explicitly
- `match_documents_qualificacao/pos_qualificacao/purificador` — Hardcoded `tipo_faq` filters (generic `buscar_faq_similar()` already exists as modular alternative)
- `useLeadRealtime` SDR realtime channels — Subscribe to both fixed SDR tables

**Future fix**: Unify SDR tables into a single `contatos_sdr` table with a `tipo_interesse` column. This requires coordinating with external chatbot/integration systems.

## Audit — Block 3 ✅ (Completed)

### Automação de funis para novas empresas e interesses

1. **Trigger `criar_funis_padrao()`** — Novo trigger `AFTER INSERT ON empresas_geral` que cria automaticamente 4 funis padrão (Triagem, Máquina de Gelo, Purificador, Outros) com suas respectivas etapas. Executa antes de `inserir_interesses_padrao` via nomenclatura alfabética (`a_criar_funis_padrao`).

2. **`copy-company-config`** — Atualizada para copiar `funis` + `etapas_funil` da empresa template antes dos interesses, com remapeamento correto de IDs. Reutiliza funis criados pelo trigger quando o `tipo` já existe no destino.

3. **`Triagem.tsx` + `InterestModal.tsx`** — Criação automática de funil ao adicionar novo interesse sem funil selecionado. O modal agora oferece opção "Criar funil automaticamente" como padrão, com etapas (Novo, Qualificação, Proposta, Fechamento).

---

## Arquitetura: Empresa ↔ Funil

### Modelo de dados

```text
empresas_geral (id)
  └── funis (id_empresa = empresas_geral.id)
        ├── tipo: 'triagem' | 'maquina_gelo' | 'purificador' | 'outros' | 'custom'
        └── etapas_funil (id_funil = funis.id)

  └── lista_interesses (empresa_id = empresas_geral.id)
        └── funil_id → funis.id  (FK direto — mapeia interesse → funil)
```

Os IDs **não são sincronizados** — cada empresa recebe funis com IDs sequenciais independentes (auto-increment). A vinculação é feita por **foreign key** (`funis.id_empresa` e `lista_interesses.funil_id`), nunca por nome ou convenção.

### Fluxo completo: criação de empresa

```text
INSERT INTO empresas_geral (nome = 'Nova Empresa')
  │
  ├─ Trigger 1: a_criar_funis_padrao()
  │    Cria 4 funis com etapas:
  │    ┌──────────────────┬──────────────┬────────────────────────────┐
  │    │ Funil            │ tipo         │ Etapas                     │
  │    ├──────────────────┼──────────────┼────────────────────────────┤
  │    │ Sem interesse    │ triagem      │ Novos, Em atendimento      │
  │    │ Máquina de Gelo  │ maquina_gelo │ Novo, Qualif., Prop., Fech.│
  │    │ Purificador      │ purificador  │ Novo, Qualif., Prop., Fech.│
  │    │ Outros interesses│ outros       │ Novo, Em atendimento       │
  │    └──────────────────┴──────────────┴────────────────────────────┘
  │
  ├─ Trigger 2: inserir_interesses_padrao()
  │    Cria 3 interesses e vincula ao funil pelo tipo:
  │    UPDATE lista_interesses SET funil_id = funis.id
  │      WHERE funis.tipo = lista_interesses.nome
  │
  └─ Trigger 3: criar_convite_inicial()
```

### Fluxo: novo contato WhatsApp → lead

```text
INSERT INTO contatos_geral (whatsapp, empresa_id)
  └─ Trigger: trg_criar_lead_apos_contato
       └─ criar_lead_triagem(whatsapp, empresa_id)
            ├─ SELECT id FROM funis WHERE tipo='triagem' AND id_empresa=X
            ├─ SELECT id FROM etapas_funil WHERE id_funil=Y ORDER BY ordem LIMIT 1
            └─ INSERT INTO leads_crm (id_funil=Y, id_etapa_atual=Z)
```

### Fluxo: interesse identificado → mover lead

```text
UPDATE contatos_geral SET interesse = 'maquina_gelo'
  └─ Trigger: mover_lead_por_interesse()
       ├─ SELECT funil_id FROM lista_interesses WHERE nome='maquina_gelo' AND empresa_id=X
       ├─ SELECT id FROM etapas_funil WHERE id_funil=N ORDER BY ordem LIMIT 1
       └─ UPDATE leads_crm SET id_funil=N, id_etapa_atual=primeira_etapa
```

### Fluxo: copy-company-config (empresa template)

1. Copia funis da empresa fonte → cria novos na destino (IDs novos)
2. Monta `funilIdRemap` (ID fonte → ID destino)
3. Copia interesses e remapeia `funil_id` usando o map

### Resumo

| Pergunta | Resposta |
|---|---|
| IDs são iguais entre empresa e funil? | Não. São independentes (auto-increment) |
| Como se vinculam? | `funis.id_empresa` = FK para `empresas_geral.id` |
| Como interesse sabe qual funil? | `lista_interesses.funil_id` = FK direto para `funis.id` |
| Como lead entra no CRM? | `criar_lead_triagem` busca funil com `tipo='triagem'` da empresa |
| Como lead muda de funil? | `mover_lead_por_interesse` consulta `lista_interesses.funil_id` |
