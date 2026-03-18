

# Diagnóstico: Informações não visíveis no detalhe do lead para Termal

## Investigação realizada

Auditei completamente o fluxo de dados para a empresa Termal (id=2, `empresas_geral`):

**Dados encontrados no banco:**
- 6 campos customizados globais (`id_funil=NULL`): Interesse, Cidade, Tipo de Uso, Consumo Mensal, Gasto Mensal, Dias por Semana
- 4 funis ativos: Sem interesse (4), Purificador (5), Máquina de gelo (14), Outros interesses (15)
- Leads existem com dados SDR parciais (maioria com `campos_extras = {}`)
- RLS usa `get_empresas_usuario()` que funciona tanto para admins quanto para usuários regulares

**Código analisado:**
- `LeadDrawer.tsx` linha 412: query busca campos com `.or('id_funil.is.null,id_funil.eq.${l.id_funil}')` — correto para campos globais
- `useLeadRealtime.ts` linha 90: fallback SDR com lógica OR — correto
- Collapsible `camposAbertos` inicia como `true` — correto
- Deduplicação defensiva — sem colisões para os 6 campos

**Resultado: O código está estruturalmente correto.** A query, o RLS, a renderização e o fallback SDR devem funcionar para Termal. Não consigo reproduzir o bug sem autenticação (a tela de login bloqueia o acesso no browser de teste).

## Hipóteses em aberto

Sem poder reproduzir, existem 3 hipóteses possíveis:

1. **O drawer abre mas todos os campos mostram "-"** — porque os leads de Termal têm `campos_extras = {}` e muitos não têm dados SDR. Isso não é um bug, é ausência de dados.

2. **O drawer não abre ou mostra "Carregando..." infinitamente** — possível erro silencioso em uma das queries paralelas (`Promise.all` na linha 409).

3. **Erro de JS não capturado** — alguma propriedade `null` causando crash silencioso no render.

## O que preciso para avançar

Para diagnosticar com precisão, preciso que você:

1. **Faça login no preview** para que eu possa testar via browser automation
2. **OU** me diga exatamente o que aparece quando abre o detalhe do lead:
   - O painel lateral abre?
   - Mostra "Carregando..." para sempre?
   - Abre mas os campos aparecem sem valor (mostrando "-")?
   - Abre mas a seção "Campos" está vazia / fechada?
   - Aparece algum erro na tela?

Com essa informação, consigo propor uma correção direcionada.

