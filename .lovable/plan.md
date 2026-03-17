

# Relatório: Erro no Onboarding de Convites

## Problema identificado

O erro **"Erro ao completar onboarding"** ocorre por uma **incompatibilidade de valores de role** entre as tabelas do sistema.

### Causa raiz

A tabela `usuario_time` possui um CHECK constraint que aceita apenas `['admin', 'user']`:
```text
usuario_time.role CHECK: 'admin' | 'user'
```

Mas o fluxo de convites usa `'member'` como role padrão:
```text
convites.role = 'member'
aceitar_convite() retorna role = 'member'
complete_onboarding insere 'member' em usuario_time → VIOLA CHECK → ERRO
```

A tabela `user_empresa` aceita `['owner', 'admin', 'member']` — então funciona lá. Mas `usuario_time` espera `'user'` e não `'member'`.

### Fluxo do erro

1. Usuário recebe convite com `role: member`
2. Preenche nome e senha, clica "Acessar Eco Ice"
3. Edge function `manage-users` → `complete_onboarding`:
   - Cria/encontra usuário no Auth ✓
   - Atualiza senha ✓
   - Chama `aceitar_convite()` → retorna `role: 'member'` ✓
   - Upsert em `usuarios` ✓ (provavelmente)
   - **INSERT em `usuario_time` com `role: 'member'` → FALHA** (CHECK constraint)
4. Erro é capturado pelo catch genérico → retorna 500
5. Frontend mostra "Erro ao completar onboarding"

### Problema secundário

A edge function **não verifica erros** nos passos 3-7 (após aceitar convite). Qualquer falha silenciosa nesses passos não é reportada de forma útil.

## Plano de correção

### 1. Corrigir mapeamento de role na Edge Function `manage-users`

No caso `complete_onboarding`, ao inserir em `usuario_time`, mapear `'member'` para `'user'`:

```js
// Linha 554-558 - Step 4: inserting usuario_time
role: finalRole === 'member' ? 'user' : finalRole,
```

Também fazer o mesmo no campo `nivel_acesso` do upsert em `usuarios` (step 3), já que a tabela pode esperar `'user'` e não `'member'`.

### 2. Adicionar tratamento de erros nos passos pós-aceitar

Adicionar verificação de `error` nos passos 3-7 da edge function para que falhas sejam reportadas com mensagens úteis em vez do genérico "Erro ao completar onboarding".

### 3. Remover a função duplicada `aceitar_convite`

Existem **duas overloads** de `aceitar_convite` no banco:
- `aceitar_convite(p_convite_id uuid)`
- `aceitar_convite(p_convite_id uuid, p_user_id uuid DEFAULT NULL)`

Isso pode causar ambiguidade no PostgREST. A versão de 1 parâmetro é obsoleta e deve ser removida via migration.

## Arquivos impactados

- `supabase/functions/manage-users/index.ts` — corrigir mapeamento de role e adicionar error handling
- Migration SQL — remover overload obsoleta de `aceitar_convite`

