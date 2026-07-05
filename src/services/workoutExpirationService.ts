import { supabase } from '../lib/supabase';

import type {
  CompleteWorkoutPlan,
  WorkoutPlan,
} from '../types/database';

type WorkoutPlanLike =
  | CompleteWorkoutPlan
  | WorkoutPlan;

type StudentLike = Record<string, any>;

const EXPIRED_NOTIFICATION_TYPE =
  'trainer_student_plan_expired';

function normalizeDateKey(
  value?: string | null
) {
  if (!value) return '';

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) return '';

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getTodayDateKey(
  referenceDate = new Date()
) {
  const year = referenceDate.getFullYear();

  const month = String(
    referenceDate.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    referenceDate.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function isWorkoutPlanExpired(
  endDate?: string | null,
  referenceDate = new Date()
) {
  const endDateKey =
    normalizeDateKey(endDate);

  if (!endDateKey) {
    return false;
  }

  return (
    endDateKey <
    getTodayDateKey(referenceDate)
  );
}

export function formatWorkoutPlanDate(
  value?: string | null
) {
  const dateKey = normalizeDateKey(value);

  if (!dateKey) {
    return 'data não informada';
  }

  const [year, month, day] =
    dateKey.split('-');

  return `${day}/${month}/${year}`;
}

function getStudentName(
  student?: StudentLike | null
) {
  return (
    student?.name ||
    student?.full_name ||
    student?.email ||
    'Aluno'
  );
}

async function resolveStudent(
  plan: WorkoutPlanLike,
  student?: StudentLike | null
) {
  if (student?.id) {
    return student;
  }

  if (!plan.student_id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('students')
    .select('*')
    .eq('id', plan.student_id)
    .maybeSingle();

  if (error) {
    console.warn(
      '[WorkoutExpiration] erro ao buscar aluno:',
      error
    );

    return null;
  }

  return data;
}

function getTrainerId(
  plan: WorkoutPlanLike,
  student?: StudentLike | null
) {
  return String(
    student?.trainer_id ||
      student?.coach_id ||
      plan.trainer_id ||
      ''
  );
}

async function resolveTrainerUserId(
  trainerId: string
) {
  if (!trainerId) {
    return '';
  }

  try {
    const {
      data: trainer,
      error,
    } = await supabase
      .from('trainer_profiles')
      .select('*')
      .eq('id', trainerId)
      .maybeSingle();

    if (!error && trainer) {
      const userId =
        trainer.auth_user_id ||
        trainer.user_id ||
        trainer.profile_id ||
        '';

      if (userId) {
        return String(userId);
      }
    }
  } catch (error) {
    console.warn(
      '[WorkoutExpiration] erro em trainer_profiles:',
      error
    );
  }

  try {
    const {
      data: profile,
      error,
    } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', trainerId)
      .maybeSingle();

    if (!error && profile?.id) {
      return String(profile.id);
    }
  } catch (error) {
    console.warn(
      '[WorkoutExpiration] erro em user_profiles:',
      error
    );
  }

  return '';
}

export async function notifyTrainerAboutExpiredPlan({
  plan,
  student,
}: {
  plan: WorkoutPlanLike;
  student?: StudentLike | null;
}) {
  try {
    if (
      !isWorkoutPlanExpired(
        plan.end_date
      )
    ) {
      return false;
    }

    const resolvedStudent =
      await resolveStudent(
        plan,
        student
      );

    const trainerId =
      getTrainerId(
        plan,
        resolvedStudent
      );

    const trainerUserId =
      await resolveTrainerUserId(
        trainerId
      );

    if (!trainerUserId) {
      console.warn(
        '[WorkoutExpiration] usuário do personal não encontrado.'
      );

      return false;
    }

    const studentName =
      getStudentName(
        resolvedStudent
      );

    const planName =
      plan.name ||
      'Plano de treino';

    const expirationDate =
      formatWorkoutPlanDate(
        plan.end_date
      );

    const title =
      `${studentName}: plano vencido`;

    const message =
      `O plano "${planName}" de ${studentName} venceu em ${expirationDate}. ` +
      'Edite, exclua ou crie um novo plano para o aluno.';

    const {
      error,
    } = await supabase
      .from('notifications')
      .upsert(
        {
          user_id:
            trainerUserId,

          title,

          message,

          type:
            EXPIRED_NOTIFICATION_TYPE,

          read: false,

          created_at:
            new Date().toISOString(),

          dedupe_key:
            `${EXPIRED_NOTIFICATION_TYPE}:${plan.id}`,
        },
        {
          onConflict:
            'dedupe_key',

          ignoreDuplicates:
            true,
        }
      );

    if (error) {
      console.error(
        '[WorkoutExpiration] erro ao notificar personal:',
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      '[WorkoutExpiration] exceção:',
      error
    );

    return false;
  }
}