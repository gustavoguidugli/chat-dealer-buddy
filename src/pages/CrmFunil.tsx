import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronDown, Pencil, Filter, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { NovoNegocioModal } from '@/components/crm/NovoNegocioModal';
import { KanbanBoard } from '@/components/crm/KanbanBoard';

interface Funil {
  id: number;
  nome: string;
}

interface EtapaFunil {
  id: number;
  nome: string;
  ordem: number;
  cor: string | null;
}

export interface LeadCard {
  id: number;
  nome: string;
  empresa_cliente: string | null;
  whatsapp: string | null;
  valor_estimado: number | null;
  data_criacao: string | null;
  id_etapa_atual: number;
  ordem_no_funil: number | null;
  proprietario_id: string | null;
  etiquetas: { nome: string; cor: string }[];
}

export default function CrmFunil() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [funis, setFunis] = useState<Funil[]>([]);
  const [funilAtual, setFunilAtual] = useState<number | null>(null);
  const [etapas, setEtapas] = useState<EtapaFunil[]>([]);
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch funis
  useEffect(() => {
    if (!empresaId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_empresa', empresaId)
        .eq('ativo', true)
        .order('ordem');
      if (data && data.length > 0) {
        setFunis(data);
        setFunilAtual(data[0].id);
      }
      setLoading(false);
    };
    fetch();
  }, [empresaId]);

  // Fetch etapas + leads when funil changes
  useEffect(() => {
    if (!funilAtual) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: etapasData } = await supabase
        .from('etapas_funil')
        .select('id, nome, ordem, cor')
        .eq('id_funil', funilAtual)
        .eq('ativo', true)
        .order('ordem');

      if (etapasData) setEtapas(etapasData);

      const { data: leadsData } = await supabase
        .from('leads_crm')
        .select('id, nome, empresa_cliente, whatsapp, valor_estimado, data_criacao, id_etapa_atual, ordem_no_funil, proprietario_id')
        .eq('id_funil', funilAtual)
        .eq('status', 'aberto')
        .eq('ativo', true)
        .order('ordem_no_funil')
        .order('created_at', { ascending: false });

      if (leadsData) {
        // Fetch etiquetas for all leads
        const leadIds = leadsData.map(l => l.id);
        let etiquetasMap: Record<number, { nome: string; cor: string }[]> = {};
        
        if (leadIds.length > 0) {
          const { data: leData } = await supabase
            .from('lead_etiquetas')
            .select('id_lead, etiquetas_card(nome, cor)')
            .in('id_lead', leadIds);
          
          if (leData) {
            for (const item of leData) {
              if (!etiquetasMap[item.id_lead]) etiquetasMap[item.id_lead] = [];
              const ec = item.etiquetas_card as any;
              if (ec) etiquetasMap[item.id_lead].push({ nome: ec.nome, cor: ec.cor });
            }
          }
        }

        setLeads(leadsData.map(l => ({
          ...l,
          etiquetas: etiquetasMap[l.id] || []
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [funilAtual]);

  const handleMoveLead = useCallback(async (leadId: number, newEtapaId: number, newOrder: number) => {
    // Optimistic update
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, id_etapa_atual: newEtapaId, ordem_no_funil: newOrder } : l
    ));

    const { error } = await supabase
      .from('leads_crm')
      .update({
        id_etapa_atual: newEtapaId,
        ordem_no_funil: newOrder,
      })
      .eq('id', leadId);

    if (error) {
      toast({ title: 'Erro ao mover negócio', description: error.message, variant: 'destructive' });
      // Revert - refetch
      setFunilAtual(prev => prev);
    }
  }, [toast]);

  const handleNewDeal = useCallback((lead: LeadCard) => {
    setLeads(prev => [lead, ...prev]);
    setModalOpen(false);
  }, []);

  const totalNegocios = leads.length;
  const funilNome = funis.find(f => f.id === funilAtual)?.nome || '';

  const leadsByEtapa = useMemo(() => {
    const map: Record<number, LeadCard[]> = {};
    for (const etapa of etapas) {
      map[etapa.id] = [];
    }
    for (const lead of leads) {
      if (map[lead.id_etapa_atual]) {
        map[lead.id_etapa_atual].push(lead);
      }
    }
    return map;
  }, [leads, etapas]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-1.5"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Negócio
              <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{totalNegocios} negócios</span>

            <Select
              value={funilAtual?.toString() || ''}
              onValueChange={(v) => setFunilAtual(Number(v))}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Selecionar funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Pencil className="h-4 w-4" />
            </Button>

          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando funil...
            </div>
          ) : etapas.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhum funil configurado. Crie um funil para começar.
            </div>
          ) : (
            <KanbanBoard
              etapas={etapas}
              leadsByEtapa={leadsByEtapa}
              onMoveLead={handleMoveLead}
            />
          )}
        </div>
      </div>

      {funilAtual && etapas.length > 0 && (
        <NovoNegocioModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          funilId={funilAtual}
          etapas={etapas}
          empresaId={empresaId!}
          onCreated={handleNewDeal}
        />
      )}
    </AppLayout>
  );
}
