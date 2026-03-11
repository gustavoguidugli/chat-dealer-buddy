

# Problema: Leads não são criados automaticamente no CRM

## Diagnóstico

O contato `5562999795026` foi inserido em `contatos_geral` (id=3989, empresa 1) com `interesse=maquina_gelo`, mas **nenhum lead foi criado** em `leads_crm`.

**Causa raiz**: Não existe nenhum trigger na tabela `contatos_geral` que chame a função `criar_lead_triagem`. Essa função precisa ser invocada explicitamente pelo backend externo (agente WhatsApp), mas aparentemente isso não está acontecendo.

## Solução

Criar um **trigger automático** na tabela `contatos_geral` que, ao inserir um novo contato, chame `criar_lead_triagem` para criar o lead no funil de triagem automaticamente.

### Alterações

**1. Nova migration SQL** — Criar trigger `after INSERT` em `contatos_geral`:

```sql
CREATE OR REPLACE FUNCTION public.trigger_criar_lead_apos_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM criar_lead_triagem(NEW.whatsapp, NEW.empresa_id, NEW.whatsapp_padrao_pipedrive);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_criar_lead_apos_contato
  AFTER INSERT ON contatos_geral
  FOR EACH ROW
  EXECUTE FUNCTION trigger_criar_lead_apos_contato();
```

Isso garante que **todo novo contato** gere automaticamente um lead no funil de triagem, sem depender do backend externo chamar a RPC separadamente.

### Riscos e mitigações

- A RPC `criar_lead_triagem` já verifica duplicatas (se lead ativo com mesmo whatsapp já existe, retorna o id existente sem criar outro)
- Se o funil de triagem não existir, a RPC lança exceção — mas a empresa 1 já tem funil de triagem (id=3)
- O trigger usa `PERFORM` (ignora retorno), então erros na RPC não impedem a inserção do contato... na verdade, `RAISE EXCEPTION` dentro da RPC **vai** propagar. Devemos envolver em `BEGIN...EXCEPTION` para não bloquear a inserção do contato caso algo falhe

### Arquivo
- Nova migration SQL (1 arquivo)
- Nenhuma mudança no frontend

