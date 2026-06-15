'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, user } = useStore();

  useEffect(() => {
    if (!supabase) return;

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        const role = profile?.role || 'user';
        login(
          { name: profile?.full_name || session.user.email, id: session.user.id, username: profile?.username, avatar_url: profile?.avatar_url },
          role
        );
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id);
        const role = profile?.role || 'user';
        login(
          { name: profile?.full_name || session.user.email, id: session.user.id, username: profile?.username, avatar_url: profile?.avatar_url },
          role
        );
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
