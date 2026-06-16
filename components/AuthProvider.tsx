'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, _hasHydrated } = useStore();

  useEffect(() => {
    if (!supabase) return;
    
    // Tunggu store hydrate dari localStorage
    if (!_hasHydrated) return;

    // Check initial session (only once after hydration)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getProfile(session.user.id).then((profile) => {
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
        });
      }
    });

    // Listen to auth changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        // User is signed in (SIGNED_IN, TOKEN_REFRESHED, etc)
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
        // User explicitly signed out
        logout();
      }
      // For other events without session, do nothing (don't logout)
    });

    return () => subscription.unsubscribe();
  }, [_hasHydrated]);

  return <>{children}</>;
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
  }, [_hasHydrated]); // Only depend on _hasHydrated, not user

  return <>{children}</>;
}
