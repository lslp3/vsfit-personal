import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Digite seu email.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar email. Tente novamente.');
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
          <h1 className="text-2xl font-bold text-white">Recuperar Senha</h1>
          <p className="text-vs-muted text-sm mt-1">Enviaremos um link para seu email</p>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 space-y-4 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Email enviado!</h2>
            <p className="text-vs-muted text-sm">
              Enviamos um link de recuperação para <strong className="text-white">{email}</strong>.
              Verifique sua caixa de entrada.
            </p>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-vs-primary font-medium hover:underline mt-2"
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </Link>
          </motion.div>
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
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={18} />}
              autoComplete="email"
            />

            <Button type="submit" loading={loading} className="w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              Enviar link
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
