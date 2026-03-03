import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag, Search, Plus, Pencil, Check, GripVertical, Trash2, X } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Etiqueta {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
  id_empresa: number;
}

interface EtiquetaSelectorProps {
  leadId: number;
  empresaId: number;
}

const CORES_DISPONIVEIS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#6b7280',
];

function SortableEtiquetaItem({
  etiqueta, isSelected, isEditing, onToggle, onUpdate, onDelete,
}: {
  etiqueta: Etiqueta;
  isSelected: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onUpdate: (e: Etiqueta) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etiqueta.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [editNome, setEditNome] = useState(etiqueta.nome);
  const [showColors, setShowColors] = useState(false);

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 py-1.5 px-1 rounded-md hover:bg-muted/50">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="relative">
          <button
            className="h-5 w-5 rounded-full border-2 border-background shrink-0 shadow-sm"
            style={{ backgroundColor: etiqueta.cor }}
            onClick={() => setShowColors(!showColors)}
          />
          {showColors && (
            <div className="absolute left-0 top-7 z-50 bg-popover border rounded-md p-2 grid grid-cols-5 gap-1 shadow-lg">
              {CORES_DISPONIVEIS.map(cor => (
                <button
                  key={cor}
                  className="h-5 w-5 rounded-full border hover:scale-110 transition-transform"
                  style={{ backgroundColor: cor }}
                  onClick={() => {
                    onUpdate({ ...etiqueta, cor });
                    setShowColors(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <Input
          value={editNome}
          onChange={e => setEditNome(e.target.value)}
          onBlur={() => { if (editNome.trim() && editNome !== etiqueta.nome) onUpdate({ ...etiqueta, nome: editNome }); }}
          onKeyDown={e => { if (e.key === 'Enter' && editNome.trim()) { onUpdate({ ...etiqueta, nome: editNome }); } }}
          className="h-6 text-xs flex-1 px-1.5"
        />
        <button onClick={onDelete} className="text-destructive hover:text-destructive/80 shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors ${
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
      }`}
      onClick={onToggle}
    >
      <span
        className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
        style={{
          backgroundColor: `${etiqueta.cor}20`,
          color: etiqueta.cor,
          border: `1px solid ${etiqueta.cor}30`,
        }}
      >
        {etiqueta.nome}
      </span>
      {isSelected && (
        <div className="ml-auto flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

export function EtiquetaSelector({ leadId, empresaId }: EtiquetaSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newCor, setNewCor] = useState('#3b82f6');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchData = useCallback(async () => {
    const [etqRes, selRes] = await Promise.all([
      supabase.from('etiquetas_card').select('id, nome, cor, ordem, id_empresa').eq('id_empresa', empresaId).eq('ativo', true).order('ordem'),
      supabase.from('lead_etiquetas').select('id_etiqueta').eq('id_lead', leadId),
    ]);
    setEtiquetas((etqRes.data || []) as Etiqueta[]);
    setSelectedIds((selRes.data || []).map(r => r.id_etiqueta));
  }, [leadId, empresaId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const toggleEtiqueta = async (id: number) => {
    if (selectedIds.includes(id)) {
      await supabase.from('lead_etiquetas').delete().eq('id_lead', leadId).eq('id_etiqueta', id);
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      await supabase.from('lead_etiquetas').insert({ id_lead: leadId, id_etiqueta: id });
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleUpdate = async (etiqueta: Etiqueta) => {
    await supabase.from('etiquetas_card').update({ nome: etiqueta.nome, cor: etiqueta.cor, ordem: etiqueta.ordem }).eq('id', etiqueta.id);
    setEtiquetas(prev => prev.map(e => e.id === etiqueta.id ? etiqueta : e));
  };

  const handleDelete = async (id: number) => {
    await supabase.from('lead_etiquetas').delete().eq('id_etiqueta', id);
    await supabase.from('etiquetas_card').update({ ativo: false }).eq('id', id);
    setEtiquetas(prev => prev.filter(e => e.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
    toast({ title: 'Etiqueta excluída' });
  };

  const handleAdd = async () => {
    if (!newNome.trim()) return;
    const { data, error } = await supabase.from('etiquetas_card').insert({
      nome: newNome.trim(),
      cor: newCor,
      id_empresa: empresaId,
      ordem: etiquetas.length,
      ativo: true,
    }).select().single();
    if (error) {
      toast({ title: 'Erro ao criar etiqueta', description: error.message, variant: 'destructive' });
    } else {
      setEtiquetas(prev => [...prev, data as Etiqueta]);
      setNewNome('');
      setAddingNew(false);
      toast({ title: 'Etiqueta criada' });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = etiquetas.findIndex(e => e.id === active.id);
    const newIndex = etiquetas.findIndex(e => e.id === over.id);
    const updated = [...etiquetas];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    updated.forEach((e, i) => { e.ordem = i; });
    setEtiquetas(updated);
    // Persist order
    updated.forEach(e => {
      supabase.from('etiquetas_card').update({ ordem: e.ordem }).eq('id', e.id).then(() => {});
    });
  };

  const filtered = etiquetas.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()));

  // Show selected etiquetas as badges next to the icon
  const selectedEtiquetas = etiquetas.filter(e => selectedIds.includes(e.id));

  return (
    <div className="inline-flex items-center gap-1.5">
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setIsEditing(false); setAddingNew(false); setSearch(''); } }}>
        <PopoverTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Tag className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" side="bottom" align="start">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar etiquetas"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          {/* List */}
          <ScrollArea className="max-h-[280px]">
            <div className="p-1.5">
              {isEditing ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filtered.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {filtered.map(etiqueta => (
                      <SortableEtiquetaItem
                        key={etiqueta.id}
                        etiqueta={etiqueta}
                        isSelected={selectedIds.includes(etiqueta.id)}
                        isEditing={true}
                        onToggle={() => {}}
                        onUpdate={handleUpdate}
                        onDelete={() => handleDelete(etiqueta.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                filtered.map(etiqueta => (
                  <SortableEtiquetaItem
                    key={etiqueta.id}
                    etiqueta={etiqueta}
                    isSelected={selectedIds.includes(etiqueta.id)}
                    isEditing={false}
                    onToggle={() => toggleEtiqueta(etiqueta.id)}
                    onUpdate={handleUpdate}
                    onDelete={() => handleDelete(etiqueta.id)}
                  />
                ))
              )}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma etiqueta encontrada</p>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-2 space-y-2">
            {addingNew ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {CORES_DISPONIVEIS.slice(0, 5).map(cor => (
                      <button
                        key={cor}
                        className={`h-4 w-4 rounded-full border-2 transition-transform ${newCor === cor ? 'scale-125 border-foreground' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: cor }}
                        onClick={() => setNewCor(cor)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newNome}
                    onChange={e => setNewNome(e.target.value)}
                    placeholder="Nome da etiqueta"
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  />
                  <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd}>Salvar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-1.5" onClick={() => setAddingNew(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
                  onClick={() => setAddingNew(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar etiqueta
                </button>
                <button
                  className={`p-1 rounded transition-colors ${isEditing ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selectedEtiquetas.map(e => (
        <span
          key={e.id}
          className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${e.cor}20`,
            color: e.cor,
          }}
        >
          {e.nome}
        </span>
      ))}
    </div>
  );
}
