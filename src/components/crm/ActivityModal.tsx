import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityIconBar } from './ActivityIconBar';
import { IconeAtividadeManager } from './IconeAtividadeManager';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityModalProps {
  leadId: number;
  empresaId: number;
  activity?: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityModal({ leadId, empresaId, activity, isOpen, onClose }: ActivityModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!activity;

  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [atribuidaA, setAtribuidaA] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>(new Date());
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [marcarComoFeito, setMarcarComoFeito] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [showIconManager, setShowIconManager] = useState(false);

  const normalizeTime = (time?: string | null) => {
    if (!time) return '';
    const [h = '', m = ''] = time.split(':');
    if (!h || !m) return '';
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  };

  const buildUtcFromSaoPaulo = (date: Date, time: string) => {
    const normalized = normalizeTime(time);
    if (!normalized) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return new Date(`${dateStr}T${normalized}:00-03:00`).toISOString();
  };

  // Load users for the dropdown using RPC (with fallback)
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      const { data: rpcUsers } = await supabase.rpc('get_usuarios_empresa', {
        empresa_id_param: empresaId,
      });

      if (rpcUsers && rpcUsers.length > 0) {
        setUsuarios(rpcUsers.map((u: any) => ({ id: u.id, nome: u.nome || u.email || 'Sem nome' })));
        return;
      }

      // Fallback para bases antigas que usam user_empresa_geral + usuarios
      const { data: links } = await supabase
        .from('user_empresa_geral')
        .select('user_id')
        .eq('empresa_id', empresaId);

      if (!links || links.length === 0) {
        setUsuarios([]);
        return;
      }

      const userIds = links.map((u: any) => u.user_id);
      const { data: usersData } = await supabase
        .from('usuarios')
        .select('uuid, nome')
        .in('uuid', userIds);

      setUsuarios((usersData || []).map((u: any) => ({ id: u.uuid, nome: u.nome || 'Sem nome' })));
    };

    fetchUsers();
  }, [isOpen, empresaId]);

  // Populate form when editing
  useEffect(() => {
    if (isOpen && activity) {
      setAssunto(activity.assunto || '');
      setDescricao(activity.descricao || '');
      setAtribuidaA(activity.atribuida_a || user?.id || '');
      setDataVencimento(activity.data_vencimento ? new Date(activity.data_vencimento) : new Date());
      setHoraInicio(normalizeTime(activity.hora_inicio));
      setHoraFim(normalizeTime(activity.hora_fim));
      setMarcarComoFeito(activity.concluida || false);
    } else if (isOpen) {
      setAssunto('');
      setDescricao('');
      setAtribuidaA(user?.id || '');
      setDataVencimento(new Date());
      setHoraInicio('08:00');
      setHoraFim('');
      setMarcarComoFeito(false);
    }
  }, [isOpen, activity, user?.id]);

  const handleSave = async () => {
    if (!assunto.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' });
      return;
    }
    if (!dataVencimento) {
      toast({ title: 'Data é obrigatória', variant: 'destructive' });
      return;
    }

    if (!horaInicio) {
      toast({ title: 'Hora de início é obrigatória', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Converte horário de São Paulo para UTC antes de salvar
    const fullDate = buildUtcFromSaoPaulo(dataVencimento, horaInicio);
    if (!fullDate) {
      toast({ title: 'Horário inválido', variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (isEditing) {
      const { error } = await supabase.from('atividades').update({
        assunto: assunto.trim(),
        descricao: descricao.trim() || null,
        atribuida_a: atribuidaA || null,
        data_vencimento: fullDate,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        concluida: marcarComoFeito,
        concluida_em: marcarComoFeito ? new Date().toISOString() : activity.concluida_em,
        concluida_por: marcarComoFeito ? user?.id : activity.concluida_por,
      }).eq('id', activity.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Atividade atualizada' });
        onClose();
      }
    } else {
      const { error } = await supabase.from('atividades').insert({
        id_empresa: empresaId,
        id_lead: leadId,
        tipo: 'follow_up',
        assunto: assunto.trim(),
        descricao: descricao.trim() || null,
        atribuida_a: atribuidaA || null,
        data_vencimento: fullDate,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        concluida: marcarComoFeito,
        concluida_em: marcarComoFeito ? new Date().toISOString() : null,
        concluida_por: marcarComoFeito ? user?.id : null,
        prioridade: 'media',
        created_by: user?.id || null,
      });

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Atividade criada' });
        onClose();
      }
    }
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <Input
            placeholder="Follow-up"
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            className="text-base font-medium"
          />

          {/* Activity type icons */}
          <ActivityIconBar
            empresaId={empresaId}
            selectedName={assunto}
            onSelect={(nome) => setAssunto(nome)}
            onManage={() => setShowIconManager(true)}
          />
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[150px] justify-start text-left font-normal h-9 text-sm", !dataVencimento && "text-muted-foreground")}
                >
                  {dataVencimento ? format(dataVencimento, "d 'de' MMM yyyy", { locale: ptBR }) : 'Data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataVencimento}
                  onSelect={setDataVencimento}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              placeholder="HH:mm"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              className="w-[100px] h-9 text-sm"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              placeholder="HH:mm"
              value={horaFim}
              onChange={e => setHoraFim(e.target.value)}
              className="w-[100px] h-9 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <Textarea
              placeholder="Anotações..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="min-h-[100px] bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              As anotações ficam visíveis, exceto para convidados do evento
            </p>
          </div>

          {/* Assigned to */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">👤</span>
            <Select value={atribuidaA} onValueChange={setAtribuidaA}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Atribuir a..." />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={marcarComoFeito}
              onCheckedChange={(v) => setMarcarComoFeito(!!v)}
            />
            <span className="text-sm text-muted-foreground">Marcar como feito</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <IconeAtividadeManager
        empresaId={empresaId}
        open={showIconManager}
        onClose={() => setShowIconManager(false)}
      />
    </Dialog>
  );
}
