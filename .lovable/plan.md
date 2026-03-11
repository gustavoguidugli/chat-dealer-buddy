

## Plano: Redesenhar sidebar com modos compacto e expandido

### Resumo

Reescrever `AppSidebar.tsx` para suportar dois modos de navegação no desktop: **expandido** (w-64, ícones + labels + submenus colapsáveis) e **compacto** (w-16, apenas ícones com popover de submenu ao hover). A preferência é persistida em `localStorage`. Mobile continua usando Sheet.

### Estrutura de navegação

```text
┌─────────────────────────────┐
│ [Logo] Eco Ice   [◀ toggle] │  ← Header (compacto: só logo icon)
├─────────────────────────────┤
│ Empresa / email             │  ← Só no expandido
├─────────────────────────────┤
│ 🏠 Home                     │
│ 📊 CRM ▾                   │  ← Collapsible (expandido) / Popover (compacto)
│    ├ Funil                  │
│    └ Atividades             │
│ 📖 Base de conhecimento     │
│ ⚙ Configurações ▾          │  ← Collapsible / Popover
│    └ Meu Time               │
│ 🏢 Empresas (super)         │
│ ↔ Trocar empresa (super)    │
├─────────────────────────────┤
│ 👤 Meu perfil               │  ← Footer fixo
│ 🚪 Sair                     │
└─────────────────────────────┘
```

### Mudanças técnicas

**1. `src/components/AppSidebar.tsx`** — Reescrever completo

- Estado `collapsed` inicializado de `localStorage.getItem('sidebar-collapsed')`
- Toggle persiste em `localStorage`
- Transição animada de largura (`transition-all duration-200`)
- **Modo expandido**: igual ao atual — Collapsible para CRM e Configurações
- **Modo compacto** (w-16):
  - Header: apenas ícone Snowflake + botão expand
  - Itens simples: ícone centralizado com `Tooltip` (label no tooltip)
  - Itens com submenu (CRM, Configurações): ao hover, abre um painel flutuante (`Popover` ou div absoluta) com os sub-itens
  - Footer: ícones de perfil e sair com tooltip
- **Mobile**: Sheet inalterado (sempre expandido)
- Item ativo destacado com `bg-sidebar-accent`

**2. Componente auxiliar `CollapsedSubmenu`**

Componente interno que envolve um ícone e, ao hover, renderiza um painel posicionado à direita com os sub-links. Usa `onMouseEnter`/`onMouseLeave` com estado local.

**3. `src/components/AppLayout.tsx`** — sem alterações significativas

### Detalhes de interação (modo compacto)

- Itens sem submenu: clique navega, tooltip mostra label
- Itens com submenu: hover abre painel flutuante à direita do ícone com fundo `bg-sidebar`, sombra, border-radius. O painel some ao sair do hover (com delay de 150ms para evitar flicker)
- Toggle expandir: botão `PanelLeftOpen` no topo

### Persistência

```typescript
const [collapsed, setCollapsed] = useState(() => {
  return localStorage.getItem('sidebar-collapsed') === 'true';
});
const toggleCollapsed = () => {
  setCollapsed(prev => {
    localStorage.setItem('sidebar-collapsed', String(!prev));
    return !prev;
  });
};
```

### Arquivo editado

- `src/components/AppSidebar.tsx` — reescrita completa

