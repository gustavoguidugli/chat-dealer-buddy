# Etapas 1-6 — Status

## Código concluído ✅
Todas as 6 etapas tiveram suas alterações de código implementadas.

## Migration pendente ⏳ (DB com timeout)

A seguinte SQL migration precisa ser executada quando o Supabase voltar:

```sql
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_select" ON public.super_admins
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.super_admins));

INSERT INTO public.super_admins (email) VALUES
  ('guidugli.gustavo@gmail.com'),
  ('matheussenacarneiro2322@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE email = (SELECT auth.jwt() ->> 'email')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_super_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id
  FROM auth.users au
  INNER JOIN public.super_admins sa ON au.email = sa.email;
$$;
```

## Resumo das alterações

### Etapa 1 — Segurança superadmin
- `src/lib/constants.ts`: Removido emails hardcoded
- `src/contexts/AuthContext.tsx`: Usa RPC `get_is_super_admin()` + estado `isSuperAdminState` + validação de empresa ativa
- `src/pages/ConfigUsuarios.tsx`: Usa RPC `get_super_admin_user_ids()` em vez de `checkSuperAdmin(email)`
- `src/components/ManageUsersModal.tsx`: Idem

### Etapa 2 — Onboarding
- Interface ConviteData já está correta. Nenhuma alteração necessária.

### Etapa 3 — CreateCompanyModal
- Template via `is_template = true` em vez de ORDER BY id
- Sufixo de código usa `Date.now().toString(36)` em vez de `'2024'`
- Toast inclui `motivos_copied` e `campos_copied`

### Etapa 4 — DeleteEmpresaModal
- Lista de itens deletados atualizada com 10 categorias

### Etapa 5 — useLeadRealtime
- `.eq('empresa_id', empresaId)` no fallback de contatos_geral
- `fetchVersionRef` para evitar race conditions

### Etapa 6 — GerenciarFaqs
- Aba "Geral" sempre presente
- `buildTipoFaqs` inclui nome do interesse + valores legados
- `resolveTipoFaqForInsert` sempre usa `tab.value` (nome do interesse)
