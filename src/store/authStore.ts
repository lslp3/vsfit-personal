import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, TrainerProfile, Student, StudentAccount } from '../types/database';
import { restoreSession, getCurrentProfile, logout as authLogout } from '../services/authService';
import { getStudentAccountByAuthUser } from '../services/studentService';

function buildFallbackProfile(user: User): { profile: UserProfile; trainerProfile: TrainerProfile } {
  const name = user.email?.split('@')[0] || 'Personal';
  const now = new Date().toISOString();

  return {
    profile: {
      id: user.id,
      email: user.email || '',
      name,
      role: 'personal',
      created_at: now,
      updated_at: now,
    },
    trainerProfile: {
      id: user.id,
      email: user.email || '',
      name,
      phone: null,
      avatar_url: null,
      bio: null,
      cref: null,
      cref_status: 'approved',
      cref_submitted_at: null,
      cref_verified_at: null,
      cref_rejection_reason: null,
      instagram: null,
      location: null,
      niche: null,
      created_at: now,
      updated_at: now,
    },
  };
}

interface AuthStore {
  user: User | null;
  profile: UserProfile | null;
  trainerProfile: TrainerProfile | null;
  student: Student | null;
  studentAccount: StudentAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setUser: (
    user: User | null,
    profile?: UserProfile | null,
    trainerProfile?: TrainerProfile | null
  ) => void;
  setStudentData: (student: Student | null, studentAccount?: StudentAccount | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  trainerProfile: null,
  student: null,
  studentAccount: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const session = await restoreSession();

      if (!session?.user) {
        set({
          user: null,
          profile: null,
          trainerProfile: null,
          student: null,
          studentAccount: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
        return;
      }

      const user = session.user;
      const { profile, trainerProfile } = await getCurrentProfile();

      const isPersonal =
        profile?.role === 'personal' ||
        Boolean(trainerProfile?.id);

      if (isPersonal) {
        const fallback = buildFallbackProfile(user);

        set({
          user,
          profile: profile || fallback.profile,
          trainerProfile: trainerProfile || fallback.trainerProfile,
          student: null,
          studentAccount: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        console.log('[AuthStore] personalSession:', {
          user: user.email,
          profile: profile || fallback.profile,
          trainerProfile: trainerProfile || fallback.trainerProfile,
        });

        return;
      }

      const { account, student } = await getStudentAccountByAuthUser(user.id);

      if (account?.id || student?.id || profile?.role === 'student') {
        set({
          user,
          profile: profile || null,
          trainerProfile: null,
          studentAccount: account,
          student,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        console.log('[AuthStore] studentSession:', {
          user: user.email,
          studentAccount: account,
          student,
        });

        return;
      }

      const fallback = buildFallbackProfile(user);

      set({
        user,
        profile: profile || fallback.profile,
        trainerProfile: trainerProfile || fallback.trainerProfile,
        student: null,
        studentAccount: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      console.log('[AuthStore] fallbackPersonalSession:', {
        user: user.email,
        profile: profile || fallback.profile,
        trainerProfile: trainerProfile || fallback.trainerProfile,
      });
    } catch (error) {
      console.error('[AuthStore] initialize error:', error);

      set({
        user: null,
        profile: null,
        trainerProfile: null,
        student: null,
        studentAccount: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Erro ao restaurar sessão',
      });
    }
  },

  setUser: (user, profile = null, trainerProfile = null) => {
    const isPersonal =
      profile?.role === 'personal' ||
      Boolean(trainerProfile?.id);

    set({
      user,
      profile,
      trainerProfile,
      student: isPersonal ? null : null,
      studentAccount: isPersonal ? null : null,
      isAuthenticated: !!user,
      isLoading: false,
      error: null,
    });
  },

  setStudentData: (student, studentAccount = null) => {
    set({
      student,
      studentAccount,
      trainerProfile: null,
    });
  },

  logout: async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('[AuthStore] logout error:', error);
    }

    set({
      user: null,
      profile: null,
      trainerProfile: null,
      student: null,
      studentAccount: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));