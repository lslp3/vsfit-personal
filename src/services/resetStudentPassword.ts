import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

function generateTemporaryPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  let password = '';

  for (let index = 0; index < 8; index += 1) {
    password +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return password;
}

export async function resetStudentPassword(
  studentId: string,
  email: string,
  name: string
): Promise<string> {
  const temporaryPassword =
    generateTemporaryPassword();

  console.log(
    '[RESET STUDENT PASSWORD] payload:',
    {
      studentId,
      email,
      name,
    }
  );

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'create-or-reset-student-auth',
    {
      body: {
        studentId,
        email,
        password:
          temporaryPassword,
        name,
      },
    }
  );

  if (error) {
    let message =
      error.message ||
      'Erro ao redefinir a senha do aluno.';

    if (
      error instanceof
      FunctionsHttpError
    ) {
      try {
        const responseBody =
          await error.context.json();

        console.error(
          '[RESET STUDENT PASSWORD HTTP ERROR]',
          responseBody
        );

        message =
          responseBody?.error ||
          responseBody?.message ||
          message;
      } catch (
        responseReadError
      ) {
        console.error(
          '[RESET STUDENT PASSWORD RESPONSE READ ERROR]',
          responseReadError
        );
      }
    } else if (
      error instanceof
      FunctionsRelayError
    ) {
      console.error(
        '[RESET STUDENT PASSWORD RELAY ERROR]',
        error
      );

      message =
        'Erro de comunicação com a função do Supabase.';
    } else if (
      error instanceof
      FunctionsFetchError
    ) {
      console.error(
        '[RESET STUDENT PASSWORD FETCH ERROR]',
        error
      );

      message =
        'Não foi possível acessar a função do Supabase.';
    } else {
      console.error(
        '[RESET STUDENT PASSWORD EDGE ERROR]',
        error
      );
    }

    throw new Error(message);
  }

  if (!data?.success) {
    console.error(
      '[RESET STUDENT PASSWORD RESPONSE ERROR]',
      data
    );

    throw new Error(
      data?.error ||
        'Erro ao redefinir a senha do aluno.'
    );
  }

  return temporaryPassword;
}