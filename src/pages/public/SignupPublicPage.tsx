import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  Dumbbell,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Target,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import * as signupService from '../../services/signupService';

export function SignupPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [trainerName, setTrainerName] = useState('');
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    signupService.getTrainerBySignupLink(slug)
      .then((data) => {
        if (data) {
          setTrainerName(data.name);
          setPlanName(data.plan_name);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !name.trim() || !email.trim()) {
      setError('Preencha nome e email');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ok = await signupService.submitSignupLead({
        signupLinkSlug: slug,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        goal: goal.trim() || undefined,
        message: message.trim() || undefined,
      });
      if (ok) {
        setSuccess(true);
      } else {
        setError('Erro ao enviar cadastro. Tente novamente.');
      }
    } catch {
      setError('Erro ao enviar cadastro.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 gap-4">
        <Dumbbell className="w-12 h-12 text-zinc-700" />
        <h1 className="text-xl font-bold text-white">Link não encontrado</h1>
        <p className="text-sm text-zinc-400 text-center">Este link de cadastro não existe ou foi desativado.</p>
        <Button variant="secondary" onClick={() => navigate('/auth/login')}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-white">Cadastro enviado com sucesso!</h1>
        <p className="text-sm text-zinc-400 max-w-xs">
          O personal <strong className="text-white">{trainerName}</strong> entrará em contato com você em breve.
        </p>
        <Button variant="secondary" onClick={() => navigate('/auth/login')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="max-w-lg mx-auto px-5 pb-10">
        <div className="flex items-center justify-center pt-10 pb-4 gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ff2a32]/15 border border-[#ff2a32]/30 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-[#ff2a32]" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">VSFit Personal</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-6 mb-8"
        >
          <h1 className="text-2xl font-black text-white">
            Treine com {trainerName}
          </h1>
          {planName && (
            <p className="mt-1 text-sm text-zinc-400">Plano: {planName}</p>
          )}
          <p className="mt-3 text-sm text-zinc-400 max-w-sm mx-auto">
            Preencha seus dados abaixo para solicitar sua consultoria personalizada.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Input
            label="Nome *"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="w-4 h-4" />}
          />

          <Input
            label="Email *"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Objetivo"
            placeholder="Ex: Emagrecimento, Hipertrofia..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            icon={<Target className="w-4 h-4" />}
          />

          <Textarea
            label="Mensagem (opcional)"
            placeholder="Conte um pouco sobre seus objetivos..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button className="w-full h-13" loading={submitting}>
            Quero ser aluno
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Ao enviar, você autoriza o contato do personal trainer.
          </p>
        </motion.form>
      </div>
    </div>
  );
}
