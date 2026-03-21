

# Persistir funil selecionado na URL

## Problema
O estado `funilAtual` é um `useState` local (linha 81) que reseta ao valor do primeiro funil sempre que ocorre re-render causado por fechar o LeadDrawer, ações em modais, ou `reloadKey` mudar — pois o `useEffect` na linha 320 re-executa e pode sobrescrever a seleção.

## Solução
Substituir `useState` por `useSearchParams` do React Router, persistindo o funil na URL como `?funil=ID`.

## Alterações — arquivo único: `src/pages/CrmFunil.tsx`

1. **Importar `useSearchParams`** de `react-router-dom`.

2. **Substituir o estado local** (linha 81):
   - Remover `const [funilAtual, setFunilAtual] = useState<number | null>(null)`
   - Adicionar lógica baseada em `searchParams`:
   ```ts
   const [searchParams, setSearchParams] = useSearchParams();
   const funilAtual = searchParams.get('funil') ? Number(searchParams.get('funil')) : null;
   const setFunilAtual = (id: number) => {
     setSearchParams(prev => { prev.set('funil', String(id)); return prev; }, { replace: true });
   };
   ```

3. **Ajustar o `useEffect` de fetch de funis** (linhas 320-340):
   - Quando os funis carregam e não há `?funil=` na URL (ou o valor não existe mais na lista), setar o primeiro funil na URL com `replace: true`.
   - Quando o funil da URL existe na lista, manter — sem sobrescrever.

4. **Ajustar `FunilSortableSelect`** — garantir que a mudança de funil chame `setFunilAtual(id)` que já atualiza a URL.

Nenhum outro arquivo precisa ser alterado. O LeadDrawer, modais e ações do kanban não tocam em `funilAtual`.

