

# Plano: Identificação visual do lead por nome + telefone clicável para WhatsApp

---

## BLOCO 1 — Diagnóstico do problema

### Estado atual

A coluna `nome` **já existe** na tabela `leads_crm` e é uma propriedade padrão. O trigger `criar_lead_triagem` preenche `nome` com `COALESCE(p_nome, v_nome_lead, p_whatsapp)` — ou seja, faz fallback para o WhatsApp quando não há nome disponível. O modal `NovoNegocioModal` também exige `nome` como campo obrigatório.

**O problema não é estrutural — é de dados de origem.** Quando um contato chega via chatbot sem `nome_lead` nem `whatsapp_padrao_pipedrive`, o trigger usa o próprio número de WhatsApp como nome. Resultado: o campo `nome` na tabela contém o telefone, e toda a UI exibe o telefone como se fosse o nome.

### Onde o telefone aparece como identificação principal

1. **Card Kanban** (`LeadCardComponent.tsx`, linha 215): `{lead.nome}` — exibe o valor que veio do banco, que é o telefone
2. **Drawer cabeçalho** (`LeadDrawer.tsx`, linha 796): `EditableLeadName` — mostra `lead.nome`
3. **Busca global** (`CrmFunil.tsx`, linha 447): `{r.nome}` nos resultados
4. **Avatar** (`LeadCardComponent.tsx`, linha 211): `getInitials(lead.nome)` — gera iniciais do telefone

### Hipótese principal

O telefone aparece como nome porque o trigger define `nome = whatsapp` quando não há nome real. Não é um bug de renderização — é uma decisão de fallback no provisionamento.

### Hipóteses secundárias

- Contatos importados sem nome preenchido (dados legados)
- `contatos_geral.nome_lead` vazio na origem (chatbot não coleta nome)

### Tipo de problema

Combinação de **provisionamento** (trigger fallback) + **renderização** (nenhum componente distingue entre "nome real" e "nome = telefone") + **UX** (telefone no drawer não é clicável para WhatsApp).

---

## BLOCO 2 — Fluxo atual (AS-IS)

```text
CRIAÇÃO DO LEAD (trigger):
  contatos_geral.INSERT → criar_lead_triagem()
    nome = COALESCE(p_nome, contatos_geral.nome_lead, whatsapp_padrao_pipedrive, p_whatsapp)
    → se nenhum nome real existe, nome = número de telefone

CRIAÇÃO DO LEAD (manual):
  NovoNegocioModal → campo "Nome" obrigatório
  → usuário digita o nome manualmente

RENDERIZAÇÃO:
  Card (LeadCardComponent): lead.nome direto, sem fallback
  Drawer (LeadDrawer): EditableLeadName com lead.nome
  Busca (CrmFunil): r.nome direto

TELEFONE NO DRAWER:
  Exibido como texto simples em "Número de telefone"
  NÃO é clicável — não abre WhatsApp
```

---

## BLOCO 3 — Estado esperado (TO-BE)

1. `leads_crm.nome` continua como propriedade padrão — já existe
2. Quando `nome` contém um nome real → exibir como identificação principal
3. Quando `nome` é igual ao WhatsApp (ou está vazio) → exibir o telefone formatado como fallback
4. O telefone no drawer deve ser clicável com link `https://wa.me/{número_normalizado}`
5. O avatar deve gerar iniciais com base no nome real; quando é telefone, usar ícone genérico
6. A lógica deve ser uma função utilitária reutilizável, não duplicada em cada componente

---

## BLOCO 4 — Plano de correção em etapas

### Etapa 1 — Criar função utilitária de resolução de identidade do lead

**Objetivo:** Centralizar a lógica de "qual texto exibir como nome" e "quais iniciais usar".

