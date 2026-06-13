import { supabase } from '../lib/supabase';
import type { SignupLink, SignupLead } from '../types/database';
import { generateSlug } from '../lib/utils';

export async function getSignupLinks(trainerId: string): Promise<SignupLink[]> {
  try {
    const { data, error } = await supabase
      .from('signup_links')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[SignupService] getSignupLinks error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[SignupService] getSignupLinks exception:', error);
    return [];
  }
}

export async function createSignupLink(trainerId: string, data: {
  title: string;
  plan_name?: string;
  message?: string;
  slug?: string;
}) {
  const slug = data.slug || generateSlug();
  const { data: link, error } = await supabase
    .from('signup_links')
    .insert({
      trainer_id: trainerId,
      title: data.title,
      slug,
      plan_name: data.plan_name || null,
      message: data.message || null,
      is_active: true,
      visits_count: 0
    })
    .select()
    .single();
  if (error) throw error;
  return link;
}

export async function toggleLinkStatus(linkId: string, active: boolean) {
  const { error } = await supabase
    .from('signup_links')
    .update({ is_active: active })
    .eq('id', linkId);
  if (error) throw error;
}

export async function deleteSignupLink(linkId: string) {
  const { error } = await supabase
    .from('signup_links')
    .delete()
    .eq('id', linkId);
  if (error) throw error;
}

export async function getLeadsByTrainer(trainerId: string): Promise<SignupLead[]> {
  try {
    const { data, error } = await supabase
      .from('signup_leads')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[SignupService] getLeadsByTrainer error:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('[SignupService] getLeadsByTrainer exception:', error);
    return [];
  }
}

export async function getSignupLinkBySlug(slug: string): Promise<SignupLink | null> {
  try {
    const { data, error } = await supabase
      .from('signup_links')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.error('[SignupService] getSignupLinkBySlug error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('[SignupService] getSignupLinkBySlug exception:', error);
    return null;
  }
}

export async function getTrainerBySignupLink(slug: string): Promise<{ trainer_id: string; name: string; plan_name: string | null } | null> {
  try {
    const link = await getSignupLinkBySlug(slug);
    if (!link) return null;

    const { data, error } = await supabase
      .from('trainer_profiles')
      .select('id, name')
      .eq('id', link.trainer_id)
      .maybeSingle();
    if (error) {
      console.error('[SignupService] getTrainerBySignupLink error:', error);
      return null;
    }
    if (!data) return null;

    return { trainer_id: link.trainer_id, name: data.name, plan_name: link.plan_name };
  } catch (error) {
    console.error('[SignupService] getTrainerBySignupLink exception:', error);
    return null;
  }
}

export async function submitSignupLead(data: {
  signupLinkSlug: string;
  name: string;
  email: string;
  phone?: string;
  goal?: string;
  message?: string;
}): Promise<boolean> {
  try {
    const link = await getSignupLinkBySlug(data.signupLinkSlug);
    if (!link) {
      console.error('[SignupService] submitSignupLead: link not found');
      return false;
    }

    const { error } = await supabase
      .from('signup_leads')
      .insert({
        signup_link_id: link.id,
        trainer_id: link.trainer_id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        goal: data.goal || null,
        message: data.message || null,
        status: 'pending',
      });
    if (error) {
      console.error('[SignupService] submitSignupLead error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[SignupService] submitSignupLead exception:', error);
    return false;
  }
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export async function convertLeadToStudent(leadId: string, trainerId: string): Promise<{
  student: any;
  credentials: { email: string; password: string };
}> {
  const { data: lead, error: leadError } = await supabase
    .from('signup_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) throw new Error('Lead não encontrado.');

  const temporaryPassword = generateTemporaryPassword();

  const { data: existingStudent } = await supabase
    .from('students')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('email', lead.email)
    .maybeSingle();

  if (existingStudent) {
    throw new Error('Este lead já existe como aluno.');
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      trainer_id: trainerId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      status: 'active',
    })
    .select('*')
    .single();

  if (studentError) throw studentError;

  const { data: authResult, error: authError } = await supabase.functions.invoke('create-or-reset-student-auth', {
    body: {
      studentId: student.id,
      email: student.email,
      password: temporaryPassword,
      name: student.name,
    },
  });

  if (authError) {
    console.error('[CREATE STUDENT AUTH]', authError);
    throw new Error(authError.message || 'Erro ao criar acesso do aluno.');
  }

  if (!authResult?.success) {
    throw new Error(authResult?.error || 'Erro ao criar acesso do aluno.');
  }

  await supabase
    .from('signup_leads')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      converted_student_id: student.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  return {
    student,
    credentials: { email: lead.email, password: temporaryPassword },
  };
}
