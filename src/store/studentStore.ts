import { create } from 'zustand';
import type { Student } from '../types/database';
import * as studentService from '../services/studentService';

interface StudentStore {
  students: Student[];
  isLoading: boolean;
  error: string | null;
  fetchStudents: (trainerId: string) => Promise<void>;
  getStudentById: (id: string) => Promise<Student | null>;
}

export const useStudentStore = create<StudentStore>((set) => ({
  students: [],
  isLoading: false,
  error: null,

  fetchStudents: async (trainerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const students = await studentService.getStudentsByTrainer(trainerId);
      set({ students, isLoading: false, error: null });
    } catch (error) {
      console.error('[StudentStore] fetchStudents error:', error);
      set({ isLoading: false, error: 'Erro ao carregar alunos' });
    }
  },

  getStudentById: async (id: string) => {
    try {
      return await studentService.getStudentById(id);
    } catch (error) {
      console.error('[StudentStore] getStudentById error:', error);
      return null;
    }
  },
}));
