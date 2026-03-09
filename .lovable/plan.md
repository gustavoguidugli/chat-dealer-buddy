
## Análise do problema (por que “Interesse” não muda)

Pelo trecho atual do `LeadDrawer.tsx`, o `<Select>` do “Interesse” está **controlado** por um `value={value || ''}` onde `value` é calculado assim:

- Se `dadosContato.interesse` (vem de `useLeadRealtime` / `contatos_geral`) estiver preenchido ⇒ ele tem prioridade e vira o `value` do Select.
- Quando o usuário seleciona uma nova opção, o código:
  1) tenta atualizar `contatos_geral` com `.eq('whatsapp', lead.whatsapp)`  
  2) atualiza `leads_crm.campos_extras` como “fallback”

O problema é que **o Select só vai “mudar” visualmente se o `value` controlado mudar**. Hoje isso não acontece porque:

1) Mesmo que você grave em `leads_crm.campos_extras`, o `value` do Select continua vindo de `dadosContato.interesse` (que ainda está com o valor antigo).
2) E o update em `contatos_geral` pode estar afetando **0 linhas** (sem retornar erro) por causa de mismatch de `whatsapp` (formatação) ou porque o lead não tem o `whatsapp` exato que existe em `contatos_geral`. Quando isso acontece, **não há evento realtime** em `contatos_geral`, então `dadosContato.interesse` não muda e o Select “volta”.

Resultado: o usuário seleciona e “não altera”.

---

## Como consertar (o que vou implementar)

### Objetivo
- Permitir trocar “Interesse” via múltipla escolha
- Ao trocar, **persistir em `public.contatos_geral.interesse`**
- A UI deve refletir a mudança imediatamente e depois ficar consistente via realtime

---

## Mudanças no Frontend (principal)

### 1) Parar de atualizar `contatos_geral` por `whatsapp` e atualizar por `id` (mais confiável)
Hoje o tipo `LeadDetail` nem possui `id_contato_geral`, então o componente nem tenta usar o melhor identificador.

**Ajustes:**
- Adicionar `id_contato_geral: number | null` na interface `LeadDetail` em `LeadDrawer.tsx`
- No `fetchMeta`, como ele já faz `select('*')` de `leads_crm`, o campo virá automaticamente (só precisamos tipar).
- No `onValueChange` do Select:
  - Se `lead.id_contato_geral` existir: fazer  
    `update contatos_geral set interesse = val where id = lead.id_contato_geral`
  - Se `lead.id_contato_geral` NÃO existir: fazer um “resolve” antes:
    - Buscar em `contatos_geral` o `id` por `whatsapp` (tentando `lead.whatsapp` e uma versão normalizada só com dígitos via `.in('whatsapp', [...])`)
    - Se não encontrar: mostrar toast “Contato não encontrado para atualizar interesse” e não prosseguir

**Detalhe importante:** usar `.select('id')` após o update para confirmar que ao menos 1 linha foi atualizada (assim detectamos “0 linhas atualizadas” e informamos com toast).

---

### 2) Fazer o Select refletir imediatamente a escolha (sem depender do realtime chegar)
Mesmo com update correto, o realtime pode demorar alguns ms. Como o Select é controlado, precisamos atualizar o “source of truth” do value imediatamente.

Como `dadosContato` vem do hook e não temos `setDadosContato` exposto, vamos adicionar no `LeadDrawer.tsx` um estado local só para o campo Interesse, por exemplo:

- `const [interesseOverride, setInteresseOverride] = useState<string | null>(null);`

E ajustar o cálculo do valor:
- Para o campo de interesse, o valor exibido vira:
  1) `interesseOverride` (se existir)  
  2) senão `dadosContato.interesse`  
  3) senão `lead.campos_extras?.interesse` (fallback)

No `onValueChange`:
- `setInteresseOverride(val)` imediatamente (UI muda na hora)
- faz o update no Supabase
- quando `dadosContato.interesse` for atualizado via realtime para o mesmo valor, limpamos o override:
  - `useEffect(() => { if (interesseOverride && dadosContato.interesse === interesseOverride) setInteresseOverride(null) }, [...])`

Isso garante:
- UX boa (muda instantâneo)
- Consistência (a fonte final é o realtime do Supabase)

---

### 3) Manter (ou simplificar) o update de `leads_crm.campos_extras`
Hoje vocês salvam também em `leads_crm.campos_extras` como fallback. Podemos:
- manter (ok para fallback/relatórios), mas ajustar para não “brigar” com o valor do Select
- ou remover se você quiser 100% canônico em `contatos_geral`

Eu vou manter como fallback, porém o Select vai seguir a prioridade:
`override → contatos_geral (realtime) → campos_extras`.

---

## Checagens no Backend / RLS (secundário, mas essencial)

Você já tem a policy `authenticated_update_contatos_geral`. Vou apenas validar 2 pontos durante a correção:

1) Se o usuário está autenticado no preview (senão o update falha com 401)
2) Se o update está realmente atualizando 1 linha (com `.select()` pra ter certeza)

Obs.: Se o update continuar retornando “0 linhas” mesmo usando `id_contato_geral`, aí o problema será: `leads_crm.id_contato_geral` está nulo/incorreto para esse lead — nesse caso eu ajusto o fallback de lookup para encontrar o contato certo e (opcionalmente) podemos também salvar `id_contato_geral` no lead quando identificado, para evitar lookup futuro.

---

## Arquivos envolvidos
- `src/components/crm/LeadDrawer.tsx`
  - tipar `id_contato_geral`
  - corrigir update do interesse para usar `id`
  - adicionar `interesseOverride` (controle imediato do Select)
  - confirmar update com `.select()` e tratar caso “0 rows”
- (Opcional) `src/hooks/useLeadRealtime.ts`
  - provavelmente não precisa mexer, porque ele já escuta `contatos_geral` e atualiza `dadosContato.interesse` em realtime

---

## Critério de aceite (como você valida que ficou certo)
1) Abrir um lead com campo “Interesse”
2) Trocar “Máquinas de gelo” → “Purificadores”
3) O campo deve mudar imediatamente no UI (sem “voltar”)
4) No Supabase, a linha correspondente em `contatos_geral` deve ter `interesse='purificador'`
5) Abrir o mesmo lead em outra aba/usuário: deve atualizar em realtime ao mudar na primeira aba
