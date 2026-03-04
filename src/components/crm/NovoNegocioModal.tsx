import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { LeadCard } from '@/pages/CrmFunil';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: number;
  etapas: { id: number; nome: string }[];
  empresaId: number;
  onCreated: (lead: LeadCard) => void;
  defaultEtapaId?: number | null;
}

export function NovoNegocioModal({ open, onOpenChange, funilId, etapas, empresaId, onCreated, defaultEtapaId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [etapaId, setEtapaId] = useState((defaultEtapaId ?? etapas[0]?.id)?.toString() || '');
  const [valorEstimado, setValorEstimado] = useState('');
  const [empresaCliente, setEmpresaCliente] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEtapaId((defaultEtapaId ?? etapas[0]?.id)?.toString() || '');
    }
  }, [open, defaultEtapaId, etapas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('leads_crm')
      .insert({
        nome: nome.trim(),
        whatsapp: whatsapp.trim() || null,
        empresa_cliente: empresaCliente.trim() || null,
        valor_estimado: valorEstimado ? Number(valorEstimado) : null,
        id_funil: funilId,
        id_etapa_atual: Number(etapaId),
        id_empresa: empresaId,
        status: 'aberto',
        ativo: true,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao criar negócio', description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      onCreated({ ...data, etiquetas: [] });
      toast({ title: 'Negócio criado com sucesso!' });
      // Reset form
      setNome('');
      setWhatsapp('');
      setEmpresaCliente('');
      setValorEstimado('');
      setEtapaId(etapas[0]?.id.toString() || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Negócio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do lead" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input id="empresa" value={empresaCliente} onChange={e => setEmpresaCliente(e.target.value)} placeholder="Empresa do cliente" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor estimado</Label>
            <Input id="valor" type="number" value={valorEstimado} onChange={e => setValorEstimado(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label>Etapa inicial</Label>
            <Select value={etapaId} onValueChange={setEtapaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {etapas.map(et => (
                  <SelectItem key={et.id} value={et.id.toString()}>{et.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !nome.trim()}>
              {saving ? 'Criando...' : 'Criar negócio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
