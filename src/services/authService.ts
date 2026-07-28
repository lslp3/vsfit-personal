import type { User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type {
  TrainerProfile,
  UserProfile,
} from '../types/database';

export async function login(
  email: string,
  password: string
) {
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function loginStudent(
  email: string,
  password: string
) {
  return login(
    email,
    password
  );
}

export async function logout() {
  const {
    error,
  } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function restoreSession() {
  const {
    data: {
      session,
    },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const {
    data,
    error,
  } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(
      '[AuthService] getUserProfile error:',
      error
    );

    throw error;
  }

  return data as UserProfile | null;
}

async function getTrainerProfile(
  userId: string
): Promise<TrainerProfile | null> {
  const {
    data,
    error,
  } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(
      '[AuthService] getTrainerProfile error:',
      error
    );

    throw error;
  }

  return data as TrainerProfile | null;
}

export async function getCurrentProfile(): Promise<{
  profile: UserProfile | null;
  trainerProfile: TrainerProfile | null;
}> {
  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      '[AuthService] getCurrentProfile user error:',
      userError
    );

    throw userError;
  }

  if (!user?.id) {
    return {
      profile: null,
      trainerProfile: null,
    };
  }

  const profile =
    await getUserProfile(user.id);

  if (!profile) {
    return {
      profile: null,
      trainerProfile: null,
    };
  }

  if (profile.role !== 'personal') {
    return {
      profile,
      trainerProfile: null,
    };
  }

  const trainerProfile =
    await getTrainerProfile(user.id);

  return {
    profile,
    trainerProfile,
  };
}

export async function registerPersonal(
  email: string,
  password: string,
  name: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const normalizedName =
    name.trim();

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: normalizedName,
        role: 'personal',
      },
    },
  });

  if (error) {
    throw error;
  }

  const user = data.user;

  if (!user?.id) {
    return data;
  }

  await createPersonalRecords({
    user,
    email: normalizedEmail,
    name: normalizedName,
  });

  return data;
}

async function createPersonalRecords({
  user,
  email,
  name,
}: {
  user: User;
  email: string;
  name: string;
}) {
  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (!existingProfile) {
    const {
      error: profileError,
    } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email,
        name,
        role: 'personal',
      });

    if (profileError) {
      throw profileError;
    }
  }

  const {
    data: existingTrainer,
    error: existingTrainerError,
  } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingTrainerError) {
    throw existingTrainerError;
  }

  if (!existingTrainer) {
    const {
      error: trainerError,
    } = await supabase
      .from('trainer_profiles')
      .insert({
        id: user.id,
        email,
        name,
        cref_status: 'not_submitted',
      });

    if (trainerError) {
      throw trainerError;
    }
  }

  const {
    data: existingSubscription,
    error: existingSubscriptionError,
  } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('trainer_id', user.id)
    .maybeSingle();

  if (existingSubscriptionError) {
    throw existingSubscriptionError;
  }

  if (!existingSubscription) {
    const {
      error: subscriptionError,
    } = await supabase
      .from('subscriptions')
      .insert({
        trainer_id: user.id,
        plan: 'free',
        student_limit: 1,
        status: 'active',
      });

    if (subscriptionError) {
      throw subscriptionError;
    }
  }
}