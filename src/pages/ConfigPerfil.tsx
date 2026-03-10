import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Pencil, Check, X, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Mail, Plus, Trash2 } from 'lucide-react';

interface UsuarioData {
  primeiro_nome: string | null;
  sobrenome: string | null;
  nome: string | null;
  email_secundario: string | null;
}

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch { /* toast handled upstream */ }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground">{value || '—'}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-border last:border-0 space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={draft} onChange={e => setDraft(e.target.value)} className="h-9" autoFocus />
        <Button size="sm" onClick={handleSave} disabled={!draft.trim() || saving} className="h-9 px-3">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value); }} className="h-9 px-3">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const checks = {
    length: newPw.length >= 8,
    upper: /[A-Z]/.test(newPw),
    lower: /[a-z]/.test(newPw),
    number: /[0-9]/.test(newPw),
    special: /[^A-Za-z0-9]/.test(newPw),
  };
  const allValid = Object.values(checks).every(Boolean);
  const match = newPw === confirm && confirm.length > 0;
  const canSave = allValid && match && current.length > 0;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message.includes('incorrect') ? 'Senha incorreta' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha alterada com sucesso' });
      onClose();
    }
  };

  const reset = () => { setCurrent(''); setNewPw(''); setConfirm(''); setShowNew(false); setShowConfirm(false); };

  useEffect(() => { if (!open) reset(); }, [open]);

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className={ok ? 'text-accent' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Senha atual</Label>
            <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div>
            <Label>Nova senha</Label>
            <div className="relative">
              <Input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <div className="relative">
              <Input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm.length > 0 && !match && <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <CheckItem ok={checks.length} label="Mínimo 8 caracteres" />
            <CheckItem ok={checks.upper} label="Letra maiúscula" />
            <CheckItem ok={checks.lower} label="Letra minúscula" />
            <CheckItem ok={checks.number} label="Número" />
            <CheckItem ok={checks.special} label="Caractere especial" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ConfigPerfil() {
  const { user } = useAuth();
  const [data, setData] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);

  // Email principal
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [emailOriginal, setEmailOriginal] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Email secundário
  const [novoSecundario, setNovoSecundario] = useState('');
  const [savingSecundario, setSavingSecundario] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmailPrincipal(user.email ?? '');
    setEmailOriginal(user.email ?? '');
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: d } = await supabase.from('usuarios').select('*').eq('uuid', user.id).single();
    if (d) setData({ primeiro_nome: d.primeiro_nome, sobrenome: d.sobrenome, nome: d.nome, email_secundario: d.email_secundario });
    setLoading(false);
  };

  const updateField = async (updates: Record<string, string>) => {
    if (!user) return;
    const { error } = await supabase.from('usuarios').update(updates).eq('uuid', user.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Atualizado com sucesso' });
    await fetchData();
  };

  const handleSaveEmail = async () => {
    if (!emailPrincipal.trim() || emailPrincipal === emailOriginal) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPrincipal)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: emailPrincipal });
    setSavingEmail(false);
    if (error) {
      toast({ title: 'Erro', description: error.message.includes('already') ? 'Este e-mail já está em uso' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Um e-mail de confirmação foi enviado para o novo endereço' });
    }
  };

  const handleAddSecundario = async () => {
    if (!novoSecundario.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoSecundario)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    setSavingSecundario(true);
    await updateField({ email_secundario: novoSecundario.trim() });
    setNovoSecundario('');
    setSavingSecundario(false);
  };

  const handleRemoveSecundario = async () => {
    setSavingSecundario(true);
    if (!user) return;
    const { error } = await supabase.from('usuarios').update({ email_secundario: null }).eq('uuid', user.id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email secundário removido' });
      await fetchData();
    }
    setSavingSecundario(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração de perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais e a segurança da sua conta.</p>
        </div>

        {/* Seção 1 — Informações pessoais */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold text-foreground mb-2">Informações pessoais</h2>

            <EditableField
              label="Nome"
              value={data?.primeiro_nome ?? ''}
              onSave={async v => updateField({ primeiro_nome: v, nome: `${v} ${data?.sobrenome ?? ''}`.trim() })}
            />
            <EditableField
              label="Sobrenome"
              value={data?.sobrenome ?? ''}
              onSave={async v => updateField({ sobrenome: v, nome: `${data?.primeiro_nome ?? ''} ${v}`.trim() })}
            />

            {/* Senha */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-xs text-muted-foreground">Senha</p>
                <p className="text-sm font-medium text-foreground tracking-widest">••••••••••</p>
              </div>
              <button onClick={() => setPwOpen(true)} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2 — E-mails */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-base font-semibold text-foreground">Contas associadas a emails</h2>

            {/* Email principal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Email principal</Label>
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              </div>
              <div className="flex items-center gap-2">
                <Input value={emailPrincipal} onChange={e => setEmailPrincipal(e.target.value)} className="h-9" />
                <Button size="sm" onClick={handleSaveEmail} disabled={emailPrincipal === emailOriginal || savingEmail} className="h-9 shrink-0">
                  {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Email secundário */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Emails secundários</Label>

              {data?.email_secundario && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                    <Mail className="h-3 w-3" />
                    {data.email_secundario}
                    <button onClick={handleRemoveSecundario} disabled={savingSecundario} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                      {savingSecundario ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </span>
                </div>
              )}

              {!data?.email_secundario && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Escreva um email..."
                    value={novoSecundario}
                    onChange={e => setNovoSecundario(e.target.value)}
                    className="h-9"
                  />
                  <Button size="sm" onClick={handleAddSecundario} disabled={!novoSecundario.trim() || savingSecundario} className="h-9 shrink-0 gap-1">
                    {savingSecundario ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Adicionar</>}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </AppLayout>
  );
}
