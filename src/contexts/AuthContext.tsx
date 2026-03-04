import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'guidugli.gustavo@gmail.com';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  empresaId: number | null;
  empresaNome: string | null;
  setEmpresa: (id: number, nome: string) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (!newSession?.user) {
          setIsAdmin(false);
          setEmpresaId(null);
          setEmpresaNome(null);
          setLoading(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchUserData = async () => {
      try {
        // Check permissions
        const { data: perm } = await supabase
          .from('user_permissions')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        const admin = perm?.is_admin ?? false;
        const superAdmin = user.email === SUPER_ADMIN_EMAIL;
        setIsAdmin(admin);

        if (!perm) {
          await supabase.from('user_permissions').insert({
            user_id: user.id,
            is_admin: false
          });
        }

        if (superAdmin) {
          const savedId = localStorage.getItem('eco_empresa_id');
          const savedNome = localStorage.getItem('eco_empresa_nome');
          if (savedId) {
            setEmpresaId(Number(savedId));
            setEmpresaNome(savedNome);
          }
        } else {
          const { data: mapping } = await (supabase as any)
            .from('user_empresa_geral')
            .select('empresa_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (mapping?.empresa_id) {
            setEmpresaId(mapping.empresa_id);
            const { data: emp } = await supabase
              .from('empresas_geral')
              .select('nome')
              .eq('id', mapping.empresa_id)
              .single();
            setEmpresaNome(emp?.nome ?? null);
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  const setEmpresa = (id: number, nome: string) => {
    setEmpresaId(id);
    setEmpresaNome(nome);
    localStorage.setItem('eco_empresa_id', String(id));
    localStorage.setItem('eco_empresa_nome', nome);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('eco_empresa_id');
    localStorage.removeItem('eco_empresa_nome');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, isAdmin, isSuperAdmin: user?.email === SUPER_ADMIN_EMAIL,
      empresaId, empresaNome,
      setEmpresa, loading, signOut: handleSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
