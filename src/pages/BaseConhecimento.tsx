import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Timer, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function BaseConhecimento() {
  const navigate = useNavigate();
  const { empresaId } = useAuth();
  const [faqCount, setFaqCount] = useState<number | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('id_empresa', empresaId);
      setFaqCount(count ?? 0);
    };
    fetchCount();
  }, [empresaId]);

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Base de Conhecimento</h1>
        <p className="text-muted-foreground text-sm mb-8">Gerencie FAQs, horários e configurações do chatbot</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* FAQs Card */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">FAQs - Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-4">
              <p className="text-sm text-muted-foreground">Gerencie as perguntas e respostas do chatbot</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{faqCount !== null ? `${faqCount} FAQs cadastradas` : '...'}</Badge>
                <Button size="sm" onClick={() => navigate('/base-conhecimento/faqs')}>
                  Gerenciar FAQs <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Horário Card */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Horário de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-4">
              <p className="text-sm text-muted-foreground">Configure quando a IA deve responder automaticamente</p>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => navigate('/base-conhecimento/horarios')}>
                  Configurar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tempo de Espera Card */}
          <Card className="opacity-60">
            <CardHeader>
              <Badge variant="outline" className="w-fit text-xs mb-3">🚧 Em breve</Badge>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-2">
                <Timer className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Tempo de Espera</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Defina quanto tempo o bot aguarda antes de responder</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
