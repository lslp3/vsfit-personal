import { create } from 'zustand';
import type { TrainerProfile } from '../types/database';
import * as trainerService from '../services/trainerService';
import type { UpdateTrainerData } from '../types/trainer';

interface TrainerStore {
  profile: TrainerProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (id: string) => Promise<void>;
  updateProfile: (id: string, data: UpdateTrainerData) => Promise<void>;
}

export const useTrainerStore = create<TrainerStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await trainerService.getTrainerProfile(id);
      set({ profile, isLoading: false, error: null });
    } catch (error) {
      console.error('[TrainerStore] fetchProfile error:', error);
      set({ isLoading: false, error: 'Erro ao carregar perfil' });
    }
  },

  updateProfile: async (id: string, data: UpdateTrainerData) => {
    try {
      const profile = await trainerService.updateTrainerProfile(id, data);
      set({ profile, error: null });
    } catch (error) {
      console.error('[TrainerStore] updateProfile error:', error);
      set({ error: 'Erro ao atualizar perfil' });
      throw error;
    }
  },
}));
