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
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MotivoPerda {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
}

interface ManageMotivosModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: number;
}

export function ManageMotivosModal({ isOpen, onClose, empresaId }: ManageMotivosModalProps) {
  const { toast } = useToast();
  const [motivos, setMotivos] = useState<MotivoPerda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoPerda | null>(null);
  const [deletingMotivo, setDeletingMotivo] = useState<MotivoPerda | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const fetchMotivos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('motivos_perda')
      .select('id, nome, descricao, ordem')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    setMotivos((data as MotivoPerda[]) || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) fetchMotivos();
  }, [isOpen, fetchMotivos]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`manage_motivos_perda_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motivos_perda',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          fetchMotivos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, empresaId, fetchMotivos]);

  const openForm = (motivo?: MotivoPerda) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setNome(motivo.nome);
      setDescricao(motivo.descricao || '');
    } else {
      setEditingMotivo(null);
      setNome('');
      setDescricao('');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) return;

    const payload = { 
      nome: nome.trim(), 
      descricao: descricao.trim() || null, 
      empresa_id: empresaId 
    };

    if (editingMotivo) {
      const { error } = await supabase
        .from('motivos_perda')
        .update(payload)
        .eq('id', editingMotivo.id);
      if (error) {
        toast({ title: 'Erro ao atualizar motivo', variant: 'destructive' });
        return;
      }
      toast({ title: 'Motivo atualizado!' });
    } else {
      const maxOrdem = motivos.length > 0 ? Math.max(...motivos.map(m => m.ordem ?? 0)) + 1 : 0;
      const { error } = await supabase
        .from('motivos_perda')
        .insert({ ...payload, ordem: maxOrdem });
      if (error) {
        toast({ title: 'Erro ao criar motivo', variant: 'destructive' });
        return;
      }
      toast({ title: 'Motivo criado!' });
    }

    setShowForm(false);
    fetchMotivos();
  };

  const handleDelete = async () => {
    if (!deletingMotivo) return;
    const { error } = await supabase
      .from('motivos_perda')
      .update({ ativo: false })
      .eq('id', deletingMotivo.id);
    if (error) {
      toast({ title: 'Erro ao deletar motivo', variant: 'destructive' });
      return;
    }
    toast({ title: 'Motivo removido!' });
    setDeletingMotivo(null);
    fetchMotivos();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Motivos de Perda</DialogTitle>
            <DialogDescription>
              Crie e organize os motivos de perda para seus leads
            </DialogDescription>
          </DialogHeader>

          {showForm ? (
            <div className="space-y-4">
              <div>
                <Label>Nome do Motivo</Label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: Preço acima do orçamento" 
                />
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input 
                  value={descricao} 
                  onChange={e => setDescricao(e.target.value)} 
                  placeholder="Descrição adicional..." 
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!nome.trim()}>
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" /> Novo Motivo
              </Button>

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando...
                </p>
              ) : motivos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum motivo criado
                </p>
              ) : (
                <div className="space-y-1 mt-2">
                  {motivos.map(motivo => (
                    <div 
                      key={motivo.id} 
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{motivo.nome}</span>
                          {motivo.descricao && (
                            <p className="text-xs text-muted-foreground">{motivo.descricao}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => openForm(motivo)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => setDeletingMotivo(motivo)}
                        >
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

      <AlertDialog open={!!deletingMotivo} onOpenChange={() => setDeletingMotivo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover motivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O motivo "{deletingMotivo?.nome}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
