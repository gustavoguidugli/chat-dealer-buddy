import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Trash2, UserX, ShieldAlert, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/constants';

interface UsuarioEmpresa {
  id: string;
  email: string;
  nome: string;
  role: string;
  isSuperAdmin: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: { id: number; nome: string | null };
}

export function ManageUsersModal({ open, onOpenChange, empresa }: Props) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialogs
  const [roleConfirm, setRoleConfirm] = useState<UsuarioEmpresa | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<UsuarioEmpresa | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_usuarios_empresa', {
        empresa_id_param: empresa.id,
      });

      if (error) throw error;

      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          nome: u.nome || u.email?.split('@')[0] || '',
          role: u.role || 'member',
          isSuperAdmin: SUPER_ADMIN_EMAILS.includes(u.email ?? ''),
        }))
      );
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [empresa.id]);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open, fetchUsers]);

  const handleToggleRole = async (user: UsuarioEmpresa) => {
    if (user.isSuperAdmin) return;

    const newRole = user.role === 'admin' ? 'member' : 'admin';
    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: user.id,
        p_empresa_id: empresa.id,
        p_new_role: newRole,
      });

      if (error) throw error;

      toast({ title: `Permissão alterada para ${newRole === 'admin' ? 'Admin' : 'Membro'}` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRoleConfirm(null);
    }
  };

  const handleRemoveUser = async (user: UsuarioEmpresa) => {
    if (user.isSuperAdmin || deleteConfirmText !== 'EXCLUIR') return;

    try {
      const { error } = await supabase.rpc('remove_user_from_empresa', {
        p_user_id: user.id,
        p_empresa_id: empresa.id,
      });

      if (error) throw error;

      toast({ title: 'Usuário removido da empresa' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRemoveConfirm(null);
      setDeleteConfirmText('');
    }
  };

  const getRoleBadge = (user: UsuarioEmpresa) => {
    if (user.isSuperAdmin) {
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/15">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Super
        </Badge>
      );
    }
    if (user.role === 'admin') {
      return (
        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/15">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15">
        <User className="h-3 w-3 mr-1" />
        Membro
      </Badge>
    );
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Usuários — {empresa.nome}</DialogTitle>
            <DialogDescription>Gerencie os usuários vinculados a esta empresa.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário vinculado.</p>
            ) : (
              users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials(user.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getRoleBadge(user)}

                    {!user.isSuperAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={user.role === 'admin' ? 'Tornar Membro' : 'Tornar Admin'}
                          onClick={() => setRoleConfirm(user)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Remover da empresa"
                          onClick={() => setRemoveConfirm(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {user.isSuperAdmin && (
                      <span className="text-[10px] text-muted-foreground italic">protegido</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Toggle role confirmation */}
      <AlertDialog open={!!roleConfirm} onOpenChange={o => { if (!o) setRoleConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar permissão?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleConfirm && (
                <>
                  <strong>{roleConfirm.nome}</strong> será alterado para{' '}
                  <strong>{roleConfirm.role === 'admin' ? 'Membro' : 'Admin'}</strong>.
                  {roleConfirm.role !== 'admin'
                    ? ' O usuário poderá gerenciar a empresa.'
                    : ' O usuário terá acessos limitados.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => roleConfirm && handleToggleRole(roleConfirm)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove user confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={o => { if (!o) { setRemoveConfirm(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Remover usuário da empresa?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{removeConfirm?.nome}</strong> ({removeConfirm?.email}) será removido
                  da empresa <strong>{empresa.nome}</strong>.
                </p>
                <p className="font-medium">Digite <strong>EXCLUIR</strong> para confirmar:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== 'EXCLUIR'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeConfirm && handleRemoveUser(removeConfirm)}
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
