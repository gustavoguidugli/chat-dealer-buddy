import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { Navigate } from 'react-router-dom';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, empresaId } = useAuth();

  if (isSuperAdmin && !empresaId) {
    return <Navigate to="/selecionar-empresa" replace />;
  }

  return (
    <div className="flex h-screen bg-secondary">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
