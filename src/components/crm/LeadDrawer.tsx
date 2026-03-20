import { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useLeadRealtime } from '@/hooks/useLeadRealtime';
import { useMotivosPerda } from '@/hooks/useMotivosPerda';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ManageMotivosModal } from '@/components/crm/ManageMotivosModal';
import { LeadDrawerHeader } from '@/components/crm/LeadDrawerHeader';
import { LeadDrawerFields } from '@/components/crm/LeadDrawerFields';
import { LeadDrawerTimeline } from '@/components/crm/LeadDrawerTimeline';
import { Settings } from 'lucide-react';

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number | null;
  onLeadChanged?: () => void;
}

interface LeadDetail {
  id: number;
  nome: string;
  empresa_cliente: string | null;
  whatsapp: string | null;
  email: string | null;
  valor_estimado: number | null;
  valor_final: number | null;
  status: string | null;
  campos_extras: Record<string, any> | null;
  id_funil: number;
  id_empresa: number;
  id_etapa_atual: number;
  id_contato_geral: number | null;
  proprietario_id: string | null;
  data_entrada_etapa_atual: string | null;
  data_criacao: string | null;
  motivo_perda: string | null;
  cpf_cnpj: string | null;
  origem: string | null;
  midia: string | null;
  campanha: string | null;
}

interface EtapaInfo {
  id: number;
  nome: string;
  ordem: number;
}

interface CampoCustomizado {
  id: number;
  nome: string;
  slug: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  ordem: number;
  id_funil: number | null;
}

interface Anotacao {
  id: number;
  conteudo: string;
  criado_por: string | null;
  created_at: string | null;
}

interface Atividade {
  id: number;
  assunto: string;
  tipo: string;
  data_vencimento: string;
  concluida: boolean;
  prioridade: string | null;
  atribuida_a: string | null;
  descricao: string | null;
}

interface HistoricoItem {
  id: number;
  tipo_evento: string;
  descricao: string;
  created_at: string | null;
  usuario_id: string | null;
  metadados: any;
  etapa_destino_id: number | null;
}

