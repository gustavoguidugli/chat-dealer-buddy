import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Convite {
  id: string;
  token: string;
  codigo: string | null;
  tipo: string;
  max_usos: number | null;
  usos_atuais: number | null;
  ativo: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: { id: number; nome: string | null };
}

export function InviteModal({ open, onOpenChange, empresa }: Props) {
  const { toast } = useToast();
  const [linkInvite, setLinkInvite] = useState<Convite | null>(null);
  const [codeInvite, setCodeInvite] = useState<Convite | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingLink, setRegeneratingLink] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newMaxUsos, setNewMaxUsos] = useState(5);
  const [showCodeForm, setShowCodeForm] = useState(false);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const { data: linkData } = await supabase
        .from('convites')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('tipo', 'link')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLinkInvite(linkData);

      const { data: codeData } = await supabase
        .from('convites')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('tipo', 'codigo')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCodeInvite(codeData);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [empresa.id]);

  useEffect(() => {
    if (open) fetchInvites();
  }, [open, fetchInvites]);

  const copyLink = () => {
    if (!linkInvite) return;
    const link = `${window.location.origin}/signup?invite=${linkInvite.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
  };

  const copyCode = () => {
    if (!codeInvite?.codigo) return;
    navigator.clipboard.writeText(codeInvite.codigo);
    toast({ title: 'Código copiado!' });
  };

  const regenerateLink = async () => {
    setRegeneratingLink(true);
    try {
      if (linkInvite) {
        await supabase.from('convites').update({ ativo: false }).eq('id', linkInvite.id);
      }
      await supabase.from('convites').insert({
        empresa_id: empresa.id,
        tipo: 'link',
        max_usos: 1,
      });
      toast({ title: 'Novo link gerado!' });
      await fetchInvites();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingLink(false);
    }
  };

  const createNewCode = async () => {
    if (!newCode.trim()) return;
    setRegeneratingCode(true);
    try {
      if (codeInvite) {
        await supabase.from('convites').update({ ativo: false }).eq('id', codeInvite.id);
      }
      await supabase.from('convites').insert({
        empresa_id: empresa.id,
        tipo: 'codigo',
        codigo: newCode.trim().toUpperCase(),
        max_usos: newMaxUsos,
      });
      toast({ title: 'Novo código gerado!' });
      setShowCodeForm(false);
      setNewCode('');
      setNewMaxUsos(5);
      await fetchInvites();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingCode(false);
    }
  };

  const linkAvailable = linkInvite && (linkInvite.usos_atuais ?? 0) < (linkInvite.max_usos ?? 1);
  const codeUsosRestantes = codeInvite
    ? (codeInvite.max_usos ?? 0) - (codeInvite.usos_atuais ?? 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convites — {empresa.nome}</DialogTitle>
          <DialogDescription>Gerencie links e códigos de convite para esta empresa.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Link Section */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Link de Convite (Uso único)</h4>
              {linkInvite ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/signup?invite=${linkInvite.token}`}
                      className="bg-muted text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm">
                      {linkAvailable ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">
                            Disponível ({linkInvite.usos_atuais ?? 0}/{linkInvite.max_usos ?? 1} usos)
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-muted-foreground">Já utilizado</span>
                        </>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={regenerateLink} disabled={regeneratingLink}>
                      {regeneratingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Gerar Novo
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Nenhum link ativo</p>
                  <Button variant="outline" size="sm" onClick={regenerateLink} disabled={regeneratingLink}>
                    {regeneratingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Gerar Link
                  </Button>
                </div>
              )}
            </div>

            {/* Code Section */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Código de Convite (Múltiplos usos)</h4>
              {codeInvite ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={codeInvite.codigo ?? ''} className="bg-muted font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copyCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {codeUsosRestantes}/{codeInvite.max_usos ?? 0} usos disponíveis
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowCodeForm(true)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Gerar Novo
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Nenhum código ativo</p>
                  <Button variant="outline" size="sm" onClick={() => setShowCodeForm(true)}>
                    Criar Código
                  </Button>
                </div>
              )}

              {showCodeForm && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Código</Label>
                    <Input
                      placeholder="Ex: MINHA_EMPRESA2024"
                      value={newCode}
                      onChange={e => setNewCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Máximo de usos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newMaxUsos}
                      onChange={e => setNewMaxUsos(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowCodeForm(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={createNewCode} disabled={regeneratingCode || !newCode.trim()}>
                      {regeneratingCode && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Criar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
