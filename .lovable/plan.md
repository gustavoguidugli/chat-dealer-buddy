

# Plano: Reescrever PoliticaPrivacidade.tsx com conteúdo real da Home

## Problema
A edição anterior removeu o conteúdo da aba de privacidade do `Home.tsx` mas nunca reescreveu `PoliticaPrivacidade.tsx`. A página ainda tem o design institucional antigo com dados placeholder.

## O que será feito

### Reescrever `src/pages/PoliticaPrivacidade.tsx`
- Remover todo o design institucional (hero banner azul, sidebar com índice, animações, fontes customizadas)
- Página simples e limpa: fundo branco, padding, texto direto — estilo de aba interna
- Usar os dados reais da empresa (CNPJ `52.691.034/0001-73`, email `guidugli.gustavo@gmail.com`, etc.)
- Manter as 10 seções com o mesmo conteúdo
- Manter `id="exclusao"` na seção 7 (exigência Meta)
- Sem autenticação, sem sidebar do sistema — página pública standalone

## Arquivo impactado
- `src/pages/PoliticaPrivacidade.tsx` — reescrita completa

