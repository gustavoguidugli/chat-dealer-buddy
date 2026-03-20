import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, Pencil, Trash2, ShieldAlert, Shield, User, KeyRound, Settings, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
interface UsuarioEmpresa {
  id: string;
  email: string;
  nome: string;
  role: string;
  isSuperAdmin: boolean;
  ativo: boolean;
  ultimoAcesso: string | null;
}

async function callManageUsers(body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke('manage-users', {
    body,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (res.error) throw new Error(res.error.message || 'Erro na operação');
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function ConfigUsuarios() {
  const { user, empresaId, empresaNome, isCompanyAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [callerRole, setCallerRole] = useState<string>('member');

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UsuarioEmpresa | null>(null);
  const [deleteUser, setDeleteUser] = useState<UsuarioEmpresa | null>(null);

  // Add form
  const [addForm, setAddForm] = useState({ nome: '', email: '', role: 'member', senha: '' });
  const [addLoading, setAddLoading] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ nome: '', email: '', role: 'member', ativo: true });
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteCounts, setDeleteCounts] = useState({ atividades: 0, leads: 0, anotacoes: 0, historico: 0 });
  const [deleteTransferTo, setDeleteTransferTo] = useState<string>('');
  const [deleteAction, setDeleteAction] = useState<'transfer' | 'unlink'>('unlink');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteCountsLoading, setDeleteCountsLoading] = useState(false);

  const callerIsSuperAdmin = isSuperAdmin;
  const canManage = callerIsSuperAdmin || callerRole === 'admin';

  // Fetch caller's actual role from user_empresa
  useEffect(() => {
    if (callerIsSuperAdmin) {
      setCallerRole('super_admin');
      return;
    }
    if (!user || !empresaId) return;
    (async () => {
      const { data } = await supabase
        .from('user_empresa')
        .select('role')
        .eq('user_id', user.id)
        .eq('empresa_id', empresaId)
        .maybeSingle();
      setCallerRole(data?.role || 'member');
    })();
  }, [user, empresaId, callerIsSuperAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_usuarios_empresa', { empresa_id_param: empresaId });
      if (error) throw error;
      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          nome: u.nome || u.email?.split('@')[0] || '',
          role: u.role || 'member',
          isSuperAdmin: checkSuperAdmin(u.email),
          ativo: !u.banned_until,
          ultimoAcesso: u.last_sign_in_at,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Group users
  const groups = {
    super_admin: users.filter(u => u.isSuperAdmin || u.role === 'super_admin'),
    admin: users.filter(u => !u.isSuperAdmin && u.role === 'admin'),
    member: users.filter(u => !u.isSuperAdmin && u.role === 'member'),
  };

  const getInitials = (nome: string) => nome.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

  const formatLastAccess = (date: string | null) => {
    if (!date) return 'Nunca acessou';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch { return 'Desconhecido'; }
  };

  // --- ADD USER ---
  const handleAdd = async () => {
    if (!empresaId || !addForm.nome.trim() || !addForm.email.trim() || !addForm.senha.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setAddLoading(true);
    try {
      await callManageUsers({
        action: 'create_user',
        email: addForm.email.trim(),
        password: addForm.senha,
        full_name: addForm.nome.trim(),
        role: addForm.role,
        empresa_id: empresaId,
      });
      toast({ title: 'Usuário criado com sucesso!' });
      setAddOpen(false);
      setAddForm({ nome: '', email: '', role: 'member', senha: '' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  // --- EDIT USER ---
  const openEdit = (u: UsuarioEmpresa) => {
    setEditUser(u);
    setEditForm({ nome: u.nome, email: u.email, role: u.role, ativo: u.ativo });
  };

  const handleEdit = async () => {
    if (!editUser || !empresaId) return;
    setEditLoading(true);
    try {
      await callManageUsers({
        action: 'edit_user',
        user_id: editUser.id,
        email: editForm.email.trim(),
        full_name: editForm.nome.trim(),
        role: callerRole === 'member' ? undefined : editForm.role,
        ativo: editForm.ativo,
        empresa_id: empresaId,
      });
      toast({ title: 'Usuário atualizado!' });
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  // --- DELETE USER ---
  const openDelete = async (u: UsuarioEmpresa) => {
    setDeleteUser(u);
    setDeleteAction('unlink');
    setDeleteTransferTo('');
    setDeleteCountsLoading(true);
    try {
      const counts = await callManageUsers({
        action: 'get_user_counts',
        user_id: u.id,
        empresa_id: empresaId,
      });
      setDeleteCounts(counts);
    } catch {
      setDeleteCounts({ atividades: 0, leads: 0, anotacoes: 0, historico: 0 });
    } finally {
      setDeleteCountsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser || !empresaId) return;
    setDeleteLoading(true);
    try {
      await callManageUsers({
        action: 'delete_user',
        user_id: deleteUser.id,
        empresa_id: empresaId,
        transfer_to: deleteAction === 'transfer' && deleteTransferTo ? deleteTransferTo : null,
      });
      toast({ title: 'Usuário excluído com sucesso!' });
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await callManageUsers({ action: 'reset_password', email });
      toast({ title: 'Email de reset enviado!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const totalRecords = deleteCounts.atividades + deleteCounts.leads + deleteCounts.anotacoes + deleteCounts.historico;
  const transferableUsers = users.filter(u => u.id !== deleteUser?.id && !u.isSuperAdmin);

  const renderGroup = (title: string, icon: React.ReactNode, badgeClass: string, borderClass: string, groupUsers: UsuarioEmpresa[]) => {
    if (groupUsers.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">{groupUsers.length}</Badge>
        </div>
        <div className="space-y-2">
          {groupUsers.map(u => (
            <Card key={u.id} className={`border-l-4 ${borderClass}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-xs bg-muted">{getInitials(u.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={u.ativo ? 'default' : 'destructive'} className="text-[10px] h-5">
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Último acesso: {formatLastAccess(u.ultimoAcesso)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge className={badgeClass}>
                    {u.isSuperAdmin ? 'Super' : u.role === 'admin' ? 'Admin' : 'Membro'}
                  </Badge>
                  {!u.isSuperAdmin && canManage && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {callerRole !== 'member' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(u)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                  {u.isSuperAdmin && (
                    <span className="text-[10px] text-muted-foreground italic ml-2">protegido</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Configurações</span>
          <span>/</span>
          <span className="text-foreground font-medium">Usuários</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Usuários {empresaNome && `— ${empresaNome}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os usuários vinculados à empresa
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            {renderGroup(
              'Super Admin',
              <ShieldAlert className="h-4 w-4 text-red-500" />,
              'bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/15',
              'border-l-red-500',
              groups.super_admin
            )}
            {renderGroup(
              'Admins',
              <Shield className="h-4 w-4 text-yellow-500" />,
              'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/15',
              'border-l-yellow-500',
              groups.admin
            )}
            {renderGroup(
              'Membros',
              <User className="h-4 w-4 text-green-500" />,
              'bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15',
              'border-l-green-500',
              groups.member
            )}
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Nenhum usuário encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
            <DialogDescription>Crie uma nova conta de usuário para esta empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={addForm.nome} onChange={e => setAddForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Permissão *</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Gerente da empresa</SelectItem>
                  <SelectItem value="member">Membro — Vendedor/Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Senha temporária *</Label>
              <Input type="password" value={addForm.senha} onChange={e => setAddForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addLoading}>
              {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editUser} onOpenChange={o => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário — {editUser?.nome}</DialogTitle>
            <DialogDescription>Atualize as informações do usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {callerRole !== 'member' && (
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={editForm.ativo ? 'ativo' : 'inativo'} onValueChange={v => setEditForm(f => ({ ...f, ativo: v === 'ativo' }))}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ativo" id="ativo" />
                    <Label htmlFor="ativo">Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="inativo" id="inativo" />
                    <Label htmlFor="inativo">Inativo</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <Button variant="outline" className="w-full" onClick={() => editUser && handleResetPassword(editUser.email)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Resetar Senha
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <AlertDialog open={!!deleteUser} onOpenChange={o => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir {deleteUser?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {deleteCountsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : totalRecords > 0 ? (
                  <>
                    <p>Este usuário possui:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {deleteCounts.atividades > 0 && <li>{deleteCounts.atividades} atividades atribuídas</li>}
                      {deleteCounts.leads > 0 && <li>{deleteCounts.leads} leads como proprietário</li>}
                      {deleteCounts.anotacoes > 0 && <li>{deleteCounts.anotacoes} anotações criadas</li>}
                      {deleteCounts.historico > 0 && <li>{deleteCounts.historico} registros no histórico</li>}
                    </ul>
                    <div className="space-y-3">
                      <p className="font-medium">O que fazer com esses dados?</p>
                      <RadioGroup value={deleteAction} onValueChange={v => setDeleteAction(v as any)}>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="transfer" id="transfer" />
                          <Label htmlFor="transfer">Transferir para outro usuário</Label>
                        </div>
                        {deleteAction === 'transfer' && (
                          <Select value={deleteTransferTo} onValueChange={setDeleteTransferTo}>
                            <SelectTrigger className="ml-6"><SelectValue placeholder="Selecione usuário" /></SelectTrigger>
                            <SelectContent>
                              {transferableUsers.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.nome} ({u.email})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="unlink" id="unlink" />
                          <Label htmlFor="unlink">Desvincular (sem proprietário)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                ) : (
                  <p>Este usuário não possui registros vinculados.</p>
                )}
                <p className="text-sm font-medium text-destructive">⚠️ Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading || (deleteAction === 'transfer' && !deleteTransferTo)}
              onClick={handleDelete}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
