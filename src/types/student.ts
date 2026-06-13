import type { Student, StudentGoals, StudentMetrics } from './database';

export interface StudentWithDetails extends Student {
  goals: StudentGoals | null;
  latestMetrics: StudentMetrics | null;
  paymentSummary: {
    pending: number;
    overdue: number;
    paid: number;
  };
  lastWorkout: string | null;
}

export interface CreateStudentData {
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  objective?: string;
  level?: string;
  weight?: number;
  height?: number;
  targetWeight?: number;
  weeklyFrequency?: number;
  notes?: string;
  createAppAccess?: boolean;
}

export interface UpdateStudentData {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  status?: 'active' | 'inactive' | 'paused';
  appAccessStatus?: 'no_access' | 'invited' | 'active' | 'blocked';
  loginEnabled?: boolean;
}
