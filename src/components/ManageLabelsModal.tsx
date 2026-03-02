import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LabelIcon, type LabelItem } from './LabelSelector';

interface ManageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
  onLabelsChanged: () => void;
}

const COLORS = [
  { nome: 'Azul', hex: '#3B82F6' },
  { nome: 'Roxo', hex: '#8B5CF6' },
  { nome: 'Rosa', hex: '#EC4899' },
  { nome: 'Vermelho', hex: '#EF4444' },
  { nome: 'Laranja', hex: '#F97316' },
  { nome: 'Amarelo', hex: '#F59E0B' },
  { nome: 'Verde', hex: '#10B981' },
  { nome: 'Cinza', hex: '#6B7280' },
];

const ICONS = ['tag', 'star', 'flag', 'bookmark', 'heart', 'alert-circle', 'check-circle', 'x-circle'];

export function ManageLabelsModal({ isOpen, onClose, empresaId, onLabelsChanged }: ManageLabelsModalProps) {
  const { toast } = useToast();
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelItem | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<LabelItem | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const [icone, setIcone] = useState('tag');

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('labels')
      .select('id, nome, cor, icone, ordem')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    setLabels((data as LabelItem[]) || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) fetchLabels();
  }, [isOpen, fetchLabels]);

  const openForm = (label?: LabelItem) => {
    if (label) {
      setEditingLabel(label);
      setNome(label.nome);
      setCor(label.cor);
      setIcone(label.icone || 'tag');
    } else {
      setEditingLabel(null);
      setNome('');
      setCor('#3B82F6');
      setIcone('tag');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) return;

    const payload = { nome: nome.trim(), cor, icone, empresa_id: empresaId };

    if (editingLabel) {
      const { error } = await supabase.from('labels').update(payload).eq('id', editingLabel.id);
      if (error) { toast({ title: 'Erro ao atualizar etiqueta', variant: 'destructive' }); return; }
      toast({ title: 'Etiqueta atualizada!' });
    } else {
      const maxOrdem = labels.length > 0 ? Math.max(...labels.map((l: any) => l.ordem ?? 0)) + 1 : 0;
      const { error } = await supabase.from('labels').insert({ ...payload, ordem: maxOrdem });
      if (error) { toast({ title: 'Erro ao criar etiqueta', variant: 'destructive' }); return; }
      toast({ title: 'Etiqueta criada!' });
    }

    setShowForm(false);
    fetchLabels();
    onLabelsChanged();
  };

  const handleDelete = async () => {
    if (!deletingLabel) return;
    const { error } = await supabase.from('labels').delete().eq('id', deletingLabel.id);
    if (error) { toast({ title: 'Erro ao deletar etiqueta', variant: 'destructive' }); return; }
    toast({ title: 'Etiqueta removida!' });
    setDeletingLabel(null);
    fetchLabels();
    onLabelsChanged();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Etiquetas</DialogTitle>
            <DialogDescription>Crie e organize etiquetas para classificar seus FAQs</DialogDescription>
          </DialogHeader>

          {showForm ? (
            <div className="space-y-4">
              <div>
                <Label>Nome da Etiqueta</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Urgente, Revisar" />
              </div>

              <div>
                <Label>Cor</Label>
                <div className="grid grid-cols-8 gap-2 mt-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => setCor(c.hex)}
                      className={`h-8 w-full rounded border-2 transition-all ${cor === c.hex ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.nome}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Ícone</Label>
                <div className="grid grid-cols-8 gap-2 mt-1.5">
                  {ICONS.map(i => (
                    <button
                      key={i}
                      onClick={() => setIcone(i)}
                      className={`h-8 w-full flex items-center justify-center rounded border transition-all ${icone === i ? 'border-primary bg-primary/10' : 'border-border'}`}
                    >
                      <LabelIcon name={i} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Preview</Label>
                <div className="mt-1.5">
                  <Badge className="border-0" style={{ backgroundColor: `${cor}20`, color: cor }}>
                    <LabelIcon name={icone} className="h-3 w-3 mr-1" />
                    {nome || 'Nome da etiqueta'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!nome.trim()}>Salvar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" /> Nova Etiqueta
              </Button>

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : labels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma etiqueta criada</p>
              ) : (
                <div className="space-y-1 mt-2">
                  {labels.map(label => (
                    <div key={label.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge className="border-0" style={{ backgroundColor: `${label.cor}20`, color: label.cor }}>
                          <LabelIcon name={label.icone} className="h-3 w-3 mr-1" />
                          {label.nome}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(label)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingLabel(label)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLabel} onOpenChange={() => setDeletingLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta "{deletingLabel?.nome}" será removida de todos os FAQs. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
