import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        set({ user, role });
      },
      logout: () => {
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
        set({ _hasHydrated: val });
      },
    }),
    {
      name: 'storyverse-store',
      partialize: (state) => ({
        lang: state.lang,
        darkMode: state.darkMode,
        user: state.user,
        role: state.role,
        textSize: state.textSize,
        viewMode: state.viewMode,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          state?.setHasHydrated(true);
        };
      },
    }
  )
);
