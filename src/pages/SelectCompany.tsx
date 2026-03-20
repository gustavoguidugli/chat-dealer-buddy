import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Loader2, Trash, MoreVertical } from 'lucide-react';
import logoEcoIce from '@/assets/logo-ecoice.png';
import { useToast } from '@/hooks/use-toast';
import { DeleteEmpresaModal } from '@/components/DeleteEmpresaModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Empresa {
  id: number;
  nome: string | null;
  numero_automacao: string | null;
  userCount: number;
}

export default function SelectCompany() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteEmpresa, setDeleteEmpresa] = useState<Empresa | null>(null);
  const { setEmpresa, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empresas_geral')
      .select('id, nome, numero_automacao')
      .order('nome');

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar empresas', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: counts } = await supabase.from('user_empresa').select('empresa_id');
    const countMap: Record<number, number> = {};
    counts?.forEach(row => { countMap[row.empresa_id] = (countMap[row.empresa_id] || 0) + 1; });

    setEmpresas((data || []).map(e => ({ ...e, userCount: countMap[e.id] || 0 })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/home', { replace: true });
      return;
    }
    fetchEmpresas();
  }, [isSuperAdmin]);

  const filtered = empresas.filter(e =>
    (e.nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (empresa: Empresa) => {
    setEmpresa(empresa.id, empresa.nome ?? 'Sem nome');
    navigate('/home');
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <img src={logoEcoIce} alt="Eco Ice" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Selecione uma empresa</h1>
              <p className="text-sm text-muted-foreground">Escolha a empresa que deseja gerenciar</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma empresa encontrada</p>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {filtered.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleSelect(empresa)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {empresa.nome ?? 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {empresa.numero_automacao || 'Sem número'}
                    </p>
                  </div>

                  <Badge variant="secondary" className="shrink-0 text-xs hidden sm:inline-flex">
                    {empresa.userCount} usuário{empresa.userCount !== 1 ? 's' : ''}
                  </Badge>

                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="left">Opções</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteEmpresaModal
        empresa={deleteEmpresa}
        open={!!deleteEmpresa}
        onOpenChange={open => { if (!open) setDeleteEmpresa(null); }}
        onDeleted={fetchEmpresas}
      />
    </TooltipProvider>
  );
}
