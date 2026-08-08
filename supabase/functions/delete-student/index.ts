// ============================================================================
// VSFit Personal — delete-student · EDGE FUNCTION (ponto único de exclusão)
// ----------------------------------------------------------------------------
// O cliente NUNCA executa DELETE direto em `students`: ele chama esta
// função com { studentId }. A função:
//
//   1. verifica o JWT do personal (admin.auth.getUser);
//   2. resolve o trainer (trainer_profiles por id ou email);
//   3. busca o aluno e valida ownership (students.trainer_id = trainer);
//   4. FASE A: chama a RPC transacional `delete_student_data(uuid, uuid)`
//      (SECURITY DEFINER, EXECUTE somente service_role) → rollback em erro;
//   5. FASE B: remove os auth users (students.auth_user_id ∪
//      student_accounts.auth_user_id, deduplicados) via
//      admin.auth.admin.deleteUser — DEPOIS do commit do banco.
//
// Ver `logic.ts` para a lógica pura (testada por unit tests) e
// `README.md` para o contrato completo.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  type DeleteStudentDeps,
  runDeleteStudentFlow,
} from './logic.ts';

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

    // Cliente ADMIN (service_role) — exclusivamente server-side.
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

    // ------------------------------------------------------------------
    // Resolve o perfil trainer (trainer_profiles) — única identidade
    // autorizada para excluir alunos.
    // ------------------------------------------------------------------
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

    const body = await req.json().catch(() => null);

    const deps: DeleteStudentDeps = {
      resolveCaller: async () => ({
        authUserId: caller.id,
        trainerId: callerTrainerId,
      }),

      fetchStudent: async (studentId) => {
        const { data: student, error: studentError } = await admin
          .from('students')
          .select('id, trainer_id, auth_user_id')
          .eq('id', studentId)
          .maybeSingle();

        if (studentError) {
          throw studentError;
        }

        if (!student) {
          return null;
        }

        // student_accounts pode ter auth_user_id próprio (modelo atual).
        let accountAuthUserId: string | null = null;
        const { data: account, error: accountError } = await admin
          .from('student_accounts')
          .select('auth_user_id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (accountError) {
          throw accountError;
        }

        accountAuthUserId = account?.auth_user_id ?? null;

        return {
          id: student.id,
          trainerId: student.trainer_id,
          authUserId: student.auth_user_id,
          accountAuthUserId,
        };
      },

      purgeDatabase: async (studentId, trainerId) => {
              // FASE A — RPC transacional (SECURITY DEFINER). EXECUTE só service_role.
              const { error } = await admin.rpc('delete_student_data', {
                p_student_uuid: studentId,
                p_trainer_uuid: trainerId,
              });

        if (error) {
          throw error;
        }
      },

      removeAuthUser: async (authUserId) => {
        // FASE B — fora da transação SQL de propósito. Idempotente:
        // usuário inexistente conta como removido (ver logic.ts).
        const { error } = await admin.auth.admin.deleteUser(authUserId);
        return error
          ? { ok: false, error: error.message }
          : { ok: true };
      },
    };

    const outcome = await runDeleteStudentFlow(body?.studentId, deps);

    return jsonResponse(outcome.body, outcome.status);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ success: false, error: error.message }, error.status);
    }

    console.error('[delete-student] erro inesperado:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Erro inesperado ao excluir o aluno.',
      },
      500
    );
  }
});