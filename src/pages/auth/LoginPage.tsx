import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Dumbbell, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

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
      const data = await authService.login(email, password);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      if (profileError || !profile) {
        setError('Perfil não encontrado.');
        setLoading(false);
        return;
      }

      const { data: trainerProfile } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      setUser(data.user, profile, trainerProfile);

      if (profile.role === 'personal') {
        navigate('/personal/dashboard', { replace: true });
      } else if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Acesso não autorizado para esta área.');
      }
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
          <h1 className="text-2xl font-bold text-white">Acessar</h1>
          <p className="text-vs-muted text-sm mt-1">Área do personal trainer</p>
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

          <div className="text-right">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-vs-muted hover:text-vs-primary transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Dumbbell size={18} />}
            Entrar
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-vs-muted">
            Não tem conta?{' '}
            <Link to="/auth/register" className="text-vs-primary font-medium hover:underline">
              Criar conta
            </Link>
          </p>
          <p className="text-sm text-vs-muted">
            É aluno?{' '}
            <Link to="/auth/student-login" className="text-vs-primary font-medium hover:underline">
              Acessar como aluno
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
