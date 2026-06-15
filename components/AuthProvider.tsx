'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout } = useStore();

  useEffect(() => {
    if (!supabase) return;

    // Selalu validasi session dari Supabase saat mount
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          const role = profile?.role || 'user';
          login(
            {
              name: profile?.full_name || session.user.email,
              id: session.user.id,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            },
            role
          );
        } else {
          // Session tidak ada di Supabase — logout dari store juga
          logout();
        }
      } catch {
        // Supabase error, biarkan store state tetap
      }
    };

    restoreSession();

    // Listen perubahan auth state (login/logout dari tab lain, token expired, dll)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id);
        const role = profile?.role || 'user';
        login(
          {
            name: profile?.full_name || session.user.email,
            id: session.user.id,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
          },
          role
        );
      } else if (event === 'SIGNED_OUT') {
        logout();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token diperbarui — pastikan user data tetap sinkron
        const profile = await getProfile(session.user.id);
        const role = profile?.role || 'user';
        login(
          {
            name: profile?.full_name || session.user.email,
            id: session.user.id,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
          },
          role
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
