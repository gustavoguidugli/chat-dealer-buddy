import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Bot, BookOpen, ArrowLeftRight, LogOut, Menu, Snowflake, Building2, Kanban, ChevronDown, Target, CheckSquare, PanelLeftClose, PanelLeftOpen, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/triagem', icon: Bot, label: 'Triagem do agente' },
  { to: '/base-conhecimento', icon: BookOpen, label: 'Base de conhecimento' },
];

function SidebarInner({ onNavigate, onCollapse }: { onNavigate?: () => void; onCollapse?: () => void }) {
  const { isAdmin, empresaNome, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrmActive = location.pathname.startsWith('/crm');

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Snowflake className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold">EcoIce</span>
        </div>
        {onCollapse && (
          <button onClick={onCollapse} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {empresaNome && (
        <div className="px-6 py-4 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Empresa</p>
          <p className="text-sm font-semibold truncate mt-1">{empresaNome}</p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}

        {/* CRM Collapsible Menu */}
        <Collapsible defaultOpen={isCrmActive}>
          <CollapsibleTrigger className={cn(
            'flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isCrmActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}>
            <div className="flex items-center gap-3">
              <Kanban className="h-5 w-5" />
              CRM
            </div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-8 space-y-0.5 mt-0.5">
            <NavLink
              to="/crm"
              end
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'text-sidebar-accent-foreground font-medium bg-sidebar-accent/60'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
              )}
            >
              <Target className="h-4 w-4" />
              Funil
            </NavLink>
            <NavLink
              to="/crm/atividades"
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'text-sidebar-accent-foreground font-medium bg-sidebar-accent/60'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
              )}
            >
              <CheckSquare className="h-4 w-4" />
              Atividades
            </NavLink>
          </CollapsibleContent>
        </Collapsible>

        {/* Configurações Collapsible Menu */}
        <Collapsible defaultOpen={location.pathname.startsWith('/configuracoes')}>
          <CollapsibleTrigger className={cn(
            'flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            location.pathname.startsWith('/configuracoes')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}>
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5" />
              Configurações
            </div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-8 space-y-0.5 mt-0.5">
            <NavLink
              to="/configuracoes/usuarios"
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'text-sidebar-accent-foreground font-medium bg-sidebar-accent/60'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40'
              )}
            >
              <Users className="h-4 w-4" />
              Usuários
            </NavLink>
          </CollapsibleContent>
        </Collapsible>

        {isAdmin && (
          <>
            <button
              onClick={() => { navigate('/admin/empresas'); onNavigate?.(); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <Building2 className="h-5 w-5" />
              Empresas
            </button>
            <button
              onClick={() => { navigate('/selecionar-empresa'); onNavigate?.(); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <ArrowLeftRight className="h-5 w-5" />
              Trocar empresa
            </button>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-card shadow-md"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0 w-64 border-0 [&>button]:hidden">
            <SidebarInner onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border">
        <button onClick={() => setCollapsed(false)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0">
      <SidebarInner onCollapse={() => setCollapsed(true)} />
    </aside>
  );
}
