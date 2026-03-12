import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, UserPlus, Shield, ShieldAlert, RefreshCw, XCircle, Eye, RotateCcw, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InviteTeamModal } from '@/components/InviteTeamModal';

interface TeamMember {
  id: number;
  id_usuario: string;
  role: string;
  status_membro: string;
  joined_at: string;
  email: string | null;
  nome: string | null;
  primeiro_nome: string | null;
  sobrenome: string | null;
}

interface Convite {
  id: string;
  email_destino: string;
  status_convite: string;
  expira_em: string | null;
  role: string;
  created_at: string;
  accepted_by_user_id: string | null;
  token: string;
}

const roleLabel: Record<string, string> = { admin: 'Admin', member: 'Membro', user: 'Membro' };
const statusLabel: Record<string, string> = { active: 'Ativo', suspended: 'Suspenso', deactivated: 'Desativado' };
const conviteStatusLabel: Record<string, string> = { pending: 'Pendente', accepted: 'Aceito', expired: 'Expirado', canceled: 'Cancelado' };

const statusColor: Record<string, string> = {
  active: 'bg-accent/20 text-accent border-accent/30',
  suspended: 'bg-destructive/20 text-destructive border-destructive/30',
};
const conviteStatusColor: Record<string, string> = {
  pending: 'bg-primary/20 text-primary border-primary/30',
  accepted: 'bg-accent/20 text-accent border-accent/30',
  expired: 'bg-muted text-muted-foreground border-border',
  canceled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export default function MeuTime() {
  const { user, empresaId, empresaNome } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingConvites, setLoadingConvites] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState('user');

  const fetchMembers = useCallback(async () => {
    if (!empresaId) return;
    setLoadingMembers(true);
    const { data, error } = await supabase
      .rpc('get_team_members', { p_empresa_id: empresaId });

    if (!error && data) setMembers(data as TeamMember[]);
    setLoadingMembers(false);
  }, [empresaId]);

  const fetchConvites = useCallback(async () => {
    if (!empresaId) return;
    setLoadingConvites(true);

    // Expire pending invites that have passed their expiration
    await supabase
      .from('convites')
      .update({ status_convite: 'expired' })
      .eq('empresa_id', empresaId)
      .eq('status_convite', 'pending')
      .lt('expira_em', new Date().toISOString());

    const { data, error } = await supabase
      .from('convites')
      .select('id, email_destino, status_convite, expira_em, role, created_at, accepted_by_user_id, token')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (!error && data) setConvites(data as Convite[]);
    setLoadingConvites(false);
  }, [empresaId]);

  useEffect(() => {
    fetchMembers();
    fetchConvites();
  }, [fetchMembers, fetchConvites]);

  const logAudit = async (action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert([{
      actor_user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: (metadata as any) ?? null,
    }]);
  };

  const getMemberName = (m: TeamMember) => {
    if (m.primeiro_nome) return `${m.primeiro_nome} ${m.sobrenome ?? ''}`.trim();
    return m.nome ?? m.email ?? '—';
  };

  // Member actions
  const handleChangeRole = async () => {
    if (!selectedMember || !empresaId) return;
    // Sync role in user_empresa (the authoritative table for RLS)
    const { error: rpcError } = await supabase.rpc('update_user_role', {
      p_user_id: selectedMember.id_usuario,
      p_empresa_id: empresaId,
      p_new_role: newRole,
    });
    if (rpcError) {
      toast({ title: 'Erro ao alterar permissão', description: rpcError.message, variant: 'destructive' });
      return;
    }
    // Also sync usuario_time for display consistency
    await supabase.from('usuario_time').update({ role: newRole }).eq('id', selectedMember.id);
    await logAudit('role_changed', 'usuario_time', String(selectedMember.id), { new_role: newRole });
    toast({ title: 'Permissão alterada com sucesso' });
    setRoleModalOpen(false);
    fetchMembers();
  };

  const handleSuspend = async (m: TeamMember) => {
    await supabase.from('usuario_time').update({ status_membro: 'suspended' }).eq('id', m.id);
    await logAudit('member_suspended', 'usuario_time', String(m.id));
    toast({ title: 'Usuário suspenso' });
    fetchMembers();
  };

  const handleReactivate = async (m: TeamMember) => {
    await supabase.from('usuario_time').update({ status_membro: 'active' }).eq('id', m.id);
    await logAudit('member_reactivated', 'usuario_time', String(m.id));
    toast({ title: 'Usuário reativado' });
    fetchMembers();
  };

  const handleRemove = async (m: TeamMember) => {
    await supabase.from('usuario_time').update({ status_membro: 'deactivated' }).eq('id', m.id);
    await logAudit('member_removed', 'usuario_time', String(m.id));
    toast({ title: 'Usuário removido do time' });
    fetchMembers();
  };

  // Convite actions
  const handleCancelConvite = async (c: Convite) => {
    await supabase.from('convites').update({ status_convite: 'canceled', canceled_at: new Date().toISOString() }).eq('id', c.id);
    await logAudit('invite_canceled', 'convites', c.id);
    toast({ title: 'Convite cancelado' });
    fetchConvites();
  };

  const handleResendConvite = async (c: Convite) => {
    if (!empresaId || !user) return;

    // Cancel the old invite
    await supabase.from('convites').update({
      status_convite: 'canceled',
      canceled_at: new Date().toISOString(),
    }).eq('id', c.id);

    // Create a new invite
    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const { data: newConvite, error } = await supabase.from('convites').insert({
      empresa_id: empresaId,
      email_destino: c.email_destino,
      role: c.role,
      tipo: 'email',
      expira_em: newExpiry,
      criado_por: user.id,
      status_convite: 'pending',
      ativo: true,
      max_usos: 1,
    }).select('id').single();

    if (error || !newConvite) {
      toast({ title: 'Erro ao reenviar convite', variant: 'destructive' });
      return;
    }

    // Send email
    try {
      await supabase.functions.invoke('send-invitation-email', {
        body: {
          convite_id: newConvite.id,
          email_destino: c.email_destino,
          empresa_nome: empresaNome ?? 'Eco Ice',
          role: c.role,
        },
      });
    } catch { /* ignore */ }

    await logAudit('invite_resent', 'convites', newConvite.id);
    toast({ title: 'Convite reenviado' });
    fetchConvites();
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Time</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os membros e convites do seu time</p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Enviar convite
          </Button>
        </div>

        <Tabs defaultValue="usuarios">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários ativos</TabsTrigger>
            <TabsTrigger value="convites">Convites</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMembers ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                  ) : members.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum membro encontrado</TableCell></TableRow>
                  ) : members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{getMemberName(m)}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {m.role === 'admin' ? <ShieldAlert className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {roleLabel[m.role] ?? m.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[m.status_membro] ?? ''}>
                          {statusLabel[m.status_membro] ?? m.status_membro}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedMember(m); setNewRole(m.role); setRoleModalOpen(true); }}>
                              Alterar permissão
                            </DropdownMenuItem>
                            {m.status_membro === 'active' && (
                              <DropdownMenuItem onClick={() => handleSuspend(m)}>Suspender</DropdownMenuItem>
                            )}
                            {m.status_membro === 'suspended' && (
                              <DropdownMenuItem onClick={() => handleReactivate(m)}>Reativar</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(m)}>
                              Remover do time
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="convites">
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiração</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingConvites ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                  ) : convites.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum convite encontrado</TableCell></TableRow>
                  ) : convites.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.email_destino}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={conviteStatusColor[c.status_convite] ?? ''}>
                          {conviteStatusLabel[c.status_convite] ?? c.status_convite}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.expira_em ? format(new Date(c.expira_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                      </TableCell>
                      <TableCell>{roleLabel[c.role] ?? c.role}</TableCell>
                      <TableCell>
                        {c.status_convite === 'pending' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar link do convite" onClick={() => {
                              const publishedUrl = 'https://eco-ice.app.br';
                              const link = `${publishedUrl}/onboarding?token=${c.token}`;
                              navigator.clipboard.writeText(link);
                              toast({ title: 'Link copiado!' });
                            }}>
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Reenviar" onClick={() => handleResendConvite(c)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar" onClick={() => handleCancelConvite(c)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {c.status_convite === 'expired' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reenviar" onClick={() => handleResendConvite(c)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status_convite === 'accepted' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver usuário" disabled>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status_convite === 'canceled' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Recriar" onClick={() => handleResendConvite(c)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Role change modal */}
        <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar permissão</DialogTitle>
            </DialogHeader>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleChangeRole}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <InviteTeamModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          onSuccess={() => { fetchConvites(); fetchMembers(); }}
        />
      </div>
    </AppLayout>
  );
}
