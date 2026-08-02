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
  isRecovering: boolean;
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

  setRecovering: (value: boolean) => void;

  logout: () => Promise<void>;
  logoutFromEvent: () => void;
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
    isRecovering: false,
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

let initializingPromise: Promise<void> | null = null;
let loggingOut = false;

export const useAuthStore =
  create<AuthStore>((set) => ({
    user: null,
    profile: null,
    trainerProfile: null,
    student: null,
    studentAccount: null,
    isLoading: true,
    isAuthenticated: false,
    isRecovering: false,
    error: null,

    initialize: async () => {
      const { isRecovering } = useAuthStore.getState();
      if (isRecovering) {
        set({ isLoading: false });
        return;
      }

      if (initializingPromise) return initializingPromise;

      set({
        isLoading: true,
        error: null,
      });

      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Auth initialization timeout after 10s')), 10000)
      );

      initializingPromise = (async () => {
        let session = null;
        try {
          session = await restoreSession();

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

          // Corner case 1: existe sessão válida do Supabase, mas não foi
          // possível carregar o perfil/estudante (ex.: falha de rede
          // transitória ao retomar do background, timeout, RLS momentâneo).
          // NÃO é um logout legítimo: preservamos o token/sessão recuperado
          // e não chamamos authLogout, permitindo que a próxima inicialização
          // (retry) restaure a sessão sem obrigar novo login.
          if (session?.user?.id) {
            set({
              user: session.user,
              profile: null,
              trainerProfile: null,
              student: null,
              studentAccount: null,
              isLoading: false,
              isAuthenticated: false,
              isRecovering: false,
              error:
                'Falha ao carregar seu perfil. Verifique sua conexão e tente novamente.',
            });
            return;
          }

          // Corner case 2: nenhuma sessão real no Supabase (sessão inexistente,
          // token inválido/expirado confirmado) → logout legítimo e limpeza.
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
        } finally {
          initializingPromise = null;
        }
      })();

      return Promise.race([initializingPromise, timeoutPromise]);
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
            state.profile
              ? state.profile
              : student
                ? buildStudentProfile({
                    user: state.user,
                    student,
                  })
                : null,
          student,
          studentAccount,
          trainerProfile: null,
        };
      });
    },

    setRecovering: (value) => {
      set({ isRecovering: value });
    },

    logout: async () => {
      if (loggingOut) return;
      loggingOut = true;

      try {
        await authLogout();
      } catch (error) {
        console.error(
          '[AuthStore] logout error:',
          error
        );
      }

      set(clearSessionState());
      loggingOut = false;
    },

    logoutFromEvent: () => {
      if (loggingOut) return;
      set(clearSessionState());
    },
  }));