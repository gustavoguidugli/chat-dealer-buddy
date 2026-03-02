import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  open: string;
  close: string;
}

interface WeeklySchedule {
  mon: TimeSlot[];
  tue: TimeSlot[];
  wed: TimeSlot[];
  thu: TimeSlot[];
  fri: TimeSlot[];
  sat: TimeSlot[];
  sun: TimeSlot[];
}

interface HorariosFuncionamento {
  weekly: WeeklySchedule;
  timezone: string;
  exceptions: Record<string, unknown>;
  always_on?: boolean;
}

const DAY_LABELS: Record<keyof WeeklySchedule, string> = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

const DAY_ORDER: (keyof WeeklySchedule)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DEFAULT_SLOT: TimeSlot = { open: '08:00', close: '18:00' };

export default function HorarioAtendimento() {
  const navigate = useNavigate();
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  });
  const [alwaysOn, setAlwaysOn] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('config_empresas_geral')
        .select('horarios_funcionamento')
        .eq('id_empresa', empresaId)
        .maybeSingle();

      if (data?.horarios_funcionamento) {
        const h = data.horarios_funcionamento as unknown as HorariosFuncionamento;
        setSchedule(h.weekly);
        setAlwaysOn(!!h.always_on);
      }
      if (error) console.error(error);
      setLoading(false);
    };
    fetch();
  }, [empresaId]);

  const toggleDay = (day: keyof WeeklySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].length > 0 ? [] : [{ ...DEFAULT_SLOT }],
    }));
  };

  const addSlot = (day: keyof WeeklySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: [...prev[day], { ...DEFAULT_SLOT }],
    }));
  };

  const removeSlot = (day: keyof WeeklySchedule, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const updateSlot = (day: keyof WeeklySchedule, index: number, field: 'open' | 'close', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => i === index ? { ...slot, [field]: value } : slot),
    }));
  };

  const handleSave = async () => {
    if (!empresaId) return;
    setSaving(true);

    const payload: HorariosFuncionamento = {
      weekly: schedule,
      timezone: 'America/Sao_Paulo',
      exceptions: {},
      always_on: alwaysOn,
    };

    const { error } = await supabase
      .from('config_empresas_geral')
      .update({ horarios_funcionamento: JSON.parse(JSON.stringify(payload)) })
      .eq('id_empresa', empresaId);

    if (error) {
      toast({ title: 'Erro ao salvar horários', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Horários salvos com sucesso!' });
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/base-conhecimento')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Horário de Atendimento</h1>
            <p className="text-muted-foreground text-sm mt-1">Configure quando a IA deve responder automaticamente</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card className="mb-4">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Sempre ativado</p>
                  <p className="text-xs text-muted-foreground">A IA responde 24h por dia, todos os dias</p>
                </div>
                <Switch checked={alwaysOn} onCheckedChange={setAlwaysOn} />
              </CardContent>
            </Card>

            <div className={`space-y-3 transition-opacity ${alwaysOn ? 'opacity-70 pointer-events-none' : ''}`}>
            {DAY_ORDER.map(day => {
              const isActive = schedule[day].length > 0;
              return (
                <Card key={day} className={!isActive ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Switch checked={isActive} onCheckedChange={() => toggleDay(day)} />
                      <span className="font-medium text-sm w-32">{DAY_LABELS[day]}</span>

                      {isActive ? (
                        <div className="flex-1 space-y-2">
                          {schedule[day].map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={slot.open}
                                onChange={e => updateSlot(day, idx, 'open', e.target.value)}
                                className="w-32 text-sm"
                              />
                              <span className="text-muted-foreground text-xs">até</span>
                              <Input
                                type="time"
                                value={slot.close}
                                onChange={e => updateSlot(day, idx, 'close', e.target.value)}
                                className="w-32 text-sm"
                              />
                              {schedule[day].length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeSlot(day, idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addSlot(day)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar intervalo
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Fechado</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
