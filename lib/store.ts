import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'guest' | 'user' | 'admin';

interface AppState {
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
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      setDarkMode: (val) => set({ darkMode: val }),
      user: null,
      role: 'guest' as UserRole,
      login: (user, role) => set({ user, role }),
      logout: () => set({ user: null, role: 'guest' }),
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
    }),
    {
      name: 'storyverse-store', // key di localStorage
      // Hanya persist data yang perlu, jangan persist semua
      partialize: (state) => ({
        darkMode: state.darkMode,
        user: state.user,
        role: state.role,
        textSize: state.textSize,
        viewMode: state.viewMode,
      }),
    }
  )
);
