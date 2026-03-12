

# Auditoria Completa: Sistema de Interesses por Empresa

---

## BLOCO 1 — Diagnostico Atual

### O que funciona
- **Isolamento por empresa na tabela `lista_interesses`**: RLS correto com `empresa_id`, dados filtrados por empresa
- **CRUD de interesses na tela Triagem**: Criar, editar, reordenar e deletar interesses por empresa funciona
- **Seletor de interesse no Drawer e no Card**: Ambos carregam interesses da empresa correta via `lista_interesses.empresa_id`
- **Sincronizacao com `contatos_geral`**: Ao alterar interesse, sincroniza o campo `interesse` no contato global
- **Historico de alteracoes**: Registra mudancas de interesse no `historico_lead`

### O que NAO funciona / esta parcial

1. **Nao existe relacao explicita `interesse -> funil`**
   - A tabela `lista_interesses` NAO tem coluna `funil_id` ou equivalente
   - O mapeamento interesse->funil e feito por **convencao de nome**: `funis.tipo = interesse.nome`
   - Isso significa que para um interesse funcionar, o campo `nome` do interesse DEVE coincidir exatamente com o campo `tipo` do funil
   - Se a empresa criar um interesse `assistencia_tecnica` mas nao existir um funil com `tipo = 'assistencia_tecnica'`, o lead simplesmente nao sera movido (falha silenciosa)

2. **`funis.tipo` depende de `funil_tipos` (tabela de referencia read-only)**
   - A tabela `funil_tipos` so tem: `triagem`, `maquina_gelo`, `purificador`, `outros`, `custom`
   - Para criar um funil com `tipo = 'assistencia_tecnica'`, o tipo precisa existir em `funil_tipos` primeiro
   - Usuarios NAO podem adicionar novos `funil_tipos` (sem INSERT policy)
   - **Resultado**: novos interesses criados pela empresa NAO conseguem ser mapeados para funis, pois o tipo correspondente nao existe

3. **Trigger `sync_contato_sdr_to_lead_crm` tem logica hardcoded**
   - Verifica `TG_TABLE_NAME = 'contatos_sdr_maquinagelo'` e `'contatos_sdr_purificador'` diretamente
   - Faixas de etiqueta (Quente/Morno/Frio) baseadas em `gasto_mensal` hardcoded no trigger original (>=2000, >=800) vs o trigger mais recente que usa `consumo_mensal` (<=800, <=1200, >1200)
   - **Dois triggers com logica conflitante**: `sync_contato_sdr_to_lead_crm` usa `gasto_mensal` e `trigger_etiqueta_consumo_mensal` usa `consumo_mensal`

4. **Trigger `inserir_interesses_padrao` cria interesses fixos**
   - Ao criar empresa, insere `maquina_gelo`, `purificador`, `outros` sempre
   - Nao e configuravel e assume que todas as empresas vendem esses produtos

### O que esta hardcoded

| Local | Valor fixo | Impacto |
|-------|-----------|---------|
| `Triagem.tsx` / `InterestModal.tsx` | `DEFAULT_NAMES = ['maquina_gelo', 'purificador', 'outros']` | Impede renomear/deletar esses interesses na UI |
| `GerenciarFaqs.tsx` | Tabs fixas `maquina_gelo` / `purificador` | FAQs limitadas a esses dois tipos |
| `useLeadRealtime.ts` | `sdrMaq ? 'maquina_gelo' : sdrPur ? 'purificador'` | Inferencia de interesse hardcoded |
| `sync_contato_sdr_to_lead_crm` | `TG_TABLE_NAME = 'contatos_sdr_maquinagelo'` | Logica de sync limitada a 2 tabelas SDR |
| `funil_tipos` | Apenas 5 tipos fixos | Novos interesses nao conseguem criar funis correspondentes |
| Trigger de etiquetas | Duas logicas diferentes (gasto vs consumo) | Inconsistencia nos criterios |

### Maiores riscos
1. **Interesse criado sem funil correspondente**: Lead nao e roteado, fica "perdido" na triagem
2. **Conflito de triggers de etiqueta**: Dois triggers com criterios diferentes atuando sobre a mesma tabela
3. **Escalabilidade bloqueada**: `funil_tipos` read-only impede novas empresas de configurar interesses diferentes

---

## BLOCO 2 — Estrutura Ideal

### Arquitetura correta

```text
lista_interesses
├── id (uuid)
├── empresa_id (bigint)     ← isolamento multiempresa
├── nome (text)             ← identificador snake_case
├── label (text)            ← nome exibido
├── funil_id (bigint) [NEW] ← FK para funis.id (relacao direta)
├── palavras_chave (text[])
├── mensagem_resposta (text)
├── ordem (int)
└── ativo (bool)

funis
├── id (bigint)
├── id_empresa (bigint)
├── nome (text)
├── tipo (text)             ← pode ser 'custom' para todos
└── ...
```

