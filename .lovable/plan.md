

## Diagnóstico: CRM da empresa 2 não recebe leads automaticamente

### Problema encontrado

A empresa 2 **não possui um funil de triagem** (`tipo = 'triagem'`). O trigger `trigger_criar_lead_apos_contato` chama a função `criar_lead_triagem`, que busca um funil com `tipo = 'triagem'` para a empresa. Como não existe, a criação do lead falha silenciosamente.

**Empresa 1**: tem funil id=3, `tipo='triagem'` -- funciona.
**Empresa 2**: funil id=4 (`Sem interesse`) tem `tipo='maquina_gelo'` em vez de `tipo='triagem'` -- falha.

Além disso, 3 dos 4 interesses da empresa 2 estão com `ativo = false`, o que impede o roteamento automático via o trigger `mover_lead_por_interesse`.

### Solução

Duas correções de dados (sem mudança de código):

1. **Corrigir o tipo do funil "Sem interesse" da empresa 2** para `triagem`:
   - `UPDATE funis SET tipo = 'triagem' WHERE id = 4 AND id_empresa = 2;`

2. **Reativar os interesses desativados da empresa 2**:
   - `UPDATE lista_interesses SET ativo = true WHERE empresa_id = 2 AND ativo = false;`

### Por que isso resolve

- Com o funil tipo `triagem` existente, novos contatos WhatsApp criam leads automaticamente na triagem.
- Com os interesses ativos, o trigger `mover_lead_por_interesse` consegue rotear o lead para o funil correto (Máquina de gelo, Purificador, Outros) quando o interesse é identificado.

### Observação importante

Este mesmo problema pode acontecer com **qualquer nova empresa** que não tenha o funil de triagem configurado corretamente. Seria recomendável verificar que o trigger `inserir_interesses_padrao` e a lógica de criação de empresa também criam o funil de triagem com `tipo = 'triagem'`.

