import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Link2, Pencil, Power, Building2, Users, Trash } from 'lucide-react';
import { CreateCompanyModal } from '@/components/CreateCompanyModal';
import { InviteModal } from '@/components/InviteModal';
import { DeleteEmpresaModal } from '@/components/DeleteEmpresaModal';
import { Navigate } from 'react-router-dom';

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

      // Get user counts per empresa
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

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
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

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-full" />
              </CardContent></Card>
            ))}
          </div>
        ) : empresas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeira empresa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {empresas.map(empresa => (
              <Card key={empresa.id} className="relative">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{empresa.nome || 'Sem nome'}</h3>
                      {empresa.numero_automacao && (
                        <p className="text-sm text-muted-foreground mt-0.5">{empresa.numero_automacao}</p>
                      )}
                    </div>
                    <Badge variant={empresa.ativo ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {empresa.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{empresa.userCount} usuário{empresa.userCount !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setInviteEmpresa(empresa)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Convites
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAtivo(empresa)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteEmpresa(empresa)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
