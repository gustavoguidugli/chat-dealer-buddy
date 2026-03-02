import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Link2, Power, Building2, Users, Trash, Search, MoreVertical } from 'lucide-react';
import { CreateCompanyModal } from '@/components/CreateCompanyModal';
import { InviteModal } from '@/components/InviteModal';
import { DeleteEmpresaModal } from '@/components/DeleteEmpresaModal';
import { Navigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Empresa {
  id: number;
  nome: string | null;
  numero_automacao: string | null;
  ativo: boolean | null;
  userCount: number;
}

export default function AdminEmpresas() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteEmpresa, setInviteEmpresa] = useState<Empresa | null>(null);
  const [deleteEmpresa, setDeleteEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas_geral')
        .select('id, nome, numero_automacao, ativo')
        .order('nome');

      if (error) throw error;

      const { data: counts } = await supabase
        .from('user_empresa')
        .select('empresa_id');

      const countMap: Record<number, number> = {};
      counts?.forEach(row => {
        countMap[row.empresa_id] = (countMap[row.empresa_id] || 0) + 1;
      });

      setEmpresas(
        (data || []).map(e => ({
          ...e,
          userCount: countMap[e.id] || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching empresas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const toggleAtivo = async (empresa: Empresa) => {
    const newAtivo = !empresa.ativo;
    const { error } = await supabase
      .from('empresas_geral')
      .update({ ativo: newAtivo })
      .eq('id', empresa.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newAtivo ? 'Empresa ativada' : 'Empresa desativada' });
      fetchEmpresas();
    }
  };

  if (!isAdmin) return <Navigate to="/home" replace />;

  const filtered = empresas.filter(e =>
    (e.nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gerenciar Empresas</h1>
              <p className="text-sm text-muted-foreground mt-1">Crie e gerencie empresas e convites</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeira empresa
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {filtered.map(empresa => (
                <div
                  key={empresa.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {empresa.nome || 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {empresa.numero_automacao || 'Sem número'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={empresa.ativo ? 'default' : 'secondary'} className="hidden sm:inline-flex text-xs">
                      {empresa.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>

                    <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {empresa.userCount}
                    </Badge>

                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="left">Opções</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setInviteEmpresa(empresa)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Convites
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleAtivo(empresa)}>
                          <Power className="h-4 w-4 mr-2" />
                          {empresa.ativo ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteEmpresa(empresa)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TooltipProvider>

      <CreateCompanyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchEmpresas}
      />

      {inviteEmpresa && (
        <InviteModal
          open={!!inviteEmpresa}
          onOpenChange={open => { if (!open) setInviteEmpresa(null); }}
          empresa={inviteEmpresa}
        />
      )}

      <DeleteEmpresaModal
        empresa={deleteEmpresa}
        open={!!deleteEmpresa}
        onOpenChange={open => { if (!open) setDeleteEmpresa(null); }}
        onDeleted={fetchEmpresas}
      />
    </AppLayout>
  );
}