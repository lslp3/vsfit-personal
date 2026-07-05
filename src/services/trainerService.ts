import { supabase } from '../lib/supabase';
import type {
  TrainerProfile,
} from '../types/database';
import type {
  UpdateTrainerData,
} from '../types/trainer';

export interface AdminTrainer
  extends TrainerProfile {
  student_count: number;

  subscription: {
    id: string;
    plan: string;
    plan_slug: string;
    status: string;
    student_limit: number;
    payment_provider: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
  } | null;
}

function normalizePlan(
  subscription: any
): string {
  return String(
    subscription?.plan_slug ||
      subscription?.plan ||
      'free'
  )
    .trim()
    .toLowerCase();
}

export async function getTrainerProfile(
  id: string
): Promise<TrainerProfile | null> {
  if (!id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(
      '[TrainerService] getTrainerProfile:',
      error
    );

    throw error;
  }

  return data as TrainerProfile | null;
}

export async function updateTrainerProfile(
  id: string,
  data: UpdateTrainerData
) {
  const {
    data: profile,
    error,
  } = await supabase
    .from('trainer_profiles')
    .update({
      ...data,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

export async function getAllTrainers():
Promise<AdminTrainer[]> {
  const [
    trainersResult,
    studentsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from('trainer_profiles')
      .select('*')
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('students')
      .select('trainer_id'),

    supabase
      .from('subscriptions')
      .select(`
        id,
        trainer_id,
        plan,
        plan_slug,
        status,
        student_limit,
        payment_provider,
        current_period_start,
        current_period_end,
        updated_at
      `)
      .order('updated_at', {
        ascending: false,
      }),
  ]);

  if (trainersResult.error) {
    console.error(
      '[TrainerService] trainers:',
      trainersResult.error
    );

    throw trainersResult.error;
  }

  if (studentsResult.error) {
    console.error(
      '[TrainerService] students:',
      studentsResult.error
    );

    throw studentsResult.error;
  }

  if (subscriptionsResult.error) {
    console.error(
      '[TrainerService] subscriptions:',
      subscriptionsResult.error
    );

    throw subscriptionsResult.error;
  }

  const studentCount = new Map<
    string,
    number
  >();

  for (
    const student of
      studentsResult.data || []
  ) {
    const trainerId =
      student.trainer_id;

    if (!trainerId) continue;

    studentCount.set(
      trainerId,
      (studentCount.get(trainerId) || 0) +
        1
    );
  }

  const subscriptionByTrainer =
    new Map<string, any>();

  for (
    const subscription of
      subscriptionsResult.data || []
  ) {
    if (
      !subscription.trainer_id ||
      subscriptionByTrainer.has(
        subscription.trainer_id
      )
    ) {
      continue;
    }

    subscriptionByTrainer.set(
      subscription.trainer_id,
      subscription
    );
  }

  return (
    trainersResult.data || []
  ).map((trainer: any) => {
    const rawSubscription =
      subscriptionByTrainer.get(
        trainer.id
      );

    const subscription =
      rawSubscription
        ? {
            id: rawSubscription.id,
            plan: normalizePlan(
              rawSubscription
            ),
            plan_slug: normalizePlan(
              rawSubscription
            ),
            status:
              rawSubscription.status ||
              'inactive',
            student_limit:
              Number(
                rawSubscription.student_limit
              ) || 1,
            payment_provider:
              rawSubscription.payment_provider ||
              null,
            current_period_start:
              rawSubscription.current_period_start ||
              null,
            current_period_end:
              rawSubscription.current_period_end ||
              null,
          }
        : null;

    return {
      ...trainer,
      student_count:
        studentCount.get(trainer.id) ||
        0,
      subscription,
    } as AdminTrainer;
  });
}

export async function getPendingCrefTrainers():
Promise<AdminTrainer[]> {
  const trainers =
    await getAllTrainers();

  return trainers.filter(
    (trainer) =>
      trainer.cref_status ===
        'pending' &&
      Boolean(trainer.cref?.trim())
  );
}

async function createCrefNotification({
  trainerId,
  title,
  message,
  type,
}: {
  trainerId: string;
  title: string;
  message: string;
  type: string;
}) {
  const {
    error,
  } = await supabase
    .from('notifications')
    .insert({
      user_id: trainerId,
      title,
      message,
      type,
      read: false,
    });

  if (error) {
    console.warn(
      '[TrainerService] notification:',
      error
    );
  }
}

export async function approveCref(
  trainerId: string
) {
  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from('trainer_profiles')
    .update({
      cref_status: 'approved',
      cref_verified_at: now,
      cref_rejection_reason: null,
      updated_at: now,
    })
    .eq('id', trainerId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await createCrefNotification({
    trainerId,
    title: 'CREF aprovado',
    message:
      'Seu CREF foi analisado e aprovado pela administração do VSFit.',
    type: 'cref_approved',
  });

  return data;
}

export async function rejectCref(
  trainerId: string,
  reason: string
) {
  const normalizedReason =
    reason.trim();

  if (!normalizedReason) {
    throw new Error(
      'Informe o motivo da rejeição.'
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from('trainer_profiles')
    .update({
      cref_status: 'rejected',
      cref_verified_at: null,
      cref_rejection_reason:
        normalizedReason,
      updated_at: now,
    })
    .eq('id', trainerId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await createCrefNotification({
    trainerId,
    title: 'CREF não aprovado',
    message:
      `Seu CREF não foi aprovado. Motivo: ${normalizedReason}`,
    type: 'cref_rejected',
  });

  return data;
}