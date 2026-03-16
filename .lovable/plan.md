

## Plano: Nome da empresa clicável no painel admin → navegar para o CRM dela

### Mudanças

**`src/components/admin/AdminEmpresasTab.tsx`**
- Importar `useAuth` e `useNavigate`
- Tornar o nome da empresa (linha 148) um botão/link clicável que chama `setEmpresa(empresa.id, empresa.nome)` e depois `navigate('/crm')`
- Estilizar com `cursor-pointer hover:underline text-primary` para indicar que é clicável

**`src/pages/SelectCompany.tsx`** — manter o arquivo mas pode ser removido futuramente. Por ora, não mexer.

**`src/components/AppLayout.tsx`** — já redireciona para `/selecionar-empresa` quando superadmin sem empresaId. Após essa mudança, o superadmin sempre terá empresa selecionada ao navegar pelo admin, então o fluxo continua funcionando normalmente.

### Comportamento
Ao clicar no nome da empresa na aba Empresas do painel admin, o sistema:
1. Define a empresa ativa via `setEmpresa(id, nome)` (salva no localStorage + state)
2. Navega para `/crm` — abrindo o CRM daquela empresa

