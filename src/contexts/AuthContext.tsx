import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isSuperAdmin, SUPER_ADMIN_EMAILS } from '@/lib/constants';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isCompanyAdmin: boolean;
  isSuperAdmin: boolean;
  empresaId: number | null;
  empresaNome: string | null;
  semEmpresa: boolean;
  moduloCrm: boolean;
  moduloIA: boolean;
  setEmpresa: (id: number, nome: string) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchModulos(empresaId: number): Promise<{ crm: boolean; ia: boolean }> {
  const { data } = await supabase
    .from('config_empresas_geral')
    .select('crm_is_ativo, triagem_is_ativo')
    .eq('id_empresa', empresaId)
    .maybeSingle();

  return {
    crm: data?.crm_is_ativo ?? false,
    ia: data?.triagem_is_ativo ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [semEmpresa, setSemEmpresa] = useState(false);
  const [moduloCrm, setModuloCrm] = useState(false);
  const [moduloIA, setModuloIA] = useState(false);
  const [loading, setLoading] = useState(true);

  const resetState = useCallback(() => {
    setIsCompanyAdmin(false);
    setEmpresaId(null);
    setEmpresaNome(null);
    setSemEmpresa(false);
    setModuloCrm(false);
    setModuloIA(false);
  }, []);

  const fetchUserData = useCallback(async (currentUser: User) => {
    try {
      const superAdmin = SUPER_ADMIN_EMAILS.includes(currentUser.email ?? '');

      if (superAdmin) {
        setIsCompanyAdmin(true);
        const savedId = localStorage.getItem('eco_empresa_id');
        const savedNome = localStorage.getItem('eco_empresa_nome');
        if (savedId) {
          const id = Number(savedId);
          setEmpresaId(id);
          setEmpresaNome(savedNome);
          const mods = await fetchModulos(id);
          setModuloCrm(mods.crm);
          setModuloIA(mods.ia);
        }
        setSemEmpresa(false);
      } else {
        const { data: mappings, error } = await supabase
          .from('user_empresa')
          .select('empresa_id, role')
          .eq('user_id', currentUser.id);

        if (error) {
          console.error('Error fetching user_empresa:', error);
          setLoading(false);
          return;
        }

        if (mappings && mappings.length > 0) {
          // If user has a saved preference and it's still valid, use it
          const savedId = localStorage.getItem('eco_empresa_id');
          const preferred = savedId
            ? mappings.find((m) => m.empresa_id === Number(savedId))
            : null;
          const mapping = preferred ?? mappings[0];

          setEmpresaId(mapping.empresa_id);
          setSemEmpresa(false);
          localStorage.setItem('eco_empresa_id', String(mapping.empresa_id));

          const role = mapping.role ?? 'member';
          setIsCompanyAdmin(role === 'admin' || role === 'super_admin');

          const [{ data: emp }, mods] = await Promise.all([
            supabase.from('empresas_geral').select('nome').eq('id', mapping.empresa_id).maybeSingle(),
            fetchModulos(mapping.empresa_id),
          ]);
          setEmpresaNome(emp?.nome ?? null);
          localStorage.setItem('eco_empresa_nome', emp?.nome ?? '');
          setModuloCrm(mods.crm);
          setModuloIA(mods.ia);
        } else {
          setIsCompanyAdmin(false);
          setSemEmpresa(true);
          setModuloCrm(false);
          setModuloIA(false);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Bootstrap: get initial session, then listen for changes
  useEffect(() => {
    let mounted = true;

    // 1. Get the initial session (awaits the token to be ready)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);

      if (initialUser) {
        fetchUserData(initialUser);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        if (!newUser) {
          resetState();
          setLoading(false);
        } else {
          // Defer fetchUserData to next tick so the Supabase client
          // has the new JWT set internally before we make queries
          setLoading(true);
          setTimeout(() => {
            if (mounted) fetchUserData(newUser);
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, resetState]);

  const refreshUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchUserData(user);
    }
  }, [user, fetchUserData]);

  const setEmpresa = async (id: number, nome: string) => {
    setEmpresaId(id);
    setEmpresaNome(nome);
    setSemEmpresa(false);
    localStorage.setItem('eco_empresa_id', String(id));
    localStorage.setItem('eco_empresa_nome', nome);
    const mods = await fetchModulos(id);
    setModuloCrm(mods.crm);
    setModuloIA(mods.ia);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('eco_empresa_id');
    localStorage.removeItem('eco_empresa_nome');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, isCompanyAdmin, isSuperAdmin: SUPER_ADMIN_EMAILS.includes(user?.email ?? ''),
      empresaId, empresaNome, semEmpresa,
      moduloCrm, moduloIA,
      setEmpresa, loading, signOut: handleSignOut,
      refreshUserData,
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
