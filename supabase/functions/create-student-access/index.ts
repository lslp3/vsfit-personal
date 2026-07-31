import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[values[i] % chars.length];
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        error: 'Método não permitido.',
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
    }

    const authorization = req.headers.get('Authorization');

    if (!authorization) {
      throw new HttpError(401, 'Usuário não autenticado.');
    }

    const token = authorization.replace(/^Bearer\s+/i, '');

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const caller = callerData?.user;

    if (callerError || !caller?.id) {
      throw new HttpError(401, 'Sessão inválida.');
    }

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('user_profiles')
      .select('id, role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfileError) {
      throw callerProfileError;
    }

    const isAdmin = callerProfile?.role === 'admin';

    let callerTrainerId: string | null = null;

    const { data: trainerById, error: trainerByIdError } = await admin
      .from('trainer_profiles')
      .select('id')
      .eq('id', caller.id)
      .maybeSingle();

    if (trainerByIdError) {
      throw trainerByIdError;
    }

    if (trainerById?.id) {
      callerTrainerId = trainerById.id;
    } else if (caller.email) {
      const { data: trainerByEmail, error: trainerByEmailError } = await admin
        .from('trainer_profiles')
        .select('id')
        .eq('email', normalizeEmail(caller.email))
        .maybeSingle();

      if (trainerByEmailError) {
        throw trainerByEmailError;
      }

      callerTrainerId = trainerByEmail?.id || null;
    }

    if (!isAdmin && !callerTrainerId) {
      throw new HttpError(403, 'Apenas personal trainers ou administradores podem criar acesso de alunos.');
    }

    const body = await req.json();

    const studentId = String(body.studentId || '').trim();
    const email = normalizeEmail(body.email);
    const name = String(body.name || '').trim();

    if (!studentId) {
      throw new Error('ID do aluno não informado.');
    }

    if (!email) {
      throw new Error('Email do aluno não informado.');
    }

    if (!name) {
      throw new Error('Nome do aluno não informado.');
    }

    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id, trainer_id')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      throw new Error('Aluno não encontrado.');
    }

    if (!isAdmin && student.trainer_id !== callerTrainerId) {
      throw new HttpError(403, 'Este aluno não pertence ao seu perfil.');
    }

    const temporaryPassword = generatePassword();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'student',
        student_id: studentId,
      },
    });

    if (authError) {
      throw new Error(authError.message || 'Erro ao criar usuário do aluno.');
    }

    const authUserId = authData.user?.id;

    if (!authUserId) {
      throw new Error('Usuário criado sem ID.');
    }

    const { error: profileError } = await admin.from('user_profiles').upsert({
      id: authUserId,
      email,
      name,
      role: 'student',
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.warn('[create-student-access] user_profiles warning:', profileError);
    }

    const { error: accountError } = await admin.from('student_accounts').insert({
      student_id: studentId,
      auth_user_id: authUserId,
      email,
      temporary_password: null,
    });

    if (accountError) {
      throw new Error(accountError.message || 'Erro ao criar conta do aluno.');
    }

    const { data: updatedStudent, error: updateError } = await admin
      .from('students')
      .update({
        auth_user_id: authUserId,
        app_access_status: 'invited',
        login_enabled: true,
      })
      .eq('id', studentId)
      .select(`
        *,
        student_accounts(*)
      `)
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Erro ao atualizar aluno.');
    }

    return jsonResponse({
      success: true,
      student: updatedStudent,
      auth_user_id: authUserId,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro inesperado.',
      },
      status
    );
  }
});
