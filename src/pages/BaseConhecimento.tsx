import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, ArrowRight, Bot } from 'lucide-react';
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
        .from('faqs')
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
          {/* Triagem da IA */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Triagem da IA</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-4">
              <p className="text-sm text-muted-foreground">Configure a mensagem inicial e os interesses do chatbot</p>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => navigate('/triagem')}>
                  Configurar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQs Card */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">FAQs e Perguntas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-4">
              <p className="text-sm text-muted-foreground">Gerencie as perguntas e respostas do chatbot</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{faqCount !== null ? `${faqCount} FAQs cadastradas` : '...'}</Badge>
                <Button size="sm" onClick={() => navigate('/base-conhecimento/faqs')}>
                  Gerenciar <ArrowRight className="h-4 w-4 ml-1" />
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
              <CardTitle className="text-base">Horário de funcionamento da IA</CardTitle>
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
        </div>
      </div>
    </AppLayout>
  );
}
