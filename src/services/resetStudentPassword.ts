import { supabase } from '../lib/supabase';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export async function resetStudentPassword(studentId: string, email: string, name: string): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();

  console.log('[RESET STUDENT PASSWORD] payload:', { studentId, email, name });

  const { data, error } = await supabase.functions.invoke('create-or-reset-student-auth', {
    body: { studentId, email, password: temporaryPassword, name },
  });

  if (error) {
    console.error('[RESET STUDENT PASSWORD EDGE ERROR]', error);
    throw new Error(error.message || 'Erro ao chamar função de reset de senha.');
  }

  if (!data?.success) {
    console.error('[RESET STUDENT PASSWORD RESPONSE ERROR]', data);
    throw new Error(data?.error || 'Erro ao resetar senha do aluno.');
  }

  return temporaryPassword;
}
