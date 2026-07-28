import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, Lock } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BrandMark } from '../../components/brand/BrandMark';
import { supabase } from '../../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyRecoverySession() {
      try {
        const searchParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
        const otpType = searchParams.get('type') || hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (tokenHash && otpType === 'recovery') {
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (!isMounted) return;

          if (otpError) {
            console.error('[ResetPasswordPage] verifyOtp error:', otpError);
            setError('Não foi possível validar o link de recuperação. Solicite um novo email.');
            setChecking(false);
            return;
          }

          if (data.session?.user) {
            setReady(true);
            setChecking(false);
            return;
          }
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!isMounted) return;

          if (!sessionError) {
            setReady(true);
            setChecking(false);
            return;
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        const session = data?.session;

        if (!isMounted) return;

        if (sessionError) {
          console.error('[ResetPasswordPage] session error:', sessionError);
          setError('Não foi possível validar o link de recuperação. Solicite um novo email.');
          setChecking(false);
          return;
        }

        if (session?.user) {
          setReady(true);
          setChecking(false);
          return;
        }

        setError('Este link de recuperação não está mais válido. Solicite um novo email.');
        setChecking(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[ResetPasswordPage] recovery check error:', err);
        setError(err?.message || 'Não foi possível validar a recuperação de senha.');
        setChecking(false);
      }
    }

    verifyRecoverySession();

    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && !!session?.user)) {
        setReady(true);
        setChecking(false);
      }
    });

    return () => {
      isMounted = false;
      authData.subscription.unsubscribe();
    };
  }, [location.hash, location.search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Preencha os dois campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) throw updateError;

      navigate('/auth/login?reset=success', { replace: true });
    } catch (err: any) {
      console.error('[ResetPasswordPage] updateUser error:', err);
      setError(err?.message || 'Não foi possível atualizar a senha. Tente novamente.');
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
          <BrandMark
            size="lg"
            className="mb-4 rounded-2xl bg-gradient-to-br from-vs-primary/15 to-orange-500/10 p-2 shadow-lg shadow-vs-primary/20"
          />
          <h1 className="text-2xl font-bold text-white">Definir nova senha</h1>
          <p className="text-vs-muted text-sm mt-1">Crie uma nova senha para sua conta</p>
        </div>

        {checking ? (
          <div className="glass-card p-6 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 size={24} className="animate-spin text-vs-primary" />
            <p className="text-vs-muted text-sm">Validando o link de recuperação...</p>
          </div>
        ) : !ready ? (
          <div className="glass-card p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Lock size={28} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Link indisponível</h2>
            <p className="text-vs-muted text-sm">{error || 'Este link de recuperação não está mais válido.'}</p>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-vs-primary font-medium hover:underline"
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </Link>
          </div>
        ) : (
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
              label="Nova senha"
              type="password"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              icon={<Lock size={18} />}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              icon={<Lock size={18} />}
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className="w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Salvar nova senha
            </Button>

            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-vs-muted hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
