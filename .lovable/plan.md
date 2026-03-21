
Objetivo: eliminar qualquer uso de `api.whatsapp.com`/`whatsapp.com/send` e padronizar abertura de WhatsApp em `wa.me` com nova aba segura.

1) Auditoria global e bloqueio de regressão
- Rodar busca global por:
  - `api.whatsapp.com`
  - `whatsapp.com/send`
  - `https://wa.me/`
- Garantir que não exista nenhuma ocorrência dos dois primeiros após os ajustes.
- Manter somente padrão `wa.me`.

2) Padronizar a regra única no utilitário
- Arquivo: `src/lib/lead-utils.ts`
- Ajustar `buildWhatsAppLink(phone)` para seguir exatamente:
  - `limpo = phone.replace(/\D/g, '')`
  - `com55 = limpo.startsWith('55') ? limpo : '55' + limpo`
  - retorno: ``https://wa.me/${com55}``
- Remover qualquer lógica condicional de tamanho (10/11) para evitar exceções e garantir consistência.

3) Corrigir abertura no LeadDrawer
- Arquivo: `src/components/crm/LeadDrawerFields.tsx`
- No botão de WhatsApp, manter abertura via `window.open` (não usar `<a href>`).
- Atualizar chamada para:
  - `window.open(url, '_blank', 'noopener,noreferrer')`
- Usar URL vinda de `buildWhatsAppLink` (fonte única de verdade), com `stopPropagation()` para não disparar eventos do card/drawer.

4) Validar cards de lead (Kanban)
- Arquivo: `src/components/crm/LeadCardComponent.tsx`
- Auditar se existe ação de WhatsApp no card.
  - Se existir: aplicar o mesmo padrão (`buildWhatsAppLink` + `window.open(..., 'noopener,noreferrer')`).
  - Se não existir: não criar UI nova (sem aumento de escopo), apenas confirmar que não há link legado incorreto.

5) QA final (obrigatório)
- Testar no `/crm`:
  - Clique no WhatsApp no LeadDrawer abre nova aba com formato `https://wa.me/5511...`.
  - Confirmar que o link aberto já sai no formato correto (sem `+`, sem máscara).
- Rodar busca global final para confirmar:
  - zero ocorrências de `api.whatsapp.com`
  - zero ocorrências de `whatsapp.com/send`
  - somente `wa.me`.
