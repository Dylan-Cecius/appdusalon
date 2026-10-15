import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { nativeAuth } from './config';
import { installNativeAuthLinks } from './authLinks';
import { installNativeSessionLifecycle } from './sessionLifecycle';
import { createLifecycleSlot } from './lifecycleSlot';

const lifecycleSlot = createLifecycleSlot();

export function NativeAuthBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!nativeAuth.enabled) return;
    let disposed = false;
    let links: ReturnType<typeof installNativeAuthLinks> | undefined;
    let lifecycle: ReturnType<typeof lifecycleSlot.mount> | undefined;
    const failed = () => { if (!disposed) toast({
      title: 'Connexion non finalisée',
      description: 'Demandez un nouveau lien depuis cette application, puis réessayez.',
      variant: 'destructive',
    }); };
    void import('@capacitor/app').then(({ App }) => {
      if (disposed) return;
      lifecycle = lifecycleSlot.mount(() => installNativeSessionLifecycle({
        app: App,
        auth: {
          async initialize() { const { error } = await supabase.auth.initialize(); if (error) throw error; },
          startAutoRefresh: () => supabase.auth.startAutoRefresh(),
          stopAutoRefresh: () => supabase.auth.stopAutoRefresh(),
        },
        failed: () => { if (!disposed) toast({ title: 'Session indisponible', description: 'Vérifiez votre connexion puis rouvrez l’application.', variant: 'destructive' }); },
      }));
      links = installNativeAuthLinks({
        app: App,
        redirect: nativeAuth.redirect!,
        async exchange(code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          // auth-js 2.71.1 returns this from its local PKCE verifier; not URL input.
          const recovery = 'redirectType' in data && data.redirectType === 'recovery';
          return { authenticated: !error && !!data.session, recovery };
        },
        authenticated: recovery => navigate(recovery ? '/auth?type=recovery' : '/auth', { replace: true }),
        failed,
      });
    }).catch(failed);
    return () => { disposed = true; links?.dispose(); void lifecycle?.dispose(); };
  }, [navigate]);
  return null;
}
