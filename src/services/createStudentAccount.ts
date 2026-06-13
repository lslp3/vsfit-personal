import { supabase } from '../lib/supabase';

export async function createStudentAuthAccount(studentId: string, email: string, password: string, name: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('create-student-account', {
    body: { studentId, email, password, name },
  });

  if (error) throw new Error(error.message || 'Erro ao criar conta de acesso');
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar conta de acesso');
}
