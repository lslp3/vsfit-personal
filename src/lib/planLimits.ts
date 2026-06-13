export type PlanSlug = 'free' | 'pro' | 'premium';

export type FinancialLevel = 'none' | 'basic' | 'advanced';

export interface PlanLimits {
  students: number;
  signupLinks: number;
  financial: boolean;
  financialLevel: FinancialLevel;
  reports: boolean;
  advancedProgress: boolean;
  capture: boolean;
  features?: string[];
}

export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  free: {
    students: 1,
    signupLinks: 0,
    financial: false,
    financialLevel: 'none',
    reports: false,
    advancedProgress: false,
    capture: false,
    features: [
      '1 aluno',
      'Biblioteca de exercícios',
      'Montador de treinos',
    ],
  },

  pro: {
    students: 3,
    signupLinks: 3,
    financial: true,
    financialLevel: 'basic',
    reports: false,
    advancedProgress: false,
    capture: true,
    features: [
      'Até 3 alunos',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat com alunos',
      'Financeiro básico',
      'Captação de alunos (3 links)',
    ],
  },

  premium: {
    students: Infinity,
    signupLinks: Infinity,
    financial: true,
    financialLevel: 'advanced',
    reports: true,
    advancedProgress: true,
    capture: true,
    features: [
      'Alunos ilimitados',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat completo',
      'Financeiro avançado',
      'Captação ilimitada',
      'Relatórios avançados',
      'Recursos premium',
    ],
  },
};

export function normalizePlanSlug(planSlug?: string): PlanSlug {
  const normalized = String(planSlug || 'free').toLowerCase();

  if (normalized === 'premium') return 'premium';
  if (normalized === 'pro') return 'pro';

  return 'free';
}

export function getPlanLimits(planSlug?: string): PlanLimits {
  const normalized = normalizePlanSlug(planSlug);
  return PLAN_LIMITS[normalized];
}

export function getStudentLimit(planSlug?: string): number {
  return getPlanLimits(planSlug).students;
}

export function getSignupLinkLimit(planSlug?: string): number {
  return getPlanLimits(planSlug).signupLinks;
}

export function canAccessFeature(
  planSlug: string | undefined,
  feature: 'financial' | 'reports' | 'advancedProgress' | 'capture'
): boolean {
  const limits = getPlanLimits(planSlug);
  return limits[feature] === true;
}

export function getFinancialLevel(planSlug?: string): FinancialLevel {
  return getPlanLimits(planSlug).financialLevel;
}

export function canAccessBasicFinancial(planSlug?: string): boolean {
  const level = getFinancialLevel(planSlug);
  return level === 'basic' || level === 'advanced';
}

export function canAccessAdvancedFinancial(planSlug?: string): boolean {
  return getFinancialLevel(planSlug) === 'advanced';
}

export function canCreateStudent(planSlug: string | undefined, currentStudentCount: number): boolean {
  const limit = getStudentLimit(planSlug);

  if (limit === Infinity) return true;

  return currentStudentCount < limit;
}

export function formatPlanLimit(value: number): string {
  if (value === Infinity || value >= 999999) return 'Ilimitado';

  return String(value);
}