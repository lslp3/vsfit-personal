import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { TrainerProfile } from '../types/database';
import type { UpdateTrainerData } from '../types/trainer';

export async function getTrainerProfile(id: string): Promise<TrainerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('trainer_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[TrainerService] getTrainerProfile error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('[TrainerService] getTrainerProfile exception:', error);
    return null;
  }
}

export async function ensureTrainerProfile(user: User): Promise<TrainerProfile | null> {
  try {
    const existing = await getTrainerProfile(user.id);
    if (existing) return existing;

    const name =
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Personal';

    const { data, error } = await supabase
      .from('trainer_profiles')
      .insert({
        id: user.id,
        email: user.email,
        name,
        cref_status: 'approved',
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.warn('[TrainerService] trainer_profiles table not available, using fallback');
        return {
          id: user.id,
          email: user.email || '',
          name,
          phone: null,
          avatar_url: null,
          bio: null,
          cref: null,
          cref_status: 'approved',
          cref_submitted_at: null,
          cref_verified_at: null,
          cref_rejection_reason: null,
          instagram: null,
          location: null,
          niche: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      console.error('[TrainerService] ensureTrainerProfile insert error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[TrainerService] ensureTrainerProfile exception:', error);

    return {
      id: user.id,
      email: user.email || '',
      name: user.email?.split('@')[0] || 'Personal',
      phone: null,
      avatar_url: null,
      bio: null,
      cref: null,
      cref_status: 'approved',
      cref_submitted_at: null,
      cref_verified_at: null,
      cref_rejection_reason: null,
      instagram: null,
      location: null,
      niche: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export async function ensureSubscription(trainerId: string) {
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        trainer_id: trainerId,
        plan: 'premium',
        status: 'active',
        student_limit: 999,
      })
      .select()
      .single();

    if (error) {
      console.warn('[TrainerService] ensureSubscription upsert error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[TrainerService] ensureSubscription exception:', error);
    return null;
  }
}

export async function updateTrainerProfile(id: string, data: UpdateTrainerData) {
  const { data: profile, error } = await supabase
    .from('trainer_profiles')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return profile;
}

export async function getAllTrainers() {
  try {
    const { data, error } = await supabase
      .from('trainer_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[TrainerService] getAllTrainers error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[TrainerService] getAllTrainers exception:', error);
    return [];
  }
}

export async function approveCref(trainerId: string) {
  const { error } = await supabase
    .from('trainer_profiles')
    .update({
      cref_status: 'approved',
      cref_verified_at: new Date().toISOString(),
    })
    .eq('id', trainerId);
  if (error) throw error;
}

export async function rejectCref(trainerId: string, reason: string) {
  const { error } = await supabase
    .from('trainer_profiles')
    .update({
      cref_status: 'rejected',
      cref_rejection_reason: reason,
    })
    .eq('id', trainerId);
  if (error) throw error;
}
