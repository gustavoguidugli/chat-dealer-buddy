import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagInput } from '@/components/TagInput';
import { Loader2 } from 'lucide-react';

export interface FaqFormData {
  contexto: string;
  pergunta: string;
  resposta: string;
  tags: string[];
}

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FaqFormData) => Promise<void>;
  initialData?: FaqFormData | null;
}

export function FaqModal({ isOpen, onClose, onSave, initialData }: FaqModalProps) {
  const [contexto, setContexto] = useState('');
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContexto(initialData?.contexto ?? '');
      setPergunta(initialData?.pergunta ?? '');
      setResposta(initialData?.resposta ?? '');
      setTags(initialData?.tags ?? []);
    }
  }, [isOpen, initialData]);

  const isValid = contexto.trim() && pergunta.trim() && resposta.trim();

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave({ contexto: contexto.trim(), pergunta: pergunta.trim(), resposta: resposta.trim(), tags });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar FAQ' : 'Adicionar FAQ'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contexto">Contexto *</Label>
            <Textarea
              id="contexto"
              rows={2}
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex: Lead pergunta sobre preço da máquina"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Descreva o contexto em que esta pergunta aparece</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pergunta">Pergunta *</Label>
            <Input
              id="pergunta"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Ex: Qual o preço da máquina?"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resposta">Resposta *</Label>
            <Textarea
              id="resposta"
              rows={5}
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Digite a resposta que o bot deve dar..."
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Você pode usar variáveis: {'{{ variavel }}'}</p>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} placeholder="Digite uma tag e pressione Enter" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar FAQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
