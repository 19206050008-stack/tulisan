// Global type definitions for StoryVerse / Di.tulis

type Language = 'id' | 'en';

type UserRole = 'guest' | 'user' | 'author' | 'admin';

interface UserProfile {
  name?: string;
  id: string;
  username?: string;
  avatar_url?: string;
  avatar_type?: string;
  selected_avatar?: string;
  frame_id?: string;
}

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: UserProfile | null;
  role: UserRole;
  login: (user: UserProfile, role: UserRole) => void;
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
