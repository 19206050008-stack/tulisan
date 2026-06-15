import { create } from 'zustand';

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

export const useStore = create<AppState>((set) => ({
  darkMode: false,
  setDarkMode: (val) => set({ darkMode: val }),
  user: null,
  role: 'guest',
  login: (user, role) => set({ user, role }),
  logout: () => set({ user: null, role: 'guest' }),
  textSize: 16,
  setTextSize: (size) => set({ textSize: size }),
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),
  savedStories: [],
  saveStoryOffline: (id) => set((state) => ({ 
    savedStories: state.savedStories.includes(id) 
      ? state.savedStories.filter(s => s !== id) 
      : [...state.savedStories, id] 
  })),
}));
