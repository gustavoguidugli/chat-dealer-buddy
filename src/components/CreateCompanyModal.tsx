import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateCompanyModal({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailConvite, setEmailConvite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSubmitting(true);
    try {
      // 1. Create company
      const { data: empresa, error } = await supabase
        .from('empresas_geral')
        .insert({ nome: nome.trim(), numero_automacao: whatsapp.trim() || null })
        .select()
        .single();

      if (error) throw error;

      // 2. Create invite with email if provided and send email via Resend
      if (emailConvite.trim()) {
        const { data: conviteData } = await supabase.from('convites').insert({
          empresa_id: empresa.id,
          tipo: 'email',
          max_usos: 1,
          email_destino: emailConvite.trim().toLowerCase(),
          expira_em: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        }).select('id').single();

        // Send branded invitation email via Resend
        if (conviteData?.id) {
          try {
            await supabase.functions.invoke('send-invitation-email', {
              body: {
                convite_id: conviteData.id,
                email_destino: emailConvite.trim().toLowerCase(),
                empresa_nome: nome.trim(),
              },
            });
          } catch (emailErr) {
            console.error('Failed to send invitation email:', emailErr);
          }
        }
      }

      // 3. Create additional code-type invite
      const codigo = nome.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20) + Date.now().toString(36).slice(-4).toUpperCase();
      await supabase.from('convites').insert({
        empresa_id: empresa.id,
        tipo: 'codigo',
        codigo,
        max_usos: 5,
      });

      // 4. Copy config from template company
      try {
        // Get first company as template (excluding the one just created)
        const { data: templateCompanies } = await supabase
          .from('empresas_geral')
          .select('id')
          .eq('is_template', true)
          .limit(1);

        const templateId = templateCompanies?.[0]?.id;

        if (templateId) {
          const { data: copyResult, error: copyError } = await supabase.functions.invoke('copy-company-config', {
            body: {
              source_company_id: templateId,
              target_company_id: empresa.id,
            },
          });

          if (copyError) {
            console.error('Error copying config:', copyError);
            toast({
              title: 'Empresa criada, mas houve erro ao copiar configurações',
              description: copyError.message,
              variant: 'destructive',
            });
          } else if (copyResult?.results) {
            const r = copyResult.results;
            toast({
              title: 'Empresa criada com sucesso!',
              description: `Copiados: ${r.faqs_copied} FAQs, ${r.labels_copied} labels, ${r.faq_labels_copied || 0} etiquetas de FAQ, ${r.interests_copied} interesses${r.config_copied ? ', configurações' : ''}`,
            });
          }
        } else {
          toast({ title: 'Empresa criada com sucesso!' });
        }
      } catch (copyErr) {
        console.error('Error calling copy-company-config:', copyErr);
        toast({
          title: 'Empresa criada com sucesso!',
          description: 'Não foi possível copiar configurações do modelo.',
        });
      }

      setNome('');
      setWhatsapp('');
      setEmailConvite('');
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
          <DialogDescription>Preencha os dados para criar uma nova empresa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da empresa</Label>
            <Input
              id="company-name"
              placeholder="Ex: Termall Refrigeração"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-whatsapp">WhatsApp</Label>
            <Input
              id="company-whatsapp"
              type="tel"
              placeholder="+55 (11) 99999-9999"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-email">Email do primeiro usuário (convite)</Label>
            <Input
              id="company-email"
              type="email"
              placeholder="usuario@email.com"
              value={emailConvite}
              onChange={e => setEmailConvite(e.target.value)}
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !nome.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
