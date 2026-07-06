import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

function normalizeEmail(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .normalize("NFKC");
}

async function findAuthUserByEmail(
  supabaseAdmin: any,
  email: string
) {
  const perPage = 1000;

  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .auth
        .admin
        .listUsers({
          page,
          perPage,
        });

    if (error) {
      throw error;
    }

    const users =
      data?.users || [];

    const user =
      users.find(
        (item: any) =>
          normalizeEmail(
            item.email
          ) === email
      );

    if (user) {
      return user;
    }

    if (
      users.length < perPage
    ) {
      break;
    }
  }

  return null;
}

serve(async (request) => {
  if (
    request.method === 'OPTIONS'
  ) {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (
    request.method !== 'POST'
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          'Método não permitido.',
      },
      405
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL'
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      ) ||
      Deno.env.get(
        'SERVICE_ROLE_KEY'
      );

    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL não configurada.'
      );
    }

    if (!serviceRoleKey) {
      throw new Error(
        'Service Role não configurada.'
      );
    }

    const authorization =
      request.headers.get(
        'Authorization'
      );

    if (!authorization) {
      throw new Error(
        'Usuário não autenticado.'
      );
    }

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        ''
      );

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          }
        }
      );

    const {
      data: callerData,
      error: callerError,
    } =
      await supabaseAdmin
        .auth
        .getUser(token);

    const caller =
      callerData?.user;

    if (
      callerError ||
      !caller?.id
    ) {
      throw new Error(
        'Sessão inválida.'
      );
    }

    const body =
      await request.json();

    const studentId =
      String(
        body.studentId || ''
      ).trim();

    const password =
      String(
        body.password || ''
      );

    if (!studentId) {
      throw new Error(
        'Aluno não informado.'
      );
    }

    if (
      password.length < 8
    ) {
      throw new Error(
        'A senha temporária deve ter pelo menos 8 caracteres.'
      );
    }

    const {
      data: callerProfile,
      error: callerProfileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select('id, role')
        .eq('id', caller.id)
        .maybeSingle();

    if (callerProfileError) {
      throw callerProfileError;
    }

    let callerTrainerId:
      string | null = null;

    const {
      data: trainerById,
      error: trainerByIdError,
    } =
      await supabaseAdmin
        .from('trainer_profiles')
        .select('id')
        .eq('id', caller.id)
        .maybeSingle();

    if (trainerByIdError) {
      throw trainerByIdError;
    }

    if (trainerById?.id) {
      callerTrainerId =
        trainerById.id;
    } else if (caller.email) {
      const {
        data: trainerByEmail,
        error:
          trainerByEmailError,
      } =
        await supabaseAdmin
          .from(
            'trainer_profiles'
          )
          .select('id')
          .eq(
            'email',
            normalizeEmail(
              caller.email
            )
          )
          .maybeSingle();

      if (
        trainerByEmailError
      ) {
        throw trainerByEmailError;
      }

      callerTrainerId =
        trainerByEmail?.id ||
        null;
    }

    const {
      data: student,
      error: studentError,
    } =
      await supabaseAdmin
        .from('students')
        .select(`
          id,
          trainer_id,
          auth_user_id,
          email
        `)
        .eq('id', studentId)
        .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      throw new Error(
        'Aluno não encontrado.'
      );
    }

    const isAdmin =
      callerProfile?.role ===
      'admin';

    const isOwnerTrainer =
      callerProfile?.role ===
        'personal' &&
      Boolean(
        callerTrainerId
      ) &&
      student.trainer_id ===
        callerTrainerId;

    if (
      !isAdmin &&
      !isOwnerTrainer
    ) {
      throw new Error(
        'Você não possui autorização para alterar este aluno.'
      );
    }

    const studentEmailNormalized = normalizeEmail(student.email);
    const bodyEmailNormalized = normalizeEmail(body.email);
    const email = studentEmailNormalized || bodyEmailNormalized;

    if (!email) {
      throw new Error(
        'O aluno não possui um email válido.'
      );
    }

    if (!email.includes('@')) {
      throw new Error(
        'O email deve conter "@".'
      );
    }

    const [localPart, domainPart] = email.split('@');
    if (!domainPart || !domainPart.trim()) {
      throw new Error(
        'O email deve ter um domínio válido.'
      );
    }

    console.log('[EMAIL DEBUG]', {
      studentEmail: student.email,
      studentEmailNormalized,
      bodyEmail: body.email,
      bodyEmailNormalized,
      email,
      length: email.length,
      chars: [...email].map(c => c.charCodeAt(0)),
    });

    const name =
      String(
        student.name ||
          body.name ||
          'Aluno'
      ).trim();

    const {
      data: studentAccount,
      error:
        studentAccountError,
    } =
      await supabaseAdmin
        .from(
          'student_accounts'
        )
        .select(
          'auth_user_id'
        )
        .eq(
          'student_id',
          student.id
        )
        .maybeSingle();

    if (
      studentAccountError
    ) {
      throw studentAccountError;
    }

    let authUserId =
      student.auth_user_id ||
      studentAccount
        ?.auth_user_id ||
        null;

    let authUser: any =
      null;

    if (authUserId) {
      const {
        data:
          existingUserData,
        error:
          existingUserError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .getUserById(
            authUserId
          );

      if (
        !existingUserError &&
        existingUserData?.user
      ) {
        authUser =
          existingUserData.user;
      }

      authUserId =
        authUser?.id ||
        null;
    }

    if (!authUser) {
      authUser =
        await findAuthUserByEmail(
          supabaseAdmin,
          email
        );

      authUserId =
        authUser?.id ||
        null;
    }

    if (authUser?.id) {
      const {
        data: updatedProfile,
        error: updatedProfileError,
      } =
        await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

      if (updatedProfileError) {
        throw updatedProfileError;
      }

      if (
        updatedProfile?.role &&
        updatedProfile.role !==
          'student'
      ) {
        throw new Error(
          'Este email já pertence a uma conta de personal ou administrador.'
        );
      }

      console.log('[UPDATE USER]', {
        id: authUser.id,
        email,
        password,
        name,
      });

      const {
        data: updatedUser,
        error: updateUserError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .updateUserById(
            authUser.id,
            {
              password,
              email_confirm: true,

              user_metadata: {
                ...authUser
                  .user_metadata,
                name,
                role: 'student',
              },

              app_metadata: {
                ...authUser
                  .app_metadata,
                role: 'student',
              },
            }
          );

      if (updateUserError) {
        console.error(updateUserError);
        throw new Error(
          JSON.stringify(updateUserError)
        );
      }

      authUser =
        updatedUser.user;

      authUserId =
        updatedUser.user.id;
    } else {
      console.log('[CREATE USER]', {
        email,
        password,
        name,
      });

      const {
        data: createdUser,
        error: createUserError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .createUser({
            email,
            password,
            email_confirm: true,

            user_metadata: {
              name,
              role: 'student',
            },

            app_metadata: {
              role: 'student',
            },
          });

      if (createUserError) {
        console.error(createUserError);
        throw new Error(
          JSON.stringify(createUserError)
        );
      }

      if (
        !createdUser.user?.id
      ) {
        throw new Error(
          'A conta de autenticação não foi criada.'
        );
      }

      authUser =
        createdUser.user;

      authUserId =
        createdUser.user.id;
    }

    const now =
      new Date().toISOString();

    const {
      error: profileUpsertError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .upsert(
          {
            id: authUserId,
            email,
            name,
            role: 'student',
            updated_at: now,
          },
          {
            onConflict: 'id',
          }
        );

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    const {
      error: studentUpdateError,
    } =
      await supabaseAdmin
        .from('students')
        .update({
          auth_user_id:
            authUserId,

          login_enabled: true,

          app_access_status:
            'active',

          updated_at: now,
        })
        .eq('id', student.id);

    if (studentUpdateError) {
      throw studentUpdateError;
    }

    const {
      error: accountUpsertError,
    } =
      await supabaseAdmin
        .from(
          'student_accounts'
        )
        .upsert(
          {
            student_id:
              student.id,

            auth_user_id:
              authUserId,

            email,

            temporary_password:
              password,

            must_change_password:
              true,

            is_active: true,

            updated_at: now,
          },
          {
            onConflict:
              'student_id',
          }
        );

    if (accountUpsertError) {
      throw accountUpsertError;
    }

    return jsonResponse({
      success: true,

      authUserId,

      user: {
        id: authUserId,
        email:
          authUser?.email ||
          email,
      },
    });
  } catch (error) {
    console.error(
      '[CREATE OR RESET STUDENT AUTH]',
      error
    );

    let errorMessage =
      'Erro ao criar ou redefinir o acesso do aluno.';
    let errorStatus = 400;
    let errorCode = 'internal_error';
    let errorName = 'Error';

    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message);
        if (
          typeof parsed === 'object' &&
          parsed !== null
        ) {
          errorMessage =
            parsed.message ?? error.message;
          errorStatus =
            parsed.status ?? errorStatus;
          errorCode =
            parsed.code ?? errorCode;
          errorName =
            parsed.name ?? errorName;
        }
      } catch (e) {
        // If not JSON, use the error message
        errorMessage = error.message;
      }
    }

    return jsonResponse(
      {
        success: false,
        error: {
          message: errorMessage,
          status: errorStatus,
          code: errorCode,
          name: errorName,
        },
      },
      errorStatus
    );
  }
});