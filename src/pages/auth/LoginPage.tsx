import {
  useState,
  type FormEvent,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  Lock,
  LogIn,
  Mail,
} from 'lucide-react';

import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import * as authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const data = await authService.login(
        email,
        password
      );

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      if (profileError || !profile) {
        setError('Perfil não encontrado.');
        setLoading(false);
        return;
      }

      const {
        data: trainerProfile,
      } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      setUser(
        data.user,
        profile,
        trainerProfile
      );

      if (profile.role === 'personal') {
        navigate('/personal/dashboard', {
          replace: true,
        });
      } else if (profile.role === 'admin') {
        navigate('/admin/dashboard', {
          replace: true,
        });
      } else {
        setError(
          'Acesso não autorizado para esta área.'
        );
      }
    } catch (loginError: any) {
      const message =
        loginError?.message ===
        'Invalid login credentials'
          ? 'Email ou senha inválidos.'
          : loginError?.message ||
            'Erro ao fazer login. Tente novamente.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#ff2a32]/10 blur-[120px]" />

      <motion.div
        initial={{
          opacity: 0,
          y: 22,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
          ease: 'easeOut',
        }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark
            size="xl"
            className="rounded-[24px]"
          />

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-[#ff2a32]">
            VSFit Personal
          </p>

          <h1 className="mt-3 text-[30px] font-black tracking-[-0.05em] text-white">
            Bem-vindo
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Acesse sua conta para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[28px] border border-white/[0.09] bg-white/[0.035] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: 'auto',
              }}
              className="rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            icon={<Mail size={18} />}
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            icon={<Lock size={18} />}
            autoComplete="current-password"
          />

          <div className="text-right">
            <Link
              to="/auth/forgot-password"
              className="text-xs font-semibold text-zinc-500 transition-colors hover:text-[#ff2a32]"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="h-14 w-full rounded-[16px] text-sm font-black"
          >
            {loading ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <LogIn size={19} />
            )}

            <span>ENTRAR</span>
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-zinc-500">
            Não tem conta?{' '}
            <Link
              to="/auth/register"
              className="font-bold text-[#ff2a32] hover:underline"
            >
              Criar conta
            </Link>
          </p>

          <p className="text-sm text-zinc-500">
            É aluno?{' '}
            <Link
              to="/auth/student-login"
              className="font-bold text-[#ff2a32] hover:underline"
            >
              Acessar como aluno
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;