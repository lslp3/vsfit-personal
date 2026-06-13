export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: import('./database').UserProfile | null;
  trainerProfile: import('./database').TrainerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export type UserRole = 'admin' | 'personal' | 'student';
