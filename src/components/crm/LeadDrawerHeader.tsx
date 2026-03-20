import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EtiquetaSelector } from '@/components/crm/EtiquetaSelector';
import {
  MoreHorizontal, Trophy, XCircle, UserCircle,
} from 'lucide-react';

interface LeadDetail {
  id: number;
  nome: string;
  whatsapp: string | null;
  valor_estimado: number | null;
  status: string | null;
  id_funil: number;
  id_empresa: number;
  id_etapa_atual: number;
  proprietario_id: string | null;
  data_entrada_etapa_atual: string | null;
}

interface EtapaInfo {
  id: number;
  nome: string;
  ordem: number;
}

// --- Editable Lead Name ---
function EditableLeadName({ leadId, nome, onSaved }: { leadId: number; nome: string; onSaved?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nome);
  const { toast } = useToast();

  useEffect(() => { setValue(nome); }, [nome]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === nome) { setEditing(false); setValue(nome); return; }
    const { error } = await supabase.from('leads_crm').update({ nome: trimmed }).eq('id', leadId);
    if (error) { toast({ title: 'Erro ao salvar nome', variant: 'destructive' }); setValue(nome); }
    else { onSaved?.(); }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="text-xl font-bold text-foreground bg-transparent border-b border-primary outline-none px-0 py-0"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(nome); setEditing(false); } }}
      />
    );
  }

  return (
    <h1
      className="text-xl font-bold text-foreground cursor-pointer hover:text-primary/80 transition-colors"
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {nome}
    </h1>
  );
}

function diasEntre(dateStr: string | null) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

interface LeadDrawerHeaderProps {
  lead: LeadDetail;
  etapas: EtapaInfo[];
  funilNome: string;
  allFunis: { id: number; nome: string }[];
  proprietarios: { id: string; nome: string }[];
  onLeadChanged?: () => void;
  fetchMeta: () => void;
  setGanhoOpen: (v: boolean) => void;
  setPerdidoOpen: (v: boolean) => void;
  setReabrirOpen: (v: boolean) => void;
  setDuplicarOpen: (v: boolean) => void;
  setExcluirOpen: (v: boolean) => void;
}

