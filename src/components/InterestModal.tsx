import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/TagInput';
import { Loader2 } from 'lucide-react';

export interface InterestFormData {
  nome: string;
  label: string;
  palavras_chave: string[];
  mensagem_resposta: string;
  ordem: number;
}

interface InterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InterestFormData) => Promise<void>;
  initialData?: InterestFormData;
  isDefault?: boolean;
  nextOrder: number;
}

const DEFAULT_NAMES = ['maquina_gelo', 'purificador', 'outros'];

export function InterestModal({ open, onOpenChange, onSave, initialData, isDefault, nextOrder }: InterestModalProps) {
  const [form, setForm] = useState<InterestFormData>({
    nome: '', label: '', palavras_chave: [], mensagem_resposta: '', ordem: nextOrder,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initialData ?? { nome: '', label: '', palavras_chave: [], mensagem_resposta: '', ordem: nextOrder });
      setError('');
    }
  }, [open, initialData, nextOrder]);

  const handleSave = async () => {
    if (!form.nome.trim()) return setError('Nome é obrigatório');
    if (!form.label.trim()) return setError('Label é obrigatório');
    if (form.palavras_chave.length === 0) return setError('Adicione pelo menos uma palavra-chave');
    if (!form.mensagem_resposta.trim()) return setError('Mensagem é obrigatória');

    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!initialData;
  const isNameLocked = isDefault || (isEditing && DEFAULT_NAMES.includes(form.nome));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Interesse' : 'Adicionar Interesse'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome (snake_case)</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm(f => ({ ...f, nome: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
              placeholder="assistencia_tecnica"
              disabled={isNameLocked}
            />
            <p className="text-xs text-muted-foreground">Use o formato snake_case (ex: assistencia_tecnica)</p>
          </div>

          <div className="space-y-2">
            <Label>Nome da Etiqueta</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Máquina de Gelo"
            />
            <p className="text-xs text-muted-foreground">
              Adicione o nome que aparecerá como opção para o lead/cliente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <TagInput
              value={form.palavras_chave}
              onChange={(tags) => setForm(f => ({ ...f, palavras_chave: tags }))}
              placeholder="Digite uma palavra e pressione Enter"
            />
            <p className="text-xs text-muted-foreground">
              Adicione palavras ou frases curtas que a IA usará para identificar esse interesse.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Resposta</Label>
            <Textarea
              value={form.mensagem_resposta}
              onChange={(e) => setForm(f => ({ ...f, mensagem_resposta: e.target.value.slice(0, 500) }))}
              placeholder="Ótimo! Vamos encontrar a máquina de gelo ideal para você. 🧊"
              rows={4}
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                Adicione o que deve ser respondido pela IA caso esse interesse seja escolhido.
              </p>
              <p className="text-xs text-muted-foreground">{form.mensagem_resposta.length}/500</p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
