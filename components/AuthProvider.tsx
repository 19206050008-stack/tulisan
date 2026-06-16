'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { supabase, getProfile } from '@/lib/supabase';

console.log('[AUTH] AuthProvider module loaded');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, logout, _hasHydrated } = useStore();
  
  console.log('[AUTH] AuthProvider rendering, _hasHydrated:', _hasHydrated);

  useEffect(() => {
    console.log('[AUTH] useEffect triggered, _hasHydrated:', _hasHydrated);
    
    if (!supabase) {
      console.log('[AUTH] ❌ Supabase not available, returning early');
      return;
    }
    
    console.log('[AUTH] ✅ Supabase is available');
    
    // Tunggu store hydrate dari localStorage
    if (!_hasHydrated) {
      console.log('[AUTH] ⏳ Store not hydrated yet, waiting...');
      return;
    }
    
    console.log('[AUTH] ✅ Store hydrated, initializing auth...');

    // Check initial session (only once after hydration)
    console.log('[AUTH] Calling supabase.auth.getSession()...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log('[AUTH] ❌ Error getting session:', error);
        return;
      }
      
      console.log('[AUTH] getSession() result:', { 
        hasSession: !!session, 
        userId: session?.user?.id 
      });
      
      if (session?.user) {
        console.log('[AUTH] Session exists, fetching profile...');
        getProfile(session.user.id).then((profile) => {
          console.log('[AUTH] Profile fetched:', { 
            profileId: profile?.id,
            role: profile?.role 
          });
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
        }).catch((err) => {
          console.log('[AUTH] ❌ Error fetching profile:', err);
        });
      } else {
        console.log('[AUTH] No session found');
      }
    });

    // Listen to auth changes (login/logout/token refresh)
    console.log('[AUTH] Setting up onAuthStateChange listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] 🔔 Auth state changed:', { 
        event, 
        userId: session?.user?.id,
        hasSession: !!session
      });
      
      if (session?.user) {
        // User is signed in (SIGNED_IN, TOKEN_REFRESHED, etc)
        console.log('[AUTH] User signed in, fetching profile for event:', event);
        const profile = await getProfile(session.user.id);
        const role = profile?.role || 'user';
        console.log('[AUTH] Calling login() with role:', role);
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
        console.log('[AUTH] User signed out explicitly');
        logout();
      } else {
        console.log('[AUTH] Auth event with no session (ignored):', event);
      }
    });
    
    console.log('[AUTH] onAuthStateChange listener registered');

    return () => {
      console.log('[AUTH] Cleaning up: unsubscribing from auth changes');
      subscription.unsubscribe();
    };
  }, [_hasHydrated]);

  return <>{children}</>;
}
