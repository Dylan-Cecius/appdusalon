import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { observeAuthSession } from '@/lib/observeAuthSession';
import { createSignOutAction } from '@/lib/signOutAction';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user ?? null;

  useEffect(() => observeAuthSession<Session>({
    subscribe(listener) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(listener);
      return () => subscription.unsubscribe();
    },
    async readSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    onSession: setSession,
    onReady: () => setLoading(false),
    onError: () => console.error('[Auth] Session restoration failed.'),
  }), []);

  const signOut = useMemo(() => createSignOutAction({
    request: () => supabase.auth.signOut(),
    complete: () => {
      setSession(null);
      window.location.replace('/auth');
    },
    failed: () => { toast({
      title: 'Déconnexion impossible',
      description: 'La déconnexion n’a pas été confirmée. Vérifiez la connexion puis réessayez.',
      variant: 'destructive',
    }); },
  }), []);

  const isReady = !loading;

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isReady,
    signOut,
  }), [user, session, loading, isReady, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