export function LeadDrawerHeader({
  lead, etapas, funilNome, allFunis, proprietarios, onLeadChanged, fetchMeta,
  setGanhoOpen, setPerdidoOpen, setReabrirOpen, setDuplicarOpen, setExcluirOpen,
}: LeadDrawerHeaderProps) {
  const { toast } = useToast();

  const [funilEtapaPopoverOpen, setFunilEtapaPopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [tempFunilId, setTempFunilId] = useState<number | null>(null);
  const [tempEtapaId, setTempEtapaId] = useState<number | null>(null);
  const [tempEtapas, setTempEtapas] = useState<EtapaInfo[]>([]);
  const [savingFunilEtapa, setSavingFunilEtapa] = useState(false);

  const etapaAtualOrdem = etapas.find(e => e.id === lead.id_etapa_atual)?.ordem ?? 0;

  const handleOpenFunilEtapaPopover = () => {
    setTempFunilId(lead.id_funil);
    setTempEtapaId(lead.id_etapa_atual);
    setTempEtapas(etapas);
    setFunilEtapaPopoverOpen(true);
  };

  const handleTempFunilChange = async (newFunilId: number) => {
    setTempFunilId(newFunilId);
    const { data } = await supabase
      .from('etapas_funil')
      .select('id, nome, ordem')
      .eq('id_funil', newFunilId)
      .eq('ativo', true)
      .order('ordem');
    const newEtapas = data || [];
    setTempEtapas(newEtapas);
    if (newEtapas.length > 0) {
      setTempEtapaId(newEtapas[0].id);
    } else {
      setTempEtapaId(null);
    }
  };

  const handleSaveFunilEtapa = async () => {
    if (!tempFunilId || !tempEtapaId) return;
    setSavingFunilEtapa(true);
    const { error } = await supabase.from('leads_crm').update({
      id_funil: tempFunilId,
      id_etapa_atual: tempEtapaId,
    }).eq('id', lead.id);
    setSavingFunilEtapa(false);
    if (error) {
      toast({ title: 'Erro ao mover lead', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Funil/etapa atualizado' });
      setFunilEtapaPopoverOpen(false);
      fetchMeta();
      onLeadChanged?.();
    }
  };

  const handleChangeProprietario = async (newOwnerId: string | null) => {
    await supabase.from('leads_crm').update({ proprietario_id: newOwnerId }).eq('id', lead.id);
    setOwnerPopoverOpen(false);
    toast({ title: 'Proprietário atualizado' });
    onLeadChanged?.();
  };

  return (
    <div className="border-b px-6 py-4 bg-card shrink-0">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <EditableLeadName leadId={lead.id} nome={lead.nome} onSaved={onLeadChanged} />
            <EtiquetaSelector leadId={lead.id} empresaId={lead.id_empresa} onChange={onLeadChanged} />
          </div>
          <Popover open={funilEtapaPopoverOpen} onOpenChange={setFunilEtapaPopoverOpen}>
            <PopoverTrigger asChild>
              <span
                className="text-sm text-primary cursor-pointer hover:underline inline-flex items-center gap-1"
                onClick={handleOpenFunilEtapaPopover}
              >
                {funilNome}
                {etapas.find(e => e.id === lead.id_etapa_atual) && (
                  <> → {etapas.find(e => e.id === lead.id_etapa_atual)?.nome}</>
                )}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-4" align="start">
              <div className="space-y-3">
                <Select
                  value={tempFunilId?.toString() || ''}
                  onValueChange={(v) => handleTempFunilChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFunis.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Etapa do funil</p>
                  <div className="flex items-center">
                    {tempEtapas.map((etapa, idx) => (
                      <button
                        key={etapa.id}
                        onClick={() => setTempEtapaId(etapa.id)}
                        className={`relative h-8 flex-1 text-xs font-medium transition-colors ${
                          tempEtapaId === etapa.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        } ${idx === 0 ? 'rounded-l-md' : ''} ${idx === tempEtapas.length - 1 ? 'rounded-r-md' : ''}`}
                        title={etapa.nome}
                        style={{
                          clipPath: idx < tempEtapas.length - 1
                            ? 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)'
                            : idx > 0
                            ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)'
                            : undefined,
                          marginLeft: idx > 0 ? '-4px' : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFunilEtapaPopoverOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveFunilEtapa}
                    disabled={savingFunilEtapa}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          {/* Proprietário selector */}
          <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-normal">
                <UserCircle className="h-3.5 w-3.5" />
                {lead.proprietario_id
                  ? (proprietarios.find(p => p.id === lead.proprietario_id)?.nome || 'Sem nome')
                  : 'Sem proprietário'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Proprietário</p>
              <button
                className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors ${!lead.proprietario_id ? 'bg-accent font-medium' : ''}`}
                onClick={() => handleChangeProprietario(null)}
              >
                Sem proprietário
              </button>
              {proprietarios.map(p => (
                <button
                  key={p.id}
                  className={`w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors flex items-center gap-2 ${lead.proprietario_id === p.id ? 'bg-accent font-medium' : ''}`}
                  onClick={() => handleChangeProprietario(p.id)}
                >
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.nome}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          {lead.status === 'ganho' ? (
            <button
              onClick={() => setReabrirOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
              title="Clique para reabrir"
            >
              <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Ganho</span>
            </button>
          ) : lead.status === 'perdido' ? (
            <button
              onClick={() => setReabrirOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
              title="Clique para reabrir"
            >
              <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Perdido</span>
            </button>
          ) : (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => setGanhoOpen(true)}
              >
                Ganho
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white font-semibold"
                onClick={() => setPerdidoOpen(true)}
              >
                Perdido
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDuplicarOpen(true)}>Duplicar lead</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setExcluirOpen(true)}>Excluir lead</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-0.5 mt-4">
        {etapas.map((etapa, i) => {
          const isPast = etapa.ordem < etapaAtualOrdem;
          const isCurrent = etapa.id === lead.id_etapa_atual;
          const dias = isCurrent ? diasEntre(lead.data_entrada_etapa_atual) : 0;
          return (
            <div
              key={etapa.id}
              className={`flex-1 flex flex-col items-center cursor-pointer group`}
              onClick={async () => {
                if (etapa.id === lead.id_etapa_atual) return;
                const { error } = await supabase.from('leads_crm').update({
                  id_etapa_atual: etapa.id,
                  data_entrada_etapa_atual: new Date().toISOString(),
                }).eq('id', lead.id);
                if (error) {
                  toast({ title: 'Erro ao mover lead', description: error.message, variant: 'destructive' });
                } else {
                  toast({ title: `Movido para ${etapa.nome}` });
                  onLeadChanged?.();
                }
              }}
            >
              <div
                className={`h-2 w-full rounded-sm transition-colors ${
                  isPast || isCurrent ? 'bg-green-500' : 'bg-muted group-hover:bg-green-300'
                } ${isCurrent ? 'bg-green-400' : ''} ${isPast ? 'bg-green-600' : ''}`}
              />
              <span className="text-[10px] text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                {isCurrent ? `${dias} dias` : isPast ? `${dias} dias` : etapa.nome}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
