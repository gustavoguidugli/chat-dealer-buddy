

## Plano: Tela Administrativa Centralizada (Super Admin)

Substituir a rota `/admin/empresas` por uma nova tela `/admin/empresas` com abas, consolidando gestão de empresas, diagnóstico do sistema e logs de auditoria em uma única interface.

### Estrutura da tela

A tela usará `Tabs` com 3 abas:

**Aba 1 — Empresas** (o que já existe, aprimorado)
- Manter lista atual de empresas com busca, criação, convites, usuários, ativar/desativar, excluir
- Adicionar colunas/badges extras: CRM ativo/inativo, quantidade de contatos, quantidade de leads ativos, quantidade de funis
- Adicionar indicador visual para empresas com problemas (sem funil triagem, CRM inativo com contatos entrando)

**Aba 2 — Diagnóstico**
- Tabela de saúde de todas as empresas ativas com checagens automáticas:
  - Tem funil `tipo='triagem'`? 
  - `crm_is_ativo = true`?
  - Tem `config_empresas_geral` configurada?
  - Tem interesses vinculados a funis (`funil_id IS NOT NULL`)?
  - Contatos recentes sem lead criado (contatos nas últimas 24h sem lead correspondente)?
- Cada empresa mostra status com ícones (check verde / X vermelho)
- Botão de ação rápida para corrigir problemas comuns (ex: ativar CRM, criar funil triagem faltante)

**Aba 3 — Logs**
- Listar registros de `audit_logs` com filtros por data, tipo de ação e entidade
- Exibir actor (email do usuário), ação, entidade, metadata expandível, timestamp
- Paginação simples (últimos 50, carregar mais)

### Arquitetura técnica

| Arquivo | Ação |
|---|---|
| `src/pages/AdminEmpresas.tsx` | Refatorar para incluir as 3 abas |
| `src/components/admin/AdminEmpresasTab.tsx` | Extrair lógica atual da lista de empresas (com métricas extras) |
| `src/components/admin/AdminDiagnosticoTab.tsx` | Nova aba de diagnóstico com queries de saúde |
| `src/components/admin/AdminLogsTab.tsx` | Nova aba de audit_logs |

### Queries de diagnóstico (via Supabase client, RLS já permite para is_admin)

```text
-- Dados consolidados por empresa (feito no frontend com múltiplas queries)
empresas_geral → id, nome, ativo
config_empresas_geral → crm_is_ativo, triagem_is_ativo
funis → count por empresa, exists tipo='triagem'
lista_interesses → count where funil_id IS NULL
contatos_geral → count últimas 24h sem lead
```

### Design visual

- Seguir o padrão existente: `AppLayout` com `TooltipProvider`, cards com `rounded-lg border`, badges coloridos
- Aba de diagnóstico: tabela com colunas de check/X usando ícones `CheckCircle2` (verde) e `XCircle` (vermelho)
- Aba de logs: tabela simples com linhas expansíveis para metadata

### Proteção de acesso

- Manter `if (!isSuperAdmin) return <Navigate to="/home" replace />`
- Audit_logs já tem RLS policy `admin_select_audit` que requer `is_admin()`

