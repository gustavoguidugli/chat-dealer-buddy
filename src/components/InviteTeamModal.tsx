import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X, Plus, Loader2 } from 'lucide-react';

interface InviteRow {
  email: string;
  role: string;
  error: string;
}

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteTeamModal({ open, onOpenChange, onSuccess }: InviteTeamModalProps) {
  const { user, empresaId, empresaNome } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'user', error: '' }]);
  const [sending, setSending] = useState(false);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !empresaId) return;
    setRows([{ email: '', role: 'user', error: '' }]);

    // Load existing members and pending invites for validation
    (async () => {
      const [membersRes, invitesRes] = await Promise.all([
        supabase.from('usuario_time').select('usuarios(email)').eq('id_empresa', empresaId).eq('status_membro', 'active'),
        supabase.from('convites').select('email_destino').eq('empresa_id', empresaId).eq('status_convite', 'pending'),
      ]);
      setExistingMembers((membersRes.data ?? []).map((m: any) => m.usuarios?.email?.toLowerCase()).filter(Boolean));
      setPendingInvites((invitesRes.data ?? []).map((c: any) => c.email_destino?.toLowerCase()).filter(Boolean));
    })();
  }, [open, empresaId]);

  const validate = (idx: number, allRows: InviteRow[]): string => {
    const email = allRows[idx].email.trim().toLowerCase();
    if (!email) return '';
    if (!emailRegex.test(email)) return 'E-mail inválido';
    const dupes = allRows.filter((r, i) => i !== idx && r.email.trim().toLowerCase() === email);
    if (dupes.length > 0) return 'E-mail duplicado';
    if (existingMembers.includes(email)) return 'Já é membro do time';
    if (pendingInvites.includes(email)) return 'Já tem um convite pendente';
    return '';
  };

  const updateRow = (idx: number, field: keyof InviteRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Revalidate all rows on email change
      if (field === 'email') {
        return updated.map((r, i) => ({ ...r, error: validate(i, updated) }));
      }
      return updated;
    });
  };

  const addRow = () => {
    if (rows.length >= 20) return;
    setRows(prev => [...prev, { email: '', role: 'user', error: '' }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((r, i) => ({ ...r, error: validate(i, updated) }));
    });
  };

  const validRows = rows.filter(r => r.email.trim() && !r.error && emailRegex.test(r.email.trim()));

  const handleSubmit = async () => {
    if (!empresaId || !user || validRows.length === 0) return;
    setSending(true);

    try {
      const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const inserts = validRows.map(r => ({
        empresa_id: empresaId,
        email_destino: r.email.trim().toLowerCase(),
        role: r.role,
        tipo: 'email',
        expira_em: expiry,
        criado_por: user.id,
        status_convite: 'pending',
        ativo: true,
        max_usos: 1,
      }));

      const { data: inserted, error } = await supabase.from('convites').insert(inserts).select('id');
      if (error) throw error;

      // Call edge function for each invite
      if (inserted) {
        for (const inv of inserted) {
          const row = validRows[inserted.indexOf(inv)];
          try {
            await supabase.functions.invoke('send-invitation-email', {
              body: {
                convite_id: inv.id,
                email_destino: row?.email.trim().toLowerCase(),
                empresa_nome: empresaNome ?? 'Eco Ice',
                role: row?.role,
              },
            });
          } catch { /* ignore */ }
        }
      }

      // Audit log
      for (const inv of inserted ?? []) {
        await supabase.from('audit_logs').insert({
          actor_user_id: user.id,
          action: 'invite_sent',
          entity_type: 'convites',
          entity_id: inv.id,
        });
      }

      toast({ title: 'Convites enviados com sucesso' });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar convites', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar para o time</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="email@empresa.com"
                  value={row.email}
                  onChange={e => updateRow(idx, 'email', e.target.value)}
                  disabled={sending}
                />
                {row.error && <p className="text-xs text-destructive">{row.error}</p>}
              </div>
              <Select value={row.role} onValueChange={v => updateRow(idx, 'role', v)} disabled={sending}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              {rows.length > 1 && (
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeRow(idx)} disabled={sending}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRow} disabled={rows.length >= 20 || sending} className="gap-1 mt-1">
          <Plus className="h-4 w-4" /> Adicionar e-mail
        </Button>
        <p className="text-xs text-muted-foreground">Você pode adicionar até 20 e-mails por envio</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={validRows.length === 0 || sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar convite{validRows.length > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
