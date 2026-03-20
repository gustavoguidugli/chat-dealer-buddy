import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash, Loader2 } from 'lucide-react';

interface Empresa {
  id: number;
  nome: string | null;
  userCount: number;
}

interface Props {
  empresa: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteEmpresaModal({ empresa, open, onOpenChange, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open && empresa) {
      setConfirmText('');
      setIsDeleting(false);
      supabase
        .from('user_empresa')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .then(({ count }) => setUserCount(count || 0));
    }
  }, [open, empresa]);

  const isConfirmValid = confirmText.trim().toLowerCase() === 'excluir';

  const handleDelete = async () => {
    if (!empresa || !isConfirmValid) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.rpc('delete_empresa_completa', {
        p_empresa_id: empresa.id,
      });
      if (error) throw error;

      toast({ title: 'Empresa excluída com sucesso!' });
      onOpenChange(false);
      onDeleted();
    } catch (err: any) {
      console.error('Erro ao excluir empresa:', err);
      toast({
        title: 'Erro ao excluir empresa',
        description: err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!isDeleting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Empresa?
          </DialogTitle>
          <DialogDescription>Esta ação é permanente e não pode ser desfeita.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="font-medium text-sm">
              Tem certeza que deseja excluir a empresa "{empresa?.nome || 'Sem nome'}"?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong>IRREVERSÍVEL</strong> e vai deletar:
            </p>
            <ul className="text-sm text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li>Todos os leads e contatos</li>
              <li>Todos os funis, etapas e histórico</li>
              <li>Todas as atividades e anotações</li>
              <li>Todas as configurações, FAQs e campos customizados</li>
              <li>Todos os convites e vínculos com usuários</li>
              <li>Todos os interesses e motivos de perda</li>
              <li>Todos os documentos e anexos</li>
            </ul>
            <p className="text-sm font-medium text-destructive mt-2">
              Total de usuários vinculados: {userCount}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Digite "<strong>EXCLUIR</strong>" para confirmar
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash className="h-4 w-4 mr-2" />
                Excluir Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