**Principio**: O mapeamento `interesse -> funil` deve ser uma FK direta (`lista_interesses.funil_id -> funis.id`), NAO uma convencao de nome.

**Frontend**: Ao alterar interesse de um lead, buscar `lista_interesses.funil_id` para determinar o funil destino, em vez de fazer `.eq('tipo', val)`.

**Triggers/Backend**: O mesmo principio se aplica — ao mover lead por interesse, usar o `funil_id` da tabela `lista_interesses`.

---

## BLOCO 3 — Ajustes Necessarios

### Banco de dados
1. **Adicionar coluna `funil_id` em `lista_interesses`** (nullable inicialmente, FK para `funis.id`)
2. **Migrar dados existentes**: Para cada interesse existente, popular `funil_id` buscando `funis` onde `tipo = interesse.nome AND id_empresa = interesse.empresa_id`
3. **Remover trigger conflitante de etiqueta**: Unificar a logica de `consumo_mensal` num unico trigger com as faixas corretas (0-800 Frio, 801-1200 Morno, 1201+ Quente)

### Backend (triggers/RPCs)
1. **Atualizar logica de roteamento no frontend** para usar `lista_interesses.funil_id` em vez de `funis.tipo = interesse.nome`
2. Manter trigger `sync_contato_sdr_to_lead_crm` como esta (hardcoded mas funcional para as tabelas SDR existentes — isso e uma limitacao de schema, nao de interesses)

### Frontend
1. **Remover `DEFAULT_NAMES` hardcoded** de `Triagem.tsx` e `InterestModal.tsx`
2. **Adicionar campo "Funil destino"** no `InterestModal` para associar cada interesse a um funil
3. **Atualizar `handleInteresseChange`** no `LeadDrawer.tsx` e `LeadCardComponent.tsx` para buscar `funil_id` do interesse selecionado via `lista_interesses`, em vez de buscar funil por tipo
4. **Atualizar `useLeadRealtime.ts`** para remover inferencia hardcoded de interesse

### Validacoes
1. Impedir criar interesse sem `funil_id` associado
2. Impedir deletar funil que tem interesses vinculados (ou alertar)
3. Validar que o funil pertence a mesma empresa do interesse

---

## BLOCO 4 — Casos de Teste

| # | Cenario | Resultado esperado |
|---|---------|-------------------|
| 1 | Empresa A cria interesse "assistencia_tecnica" associado ao funil "Assistencia" | Interesse salvo com `funil_id` correto |
| 2 | Lead da Empresa A muda interesse para "assistencia_tecnica" | Lead movido para funil "Assistencia", primeira etapa |
| 3 | Empresa B NAO ve interesses da Empresa A | Lista de interesses vazia ou apenas os da Empresa B |
| 4 | Criar interesse sem funil associado | Erro de validacao impede a criacao |
| 5 | Deletar interesse que tem leads usando-o | Sistema permite, mas lead mantem interesse anterior |
| 6 | Alterar interesse no Card Kanban | Mesmo comportamento que no Drawer — roteamento correto |
| 7 | Lead automatico via WhatsApp | Criado na triagem, ao receber interesse via bot, movido para funil correto |
| 8 | Empresa com interesses customizados nao-padrao | Sistema funciona sem depender de `DEFAULT_NAMES` |

---

## BLOCO 5 — Execucao

### Falhas estruturais encontradas e correcoes propostas

**1. Adicionar `funil_id` na `lista_interesses` + migracao de dados**
- SQL migration: `ALTER TABLE lista_interesses ADD COLUMN funil_id bigint REFERENCES funis(id)`
- Update migration para popular dados existentes baseado no match `funis.tipo = lista_interesses.nome`

**2. Atualizar `InterestModal.tsx`**
- Adicionar Select de funil destino
- Tornar obrigatorio
- Salvar `funil_id` junto com os outros campos

**3. Atualizar roteamento no `LeadDrawer.tsx` e `LeadCardComponent.tsx`**
- Em vez de: `supabase.from('funis').select('id').eq('tipo', val)`
- Usar: `supabase.from('lista_interesses').select('funil_id').eq('nome', val).eq('empresa_id', ...)`

**4. Remover `DEFAULT_NAMES` hardcoded**
- Substituir por flag `is_default` na tabela ou simplesmente remover a restricao (qualquer interesse pode ser editado/deletado)

**5. Unificar triggers de etiqueta**
- Manter apenas o trigger baseado em `consumo_mensal` com as faixas: 0-800 Frio, 801-1200 Morno, 1201+ Quente

### Ordem de execucao
1. Migration de banco (adicionar `funil_id`, popular dados, unificar triggers)
2. Atualizar `InterestModal.tsx` (campo funil)
3. Atualizar `Triagem.tsx` (remover DEFAULT_NAMES)
4. Atualizar `LeadCardComponent.tsx` e `LeadDrawer.tsx` (roteamento via `funil_id`)
5. Atualizar `useLeadRealtime.ts` (remover inferencia hardcoded)

