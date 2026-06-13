import { supabase } from './supabase';
import type { UserProfile, TrainerProfile } from '../types/database';

export async function getCurrentProfile(): Promise<{
  profile: UserProfile | null;
  trainerProfile: TrainerProfile | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, trainerProfile: null };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'personal') {
    return { profile, trainerProfile: null };
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { profile, trainerProfile };
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: data.user.id,
      email,
      name,
      role: 'personal',
    });
    if (profileError) throw profileError;

    const { error: trainerError } = await supabase.from('trainer_profiles').insert({
      id: data.user.id,
      email,
      name,
    });
    if (trainerError) throw trainerError;

    const { error: subError } = await supabase.from('subscriptions').insert({
      trainer_id: data.user.id,
      plan: 'free',
      student_limit: 1,
    });
    if (subError) throw subError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
