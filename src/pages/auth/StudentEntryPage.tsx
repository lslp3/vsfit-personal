import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import vsfitLogo from '../../assets/brand/vsfit-logo.png';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import * as signupService from '../../services/signupService';

/**
 * SPRINT 17 · ETAPA 6 — Fluxo Aluno (entrada por código).
 *
 * Guarda: "Aluno não cria conta independente." A base de alunos não tem campo
 * de "código de convite" próprio (limitação de backend — sem migration sem
 * Edge Functions). O código informado pelo Personal é o **slug do link de
 * cadastro existente** (`coach_signup_links.slug`), que a infraestrutura atual
 * (`getTrainerBySignupLink`) já valida. Assim reutilizamos 100% do fluxo de
 * convite existente: código válido → `/signup/:slug` (lead → Edge Function
 * `create-or-reset-student-auth` cria a conta). Alunos já com conta acessam
 * pelo login normal (`/auth/student-login`).
 */

export function StudentEntryPage() {
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatedTrainer, setValidatedTrainer] =
    useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setValidatedTrainer(null);

    const normalized = code.trim().toLowerCase();
    if (!normalized) {
      setError('Informe o código recebido do seu Personal.');
      return;
    }

    setLoading(true);

    try {
      const data = await signupService.getTrainerBySignupLink(normalized);

      if (!data?.link) {
        setError(
          'Código não encontrado ou desativado. Confira com seu Personal.'
        );
        return;
      }

      setValidatedTrainer(data.trainer?.name || data.trainer?.email || 'seu Personal');

      // Redireciona ao fluxo de cadastro existente do link correspondente.
      // O aluno não cria conta autônoma: o lead vira aluno via Edge Function
      // create-or-reset-student-auth (fluxo já em produção).
      navigate(`/signup/${data.link.slug}`, { replace: true });
    } catch (err: any) {
      console.error('[StudentEntryPage] validate error:', err);
      setError(
        err?.message || 'Não foi possível validar o código. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
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
            Seu treino começa aqui
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Digite o código que você recebeu do seu personal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[28px] border border-white/[0.09] bg-[#0d0d0e] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-[14px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {validatedTrainer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 rounded-[14px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                Código válido de <b>{validatedTrainer}</b>. Redirecionando...
              </span>
            </motion.div>
          )}

          <Input
            label="Código do Personal"
            icon={<KeyRound size={18} />}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
              setValidatedTrainer(null);
            }}
            placeholder="Ex.: fit-personal-3f2ab1"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <Button
            type="submit"
            loading={loading}
            className="h-12 w-full rounded-[16px] text-sm font-black"
          >
            {loading ? (
              <Loader2 size={19} className="animate-spin" />
            ) : (
              <ArrowRight size={19} />
            )}
            <span>CONTINUAR COMO ALUNO</span>
          </Button>

          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <UserRound className="h-4 w-4 shrink-0 text-zinc-500" />
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Não encontrou seu personal? Peça o código ou o link de
              cadastro para conseguir acessar seus treinos.
            </p>
          </div>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-zinc-500">
            Já tem conta de aluno?{' '}
            <Link
              to="/auth/student-login"
              className="inline-flex items-center gap-1 font-bold text-[#ff2a32] hover:underline"
            >
              <LogIn size={13} />
              Entrar
            </Link>
          </p>

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

export default StudentEntryPage;