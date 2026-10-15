import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { nativeAuth } from './config';
import { installNativeAuthLinks } from './authLinks';

export function NativeAuthBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!nativeAuth.enabled) return;
    let disposed = false;
    let links: ReturnType<typeof installNativeAuthLinks> | undefined;
    const failed = () => { if (!disposed) toast({
      title: 'Connexion non finalisée',
      description: 'Demandez un nouveau lien depuis cette application, puis réessayez.',
      variant: 'destructive',
    }); };
    void import('@capacitor/app').then(({ App }) => {
      if (disposed) return;
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
    return () => { disposed = true; links?.dispose(); };
  }, [navigate]);
  return null;
}
