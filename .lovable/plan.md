

# Diagnóstico: Tab de Diagnóstico Admin

## Investigação

1. **Banco de dados**: Eco Ice (id 25) tem `crm_is_ativo: true` — o toggle funcionou no banco.
2. **Código do toggle**: O `toggleCrm` faz upsert corretamente e a RLS (`get_empresas_usuario`) inclui super admins.
3. **Problema real identificado**: Ao atualizar a página (F5), a tab volta para "empresas" (é o `defaultValue`), então o usuário precisa clicar em "Diagnóstico" novamente — dando a impressão de que não funcionou.
4. **Problema secundário**: O `fetch()` após o toggle não é `await`ed, e erros das queries individuais (`configsRes.error`, `funisRes.error`, etc.) são silenciados.

## Plano de correção

### 1. Persistir a tab ativa na URL (`AdminEmpresas.tsx`)
- Usar query param ou state para manter a tab selecionada ao recarregar a página (ex: `?tab=diagnostico`). Assim, ao dar F5, o usuário permanece na aba correta.

### 2. Melhorar feedback de erros (`AdminDiagnosticoTab.tsx`)
- Adicionar `await` no `fetch()` dentro do `toggleCrm`
- Logar e mostrar toast para erros das queries individuais (configs, funis, contatos, leads)
- Mostrar mensagem "Nenhuma empresa encontrada" quando `rows` estiver vazio

## Arquivos impactados
- `src/pages/AdminEmpresas.tsx` — persistir tab ativa via URL
- `src/components/admin/AdminDiagnosticoTab.tsx` — melhorar error handling e await

