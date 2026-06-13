import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import * as authService from '../../services/authService';

export function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!name.trim()) return 'Digite seu nome.';
    if (!email.trim()) return 'Digite seu email.';
    if (!password) return 'Digite uma senha.';
    if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
    if (password !== confirmPassword) return 'As senhas não coincidem.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await authService.registerPersonal(email, password, name);
      setSuccess(true);
    } catch (err: any) {
      const message =
        err?.message === 'User already registered'
          ? 'Este email já está cadastrado.'
          : err?.message || 'Erro ao cadastrar. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <div className="glass-card p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Conta criada!</h2>
            <p className="text-vs-muted text-sm">
              Sua conta foi criada com sucesso. Acesse o sistema para começar.
            </p>
            <Button onClick={() => navigate('/auth/login')} className="w-full mt-2">
              Ir para o login
            </Button>
          </div>
        </motion.div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          <p className="text-vs-muted text-sm mt-1">Cadastre-se como personal trainer</p>
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
            label="Nome completo"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User size={18} />}
            autoComplete="name"
          />

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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            autoComplete="new-password"
          />

          <Input
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock size={18} />}
            autoComplete="new-password"
          />

          <Button type="submit" loading={loading} className="w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <User size={18} />}
            Cadastrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-vs-muted">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-vs-primary font-medium hover:underline">
            Fazer login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
