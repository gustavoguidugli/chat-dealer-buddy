

# Plano: Migrar Política de Privacidade da Home para página pública

## O que será feito

### 1. Reescrever `PoliticaPrivacidade.tsx`
- Remover todo o design institucional atual (sidebar com índice, layout elaborado)
- Copiar exatamente o conteúdo da aba "Política de Privacidade" que está em `Home.tsx` (seções 1-10, dados reais)
- Página simples, pública, sem autenticação — apenas o artigo com fundo branco e padding
- Manter `id="exclusao"` na seção 7

### 2. Limpar `Home.tsx`
- Remover aba "Política de Privacidade" (`TabsTrigger` + `TabsContent`)
- Remover `Tabs` (sobra só o conteúdo "Início", renderizado direto)
- Remover imports não usados (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `ShieldCheck`)

## Arquivos impactados
- `src/pages/PoliticaPrivacidade.tsx` — reescrito com conteúdo da Home
- `src/pages/Home.tsx` — simplificado

