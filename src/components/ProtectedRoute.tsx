import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, semEmpresa, isSuperAdmin } = useAuth();
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

  return <>{children}</>;
}
