import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Loader2, Snowflake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Empresa {
  id: number;
  nome: string | null;
  numero_automacao: string | null;
}

export default function SelectCompany() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { setEmpresa, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home', { replace: true });
      return;
    }
    const fetch = async () => {
      const { data, error } = await supabase
        .from('empresas_geral')
        .select('id, nome, numero_automacao')
        .order('nome');
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar empresas', variant: 'destructive' });
      } else {
        setEmpresas(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [isAdmin]);

  const filtered = empresas.filter(e =>
    (e.nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (empresa: Empresa) => {
    setEmpresa(empresa.id, empresa.nome ?? 'Sem nome');
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-brand p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Snowflake className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Selecione uma empresa</h1>
            <p className="text-sm text-muted-foreground">Escolha a empresa que deseja gerenciar</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((empresa) => (
              <button
                key={empresa.id}
                className="flex items-center gap-4 w-full rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50 group"
                onClick={() => handleSelect(empresa)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-muted">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{empresa.nome ?? 'Sem nome'}</h3>
                  <p className="text-xs text-muted-foreground">{empresa.numero_automacao || 'Sem número'}</p>
                </div>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  Acessar →
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Nenhuma empresa encontrada</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
