import { useState, useMemo } from 'react';
import { buildWhatsAppLink, formatPhoneDisplay } from '@/lib/lead-utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Plus, Trash2, GripVertical } from 'lucide-react';

interface LeadDetail {
  id: number;
  nome: string;
  whatsapp: string | null;
  valor_estimado: number | null;
  status: string | null;
  campos_extras: Record<string, any> | null;
  id_funil: number;
  id_empresa: number;
  id_etapa_atual: number;
  id_contato_geral: number | null;
  proprietario_id: string | null;
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

// --- SortableFieldItem ---
function SortableFieldItem({ campo, index, editingCampos, setEditingCampos, onDelete }: {
  campo: CampoCustomizado;
  index: number;
  editingCampos: CampoCustomizado[];
  setEditingCampos: (c: CampoCustomizado[]) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 p-2 rounded-md border bg-background">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <Input
          value={campo.nome}
          onChange={e => {
            const updated = [...editingCampos];
            updated[index] = { ...updated[index], nome: e.target.value };
            setEditingCampos(updated);
          }}
          className="h-7 text-xs"
          placeholder="Nome do campo"
        />
        <Select
          value={campo.tipo}
          onValueChange={v => {
            const updated = [...editingCampos];
            updated[index] = { ...updated[index], tipo: v };
            setEditingCampos(updated);
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="texto">Texto</SelectItem>
            <SelectItem value="numero">Número</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="select">Seleção</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <button
        className="text-destructive hover:text-destructive/80 shrink-0"
        onClick={() => onDelete(campo.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface LeadDrawerFieldsProps {
  lead: LeadDetail;
  campos: CampoCustomizado[];
  dadosContato: Record<string, any>;
  listaInteresses: { nome: string; label: string; funil_id: number | null }[];
  onLeadChanged?: () => void;
  setLead: (lead: any) => void;
  fetchAll: () => void;
  fetchMeta: () => void;
}

export function LeadDrawerFields({
  lead, campos, dadosContato, listaInteresses, onLeadChanged, setLead, fetchAll, fetchMeta,
}: LeadDrawerFieldsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [editingTelefone, setEditingTelefone] = useState(false);
  const [telefoneTemp, setTelefoneTemp] = useState('');
  const [editingValor, setEditingValor] = useState(false);
  const [valorTemp, setValorTemp] = useState('');
  const [camposAbertos, setCamposAbertos] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [interesseOverride, setInteresseOverride] = useState<string | null>(null);

  // Field management
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('texto');
  const [savingField, setSavingField] = useState(false);
  const [manageFieldsOpen, setManageFieldsOpen] = useState(false);
  const [editingCampos, setEditingCampos] = useState<CampoCustomizado[]>([]);
  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);

  const fieldSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const fieldIds = useMemo(() => editingCampos.map(c => c.id), [editingCampos]);

  // Clear interesseOverride when realtime syncs
  // (handled via useEffect in parent, but also local)
  const effectiveInteresse = interesseOverride ?? dadosContato.interesse;

  const openManageFields = () => {
    setEditingCampos(campos.map(c => ({ ...c })));
    setManageFieldsOpen(true);
  };

  const handleUpdateField = async (campo: CampoCustomizado) => {
    const { error } = await supabase.from('campos_customizados')
      .update({ nome: campo.nome, tipo: campo.tipo, ordem: campo.ordem })
      .eq('id', campo.id);
    if (error) {
      toast({ title: 'Erro ao atualizar campo', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteField = async (id: number) => {
    const { error } = await supabase.from('campos_customizados')
      .update({ ativo: false })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir campo', description: error.message, variant: 'destructive' });
    } else {
      setEditingCampos(prev => prev.filter(c => c.id !== id));
      setDeletingFieldId(null);
      toast({ title: 'Campo excluído' });
      fetchAll();
    }
  };

  const handleSaveAllFields = async () => {
    for (const campo of editingCampos) {
      await handleUpdateField(campo);
    }
    toast({ title: 'Campos atualizados' });
    setManageFieldsOpen(false);
    fetchAll();
  };

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = editingCampos.findIndex(c => c.id === active.id);
    const newIndex = editingCampos.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newCampos = [...editingCampos];
    const [moved] = newCampos.splice(oldIndex, 1);
    newCampos.splice(newIndex, 0, moved);
    newCampos.forEach((c, i) => { c.ordem = i; });
    setEditingCampos(newCampos);
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    setSavingField(true);
    const slug = newFieldName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { error } = await supabase.from('campos_customizados').insert({
      nome: newFieldName.trim(),
      slug,
      tipo: newFieldType,
      id_empresa: lead.id_empresa,
      id_funil: lead.id_funil,
      ordem: campos.length,
      ativo: true,
      obrigatorio: false,
    });
    setSavingField(false);
    if (error) {
      toast({ title: 'Erro ao criar campo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campo criado com sucesso' });
      setNewFieldName('');
      setNewFieldType('texto');
      setAddFieldOpen(false);
      fetchAll();
    }
  };

  const handleSaveField = async (keyOrSlug: string) => {
    const newExtras = { ...(lead.campos_extras || {}), [keyOrSlug]: editingValue };
    await supabase.from('leads_crm').update({
      campos_extras: newExtras,
    }).eq('id', lead.id);
    setLead({ ...lead, campos_extras: newExtras });

    // Sync SDR tables for mapped fields
    const sdrFields = ['gasto_mensal', 'consumo_mensal', 'dias_semana', 'cidade', 'tipo_uso'];
    if (sdrFields.includes(keyOrSlug) && lead.whatsapp) {
      const raw = lead.whatsapp.replace(/\D/g, '');
      const whatsappLookup = raw.startsWith('55') ? raw : '55' + raw;
      const interesse = dadosContato.interesse || lead.campos_extras?.interesse || null;
      try {
        await supabase.rpc('update_contato_sdr_field', {
          p_whatsapp: whatsappLookup,
          p_campo: keyOrSlug,
          p_valor: editingValue,
          p_interesse: interesse,
        });
      } catch (e) {
        console.warn('Falha ao sincronizar campo SDR:', e);
      }
    }

    setEditingField(null);
    setEditingValue('');
  };

  const normalizeFieldIdentifier = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

  const contatoFieldMap: Record<string, string> = {
    interesse: 'interesse',
    cidade: 'cidade',
    tipo_uso: 'tipo_uso',
    tipo_de_uso: 'tipo_uso',
    consumo_mensal: 'consumo_mensal',
    gasto_mensal: 'gasto_mensal',
    dias_semana: 'dias_semana',
    dias_por_semana: 'dias_semana',
  };

  const contatoNameMap: Record<string, string> = {
    interesse: 'interesse',
    cidade: 'cidade',
    tipo_de_uso: 'tipo_uso',
    consumo_mensal: 'consumo_mensal',
    gasto_mensal: 'gasto_mensal',
    dias_por_semana: 'dias_semana',
  };

  return (
    <>
      <div className="w-[260px] border-r bg-muted/30 shrink-0 overflow-y-auto">
        {/* Número de telefone */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Número de telefone</span>
            {!editingTelefone && (
              <Pencil
                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => {
                  setEditingTelefone(true);
                  setTelefoneTemp(lead.whatsapp || '');
                }}
              />
            )}
          </div>
          {editingTelefone ? (
            <div className="mt-1.5">
              <Input
                value={telefoneTemp}
                onChange={e => setTelefoneTemp(e.target.value)}
                className="h-7 text-sm"
                placeholder="(00) 00000-0000"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = telefoneTemp.trim() || null;
                    await supabase.from('leads_crm').update({ whatsapp: val }).eq('id', lead.id);
                    setEditingTelefone(false);
                    onLeadChanged?.();
                  } else if (e.key === 'Escape') {
                    setEditingTelefone(false);
                  }
                }}
                onBlur={async () => {
                  const val = telefoneTemp.trim() || null;
                  await supabase.from('leads_crm').update({ whatsapp: val }).eq('id', lead.id);
                  setEditingTelefone(false);
                  onLeadChanged?.();
                }}
              />
            </div>
          ) : (
          <div className="mt-0.5">
            {(() => {
              const phoneValue = dadosContato.telefone || lead.whatsapp;
              if (!phoneValue) return <span className="text-sm text-muted-foreground font-normal">Não definido</span>;
              const waLink = buildWhatsAppLink(phoneValue);
              const displayPhone = formatPhoneDisplay(phoneValue) || phoneValue;
              return waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayPhone}
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              ) : (
                <p className="text-sm font-semibold text-foreground">{displayPhone}</p>
              );
            })()}
          </div>
          )}
        </div>
        {/* Valor do negócio */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Valor do negócio</span>
            {!editingValor && (
              <Pencil
                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => {
                  setEditingValor(true);
                  setValorTemp(lead.valor_estimado != null ? String(lead.valor_estimado) : '');
                }}
              />
            )}
          </div>
          {editingValor ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                value={valorTemp}
                onChange={e => setValorTemp(e.target.value)}
                className="h-7 text-sm flex-1"
                placeholder="0"
                autoFocus
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = valorTemp.trim() ? Number(valorTemp) : null;
                    await supabase.from('leads_crm').update({ valor_estimado: val }).eq('id', lead.id);
                    setEditingValor(false);
                    onLeadChanged?.();
                  } else if (e.key === 'Escape') {
                    setEditingValor(false);
                  }
                }}
                onBlur={async () => {
                  const val = valorTemp.trim() ? Number(valorTemp) : null;
                  await supabase.from('leads_crm').update({ valor_estimado: val }).eq('id', lead.id);
                  setEditingValor(false);
                  onLeadChanged?.();
                }}
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {lead.valor_estimado != null
                ? `R$ ${Number(lead.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : <span className="text-muted-foreground font-normal">Não definido</span>
              }
            </p>
          )}
        </div>

        <Collapsible open={camposAbertos} onOpenChange={setCamposAbertos}>
          <div className="flex items-center justify-between w-full px-4 py-3">
            <CollapsibleTrigger className="text-sm font-semibold text-foreground hover:text-foreground/80">
              Campos
            </CollapsibleTrigger>
            <div className="flex items-center gap-1">
              <Popover open={manageFieldsOpen} onOpenChange={setManageFieldsOpen}>
                <PopoverTrigger asChild>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={openManageFields} />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" side="bottom" align="end">
                  <p className="text-sm font-semibold text-foreground mb-3">Gerenciar campos</p>
                  <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {editingCampos.map((campo, index) => (
                          <SortableFieldItem
                            key={campo.id}
                            campo={campo}
                            index={index}
                            editingCampos={editingCampos}
                            setEditingCampos={setEditingCampos}
                            onDelete={(id) => setDeletingFieldId(id)}
                          />
                        ))}
                        {editingCampos.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum campo</p>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <Button
                    size="sm"
                    className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={handleSaveAllFields}
                  >
                    Salvar alterações
                  </Button>
                </PopoverContent>
              </Popover>
              <Popover open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                <PopoverTrigger asChild>
                  <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" side="bottom" align="end">
                  <p className="text-sm font-semibold text-foreground mb-3">Novo campo</p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        value={newFieldName}
                        onChange={e => setNewFieldName(e.target.value)}
                        placeholder="Ex: Gasto Mensal"
                        className="h-8 text-sm mt-1"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select value={newFieldType} onValueChange={setNewFieldType}>
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="texto">Texto</SelectItem>
                          <SelectItem value="numero">Número</SelectItem>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="select">Seleção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      onClick={handleAddField}
                      disabled={!newFieldName.trim() || savingField}
                    >
                      {savingField ? 'Criando...' : 'Adicionar'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <CollapsibleContent>
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Negócio
              </p>
              {campos.map(campo => {
                const normalizedNome = normalizeFieldIdentifier(campo.nome);
                const normalizedSlug = normalizeFieldIdentifier(campo.slug);

                const contatoKeyByName = contatoNameMap[normalizedNome];
                const contatoKeyBySlug = contatoFieldMap[normalizedSlug];
                const contatoKey = contatoKeyByName ?? contatoKeyBySlug;
                const storageKey = contatoKey ?? campo.slug;

                const contatoValue = contatoKey ? dadosContato[contatoKey] : null;
                const contatoHasValue = contatoValue != null && String(contatoValue).trim() !== '';

                const extraValue =
                  lead.campos_extras?.[storageKey] ??
                  lead.campos_extras?.[campo.slug] ??
                  '';

                const value = contatoHasValue ? String(contatoValue) : String(extraValue);
                const isEditing = editingField === campo.slug;
                const isInteresseField = contatoKey === 'interesse' || normalizedNome === 'interesse';

                return (
                  <div
                    key={campo.id}
                    className="flex items-center justify-between py-2 px-1 rounded-md group hover:bg-muted/50 cursor-pointer"
                    onMouseDown={(e) => {
                      if (!isEditing && !isInteresseField) {
                        e.preventDefault();
                        setEditingField(campo.slug);
                        setEditingValue(value);
                      }
                    }}
                  >
                    <span className="text-xs text-muted-foreground font-medium shrink-0 w-[90px] text-right pr-3">
                      {campo.nome}
                    </span>
                    {isInteresseField ? (
                      <div className="flex-1">
                        <Select
                          value={(interesseOverride ?? value) || ''}
                          onValueChange={async (val) => {
                            setInteresseOverride(val);

                            const previousValue = dadosContato.interesse || lead.campos_extras?.interesse || null;

                            // 1. Sync to contatos_geral
                            try {
                              let contatoGeralId = lead.id_contato_geral;
                              
                              if (!contatoGeralId && lead.whatsapp) {
                                const raw = lead.whatsapp.replace(/\D/g, '');
                                const variants = [
                                  lead.whatsapp,
                                  raw,
                                  raw.startsWith('55') ? raw : '55' + raw,
                                  raw.startsWith('55') ? raw.slice(2) : raw,
                                ].filter(Boolean);
                                
                                const { data: contatoData } = await supabase
                                  .from('contatos_geral')
                                  .select('id, empresa_id')
                                  .in('whatsapp', [...new Set(variants)])
                                  .limit(1)
                                  .maybeSingle();
                                
                                if (contatoData) {
                                  contatoGeralId = contatoData.id;
                                  await supabase.from('leads_crm').update({ id_contato_geral: contatoGeralId }).eq('id', lead.id);
                                  
                                  if (!contatoData.empresa_id) {
                                    await supabase.from('contatos_geral').update({ empresa_id: lead.id_empresa }).eq('id', contatoGeralId);
                                  }
                                }
                              }

                              if (contatoGeralId) {
                                await supabase
                                  .from('contatos_geral')
                                  .update({ interesse: val })
                                  .eq('id', contatoGeralId);
                              }
                            } catch (e) {
                              console.warn('Falha ao sincronizar interesse com contatos_geral:', e);
                            }

                            // 2. Save to leads_crm.campos_extras
                            const newExtras = { ...(lead.campos_extras || {}), [storageKey]: val };
                            await supabase.from('leads_crm').update({ campos_extras: newExtras }).eq('id', lead.id);
                            setLead({ ...lead, campos_extras: newExtras });

                            // 3. Register change in historico_lead
                            if (previousValue !== val) {
                              const interesseLabel = listaInteresses.find(i => i.nome === val)?.label || val;
                              const previousLabel = listaInteresses.find(i => i.nome === previousValue)?.label || previousValue || 'Não definido';
                              
                              await supabase.from('historico_lead').insert({
                                id_lead: lead.id,
                                id_empresa: lead.id_empresa,
                                tipo_evento: 'campo_alterado',
                                descricao: `Interesse alterado de "${previousLabel}" para "${interesseLabel}"`,
                                usuario_id: user?.id || null,
                                metadados: {
                                  campo: 'interesse',
                                  valor_anterior: previousValue,
                                  valor_novo: val,
                                },
                              });
                            }

                            // 4. Wait for DB trigger, then refresh
                            await new Promise(resolve => setTimeout(resolve, 400));
                            await fetchMeta();
                            onLeadChanged?.();
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {listaInteresses.map(int => (
                              <SelectItem key={int.nome} value={int.nome}>
                                {int.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : isEditing ? (
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveField(storageKey);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          onBlur={() => {
                            const currentSlug = campo.slug;
                            const currentStorageKey = storageKey;
                            requestAnimationFrame(() => {
                              setEditingField(prev => {
                                if (prev !== null && prev !== currentSlug) return prev;
                                handleSaveField(currentStorageKey);
                                return null;
                              });
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-foreground">{value || '-'}</span>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                );
              })}
              {campos.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhum campo customizado</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Delete field confirmation */}
      <AlertDialog open={deletingFieldId !== null} onOpenChange={(v) => { if (!v) setDeletingFieldId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este campo? Os valores já preenchidos nos leads serão mantidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deletingFieldId && handleDeleteField(deletingFieldId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
