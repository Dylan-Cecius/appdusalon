import { useState, useEffect, createContext, useContext, useRef, useCallback, useMemo } from 'react';
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

const AUTH_EVENT_GRACE_MS = 30 * 1000;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const initialSessionResolved = useRef(false);
  const explicitSignOut = useRef(false);
  const pendingSessionRef = useRef<Session | null | undefined>(undefined);
  const lastAuthSuccessAt = useRef(0);

  const applySession = useCallback((nextSession: Session | null, source: string) => {
    sessionRef.current = nextSession;

    const nextUser = nextSession?.user ?? null;

    if (nextUser) {
      lastAuthSuccessAt.current = Date.now();
    }

    console.log('[Auth] apply session:', source, '| user:', nextUser?.email ?? null);

    setUser((previousUser) => {
      const hasSameIdentity =
        previousUser?.id === nextUser?.id &&
        previousUser?.email === nextUser?.email;

      return hasSameIdentity ? previousUser : nextUser;
    });
  }, []);

  useEffect(() => {
    console.log('[Auth] init start');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[Auth] state change:', event, '| session:', !!currentSession);

        if (!initialSessionResolved.current) {
          pendingSessionRef.current = currentSession;

          if (event === 'INITIAL_SESSION') {
            applySession(currentSession, 'INITIAL_SESSION');
          } else {
            console.log('[Auth] queued pre-init event:', event);
          }

          return;
        }

        if (event === 'SIGNED_OUT') {
          const withinGracePeriod = Date.now() - lastAuthSuccessAt.current < AUTH_EVENT_GRACE_MS;

          if (explicitSignOut.current) {
            console.log('[Auth] explicit sign-out — clearing state');
            sessionRef.current = null;
            setUser(null);
            explicitSignOut.current = false;
          } else if (withinGracePeriod) {
            console.log('[Auth] ignoring transient SIGNED_OUT within auth grace window');
          } else {
            console.log('[Auth] signed out — clearing state');
            sessionRef.current = null;
            setUser(null);
          }

          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          sessionRef.current = currentSession;

          if (currentSession?.user) {
            lastAuthSuccessAt.current = Date.now();
          }

          setUser((previousUser) => {
            const nextUser = currentSession?.user ?? null;
            const hasSameIdentity =
              previousUser?.id === nextUser?.id &&
              previousUser?.email === nextUser?.email;

            if (hasSameIdentity) {
              console.log('[Auth] token refreshed — stable user, skipping re-render');
              return previousUser;
            }

            console.log('[Auth] token refreshed — user identity changed');
            return nextUser;
          });

          return;
        }

        applySession(currentSession, event);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session: restoredSession }, error }) => {
        if (error) {
          console.error('[Auth] getSession error:', error);
        }

        const resolvedSession = restoredSession ?? pendingSessionRef.current ?? null;

        console.log('[Auth] init session:', !!resolvedSession, resolvedSession?.user?.email);
        applySession(resolvedSession, 'getSession');
      })
      .finally(() => {
        initialSessionResolved.current = true;
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signOut = useCallback(async () => {
    console.log('[Auth] signOut called');
    explicitSignOut.current = true;

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        explicitSignOut.current = false;
        throw error;
      }
    } finally {
      window.location.replace('/auth');
    }
  }, []);

  const isReady = !loading;

  const value = useMemo(() => ({
    user,
    session: sessionRef.current,
    loading,
    isReady,
    signOut,
  }), [user, loading, isReady, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
