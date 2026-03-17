

# Plano: Tornar ativação/desativação de CRM modular no Diagnóstico

## O que será feito

### Alterar `src/components/admin/AdminDiagnosticoTab.tsx`

1. **Botão toggle**: Substituir o botão "Ativar CRM" (que só aparece quando CRM está desativo) por um botão que alterna entre ativar e desativar:
   - CRM desativo → botão "Ativar CRM" (ícone Wrench, cor padrão)
   - CRM ativo → botão "Desativar CRM" (ícone Wrench, cor destructive/warning)

2. **Nova função `toggleCrm`**: Substituir `ativarCrm` por uma função que recebe o estado atual e faz upsert com o valor invertido (`crm_is_ativo: !currentValue`), recarregando a tabela após sucesso.

3. **Feedback**: Toast de sucesso indicando o novo estado ("CRM ativado" ou "CRM desativado").

## Arquivo impactado
- `src/components/admin/AdminDiagnosticoTab.tsx`

