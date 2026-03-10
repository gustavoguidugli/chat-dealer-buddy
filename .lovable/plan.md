

## Plan: Implementar distinção `isSuperAdmin` vs `isCompanyAdmin` no frontend

### Problema atual

O `AuthContext` expõe `isAdmin` vindo de `user_permissions.is_admin`, que é uma flag separada e não reflete o papel real do usuário na empresa ativa. Não existe um `isCompanyAdmin` derivado de `user_empresa.role`.

### Mudanças

**1. `src/contexts/AuthContext.tsx`**
- Remover dependência de `user_permissions.is_admin` para determinar admin
- Adicionar `isCompanyAdmin: boolean` ao contexto (true se `user_empresa.role` for `'admin'` ou `'super_admin'` na empresa ativa, OU se `isSuperAdmin`)
- No `fetchUserData`, para usuários não-super-admin, buscar o `role` de `user_empresa` junto com `empresa_id` de `user_empresa_geral`
- Para super admins, `isCompanyAdmin` é sempre `true`
- Manter `isSuperAdmin` como está (lista de emails)
- Remover `isAdmin` antigo ou torná-lo alias de `isCompanyAdmin`

**2. Atualizar consumidores de `isAdmin`**
- `src/components/AppSidebar.tsx` — trocar `isAdmin` por `isCompanyAdmin`
- `src/pages/GerenciarFaqs.tsx` — trocar `isAdmin` por `isCompanyAdmin`
- `src/pages/ConfigUsuarios.tsx` — trocar `isAdmin` por `isCompanyAdmin`
- `src/pages/SelectCompany.tsx` — já usa `isSuperAdmin`, remover import de `isAdmin`

**3. Hierarquia final de permissões no frontend**

```text
isSuperAdmin (email hardcoded)
  └── Acesso global: trocar empresa, gerenciar empresas, tudo
  └── isCompanyAdmin = true automaticamente

isCompanyAdmin (role 'admin' em user_empresa)
  └── Gerenciar usuários da empresa, FAQs, configurações
  └── Não pode trocar empresa nem acessar /admin/empresas

member (role 'member')
  └── Acesso básico, sem gestão
```

### Interface atualizada do AuthContext

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isCompanyAdmin: boolean;  // admin da empresa ativa (ou super admin)
  isSuperAdmin: boolean;    // acesso global irrestrito
  empresaId: number | null;
  empresaNome: string | null;
  semEmpresa: boolean;
  setEmpresa: (id: number, nome: string) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}
```

Nenhuma alteração de banco necessária.

