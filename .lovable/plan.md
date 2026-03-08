

## Plano: Anexar Arquivos e Imagens nas Anotações do Lead

### Mudanças no Supabase

Sim, precisa de alterações:

1. **Nova tabela `anexos_anotacao`** para armazenar referências aos arquivos:
   - `id` (BIGINT PK)
   - `id_anotacao` (BIGINT FK → anotacoes_lead.id ON DELETE CASCADE)
   - `id_empresa` (BIGINT)
   - `nome_arquivo` (TEXT) — nome original
   - `tipo_arquivo` (TEXT) — mime type (image/png, application/pdf, etc.)
   - `tamanho` (BIGINT) — bytes
   - `storage_path` (TEXT) — caminho no bucket
   - `url_publica` (TEXT) — URL pública do arquivo
   - `created_at` (TIMESTAMPTZ)
   - RLS: mesmas políticas da `anotacoes_lead` (por empresa via `user_empresa`)

2. **Novo bucket Storage** `anexos-lead` (público) para armazenar os arquivos, com RLS policies para upload/delete por usuários autenticados da empresa.

3. **Realtime** habilitado na tabela `anexos_anotacao`.

### Mudanças no Frontend

1. **Área de upload no input de anotação** (`LeadDrawer.tsx`):
   - Adicionar botão de clipe (📎) ao lado do botão "Salvar"
   - Input hidden `type="file"` com `multiple` e `accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"`
   - Preview dos arquivos selecionados antes de salvar (thumbnails para imagens, ícone+nome para documentos)
   - Botão X para remover arquivo antes de enviar

2. **Fluxo de salvamento** (`handleSalvarAnotacao`):
   - Primeiro salva a anotação (INSERT em `anotacoes_lead`) e pega o `id` retornado
   - Faz upload dos arquivos para `anexos-lead/{empresaId}/{leadId}/{anotacaoId}/{filename}`
   - Insere registros na tabela `anexos_anotacao` com o path e URL pública

3. **Exibição dos anexos no histórico**:
   - No card de cada anotação no histórico, buscar anexos vinculados
   - Imagens: mostrar thumbnails clicáveis (abre em nova aba ou lightbox)
   - Documentos: mostrar ícone + nome com link de download
   - Usar o hook `useLeadRealtime` para adicionar subscription na tabela `anexos_anotacao`

4. **Edição/exclusão**:
   - Ao excluir anotação, o CASCADE já remove os registros de `anexos_anotacao`; também deletar os arquivos do Storage
   - Na edição da anotação, permitir adicionar novos anexos ou remover existentes

### Estrutura de Arquivos

- Migração SQL: criar tabela + bucket + policies
- `src/components/crm/LeadDrawer.tsx`: adicionar UI de upload e exibição de anexos
- `src/hooks/useLeadRealtime.ts`: adicionar state `anexos` e subscription na tabela `anexos_anotacao`

