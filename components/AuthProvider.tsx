'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, _hasHydrated, user } = useStore();

  useEffect(() => {
    if (!supabase) return;

    // Tunggu Zustand selesai hydrate dari localStorage
    if (!_hasHydrated) return;

    // Validasi session dari Supabase
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Session valid di Supabase, sync ke store
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
        } else if (user) {
          // Store punya user tapi Supabase tidak, coba refresh session
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession?.user) {
            // Refresh berhasil, update store
            const profile = await getProfile(refreshedSession.user.id);
            const role = profile?.role || 'user';
            login(
              {
                name: profile?.full_name || refreshedSession.user.email,
                id: refreshedSession.user.id,
                username: profile?.username,
                avatar_url: profile?.avatar_url,
              },
              role
            );
          } else {
            // Refresh gagal, session benar-benar expired
            logout();
          }
        }
        // Jika store tidak punya user dan Supabase juga tidak, biarkan tetap guest (jangan call logout)
      } catch (error) {
        console.error('Session restore error:', error);
        // Error dari Supabase, JANGAN logout — biarkan store state tetap
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
  }, [_hasHydrated, user, login, logout]);

  return <>{children}</>;
}
