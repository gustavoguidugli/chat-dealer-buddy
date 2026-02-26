import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, CheckCircle2, XCircle, Plus, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Convite {
  id: string;
  token: string;
  email_destino: string | null;
  tipo: string;
  max_usos: number | null;
  usos_atuais: number | null;
  ativo: boolean | null;
  created_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: { id: number; nome: string | null };
}

export function InviteModal({ open, onOpenChange, empresa }: Props) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('convites')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('tipo', 'link')
        .order('created_at', { ascending: false })
        .limit(20);

      setInvites((data as unknown as Convite[]) ?? []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [empresa.id]);

  useEffect(() => {
    if (open) fetchInvites();
  }, [open, fetchInvites]);

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
  };

  const createInvite = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setCreating(true);
    try {
      const { error } = await supabase.from('convites').insert({
        empresa_id: empresa.id,
        tipo: 'link',
        max_usos: 1,
        email_destino: email,
      } as any);

      if (error) throw error;

      toast({ title: 'Convite criado!', description: `Convite para ${email}` });
      setNewEmail('');
      setShowForm(false);
      await fetchInvites();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Convites — {empresa.nome}</DialogTitle>
          <DialogDescription>Gere convites vinculados a um email específico.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Create new invite */}
          {showForm ? (
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Novo Convite</h4>
              <div className="space-y-1">
                <Label className="text-xs">Email do destinatário</Label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setNewEmail(''); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={createInvite} disabled={creating || !newEmail.trim()}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Criar Convite
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Novo Convite
            </Button>
          )}

          {/* List of invites */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum convite criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {invites.map(invite => {
                const used = (invite.usos_atuais ?? 0) >= (invite.max_usos ?? 1);
                const inactive = !invite.ativo;
                const isExpired = used || inactive;

                return (
                  <div key={invite.id} className={`rounded-lg border p-3 space-y-2 ${isExpired ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {invite.email_destino || 'Sem email'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isExpired ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {isExpired ? 'Usado' : 'Disponível'}
                        </span>
                      </div>
                    </div>
                    {!isExpired && (
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={`${window.location.origin}/invite?token=${invite.token}`}
                          className="bg-muted text-xs h-8"
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyLink(invite.token)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
