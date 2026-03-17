

## Plano: Limpeza de leads espelhados + Ícone de interesse

### Diagnóstico dos dados atuais

**Duplicatas ativas (espelhamento real):**
- Empresa 1: Lead #2 (Gustavo, `43996971234`) e Lead #94 (+55 43 9697-1234, `5543996971234`) — mesmo telefone em formatos diferentes, ambos ativos no funil Máquina de Gelo

**Leads fantasma** (19 leads com `ativo=false` + `status=aberto`):
- Resíduos de testes e do bug anterior — IDs: 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 34, 47, 49, 54, 55, 56, 60, 61

---

### Etapa 1 — Limpeza de dados

**1a. Duplicata ativa por formato de WhatsApp:**
- Lead #94 (`5543996971234`, criado em 16/Mar) é a versão mais recente e foi criada pelo trigger com o formato normalizado
- Lead #2 (`43996971234`, criado em 03/Mar) é a versão antiga sem prefixo 55
- **Ação:** Desativar o lead mais antigo (#2) marcando `ativo = false` e `status = 'perdido'`, `motivo_perda = 'Duplicata por formato de whatsapp'`

**1b. Leads fantasma:**
- **Ação:** Atualizar os 19 leads com `ativo=false AND status='aberto'` para `status = 'perdido'` e `motivo_perda = 'Lead fantasma removido em limpeza'`

Ambas as operações via SQL direto (INSERT tool).

---

### Etapa 2 — Prevenção futura de duplicatas por formato

Atualmente o trigger `criar_lead_triagem` verifica duplicatas com match exato de `whatsapp`. Mas o mesmo número pode chegar como `43996971234` e `5543996971234`.

**Ação:** Criar uma migration que altere a função `criar_lead_triagem()` para normalizar o whatsapp antes de verificar duplicatas. A verificação passaria a:
- Remover o prefixo `55` para comparação, ou
- Checar com `OR` se existe lead com `'55' || whatsapp` ou `substr(whatsapp, 3)` já no banco

Isso previne que o trigger crie um segundo lead para o mesmo contato em formato diferente.

---

### Etapa 3 — Ícone de interesse no card

**Arquivo:** `src/components/crm/LeadCardComponent.tsx`, linha 311-312

**Ação:** Alterar a cor do `<Tag>` e o estilo do `SelectTrigger` condicionalmente:
- Com interesse: `text-primary` + borda sólida
- Sem interesse: `text-muted-foreground` + borda dashed (estado atual)

```tsx
// Antes
<SelectTrigger className="h-7 text-[11px] border-dashed ...">
  <Tag className="h-3 w-3 text-muted-foreground shrink-0" />

// Depois
<SelectTrigger className={cn("h-7 text-[11px] ...", 
  currentInteresse ? "border-solid border-primary/40" : "border-dashed border-border/60"
)}>
  <Tag className={cn("h-3 w-3 shrink-0", 
    currentInteresse ? "text-primary" : "text-muted-foreground"
  )} />
```

---

### Resumo de impacto

| Ação | Registros afetados | Risco |
|---|---|---|
| Desativar lead #2 | 1 lead | Baixo — lead duplicado |
| Fechar 19 fantasmas | 19 leads já invisíveis | Nenhum |
| Normalização no trigger | Prevenção futura | Baixo — apenas adiciona verificação |
| Ícone de interesse | Visual only | Nenhum |