**Implementação:**
- Criar em `src/lib/lead-utils.ts`:
  - `getLeadDisplayName(nome, whatsapp)` → retorna nome real ou telefone formatado
  - `isPhoneAsName(nome, whatsapp)` → detecta se o nome é na verdade o telefone (comparando dígitos)
  - `getLeadInitials(nome, whatsapp)` → retorna iniciais do nome real, ou fallback como "?" / ícone
  - `buildWhatsAppLink(whatsapp)` → retorna `https://wa.me/55XXXXXXXXX` normalizado

**Risco:** Nenhum — código novo, sem alterar existente.
**Validação:** Testes unitários com cenários: nome real, nome = telefone, nome vazio, telefone null.

### Etapa 2 — Atualizar LeadCardComponent

**Objetivo:** Usar nome real como título, fallback para telefone formatado. Avatar com iniciais corretas.

**Componentes:** `LeadCardComponent.tsx`
- Linha 215: trocar `{lead.nome}` por `{getLeadDisplayName(lead.nome, lead.whatsapp)}`
- Linha 211: trocar `getInitials(lead.nome)` por `getLeadInitials(lead.nome, lead.whatsapp)`

**Risco:** Baixo — apenas visual.
**Validação:** Cards com nome real exibem nome; cards com nome = telefone exibem telefone formatado.

### Etapa 3 — Atualizar LeadDrawer (cabeçalho + telefone clicável)

**Objetivo:** Nome editável no cabeçalho + telefone como link para WhatsApp.

**Componentes:** `LeadDrawer.tsx`
- Cabeçalho (linha 796): `EditableLeadName` já edita `nome` — funciona corretamente
- Telefone (linhas 1037-1044): transformar o texto em link clicável `<a href={buildWhatsAppLink(...)} target="_blank">`
- Adicionar ícone de WhatsApp ao lado do número para indicar que é clicável

**Risco:** Baixo — adição de link, sem alterar lógica existente.
**Validação:** Clicar no telefone abre `wa.me` em nova aba.

### Etapa 4 — Atualizar busca global

**Objetivo:** Resultados da busca exibem nome real ou telefone formatado.

**Componentes:** `CrmFunil.tsx`, linha 447
- Trocar `{r.nome}` por `{getLeadDisplayName(r.nome, r.whatsapp)}`

**Risco:** Nenhum.
**Validação:** Buscar por telefone retorna resultado com display correto.

### Etapa 5 — Validação end-to-end

**Verificações:**
1. Lead com nome real → card mostra nome, drawer mostra nome editável, telefone clicável abaixo
2. Lead com nome = telefone → card mostra telefone formatado, drawer permite editar nome, telefone clicável
3. WhatsApp link funciona com diferentes formatos de número
4. Funciona para todas as empresas (Termall, AquaSampa, etc.)

---

## BLOCO 5 — Critérios de aceite

1. Existe função utilitária centralizada para resolução de identidade do lead
2. Leads com nome real preenchido exibem o nome como identificação principal no card, drawer e busca
3. Leads cujo nome é o próprio telefone continuam exibindo o telefone formatado (sem regressão visual)
4. O telefone no drawer é clicável e abre WhatsApp (`wa.me`)
5. Avatar exibe iniciais do nome real; quando é telefone, exibe fallback visual adequado
6. A lógica é consistente entre empresas e não depende de dados específicos
7. Não há alteração de schema — a coluna `nome` já existe e é usada corretamente

---

## BLOCO 6 — Recomendação final

**Recomendação: Ajuste pontual**

**Justificativa:**
- A coluna `nome` já existe como propriedade padrão em `leads_crm`
- O trigger de provisionamento já tenta preencher com nome real (fallback para telefone é aceitável)
- O problema é exclusivamente de **renderização** e **UX** — nenhuma alteração de schema ou banco é necessária
- A criação de uma função utilitária centraliza a lógica e previne inconsistência futura
- O telefone clicável é uma adição de UX simples com `wa.me`

Não há risco de reincidência porque a lógica de fallback visual será centralizada em uma função reutilizável, independente do valor que vier do banco.

