import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'guest' | 'user' | 'admin';
export type Language = 'id' | 'en';

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: any | null;
  role: UserRole;
  login: (user: any, role: UserRole) => void;
  logout: () => void;
  textSize: number;
  setTextSize: (size: number) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  savedStories: string[];
  saveStoryOffline: (id: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

console.log('[STORE] Initializing Zustand store...');

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'id' as Language,
      setLang: (lang) => set({ lang }),
      darkMode: false,
      setDarkMode: (val) => set({ darkMode: val }),
      user: null,
      role: 'guest' as UserRole,
      login: (user, role) => {
        console.log('[STORE] login() called with:', { userId: user?.id, role });
        set({ user, role });
      },
      logout: () => {
        console.log('[STORE] logout() called');
        set({ user: null, role: 'guest' });
      },
      textSize: 16,
      setTextSize: (size) => set({ textSize: size }),
      viewMode: 'grid' as 'grid' | 'list',
      setViewMode: (mode) => set({ viewMode: mode }),
      savedStories: [],
      saveStoryOffline: (id) => set((state) => ({
        savedStories: state.savedStories.includes(id)
          ? state.savedStories.filter(s => s !== id)
          : [...state.savedStories, id]
      })),
      _hasHydrated: false,
      setHasHydrated: (val) => {
        console.log('[STORE] setHasHydrated() called with:', val);
        set({ _hasHydrated: val });
      },
    }),
    {
      name: 'storyverse-store', // key di localStorage
      // Hanya persist data yang perlu, jangan persist semua
      partialize: (state) => ({
        lang: state.lang,
        darkMode: state.darkMode,
        user: state.user,
        role: state.role,
        textSize: state.textSize,
        viewMode: state.viewMode,
      }),
      onRehydrateStorage: () => {
        console.log('[STORE] onRehydrateStorage() - Starting hydration from localStorage...');
        return (state) => {
          // Dipanggil setelah state berhasil di-load dari localStorage
          console.log('[STORE] onRehydrateStorage() - Hydration complete. State:', {
            hasUser: !!state?.user,
            userId: state?.user?.id,
            role: state?.role,
          });
          state?.setHasHydrated(true);
        };
      },
    }
  )
);

console.log('[STORE] Zustand store created');
