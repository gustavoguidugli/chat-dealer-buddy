import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, RefreshCw, Wrench } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

interface DiagRow {
  id: number;
  nome: string | null;
  hasConfig: boolean;
  crmAtivo: boolean;
  triagemAtiva: boolean;
  hasFunilTriagem: boolean;
  funilCount: number;
  contatosRecentes: number;
  leadsRecentes: number;
  problemas: number;
}

export function AdminDiagnosticoTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<DiagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [empresasRes, configsRes, funisRes, contatosRes, leadsRes] = await Promise.all([
        supabase.from('empresas_geral').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('config_empresas_geral').select('id_empresa, crm_is_ativo, triagem_is_ativo'),
        supabase.from('funis').select('id_empresa, tipo'),
        supabase.from('contatos_geral').select('empresa_id, created_at').gte('created_at', ontem),
        supabase.from('leads_crm').select('id_empresa, created_at').gte('created_at', ontem),
      ]);

      if (empresasRes.error) throw empresasRes.error;

      const configMap = new Map<number, { crm: boolean; triagem: boolean }>();
      configsRes.data?.forEach(c => {
        configMap.set(c.id_empresa, { crm: c.crm_is_ativo === true, triagem: c.triagem_is_ativo !== false });
      });

      const funilMap = new Map<number, { count: number; hasTriagem: boolean }>();
      funisRes.data?.forEach(f => {
        const cur = funilMap.get(f.id_empresa) || { count: 0, hasTriagem: false };
        cur.count++;
        if (f.tipo === 'triagem') cur.hasTriagem = true;
        funilMap.set(f.id_empresa, cur);
      });

      const contatoMap = new Map<number, number>();
      contatosRes.data?.forEach(c => {
        if (c.empresa_id) contatoMap.set(c.empresa_id, (contatoMap.get(c.empresa_id) || 0) + 1);
      });

      const leadMap = new Map<number, number>();
      leadsRes.data?.forEach(l => {
        leadMap.set(l.id_empresa, (leadMap.get(l.id_empresa) || 0) + 1);
      });

      const result: DiagRow[] = (empresasRes.data || []).map(e => {
        const cfg = configMap.get(e.id);
        const funil = funilMap.get(e.id);
        const hasConfig = !!cfg;
        const crmAtivo = cfg?.crm ?? false;
        const triagemAtiva = cfg?.triagem ?? false;
        const hasFunilTriagem = funil?.hasTriagem ?? false;
        const contatosRecentes = contatoMap.get(e.id) || 0;
        const leadsRecentes = leadMap.get(e.id) || 0;

        let problemas = 0;
        if (!hasConfig) problemas++;
        if (!crmAtivo) problemas++;
        if (!hasFunilTriagem) problemas++;
        if (contatosRecentes > 0 && leadsRecentes === 0 && crmAtivo) problemas++;

        return {
          id: e.id,
          nome: e.nome,
          hasConfig,
          crmAtivo,
          triagemAtiva,
          hasFunilTriagem,
          funilCount: funil?.count ?? 0,
          contatosRecentes,
          leadsRecentes,
          problemas,
        };
      });

      result.sort((a, b) => b.problemas - a.problemas);
      setRows(result);
    } catch (err) {
      console.error('Diagnostico error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const ativarCrm = async (empresaId: number) => {
    setFixing(empresaId);
    const { error } = await supabase
      .from('config_empresas_geral')
      .upsert({ id_empresa: empresaId, crm_is_ativo: true }, { onConflict: 'id_empresa' });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'CRM ativado com sucesso' });
      fetch();
    }
    setFixing(null);
  };

  const Check = () => <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  const Cross = () => <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Checagem automática de saúde das empresas ativas
        </p>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Config</TableHead>
                <TableHead className="text-center">CRM</TableHead>
                <TableHead className="text-center">Funil Triagem</TableHead>
                <TableHead className="text-center">Contatos 24h</TableHead>
                <TableHead className="text-center">Leads 24h</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">{row.nome || 'Sem nome'}</TableCell>
                  <TableCell className="text-center">{row.hasConfig ? <Check /> : <Cross />}</TableCell>
                  <TableCell className="text-center">{row.crmAtivo ? <Check /> : <Cross />}</TableCell>
                  <TableCell className="text-center">{row.hasFunilTriagem ? <Check /> : <Cross />}</TableCell>
                  <TableCell className="text-center text-sm">{row.contatosRecentes}</TableCell>
                  <TableCell className="text-center text-sm">{row.leadsRecentes}</TableCell>
                  <TableCell className="text-center">
                    {row.problemas === 0 ? (
                      <Badge variant="default" className="text-xs">OK</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">{row.problemas} problema{row.problemas > 1 ? 's' : ''}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!row.crmAtivo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => ativarCrm(row.id)}
                        disabled={fixing === row.id}
                        className="text-xs"
                      >
                        <Wrench className="h-3 w-3 mr-1" /> Ativar CRM
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
