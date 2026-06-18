'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, _hasHydrated } = useStore();

  useEffect(() => {
    if (!supabase) {
      return;
    }
    
    // Wait for store hydration from localStorage
    if (!_hasHydrated) {
      return;
    }

    // Check initial session (only once after hydration)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        return;
      }
      
      if (session?.user) {
        getProfile(session.user.id).then((profile) => {
          const role = profile?.role || 'user';
          login(
            {
              name: profile?.full_name || session.user.email,
              id: session.user.id,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              frame_id: profile?.frame_id,
            },
            role
          );
        }).catch(() => {
          // Profile fetch failed, silently handle
        });
      }
    });

    // Listen to auth changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
            frame_id: profile?.frame_id,
          },
          role
        );
      } else if (event === 'SIGNED_OUT') {
        // User explicitly signed out
        logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [_hasHydrated]);

  return <>{children}</>;
}
