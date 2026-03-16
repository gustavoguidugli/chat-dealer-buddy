

## Plano: Sistema modular de funcionalidades por empresa (IA Agent + CRM)

### Conceito

Cada empresa terá dois módulos que podem ser ativados/desativados independentemente:
- **Agente de IA** → controla acesso a: Triagem, Base de Conhecimento, FAQs, Horários
- **CRM** → controla acesso a: Funil, Atividades

Os flags já existem no banco: `config_empresas_geral.crm_is_ativo` e `config_empresas_geral.triagem_is_ativo` (este último será usado como flag do módulo IA).

### Mudanças

**1. `src/contexts/AuthContext.tsx`**
- Adicionar dois estados: `moduloCrm: boolean` e `moduloIA: boolean`
- No `fetchUserData`, após obter o `empresaId`, buscar `config_empresas_geral` para ler `crm_is_ativo` e `triagem_is_ativo`
- Para Super Admin, buscar com base no `empresaId` salvo no localStorage (quando disponível)
- Expor `moduloCrm` e `moduloIA` no contexto
- Na troca de empresa (`setEmpresa`), re-fetch os módulos da nova empresa

**2. `src/components/AppSidebar.tsx`**
- Ler `moduloCrm` e `moduloIA` do `useAuth()`
- Condicionar a renderização do menu CRM a `moduloCrm`
- Condicionar "Base de conhecimento" a `moduloIA`
- Aplicar em ambos os modos (expandido e compacto)

**3. `src/components/ProtectedRoute.tsx`**
- Ler `moduloCrm` e `moduloIA` do `useAuth()`
- Rotas `/crm` e `/crm/atividades`: redirecionar para `/home` se `!moduloCrm`
- Rotas `/base-conhecimento`, `/base-conhecimento/faqs`, `/base-conhecimento/horarios`, `/triagem`: redirecionar para `/home` se `!moduloIA`
- Super Admins **não são bloqueados** (têm acesso total sempre)

### Mapeamento de rotas por módulo

| Módulo | Rotas protegidas |
|--------|-----------------|
| CRM | `/crm`, `/crm/atividades` |
| IA | `/triagem`, `/base-conhecimento`, `/base-conhecimento/faqs`, `/base-conhecimento/horarios` |

### Notas técnicas
- Nenhuma migração SQL necessária — os campos `crm_is_ativo` e `triagem_is_ativo` já existem em `config_empresas_geral`
- Default: se a empresa não tiver registro em `config_empresas_geral`, ambos os módulos ficam **desativados** (segurança por padrão)
- O painel admin continua permitindo ativar/desativar CRM via diagnóstico (já implementado)

