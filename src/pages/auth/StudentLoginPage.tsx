import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, GraduationCap, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';

export function StudentLoginPage() {
  const navigate = useNavigate();
  const { setUser, setStudentData } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const data = await authService.loginStudent(email, password);
      const normalizedEmail = email.trim().toLowerCase();
      const authUserId = data.user!.id;

      console.log('[STUDENT LOGIN] auth user:', authUserId);
      console.log('[STUDENT LOGIN] email:', normalizedEmail);

      let student: any = null;

      const { data: accountByAuthUserId } = await supabase
        .from('student_accounts')
        .select('*, student:students(*)')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      console.log('[STUDENT LOGIN] account by auth_user_id:', accountByAuthUserId);

      if (accountByAuthUserId) {
        const raw = Array.isArray(accountByAuthUserId.student)
          ? accountByAuthUserId.student[0]
          : accountByAuthUserId.student;
        student = raw;
        setStudentData(student, accountByAuthUserId);
      }

      if (!student) {
        const { data: accountByEmail } = await supabase
          .from('student_accounts')
          .select('*, student:students(*)')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (accountByEmail) {
          const raw = Array.isArray(accountByEmail.student)
            ? accountByEmail.student[0]
            : accountByEmail.student;
          student = raw;
          setStudentData(student, accountByEmail);

          if (!accountByEmail.auth_user_id) {
            await supabase
              .from('student_accounts')
              .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
              .eq('student_id', student.id);
          }
        }
      }

      if (!student) {
        const { data: studentByEmail } = await supabase
          .from('students')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        console.log('[STUDENT LOGIN] student by email:', studentByEmail);

        if (studentByEmail) {
          student = studentByEmail;

          const { data: upserted } = await supabase
            .from('student_accounts')
            .upsert(
              {
                student_id: studentByEmail.id,
                email: normalizedEmail,
                auth_user_id: authUserId,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'student_id' }
            )
            .select()
            .single();

          setStudentData(student, upserted as any || null);
        }
      }

      if (!student) {
        await supabase.auth.signOut();
        setError('Perfil de aluno não encontrado.');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (!profile) {
        await supabase.from('user_profiles').insert({
          id: authUserId,
          email: normalizedEmail,
          name: student.name || normalizedEmail.split('@')[0],
          role: 'student',
        }).maybeSingle();
      }

      setUser(data.user, profile || {
        id: authUserId,
        email: normalizedEmail,
        name: student.name || normalizedEmail.split('@')[0],
        role: 'student',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, null);

      console.log('[STUDENT LOGIN] student:', student);
      console.log('[STUDENT LOGIN] real student id:', student?.id);

      navigate('/student/home', { replace: true });
    } catch (err: any) {
      const message =
        err?.message === 'Invalid login credentials'
          ? 'Email ou senha inválidos.'
          : err?.message || 'Erro ao fazer login. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vs-primary to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-vs-primary/20">
            <span className="text-white font-black text-2xl tracking-tight">VS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Área do Aluno</h1>
          <p className="text-vs-muted text-sm mt-1">Acesse seus treinos</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading} className="w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />}
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-vs-muted">
          É personal trainer?{' '}
          <Link to="/auth/login" className="text-vs-primary font-medium hover:underline">
            Acessar como personal
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
