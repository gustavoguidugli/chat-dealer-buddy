import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Navigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, Stethoscope, ScrollText } from 'lucide-react';
import { AdminEmpresasTab } from '@/components/admin/AdminEmpresasTab';
import { AdminDiagnosticoTab } from '@/components/admin/AdminDiagnosticoTab';
import { AdminLogsTab } from '@/components/admin/AdminLogsTab';

export default function AdminEmpresas() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) return <Navigate to="/home" replace />;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie empresas, diagnostique problemas e visualize logs</p>
          </div>

          <Tabs defaultValue="empresas">
            <TabsList>
              <TabsTrigger value="empresas" className="gap-2">
                <Building2 className="h-4 w-4" /> Empresas
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="gap-2">
                <Stethoscope className="h-4 w-4" /> Diagnóstico
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <ScrollText className="h-4 w-4" /> Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="empresas">
              <AdminEmpresasTab />
            </TabsContent>
            <TabsContent value="diagnostico">
              <AdminDiagnosticoTab />
            </TabsContent>
            <TabsContent value="logs">
              <AdminLogsTab />
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
