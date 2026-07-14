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
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
} from 'lucide-react';

import vsfitLogo from '../../assets/brand/vsfit-logo.png';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import * as authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

function normalizeJoinedStudent(value: any) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export function StudentLoginPage() {
  const navigate = useNavigate();

  const {
    setUser,
    setStudentData,
  } = useAuthStore();

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

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password.trim()
    ) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      const loginData =
        await authService.login(
          normalizedEmail,
          password
        );

      const authUser = loginData.user;

      if (!authUser?.id) {
        throw new Error(
          'Usuário não identificado.'
        );
      }

      let account: any = null;
      let student: any = null;

      const {
        data: accountByAuth,
        error: accountByAuthError,
      } = await supabase
        .from('student_accounts')
        .select(
          '*, student:students(*)'
        )
        .eq(
          'auth_user_id',
          authUser.id
        )
        .maybeSingle();

      if (accountByAuthError) {
        console.warn(
          '[StudentLoginPage] account auth:',
          accountByAuthError
        );
      }

      if (accountByAuth) {
        account = accountByAuth;
        student = normalizeJoinedStudent(
          accountByAuth.student
        );
      }

      if (!student) {
        const {
          data: accountByEmail,
          error: accountByEmailError,
        } = await supabase
          .from('student_accounts')
          .select(
            '*, student:students(*)'
          )
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (accountByEmailError) {
          console.warn(
            '[StudentLoginPage] account email:',
            accountByEmailError
          );
        }

        if (accountByEmail) {
          account = accountByEmail;

          student =
            normalizeJoinedStudent(
              accountByEmail.student
            );

          if (
            !accountByEmail.auth_user_id
          ) {
            const {
              error: updateAccountError,
            } = await supabase
              .from('student_accounts')
              .update({
                auth_user_id:
                  authUser.id,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                'id',
                accountByEmail.id
              );

            if (updateAccountError) {
              console.warn(
                '[StudentLoginPage] update account:',
                updateAccountError
              );
            }

            account = {
              ...accountByEmail,
              auth_user_id:
                authUser.id,
            };
          }
        }
      }

      if (!student) {
        const {
          data: studentByEmail,
          error: studentError,
        } = await supabase
          .from('students')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (studentError) {
          console.warn(
            '[StudentLoginPage] student email:',
            studentError
          );
        }

        if (studentByEmail) {
          student = studentByEmail;

          account = {
            id: null,
            student_id:
              studentByEmail.id,
            auth_user_id:
              authUser.id,
            email: normalizedEmail,
            is_active: true,
          };
        }
      }

      if (!student?.id) {
        await supabase.auth.signOut();

        throw new Error(
          'Perfil de aluno não encontrado.'
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn(
          '[StudentLoginPage] profile:',
          profileError
        );
      }

      const now =
        new Date().toISOString();

      const studentProfile =
        profile || {
          id: authUser.id,
          email:
            authUser.email ||
            normalizedEmail,
          name:
            student.name ||
            student.full_name ||
            'Aluno',
          role: 'student',
          created_at: now,
          updated_at: now,
        };

      setUser(
        authUser,
        studentProfile as any,
        null
      );

      setStudentData(
        student,
        account
      );

      navigate('/student/home', {
        replace: true,
      });
    } catch (loginError: any) {
      console.error(
        '[StudentLoginPage] login error:',
        loginError
      );

      const message =
        loginError?.message ===
        'Invalid login credentials'
          ? 'Email ou senha inválidos.'
          : loginError?.message ||
            'Erro ao entrar como aluno.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-6">
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          ease: 'easeOut',
        }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center p-1">
            <img
              src={vsfitLogo}
              alt="VSFit Aluno"
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-[#ff2a32]">
            <GraduationCap className="h-4 w-4" />

            <p className="text-[10px] font-black uppercase tracking-[0.28em]">
              VSFit Aluno
            </p>
          </div>

          <h1 className="mt-3 text-[24px] font-black tracking-[-0.05em] text-white">
            Bem-vindo
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Acesse seus treinos e evolução
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[28px] border border-white/[0.09] bg-[#0d0d0e] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
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
            className="h-12 w-full rounded-[16px] text-sm font-black"
          >
            {loading ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <LogIn size={19} />
            )}

            <span>ENTRAR COMO ALUNO</span>
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-500">
            É personal?{' '}
            <Link
              to="/auth/login"
              className="font-bold text-[#ff2a32] hover:underline"
            >
              Acessar área do personal
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default StudentLoginPage;