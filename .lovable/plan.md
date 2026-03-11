
Objetivo: corrigir o modo compacto da sidebar para que todos os ícones fiquem no mesmo eixo visual e pareçam “encaixados” nos botões, sem mexer no comportamento geral do menu.

1. Diagnóstico do desalinhamento
- O problema está concentrado em `src/components/AppSidebar.tsx`.
- No modo reduzido, header, navegação e rodapé usam tamanhos diferentes:
  - logo: `h-9 w-9`
  - botão expandir: `h-8 w-8`
  - itens do menu: `h-10 w-10`
- Isso quebra o eixo central do menu compacto.
- Além disso, alguns elementos ficam dentro de wrappers diferentes (`relative w-10`, `Tooltip`, `button`, `NavLink`), então mesmo quando “parecem” iguais, o alinhamento visual da coluna não fica consistente.

2. Ajuste proposto
- Padronizar um único “slot” visual para o menu compacto:
  - todos os itens clicáveis do modo reduzido terão exatamente o mesmo tamanho
  - logo, botão de expandir, links, botões de super admin, perfil e sair vão seguir a mesma largura/altura-base
- Garantir que header, nav e footer usem o mesmo eixo:
  - wrappers com `w-full`
  - conteúdo centralizado da mesma forma em todas as seções
  - espaçamento vertical uniforme
- Refatorar o submenu compacto para herdar a mesma base visual dos demais botões, evitando que o ícone do item com hover pareça “andar” em relação aos outros.

3. Implementação
- Em `AppSidebar.tsx`:
  - criar uma classe/base compartilhada para os botões compactos
  - aplicar essa base em:
    - `CompactNavItem`
    - trigger de `CollapsedSubmenu`
    - botão de expandir
    - botões de `Empresas`, `Trocar empresa` e `Sair`
  - alinhar o header compacto para usar o mesmo centro óptico da coluna
  - revisar `px/py/gap` do modo compacto para que header, corpo e footer fiquem simétricos
- Manter:
  - persistência no `localStorage`
  - destaque de item ativo
  - submenu lateral no hover
  - “Meu perfil” e “Sair” fixos no rodapé

4. Resultado esperado
- Ícones centralizados dentro dos botões
- Todos os botões da coluna exatamente alinhados entre si
- Header, navegação e rodapé no mesmo eixo vertical
- Menu reduzido com aparência limpa e consistente

5. Arquivo a editar
- `src/components/AppSidebar.tsx`

6. Detalhe técnico
- A correção não exige redesign completo nem troca de componente.
- É um ajuste estrutural de layout no modo compacto, com foco em:
  - uniformidade de tamanho
  - centralização real
  - consistência entre wrappers
