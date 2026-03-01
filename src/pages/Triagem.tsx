import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InterestModal, InterestFormData } from '@/components/InterestModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Interesse {
  id: string;
  nome: string;
  label: string;
  palavras_chave: string[];
  mensagem_resposta: string;
  ordem: number;
  ativo: boolean | null;
  empresa_id: number | null;
}

const DEFAULT_NAMES = ['maquina_gelo', 'purificador', 'outros'];

export default function Triagem() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [interesses, setInteresses] = useState<Interesse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState<Interesse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Interesse | null>(null);

  const fetchInteresses = async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('lista_interesses')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ordem');
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar interesses', variant: 'destructive' });
    } else {
      setInteresses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInteresses(); }, [empresaId]);

  const handleSave = async (formData: InterestFormData) => {
    if (editingInterest) {
      const { error } = await supabase
        .from('lista_interesses')
        .update({
          label: formData.label,
          palavras_chave: formData.palavras_chave,
          mensagem_resposta: formData.mensagem_resposta,
          ordem: formData.ordem,
        })
        .eq('id', editingInterest.id);
      if (error) throw new Error('Erro ao atualizar interesse');
      toast({ title: 'Interesse atualizado com sucesso!' });
    } else {
      const { error } = await supabase
        .from('lista_interesses')
        .insert({
          empresa_id: empresaId!,
          nome: formData.nome,
          label: formData.label,
          palavras_chave: formData.palavras_chave,
          mensagem_resposta: formData.mensagem_resposta,
          ordem: formData.ordem,
          ativo: true,
        });
      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
          throw new Error('Já existe um interesse com esse nome');
        }
        throw new Error('Erro ao criar interesse');
      }
      toast({ title: 'Interesse criado com sucesso!' });
    }
    await fetchInteresses();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('lista_interesses').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    } else {
      toast({ title: 'Interesse removido' });
      await fetchInteresses();
    }
    setDeleteTarget(null);
  };

  const handleToggle = async (interesse: Interesse) => {
    const { error } = await supabase
      .from('lista_interesses')
      .update({ ativo: !interesse.ativo })
      .eq('id', interesse.id);
    if (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    } else {
      setInteresses(prev => prev.map(i => i.id === interesse.id ? { ...i, ativo: !i.ativo } : i));
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= interesses.length) return;
    const newList = [...interesses];
    const tempOrdem = newList[index].ordem;
    newList[index] = { ...newList[index], ordem: newList[swapIndex].ordem };
    newList[swapIndex] = { ...newList[swapIndex], ordem: tempOrdem };
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setInteresses(newList);
    await Promise.all([
      supabase.from('lista_interesses').update({ ordem: newList[index].ordem }).eq('id', newList[index].id),
      supabase.from('lista_interesses').update({ ordem: newList[swapIndex].ordem }).eq('id', newList[swapIndex].id),
    ]);
  };

  const isDefault = (nome: string) => DEFAULT_NAMES.includes(nome);
  const nextOrder = interesses.length > 0 ? Math.max(...interesses.map(i => i.ordem)) + 1 : 1;

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Interesses</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure os tópicos que o chatbot pode identificar</p>
          </div>
          <Button onClick={() => { setEditingInterest(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : interesses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum interesse cadastrado. Clique em "Adicionar" para criar o primeiro.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {interesses.map((interesse, index) => (
              <Card key={interesse.id} className={`transition-opacity ${interesse.ativo === false ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Reorder */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button onClick={() => handleReorder(index, 'up')} disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <Badge variant="outline" className="text-xs font-bold w-7 justify-center">{interesse.ordem}</Badge>
                    <button onClick={() => handleReorder(index, 'down')} disabled={index === interesses.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{interesse.label}</h3>
                      {isDefault(interesse.nome) && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Lock className="h-3 w-3" /> Padrão
                        </Badge>
                      )}
                      {interesse.ativo === false && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{interesse.nome}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {interesse.palavras_chave?.map((kw) => (
                        <Badge key={kw} className="text-xs bg-primary-muted text-primary border-0">{kw}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{interesse.mensagem_resposta}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={interesse.ativo !== false} onCheckedChange={() => handleToggle(interesse)} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingInterest(interesse); setModalOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!isDefault(interesse.nome) ? (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(interesse)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" disabled className="opacity-30" title="Interesses padrão não podem ser deletados">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <InterestModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingInterest(null); }}
          onSave={handleSave}
          initialData={editingInterest ? {
            nome: editingInterest.nome,
            label: editingInterest.label,
            palavras_chave: editingInterest.palavras_chave || [],
            mensagem_resposta: editingInterest.mensagem_resposta,
            ordem: editingInterest.ordem,
          } : undefined}
          isDefault={editingInterest ? isDefault(editingInterest.nome) : false}
          nextOrder={nextOrder}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar interesse?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar "{deleteTarget?.label}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
