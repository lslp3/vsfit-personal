import { create } from 'zustand';
import type { WorkoutPlan, WorkoutLog } from '../types/database';
import * as workoutService from '../services/workoutService';
import type { CreateWorkoutData } from '../types/workout';

interface WorkoutStore {
  plans: WorkoutPlan[];
  logs: WorkoutLog[];
  isLoading: boolean;
  error: string | null;
  fetchPlansByStudent: (studentId: string) => Promise<void>;
  fetchPlansByTrainer: (trainerId: string) => Promise<void>;
  createPlan: (trainerId: string, data: CreateWorkoutData) => Promise<any>;
  publishPlan: (id: string) => Promise<void>;
  fetchLogsByStudent: (studentId: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  plans: [],
  logs: [],
  isLoading: false,
  error: null,

  fetchPlansByStudent: async (studentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const plans = await workoutService.getWorkoutPlansByStudent(studentId);
      set({ plans, isLoading: false, error: null });
    } catch (error) {
      console.error('[WorkoutStore] fetchPlansByStudent error:', error);
      set({ isLoading: false, error: 'Erro ao carregar treinos' });
    }
  },

  fetchPlansByTrainer: async (trainerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const plans = await workoutService.getWorkoutPlansByTrainer(trainerId);
      set({ plans, isLoading: false, error: null });
    } catch (error) {
      console.error('[WorkoutStore] fetchPlansByTrainer error:', error);
      set({ isLoading: false, error: 'Erro ao carregar treinos' });
    }
  },

  createPlan: async (trainerId: string, data: CreateWorkoutData) => {
    return workoutService.createWorkoutPlan(trainerId, data);
  },

  publishPlan: async (id: string) => {
    await workoutService.publishWorkoutPlan(id);
    set((state) => ({
      plans: state.plans.map((p) =>
        p.id === id ? { ...p, status: 'published' as const } : p
      ),
    }));
  },

  fetchLogsByStudent: async (studentId: string) => {
    try {
      const logs = await workoutService.getWorkoutLogsByStudent(studentId);
      set({ logs, error: null });
    } catch (error) {
      console.error('[WorkoutStore] fetchLogsByStudent error:', error);
      set({ error: 'Erro ao carregar histórico' });
    }
  },
}));
