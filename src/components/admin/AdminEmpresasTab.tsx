import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Link2, Power, Building2, Users, Trash, Search, MoreVertical, BarChart3 } from 'lucide-react';
import { CreateCompanyModal } from '@/components/CreateCompanyModal';
import { InviteModal } from '@/components/InviteModal';
import { DeleteEmpresaModal } from '@/components/DeleteEmpresaModal';
import { ManageUsersModal } from '@/components/ManageUsersModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Empresa {
  id: number;
  nome: string | null;
  numero_automacao: string | null;
  ativo: boolean | null;
  userCount: number;
  leadCount: number;
  funilCount: number;
  crmAtivo: boolean | null;
}

export function AdminEmpresasTab() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteEmpresa, setInviteEmpresa] = useState<Empresa | null>(null);
  const [deleteEmpresa, setDeleteEmpresa] = useState<Empresa | null>(null);
  const [usersEmpresa, setUsersEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    try {
      const [empresasRes, userCountsRes, leadCountsRes, funisRes, configsRes] = await Promise.all([
        supabase.from('empresas_geral').select('id, nome, numero_automacao, ativo').order('nome'),
        supabase.from('user_empresa').select('empresa_id'),
        supabase.from('leads_crm').select('id_empresa').eq('ativo', true),
        supabase.from('funis').select('id_empresa'),
        supabase.from('config_empresas_geral').select('id_empresa, crm_is_ativo'),
      ]);

      if (empresasRes.error) throw empresasRes.error;

      const userMap: Record<number, number> = {};
      userCountsRes.data?.forEach(r => { userMap[r.empresa_id] = (userMap[r.empresa_id] || 0) + 1; });

      const leadMap: Record<number, number> = {};
      leadCountsRes.data?.forEach(r => { leadMap[r.id_empresa] = (leadMap[r.id_empresa] || 0) + 1; });

      const funilMap: Record<number, number> = {};
      funisRes.data?.forEach(r => { funilMap[r.id_empresa] = (funilMap[r.id_empresa] || 0) + 1; });

      const configMap: Record<number, boolean | null> = {};
      configsRes.data?.forEach(r => { configMap[r.id_empresa] = r.crm_is_ativo; });

      setEmpresas(
        (empresasRes.data || []).map(e => ({
          ...e,
          userCount: userMap[e.id] || 0,
          leadCount: leadMap[e.id] || 0,
          funilCount: funilMap[e.id] || 0,
          crmAtivo: configMap[e.id] ?? null,
        }))
      );
    } catch (err) {
      console.error('Error fetching empresas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  const toggleAtivo = async (empresa: Empresa) => {
    const newAtivo = !empresa.ativo;
    const { error } = await supabase.from('empresas_geral').update({ ativo: newAtivo }).eq('id', empresa.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newAtivo ? 'Empresa ativada' : 'Empresa desativada' });
      fetchEmpresas();
    }
  };

  const filtered = empresas
    .filter(e => (e.nome ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aG = (a.nome ?? '').toLowerCase().includes('gustavo');
      const bG = (b.nome ?? '').toLowerCase().includes('gustavo');
      if (aG && !bG) return -1;
      if (!aG && bG) return 1;
      if (a.ativo && !b.ativo) return -1;
      if (!a.ativo && b.ativo) return 1;
      return (a.nome ?? '').localeCompare(b.nome ?? '');
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Empresa
        </Button>
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
            <div key={empresa.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{empresa.nome || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground truncate">{empresa.numero_automacao || 'Sem número'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <Badge variant={empresa.ativo ? 'default' : 'secondary'} className="hidden sm:inline-flex text-xs">
                  {empresa.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
                <Badge variant={empresa.crmAtivo ? 'default' : 'outline'} className="hidden sm:inline-flex text-xs">
                  CRM {empresa.crmAtivo ? 'On' : 'Off'}
                </Badge>
                <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                  <Users className="h-3 w-3 mr-1" />{empresa.userCount}
                </Badge>
                <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />{empresa.leadCount}
                </Badge>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">Opções</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setInviteEmpresa(empresa)}>
                      <Link2 className="h-4 w-4 mr-2" /> Convites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setUsersEmpresa(empresa)}>
                      <Users className="h-4 w-4 mr-2" /> Usuários
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleAtivo(empresa)}>
                      <Power className="h-4 w-4 mr-2" /> {empresa.ativo ? 'Desativar' : 'Ativar'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteEmpresa(empresa)}>
                      <Trash className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCompanyModal open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchEmpresas} />
      {inviteEmpresa && (
        <InviteModal open={!!inviteEmpresa} onOpenChange={open => { if (!open) setInviteEmpresa(null); }} empresa={inviteEmpresa} />
      )}
      <DeleteEmpresaModal empresa={deleteEmpresa} open={!!deleteEmpresa} onOpenChange={open => { if (!open) setDeleteEmpresa(null); }} onDeleted={fetchEmpresas} />
      {usersEmpresa && (
        <ManageUsersModal open={!!usersEmpresa} onOpenChange={open => { if (!open) setUsersEmpresa(null); }} empresa={usersEmpresa} />
      )}
    </div>
  );
}
