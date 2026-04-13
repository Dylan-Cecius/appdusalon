import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSessionResolved = useRef(false);
  const explicitSignOut = useRef(false);

  useEffect(() => {
    console.log('[Auth] init start');

    // 1. Set up listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[Auth] state change:', event, '| session:', !!currentSession);

        // Only process events after initial getSession has resolved
        if (!initialSessionResolved.current) {
          console.log('[Auth] ignoring event before init resolved');
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Only clear state if this was an explicit sign-out from our app
          if (explicitSignOut.current) {
            console.log('[Auth] explicit sign-out — clearing state');
            setUser(null);
            setSession(null);
            explicitSignOut.current = false;
          } else {
            console.log('[Auth] ignoring non-explicit SIGNED_OUT (rate limit / token refresh artifact)');
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
      console.log('[Auth] init session:', !!restoredSession, restoredSession?.user?.email);
      setSession(restoredSession);
      setUser(restoredSession?.user ?? null);
      initialSessionResolved.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] signOut called');
    explicitSignOut.current = true;
    // Clear state immediately for responsive UX
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);

  const isReady = !loading;

  const value = {
    user,
    session,
    loading,
    isReady,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
