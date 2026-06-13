import { supabase } from '../lib/supabase';
import type { UserProfile, TrainerProfile } from '../types/database';
import type { User } from '@supabase/supabase-js';
import { ensureTrainerProfile, ensureSubscription } from './trainerService';

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function restoreSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function ensureUserProfile(user: User): Promise<UserProfile | null> {
  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return existing;

    const name =
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Personal';

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        name,
        role: 'personal',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        console.warn('[AuthService] user_profiles table not available, using fallback');
      } else {
        console.error('[AuthService] ensureUserProfile insert error:', error);
      }
      return {
        id: user.id,
        email: user.email || '',
        name,
        role: 'personal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data;
  } catch (error) {
    console.error('[AuthService] ensureUserProfile exception:', error);
    const name = user.email?.split('@')[0] || 'Personal';
    return {
      id: user.id,
      email: user.email || '',
      name,
      role: 'personal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export async function getCurrentProfile(): Promise<{
  profile: UserProfile | null;
  trainerProfile: TrainerProfile | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profile: null, trainerProfile: null };

    const profile = await ensureUserProfile(user);

    if (!profile || profile.role !== 'personal') {
      return { profile, trainerProfile: null };
    }

    const trainerProfile = await ensureTrainerProfile(user);
    await ensureSubscription(user.id);

    return { profile, trainerProfile };
  } catch (error) {
    console.error('[AuthService] getCurrentProfile error:', error);
    return { profile: null, trainerProfile: null };
  }
}

export async function registerPersonal(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user) {
    const { error: pErr } = await supabase.from('user_profiles').insert({
      id: data.user.id, email, name, role: 'personal',
    });
    if (pErr) throw pErr;

    const { error: tErr } = await supabase.from('trainer_profiles').insert({
      id: data.user.id, email, name,
    });
    if (tErr) throw tErr;

    const { error: sErr } = await supabase.from('subscriptions').insert({
      trainer_id: data.user.id, plan: 'free', student_limit: 1,
    });
    if (sErr) throw sErr;
  }

  return data;
}

export async function loginStudent(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
