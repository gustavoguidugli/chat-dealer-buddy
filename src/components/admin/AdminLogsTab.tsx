import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const PAGE_SIZE = 50;

export function AdminLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async (append = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      if (search.trim()) {
        query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);
      }

      if (append && logs.length > 0) {
        const lastDate = logs[logs.length - 1].created_at;
        if (lastDate) query = query.lt('created_at', lastDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fetched = (data || []) as AuditLog[];
      setHasMore(fetched.length > PAGE_SIZE);
      const trimmed = fetched.slice(0, PAGE_SIZE);

      setLogs(prev => append ? [...prev, ...trimmed] : trimmed);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter, search, logs]);

  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter]);

  const handleSearch = () => fetchLogs(false);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  };

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'destructive' as const;
    if (action.includes('create') || action.includes('insert')) return 'default' as const;
    return 'secondary' as const;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ação ou entidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="convite">Convite</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="funil">Funil</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(false)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum log encontrado</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID Entidade</TableHead>
                <TableHead>Ator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <>
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <TableCell className="px-2">
                      {log.metadata ? (
                        expandedId === log.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={actionColor(log.action)} className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity_type}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                      {log.entity_id || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                      {log.actor_user_id || '-'}
                    </TableCell>
                  </TableRow>
                  {expandedId === log.id && log.metadata && (
                    <TableRow key={`${log.id}-meta`}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto p-2 rounded-md bg-muted">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => fetchLogs(true)} disabled={loading}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
