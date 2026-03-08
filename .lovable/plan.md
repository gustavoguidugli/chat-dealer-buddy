

## Plan: Vincular usuário à Empresa 1 como super_admin

Three data inserts are needed using the Supabase insert tool:

1. **user_empresa** - Insert `user_id`, `empresa_id: 1`, `role: 'super_admin'`
2. **user_empresa_geral** - Insert `user_id`, `empresa_id: 1` (defines which company loads in AuthContext)
3. **user_permissions** - Insert `user_id`, `is_admin: true` (grants admin-level access for RLS policies)

All three use the user UUID `89a6ca88-181a-40dd-b4e4-262eff0b7460`. No schema changes needed -- purely data operations.