export function LeadDrawer({ open, onOpenChange, leadId, onLeadChanged }: LeadDrawerProps) {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  const { motivos: motivosPerda, forceRefresh: refreshMotivos } = useMotivosPerda(empresaId);

  // Realtime data
  const {
    lead: realtimeLead,
    setLead: setRealtimeLead,
    anotacoes: realtimeAnotacoes,
    atividades: realtimeAtividades,
    historico: realtimeHistorico,
    dadosContato,
    anexos: realtimeAnexos,
    loading: realtimeLoading,
  } = useLeadRealtime(open ? leadId : null, empresaId);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [funilNome, setFunilNome] = useState('');
  const [etapas, setEtapas] = useState<EtapaInfo[]>([]);
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [listaInteresses, setListaInteresses] = useState<{ nome: string; label: string; funil_id: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const anotacoes = useMemo(() => (realtimeAnotacoes || []) as Anotacao[], [realtimeAnotacoes]);
  const atividades = useMemo(() => (realtimeAtividades || []) as Atividade[], [realtimeAtividades]);
  const historico = useMemo(() => (realtimeHistorico || []) as HistoricoItem[], [realtimeHistorico]);

  // Dialogs (shared across sections)
  const [ganhoOpen, setGanhoOpen] = useState(false);
  const [perdidoOpen, setPerdidoOpen] = useState(false);
  const [motivosSelecionados, setMotivosSelecionados] = useState<number[]>([]);
  const [manageMotivosOpen, setManageMotivosOpen] = useState(false);
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [duplicarOpen, setDuplicarOpen] = useState(false);

  const [proprietarios, setProprietarios] = useState<{id: string; nome: string}[]>([]);
  const [allFunis, setAllFunis] = useState<{id: number; nome: string}[]>([]);

  // Fetch funil metadata
  const fetchMeta = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);

    const { data: leadData } = await supabase.from('leads_crm').select('*').eq('id', leadId).single();

    if (leadData) {
      const l = leadData;
      setLead({
        ...l,
        campos_extras: (l.campos_extras as Record<string, any>) || {},
      });

      const [funilRes, etapasRes, camposRes, interessesRes] = await Promise.all([
        supabase.from('funis').select('nome').eq('id', l.id_funil).single(),
        supabase.from('etapas_funil').select('id, nome, ordem').eq('id_funil', l.id_funil).eq('ativo', true).order('ordem'),
        supabase.from('campos_customizados').select('*').or(`id_funil.is.null,id_funil.eq.${l.id_funil}`).eq('id_empresa', l.id_empresa).eq('ativo', true).order('ordem'),
        supabase.from('lista_interesses').select('nome, label, funil_id').eq('empresa_id', l.id_empresa).order('ordem'),
      ]);

      setFunilNome(funilRes.data?.nome || '');
      setEtapas(etapasRes.data || []);
      // Deduplicação defensiva
      const camposRaw = (camposRes.data || []) as CampoCustomizado[];
      const camposUnicos = new Map<string, CampoCustomizado>();
      const normNome = (n: string) =>
        n.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const c of camposRaw) {
        const key = normNome(c.nome);
        const existing = camposUnicos.get(key);
        if (!existing || (c.id_funil !== null && existing.id_funil === null)) {
          camposUnicos.set(key, c);
        }
      }
      setCampos(Array.from(camposUnicos.values()));
      setListaInteresses(interessesRes.data || []);
    }

    setLoading(false);
  }, [leadId]);

  const fetchAll = fetchMeta;

  // Keep lead state in sync with realtime
  useEffect(() => {
    if (realtimeLead) {
      setLead(prev => prev ? {
        ...prev,
        ...realtimeLead,
        campos_extras: (realtimeLead.campos_extras as Record<string, any>) || prev.campos_extras || {},
      } : null);
    }
  }, [realtimeLead]);

  useEffect(() => {
    if (open && leadId) fetchMeta();
  }, [open, leadId, fetchMeta]);

  // Fetch proprietários
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase.rpc('get_usuarios_empresa', { empresa_id_param: empresaId });
      if (data) {
        setProprietarios(data.map((u: any) => ({ id: u.id, nome: u.nome || u.email })));
      }
    })();
  }, [empresaId]);

  // Fetch all funnels
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .order('ordem');
      if (data) setAllFunis(data);
    })();
  }, [empresaId]);

  // --- ACTIONS ---

  const handleGanho = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').update({
      status: 'ganho',
      data_ganho: new Date().toISOString(),
    }).eq('id', lead.id);
    toast({ title: 'Lead marcado como ganho! 🎉' });
    setGanhoOpen(false);
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handlePerdido = async () => {
    if (!lead || motivosSelecionados.length === 0) return;
    const motivoTexto = motivosPerda
      .filter(m => motivosSelecionados.includes(m.id))
      .map(m => m.nome)
      .join(', ');
    await supabase.from('leads_crm').update({
      status: 'perdido',
      motivo_perda: motivoTexto,
      data_perdido: new Date().toISOString(),
    }).eq('id', lead.id);
    toast({ title: 'Lead marcado como perdido' });
    setPerdidoOpen(false);
    setMotivosSelecionados([]);
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handleExcluir = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').update({ ativo: false }).eq('id', lead.id);
    toast({ title: 'Lead excluído' });
    setExcluirOpen(false);
    onLeadChanged?.();
    onOpenChange(false);
  };

  const handleDuplicar = async () => {
    if (!lead) return;
    await supabase.from('leads_crm').insert({
      nome: `${lead.nome} (Cópia)`,
      id_empresa: empresaId!,
      id_funil: lead.id_funil,
      id_etapa_atual: lead.id_etapa_atual,
      campos_extras: lead.campos_extras || {},
      valor_estimado: lead.valor_estimado,
      empresa_cliente: lead.empresa_cliente,
      whatsapp: lead.whatsapp,
      email: lead.email,
      proprietario_id: lead.proprietario_id,
      status: 'aberto',
    } as any);
    toast({ title: 'Lead duplicado com sucesso!' });
    setDuplicarOpen(false);
    onLeadChanged?.();
  };

  if (!lead && !loading) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[75vw] p-0 flex flex-col overflow-hidden">
          <ErrorBoundary>
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Carregando...</div>
          ) : lead ? (
            <>
              <LeadDrawerHeader
                lead={lead}
                etapas={etapas}
                funilNome={funilNome}
                allFunis={allFunis}
                proprietarios={proprietarios}
                onLeadChanged={onLeadChanged}
                fetchMeta={fetchMeta}
                setGanhoOpen={setGanhoOpen}
                setPerdidoOpen={setPerdidoOpen}
                setReabrirOpen={setReabrirOpen}
                setDuplicarOpen={setDuplicarOpen}
                setExcluirOpen={setExcluirOpen}
              />

              {/* BODY */}
              <div className="flex flex-1 overflow-hidden">
                <LeadDrawerFields
                  lead={lead}
                  campos={campos}
                  dadosContato={dadosContato}
                  listaInteresses={listaInteresses}
                  onLeadChanged={onLeadChanged}
                  setLead={setLead}
                  fetchAll={fetchAll}
                  fetchMeta={fetchMeta}
                />

                <LeadDrawerTimeline
                  lead={lead}
                  leadId={leadId!}
                  empresaId={empresaId!}
                  anotacoes={anotacoes}
                  atividades={atividades}
                  historico={historico}
                  realtimeAnexos={realtimeAnexos}
                  proprietarios={proprietarios}
                  onLeadChanged={onLeadChanged}
                />
              </div>
            </>
          ) : null}
          </ErrorBoundary>
        </SheetContent>
      </Sheet>

      {/* REABRIR DIALOG */}
      <AlertDialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir lead?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja reabrir &quot;{lead?.nome}&quot;? O lead voltará para o funil como aberto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!lead) return;
              const isWon = lead.status === 'ganho';
              await supabase.from('leads_crm').update(
                isWon
                  ? { status: 'aberto', data_ganho: null }
                  : { status: 'aberto', data_perdido: null, motivo_perda: null }
              ).eq('id', lead.id);
              toast({ title: 'Lead reaberto' });
              setReabrirOpen(false);
              onLeadChanged?.();
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GANHO DIALOG */}
      <AlertDialog open={ganhoOpen} onOpenChange={setGanhoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como ganho?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja marcar "{lead?.nome}" como ganho?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700 text-white" onClick={handleGanho}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PERDIDO DIALOG */}
      <AlertDialog open={perdidoOpen} onOpenChange={setPerdidoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como perdido?</AlertDialogTitle>
            <AlertDialogDescription>Selecione o(s) motivo(s) da perda.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-2 max-h-[200px] overflow-y-auto">
            {motivosPerda.map(motivo => (
              <label 
                key={motivo.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={motivosSelecionados.includes(motivo.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMotivosSelecionados(prev => [...prev, motivo.id]);
                    } else {
                      setMotivosSelecionados(prev => prev.filter(id => id !== motivo.id));
                    }
                  }}
                />
                <span className="text-sm">{motivo.nome}</span>
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setManageMotivosOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar motivos
          </Button>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMotivosSelecionados([])}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={motivosSelecionados.length === 0}
              onClick={handlePerdido}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Motivos Modal */}
      {empresaId && (
        <ManageMotivosModal
          isOpen={manageMotivosOpen}
          onClose={() => setManageMotivosOpen(false)}
          empresaId={empresaId}
          onSave={refreshMotivos}
        />
      )}

      {/* EXCLUIR DIALOG */}
      <AlertDialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleExcluir}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DUPLICAR DIALOG */}
      <AlertDialog open={duplicarOpen} onOpenChange={setDuplicarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar lead?</AlertDialogTitle>
            <AlertDialogDescription>Deseja duplicar "{lead?.nome}"? Uma cópia será criada na mesma etapa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleDuplicar}>
              Duplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
