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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityIconBar } from './ActivityIconBar';
import { IconeAtividadeManager } from './IconeAtividadeManager';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityModalProps {
  leadId?: number;
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

  // Lead selection state (when leadId is not provided)
  const [selectedLeadId, setSelectedLeadId] = useState<number | undefined>(leadId);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadResults, setLeadResults] = useState<{ id: number; nome: string; empresa_cliente: string | null }[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [selectedLeadName, setSelectedLeadName] = useState('');

  const hasExternalLeadId = leadId && leadId > 0;

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

  // Load users
  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      const { data: rpcUsers } = await supabase.rpc('get_usuarios_empresa', {
        empresa_id_param: empresaId,
      });
      if (rpcUsers && rpcUsers.length > 0) {
        setUsuarios(rpcUsers.map((u: any) => ({ id: u.id, nome: u.nome || u.email || 'Sem nome' })));
      }
    };
    fetchUsers();
  }, [isOpen, empresaId]);

  // Search leads when no leadId
  useEffect(() => {
    if (hasExternalLeadId || !leadSearch.trim()) {
      setLeadResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingLeads(true);
      const { data } = await supabase
        .from('leads_crm')
        .select('id, nome, empresa_cliente')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .ilike('nome', `%${leadSearch.trim()}%`)
        .limit(10);
      setLeadResults(data || []);
      setSearchingLeads(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [leadSearch, empresaId, hasExternalLeadId]);

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
      setSelectedLeadId(activity.id_lead || leadId);
    } else if (isOpen) {
      setAssunto('');
      setDescricao('');
      setAtribuidaA(user?.id || '');
      setDataVencimento(new Date());
      setHoraInicio('08:00');
      setHoraFim('');
      setMarcarComoFeito(false);
      setSelectedLeadId(leadId);
      setLeadSearch('');
      setSelectedLeadName('');
    }
  }, [isOpen, activity, user?.id, leadId]);

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
    if (!selectedLeadId) {
      toast({ title: 'Selecione um negócio (lead)', variant: 'destructive' });
      return;
    }

    setSaving(true);

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
        id_lead: selectedLeadId,
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
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Lead selector - only shown when no external leadId */}
          {!hasExternalLeadId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Negócio (lead) *</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={selectedLeadName || 'Buscar negócio...'}
                  value={leadSearch}
                  onChange={(e) => { setLeadSearch(e.target.value); setLeadSearchOpen(true); }}
                  onFocus={() => { if (leadSearch.trim()) setLeadSearchOpen(true); }}
                  className="pl-9"
                />
                {leadSearchOpen && leadSearch.trim() && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                    {searchingLeads ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">Buscando...</div>
                    ) : leadResults.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">Nenhum negócio encontrado</div>
                    ) : (
                      leadResults.map((r) => (
                        <button
                          key={r.id}
                          className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm border-b border-border last:border-0"
                          onClick={() => {
                            setSelectedLeadId(r.id);
                            setSelectedLeadName(r.nome);
                            setLeadSearch('');
                            setLeadSearchOpen(false);
                          }}
                        >
                          <span className="font-medium">{r.nome}</span>
                          {r.empresa_cliente && <span className="text-muted-foreground ml-2 text-xs">{r.empresa_cliente}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedLeadName && (
                <p className="text-xs text-muted-foreground">Selecionado: <span className="font-medium text-foreground">{selectedLeadName}</span></p>
              )}
            </div>
          )}

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
    </Dialog>

    <IconeAtividadeManager
      empresaId={empresaId}
      open={showIconManager}
      onClose={() => setShowIconManager(false)}
    />
  );
}
