import { useState, useRef, type ElementType, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home, BookOpen, LogOut, Menu, Building2,
  ChevronDown, Target, CheckSquare, PanelLeftClose, PanelLeftOpen, Handshake,
  Settings, Users, UserCog, BarChart2,
} from 'lucide-react';
import logoEcoIce from '@/assets/logo-ecoice.png';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const COMPACT_SLOT = 'flex h-10 w-10 items-center justify-center rounded-lg transition-colors shrink-0';

/* ─── Collapsed hover submenu ─── */
function CollapsedSubmenu({
  icon: Icon,
  label,
  isActive,
  defaultTo,
  children,
}: {
  icon: ElementType;
  label: string;
  isActive: boolean;
  defaultTo: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div className="relative flex justify-center" onMouseEnter={enter} onMouseLeave={leave}>
      <NavLink
        to={defaultTo}
        className={cn(
          COMPACT_SLOT,
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </NavLink>
      {open && (
        <div className="absolute left-full top-0 ml-1 z-50 min-w-[170px] rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-xl space-y-0.5">
          <p className="px-3 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">{label}</p>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Submenu link used inside CollapsedSubmenu panel ─── */
function SubmenuLink({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: ElementType; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) => cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'text-sidebar-accent-foreground font-medium bg-sidebar-accent/60'
          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

/* ─── Icon-only nav item with tooltip (compact mode) ─── */
function CompactNavItem({ to, icon: Icon, label, onClick }: { to: string; icon: ElementType; label: string; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          onClick={onClick}
          className={({ isActive }) => cn(
            COMPACT_SLOT,
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/* ─── Full sidebar content (expanded) ─── */
function ExpandedContent({ onNavigate, onCollapse }: { onNavigate?: () => void; onCollapse?: () => void }) {
  const { user, isSuperAdmin, empresaNome, signOut, moduloCrm, moduloIA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrmActive = location.pathname.startsWith('/crm');

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logoEcoIce} alt="Eco Ice" className="h-10 w-10 rounded-lg object-contain" />
          <span className="text-xl font-bold">Eco Ice</span>
        </div>
        {onCollapse && (
          <button onClick={onCollapse} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Company info */}
      {empresaNome && (
        <div className="px-6 py-4 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Empresa</p>
          <p className="text-sm font-semibold truncate mt-1">{empresaNome}</p>
          {user?.email && <p className="text-xs text-sidebar-foreground/50 truncate mt-1">{user.email}</p>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink to="/home" onClick={onNavigate} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
          <Home className="h-5 w-5" /> Home
        </NavLink>

        {/* CRM */}
        {moduloCrm && (
        <Collapsible defaultOpen={isCrmActive}>
          <CollapsibleTrigger className={cn('flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isCrmActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
            <div className="flex items-center gap-3"><Handshake className="h-5 w-5" /> CRM</div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-8 space-y-0.5 mt-0.5">
            <SubmenuLink to="/crm" label="Funil" icon={Target} onClick={onNavigate} />
            <SubmenuLink to="/crm/atividades" label="Atividades" icon={CheckSquare} onClick={onNavigate} />
            <SubmenuLink to="/crm/dashboards" label="Dashboards" icon={BarChart2} onClick={onNavigate} />
          </CollapsibleContent>
        </Collapsible>
        )}

        {moduloIA && (
        <NavLink to="/base-conhecimento" onClick={onNavigate} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
          <BookOpen className="h-5 w-5" /> Base de conhecimento
        </NavLink>
        )}

        {/* Configurações */}
        <Collapsible defaultOpen={location.pathname.startsWith('/configuracoes') || location.pathname === '/meu-time'}>
          <CollapsibleTrigger className={cn('flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', (location.pathname.startsWith('/configuracoes') || location.pathname === '/meu-time') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
            <div className="flex items-center gap-3"><Settings className="h-5 w-5" /> Configurações</div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-8 space-y-0.5 mt-0.5">
            <SubmenuLink to="/meu-time" label="Meu Time" icon={Users} onClick={onNavigate} />
          </CollapsibleContent>
        </Collapsible>

        {isSuperAdmin && (
          <button onClick={() => { navigate('/admin/empresas'); onNavigate?.(); }} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <Building2 className="h-5 w-5" /> Painel Admin
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <NavLink to="/configuracoes/perfil" onClick={onNavigate} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
          <UserCog className="h-5 w-5" /> Meu perfil
        </NavLink>
        <button onClick={signOut} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5" /> Sair
        </button>
      </div>
    </div>
  );
}

/* ─── Compact sidebar (icons only) ─── */
function CompactContent({ onExpand }: { onExpand: () => void }) {
  const { isSuperAdmin, signOut, moduloCrm, moduloIA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrmActive = location.pathname.startsWith('/crm');
  const isConfigActive = location.pathname.startsWith('/configuracoes') || location.pathname === '/meu-time';

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 py-5 border-b border-sidebar-border">
        <img src={logoEcoIce} alt="Eco Ice" className="h-8 w-8 rounded-lg object-contain" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onExpand} className={cn(COMPACT_SLOT, 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent')}>
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expandir menu</TooltipContent>
        </Tooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto">
        <CompactNavItem to="/home" icon={Home} label="Home" />

        {moduloCrm && (
        <CollapsedSubmenu icon={Handshake} label="CRM" isActive={isCrmActive} defaultTo="/crm">
          <SubmenuLink to="/crm" label="Funil" icon={Target} />
          <SubmenuLink to="/crm/atividades" label="Atividades" icon={CheckSquare} />
          <SubmenuLink to="/crm/dashboards" label="Dashboards" icon={BarChart2} />
        </CollapsedSubmenu>
        )}

        {moduloIA && (
        <CompactNavItem to="/base-conhecimento" icon={BookOpen} label="Base de conhecimento" />
        )}

        <CollapsedSubmenu icon={Settings} label="Configurações" isActive={isConfigActive} defaultTo="/meu-time">
          <SubmenuLink to="/meu-time" label="Meu Time" icon={Users} />
        </CollapsedSubmenu>

        {isSuperAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => navigate('/admin/empresas')} className={cn(COMPACT_SLOT, 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
                <Building2 className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Painel Admin</TooltipContent>
          </Tooltip>
        )}
      </nav>

      {/* Footer */}
      <div className="flex flex-col items-center gap-1 py-3 border-t border-sidebar-border">
        <CompactNavItem to="/configuracoes/perfil" icon={UserCog} label="Meu perfil" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={signOut} className={cn(COMPACT_SLOT, 'text-sidebar-foreground/70 hover:text-destructive')}>
              <LogOut className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Sair</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export function AppSidebar() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-card shadow-md" onClick={() => setMobileOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 border-0 [&>button]:hidden">
            <ExpandedContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className={cn('shrink-0 transition-all duration-200', collapsed ? 'w-16' : 'w-64')}>
      {collapsed
        ? <CompactContent onExpand={toggleCollapsed} />
        : <ExpandedContent onCollapse={toggleCollapsed} />
      }
    </aside>
  );
}
