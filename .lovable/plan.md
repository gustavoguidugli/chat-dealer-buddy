
Objetivo: tornar a visualização de anexos confiável (principalmente PDF) sem depender de comportamento instável do navegador.

1) Diagnóstico já feito
- Conferi `anexos_anotacao` e os arquivos em `storage.objects`: os dados estão corretos (nome, `storage_path`, `tipo_arquivo=application/pdf`, tamanho, URL).
- A requisição de download do PDF retorna 200 e bytes válidos do arquivo.
- Conclusão: o problema não é a estrutura da tabela; é a estratégia de preview atual (PDF em `<iframe>`), que pode ser bloqueada pelo Chrome em contexto sandbox/iframe (como no preview do Lovable).

2) O que precisa (ou não) mudar no Supabase
- Para resolver esse bug específico: não precisa adicionar coluna/tabela.
- Melhoria opcional (performance): índice em `anexos_anotacao(id_anotacao, created_at)` para carregar anexos do histórico mais rápido.

3) Plano mais fácil e prático para visualização
- Substituir preview de PDF por renderização via PDF.js (em vez de iframe/plugin do navegador).
- Manter fluxo atual de storage (`download`) e botão “Baixar”.
- Regras de visualização:
  - Imagem: mostra direto (já funciona).
  - PDF: renderiza dentro do modal com PDF.js.
  - Outros tipos (doc/xls/etc): mostrar card com ação “Baixar” e fallback “Abrir em nova aba” quando aplicável.

4) Arquivos e mudanças planejadas
- `src/components/crm/FilePreviewModal.tsx`
  - Remover `<iframe>` para PDF.
  - Implementar viewer com `react-pdf`/`pdfjs-dist` (estado de loading, erro, paginação simples).
- `src/components/crm/LeadDrawer.tsx`
  - Ajustar `handlePreviewFile` para entregar Blob/ArrayBuffer ao modal.
  - Preservar botão de download.
  - Fallback amigável: se falhar renderização do PDF, exibir “Não foi possível visualizar, baixe o arquivo”.
- `package.json`
  - Adicionar dependências de PDF viewer.

5) Validação (fim a fim)
- Testar no preview e no domínio publicado:
  - PDF abre no modal sem baixar automaticamente.
  - Imagem abre normalmente.
  - Download continua funcionando.
  - Reabrir o mesmo anexo várias vezes sem erro de URL temporária.
  - Fluxo completo: anexar → salvar anotação → clicar no histórico → visualizar.
