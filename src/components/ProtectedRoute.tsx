import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const CRM_ROUTES = ['/crm', '/crm/atividades'];
const IA_ROUTES = ['/triagem', '/base-conhecimento', '/base-conhecimento/faqs', '/base-conhecimento/horarios'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, semEmpresa, isSuperAdmin, moduloCrm, moduloIA } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow aceitar-convite even without empresa
  if (location.pathname === '/aceitar-convite') {
    return <>{children}</>;
  }

  // Users without empresa (non-super-admin) should go to /sem-empresa
  if (semEmpresa && !isSuperAdmin) {
    return <Navigate to="/sem-empresa" replace />;
  }

  // Module-based route protection (super admins bypass)
  if (!isSuperAdmin) {
    if (!moduloCrm && CRM_ROUTES.includes(location.pathname)) {
      return <Navigate to="/home" replace />;
    }
    if (!moduloIA && IA_ROUTES.includes(location.pathname)) {
      return <Navigate to="/home" replace />;
    }
  }

  return <>{children}</>;
}
