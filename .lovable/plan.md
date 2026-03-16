

## Arquitetura: Empresa ↔ Funil — Como funciona

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

---

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
  │      (ex: nome='maquina_gelo' → funis.tipo='maquina_gelo')
  │
  └─ Trigger 3: criar_convite_inicial()
```

A ordem é garantida pela **nomenclatura alfabética** dos triggers (`a_criar...` < `inserir...`).

---

### Fluxo: novo contato WhatsApp → lead

```text
INSERT INTO contatos_geral (whatsapp, empresa_id)
  │
  └─ Trigger: trg_criar_lead_apos_contato
       └─ Chama criar_lead_triagem(whatsapp, empresa_id)
            │
            ├─ SELECT id FROM funis WHERE tipo='triagem' AND id_empresa=X
            ├─ SELECT id FROM etapas_funil WHERE id_funil=Y ORDER BY ordem LIMIT 1
            └─ INSERT INTO leads_crm (id_funil=Y, id_etapa_atual=Z)
```

### Fluxo: interesse identificado → mover lead

```text
UPDATE contatos_geral SET interesse = 'maquina_gelo'
  │
  └─ Trigger: mover_lead_por_interesse()
       │
       ├─ SELECT funil_id FROM lista_interesses
       │    WHERE nome='maquina_gelo' AND empresa_id=X
       │    → retorna funil_id (ex: 15)
       │
       ├─ SELECT id FROM etapas_funil
       │    WHERE id_funil=15 ORDER BY ordem LIMIT 1
       │
       └─ UPDATE leads_crm SET id_funil=15, id_etapa_atual=primeira_etapa
```

### Fluxo: copy-company-config (empresa template)

Quando se copia config de uma empresa modelo, a edge function:
1. Copia funis da empresa fonte → cria novos na destino (IDs novos)
2. Monta `funilIdRemap` (ID fonte → ID destino)
3. Copia interesses e remapeia `funil_id` usando o map

---

### Resumo

| Pergunta | Resposta |
|---|---|
| IDs são iguais entre empresa e funil? | Não. São independentes (auto-increment) |
| Como se vinculam? | `funis.id_empresa` = FK para `empresas_geral.id` |
| Como interesse sabe qual funil? | `lista_interesses.funil_id` = FK direto para `funis.id` |
| Como lead entra no CRM? | `criar_lead_triagem` busca funil com `tipo='triagem'` da empresa |
| Como lead muda de funil? | `mover_lead_por_interesse` consulta `lista_interesses.funil_id` |

Não existe nenhum "sync" de IDs — tudo é baseado em foreign keys e lookups por `tipo` + `id_empresa`.

