import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

import {
  getCurrentProfile,
  logout as authLogout,
  restoreSession,
} from '../services/authService';
import {
  getStudentAccountByAuthUser,
} from '../services/studentService';
import type {
  Student,
  StudentAccount,
  TrainerProfile,
  UserProfile,
} from '../types/database';

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

  setStudentData: (
    student: Student | null,
    studentAccount?: StudentAccount | null
  ) => void;

  logout: () => Promise<void>;
}

function clearSessionState() {
  return {
    user: null,
    profile: null,
    trainerProfile: null,
    student: null,
    studentAccount: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
  };
}

function buildStudentProfile({
  user,
  student,
}: {
  user: User;
  student: Student;
}): UserProfile {
  const now =
    new Date().toISOString();

  return {
    id: user.id,
    email:
      user.email ||
      student.email ||
      '',
    name:
      student.name ||
      'Aluno',
    role: 'student',
    created_at: now,
    updated_at: now,
  };
}

export const useAuthStore =
  create<AuthStore>((set) => ({
    user: null,
    profile: null,
    trainerProfile: null,
    student: null,
    studentAccount: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,

    initialize: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const session =
          await restoreSession();

        const user =
          session?.user || null;

        if (!user?.id) {
          set(clearSessionState());
          return;
        }

        const {
          profile,
          trainerProfile,
        } = await getCurrentProfile();

        if (
          profile?.role === 'admin'
        ) {
          set({
            user,
            profile,
            trainerProfile: null,
            student: null,
            studentAccount: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return;
        }

        if (
          profile?.role === 'personal'
        ) {
          set({
            user,
            profile,
            trainerProfile:
              trainerProfile || null,
            student: null,
            studentAccount: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return;
        }

        const {
          account,
          student,
        } =
          await getStudentAccountByAuthUser(
            user.id
          );

        if (
          profile?.role === 'student' ||
          student?.id ||
          account?.id
        ) {
          if (!student?.id) {
            throw new Error(
              'Perfil de aluno não encontrado.'
            );
          }

          set({
            user,
            profile:
              profile ||
              buildStudentProfile({
                user,
                student,
              }),
            trainerProfile: null,
            student,
            studentAccount:
              account || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return;
        }

        await authLogout();

        set({
          ...clearSessionState(),
          error:
            'Esta conta não possui um perfil válido no VSFit.',
        });
      } catch (error) {
        console.error(
          '[AuthStore] initialize error:',
          error
        );

        try {
          await authLogout();
        } catch (logoutError) {
          console.warn(
            '[AuthStore] logout after initialization error:',
            logoutError
          );
        }

        set({
          ...clearSessionState(),
          error:
            error instanceof Error
              ? error.message
              : 'Erro ao restaurar sessão.',
        });
      }
    },

    setUser: (
      user,
      profile = null,
      trainerProfile = null
    ) => {
      if (!user) {
        set(clearSessionState());
        return;
      }

      set({
        user,
        profile,
        trainerProfile:
          profile?.role === 'personal'
            ? trainerProfile
            : null,
        student: null,
        studentAccount: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    },

    setStudentData: (
      student,
      studentAccount = null
    ) => {
      set((state) => {
        if (!state.user) {
          return {
            student,
            studentAccount,
            trainerProfile: null,
          };
        }

        return {
          profile:
            state.profile?.role ===
            'student'
              ? state.profile
              : student
                ? buildStudentProfile({
                    user: state.user,
                    student,
                  })
                : state.profile,
          student,
          studentAccount,
          trainerProfile: null,
        };
      });
    },

    logout: async () => {
      try {
        await authLogout();
      } catch (error) {
        console.error(
          '[AuthStore] logout error:',
          error
        );
      }

      set(clearSessionState());
    },
  }));