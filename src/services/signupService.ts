import { supabase } from '../lib/supabase';
import { generatePassword } from '../lib/utils';
import type { SignupLink, SignupLead } from '../types/database';

type CreateSignupLinkData = {
  title: string;
  plan_name?: string;
  message?: string;
  slug?: string;
};

type SubmitSignupLeadData = {
  signup_link_id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone?: string | null;
  birth_date?: string | null;
  goal?: string | null;
  message?: string | null;
};

function normalizeSlug(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function randomSlug(title: string) {
  const base = normalizeSlug(title) || 'captacao';
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  const suffix = values[0].toString(36).padStart(6, '0').slice(0, 6);

  return `${base}-${suffix}`;
}

function toNullableDate(value?: string | null) {
  if (!value) return null;
  return value;
}


export async function getSignupLinks(trainerId: string): Promise<SignupLink[]> {
  try {
    const { data, error } = await supabase
      .from('coach_signup_links')
      .select('*')
      .eq('coach_auth_user_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as SignupLink[];
  } catch (error) {
    console.error('[signupService] getSignupLinks error:', error);
    throw error;
  }
}


export async function getLeadsByTrainer(trainerId: string): Promise<SignupLead[]> {
  try {
    const { data, error } = await supabase
      .from('signup_leads')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as SignupLead[];
  } catch (error) {
    console.error('[signupService] getLeadsByTrainer error:', error);
    throw error;
  }
}


export async function createSignupLink(
  coachId: string,
  coachAuthUserId: string,
  payload: CreateSignupLinkData
) {
  const slug = normalizeSlug(payload.slug || '') || randomSlug(payload.title);

  const { data, error } = await supabase
    .from('coach_signup_links')
    .insert({
      coach_id: coachId,
      coach_auth_user_id: coachAuthUserId,
      slug,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as SignupLink;
}


export async function deleteSignupLink(id: string) {
  const { error } = await supabase
    .from('coach_signup_links')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


export async function toggleLinkStatus(
  id: string,
  isActive: boolean
) {
  const { data, error } = await supabase
    .from('coach_signup_links')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  return data as SignupLink;
}


export async function getTrainerBySignupLink(slug: string) {
  const { data: link, error: linkError } = await supabase
    .from('coach_signup_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) return null;


  const { data: trainer } = await supabase
    .from('trainer_profiles')
    .select('*')
    .eq('id', link.coach_auth_user_id)
    .maybeSingle();


  return {
    link,
    trainer: trainer || null,
  };
}


export async function submitSignupLead(
  payload: SubmitSignupLeadData
) {

  const { data, error } = await supabase
    .from('signup_leads')
    .insert({
      signup_link_id: payload.signup_link_id,
      trainer_id: payload.trainer_id,

      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,

      birth_date: toNullableDate(payload.birth_date),

      goal: payload.goal || null,
      message: payload.message || null,

      status: 'new',
    })
    .select('*')
    .single();


  if (error) throw error;


  return data as SignupLead;
}



export async function convertLeadToStudent(
  leadId: string,
  trainerId: string
) {
  const { data: lead, error: leadError } =
    await supabase
      .from('signup_leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) {
    throw new Error('Lead não encontrado.');
  }

  const emailNormalized = lead.email.trim().toLowerCase();

  // Verifica se já existe um aluno com este email para evitar erro de constraint
  const { data: existingStudent } = await supabase
    .from('students')
    .select('id')
    .eq('email', emailNormalized)
    .maybeSingle();

  if (existingStudent) {
    throw new Error('Já existe um aluno cadastrado com este email.');
  }

  const temporaryPassword = generatePassword();
  let createdStudentId: string | null = null;

  try {
    const { data: student, error: studentError } =
      await supabase
        .from('students')
        .insert({
          trainer_id: trainerId,
          name: lead.name,
          email: emailNormalized,
          phone: lead.phone || null,
          birth_date: lead.birth_date || null,
          status: 'active',
          source: 'signup_link',
          signup_lead_id: lead.id,
          login_enabled: true,
          app_access_status: 'invited',
        })
        .select('*')
        .single();

    if (studentError) throw studentError;
    createdStudentId = student.id;

    await supabase
      .from('student_goals')
      .insert({
        student_id: student.id,
        objective: lead.goal || null,
        level: 'Iniciante',
      });

    const { data: authResult, error: fnError } =
      await supabase.functions.invoke(
        'create-or-reset-student-auth',
        {
          body: {
            studentId: student.id,
            email: emailNormalized,
            name: lead.name,
            password: temporaryPassword,
          },
        }
      );

    if (fnError) throw fnError;

    const authUserId =
      authResult?.authUserId ||
      authResult?.user?.id ||
      null;

    await supabase
      .from('student_accounts')
      .upsert(
        {
          student_id: student.id,
          auth_user_id: authUserId,
          email: emailNormalized,
          temporary_password: null,
          must_change_password: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'student_id',
        }
      );

    if (authUserId) {
      await supabase
        .from('students')
        .update({
          auth_user_id: authUserId,
        })
        .eq('id', student.id);
    }

    await supabase
      .from('signup_leads')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        converted_student_id: student.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    return {
      student,
      credentials: {
        email: emailNormalized,
        password: temporaryPassword,
      },
    };
  } catch (error) {
    console.error('[signupService] convertLeadToStudent error:', error);
    
    // ROLLBACK: Se criou o aluno mas falhou no auth ou conta, deleta o aluno
    if (createdStudentId) {
      await supabase
        .from('students')
        .delete()
        .eq('id', createdStudentId);
    }
    
    throw error;
  }
}
