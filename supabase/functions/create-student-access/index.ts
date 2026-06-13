import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$#';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  return password;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();

    const studentId = String(body.studentId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
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
      temporary_password: temporaryPassword,
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

    return new Response(
      JSON.stringify({
        success: true,
        student: updatedStudent,
        credentials: {
          email,
          password: temporaryPassword,
          temporary_password: temporaryPassword,
        },
        auth_user_id: authUserId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro inesperado.',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});