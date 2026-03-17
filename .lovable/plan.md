

# Diagnóstico: "Meu Time" não carrega para matheus.carneiro@vammo.com

---

## BLOCO 1 — Diagnóstico objetivo

### O que deveria acontecer
Ao abrir "Meu Time", o `AuthContext` resolve o usuário e sua empresa, fornece `empresaId` ao componente, que chama `get_team_members(empresaId)` e renderiza a tabela.

### O que está acontecendo
A página fica presa em "Carregando..." infinitamente. Nenhum dado é exibido, nenhum erro visível.

### Hipótese principal (confirmada por evidência)
O usuário `matheus.carneiro@vammo.com` (UUID `c8ad6221-...`) está vinculado a **duas empresas** na tabela `user_empresa`:
- Empresa 17 ("Empresa do Matheus") — role: `member`  
- Empresa 25 ("Eco Ice (API Oficial)") — role: `admin`

O `AuthContext` (linha 79-83) faz:
```typescript
const { data: mapping, error } = await supabase
  .from('user_empresa')
  .select('empresa_id, role')
  .eq('user_id', currentUser.id)
  .maybeSingle();  // ← ERRO: retorna PGRST116 quando há >1 linha
```

`maybeSingle()` retorna erro quando há múltiplas linhas. O bloco `if (error)` na linha 85 faz `return` **sem chamar `setLoading(false)`**, deixando o estado `loading = true` para sempre.

**Resultado**: toda a aplicação fica presa em loading. A tela de "Meu Time" nunca recebe `empresaId`, nunca chama as queries, e mostra "Carregando..." indefinidamente.

### Hipóteses secundárias
Nenhuma relevante — a causa raiz é clara e confirmada pelos dados do banco.

### Camada do problema
**Resolução da empresa/tenant no AuthContext** — o problema não está na página "Meu Time" em si, mas na camada de autenticação que a alimenta.

---

## BLOCO 2 — Fluxo atual (AS-IS)

```text
1. Usuário faz login
2. AuthContext.fetchUserData() é chamado
3. Verifica se é super admin → NÃO (email não está na lista)
4. Query: user_empresa WHERE user_id = X → .maybeSingle()
5. ⚠️ 2 linhas retornadas → PostgREST retorna PGRST116
6. error !== null → entra no if(error), faz console.error + return
7. setLoading(false) NUNCA é chamado
8. loading = true PARA SEMPRE
9. ProtectedRoute renderiza <Loader2 /> infinitamente
10. Página "Meu Time" nunca monta
```

**Ponto de quebra**: Passo 4-6 — a query `maybeSingle()` não suporta múltiplos vínculos.

---

## BLOCO 3 — Estado esperado (TO-BE)

1. Usuários com múltiplas empresas devem ter seus vínculos resolvidos corretamente
2. O `AuthContext` deve selecionar uma empresa padrão (a primeira, ou a última usada) quando há múltiplos vínculos
3. `loading` deve sempre resolver para `false`, mesmo em cenários de erro
4. Se o vínculo não puder ser resolvido, o estado `semEmpresa` deve ser ativado ou o usuário redirecionado para seleção de empresa
5. A página "Meu Time" deve carregar normalmente com a empresa resolvida

---

## BLOCO 4 — Plano de correção em etapas

### Etapa 1: Corrigir a resolução multi-empresa no AuthContext
**Objetivo**: Suportar usuários com múltiplas empresas sem quebrar.

**O que será feito**:
- Substituir `.maybeSingle()` por `.limit(1).maybeSingle()` ou usar `.select()` sem modificador e pegar o primeiro resultado
- Implementar lógica: se há múltiplas empresas, selecionar a que está salva em `localStorage` (se existir e for válida), senão usar a primeira
- Garantir que `setLoading(false)` é chamado em **todos** os caminhos, inclusive erros

**Arquivos**: `src/contexts/AuthContext.tsx` (linhas 78-103)

**Risco**: Baixo — é uma correção pontual na query, sem alterar a lógica downstream.

**Validação**: Login com `matheus.carneiro@vammo.com` deve resolver empresa e permitir navegação normal.

### Etapa 2: Garantir fallback de loading em erros
**Objetivo**: Prevenir loading infinito em qualquer cenário.

**O que será feito**:
- No bloco `if (error)` da linha 85-88, adicionar `setLoading(false)` antes do `return`
- Considerar exibir toast ou redirecionar para estado de erro

**Arquivos**: `src/contexts/AuthContext.tsx`

**Risco**: Mínimo.

**Validação**: Simular erro de rede e confirmar que a tela não fica presa.

### Etapa 3: Validação funcional
**Objetivo**: Confirmar que "Meu Time" funciona para este usuário.

**O que será verificado**:
- `empresaId` é resolvido corretamente no contexto
- `get_team_members(empresaId)` retorna dados
- Tabela de usuários ativos renderiza
- Convites carregam
- Não há loading infinito

---

## BLOCO 5 — Critérios de aceite

1. Usuário `matheus.carneiro@vammo.com` consegue fazer login e acessar "Meu Time" sem loading infinito
2. A tabela de usuários ativos renderiza com dados ou empty state
3. Convites carregam normalmente
4. `setLoading(false)` é sempre chamado, independente do resultado da query
5. Usuários com múltiplos vínculos de empresa não quebram o fluxo de autenticação
6. O comportamento para usuários com um único vínculo permanece inalterado

---

## BLOCO 6 — Recomendação

**Correção intermediária** — A causa raiz é uma chamada `.maybeSingle()` que não contempla o cenário multi-empresa. A correção é substituí-la por uma query que seleciona a primeira empresa (ou a preferida via localStorage) e garantir o fallback de `setLoading(false)`.

Isso resolve o problema imediato sem exigir refatoração da arquitetura multi-tenant. No futuro, se o sistema precisar suportar troca de empresa para usuários comuns (não super-admin), será necessária uma correção estrutural com tela de seleção de empresa — mas isso está fora do escopo atual.

