import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionResolved = useRef(false);
  const explicitSignOut = useRef(false);

  useEffect(() => {
    // 1. Set up listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only process events after initial getSession has resolved
        if (!initialSessionResolved.current) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Only clear state if this was an explicit sign-out from our app
          // This prevents rate-limit-induced token refresh failures from logging users out
          if (explicitSignOut.current) {
            setUser(null);
            setSession(null);
            explicitSignOut.current = false;
          }
          return;
        }

        // For all other events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, etc.)
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    // 2. Restore session from localStorage
    supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
      setSession(restoredSession);
      setUser(restoredSession?.user ?? null);
      initialSessionResolved.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    explicitSignOut.current = true;
    // Clear state immediately for responsive UX
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
