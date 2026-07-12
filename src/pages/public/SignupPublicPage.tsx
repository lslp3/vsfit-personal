import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Dumbbell,
  Loader2,
  Send,
} from "lucide-react";

import { Input, Textarea } from "../../components/ui/Input";
import * as signupService from "../../services/signupService";

type SignupData = {
  link: any;
  trainer: any;
};

function getTrainerName(trainer: any) {
  return trainer?.name || trainer?.full_name || trainer?.email || "Personal";
}

export function SignupPublicPage() {
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [signupData, setSignupData] = useState<SignupData | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    goal: "",
    message: "",
  });

  useEffect(() => {
    loadSignupLink();
  }, [slug]);

  async function loadSignupLink() {
    if (!slug) {
      setError("Link de cadastro inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await signupService.getTrainerBySignupLink(slug);

      if (!data?.link) {
        setError("Este link não está disponível ou foi desativado.");
        return;
      }

      setSignupData(data);
    } catch (err: any) {
      console.error("[SignupPublicPage] load error:", err);
      setError(err?.message || "Erro ao carregar link de cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signupData?.link) return;

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Nome e email são obrigatórios.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await signupService.submitSignupLead({
        signup_link_id: signupData.link.id,
        trainer_id: signupData.link.trainer_id,
        trainer_auth_user_id: signupData.link.trainer_auth_user_id || null,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        birth_date: formData.birthDate || null,
        goal: formData.goal || null,
        message: formData.message.trim() || null,
      });

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        birthDate: "",
        goal: "",
        message: "",
      });
    } catch (err: any) {
      console.error("[SignupPublicPage] submit error:", err);
      setError(err?.message || "Erro ao enviar cadastro.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <p className="text-sm font-black text-zinc-300">
            Carregando cadastro...
          </p>
        </div>
      </div>
    );
  }

  if (error && !signupData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
        <div className="w-full max-w-sm rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-4 text-xl font-black">Link indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-red-100/80">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <div className="mx-auto max-w-md space-y-5">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32]">
            <Dumbbell className="h-10 w-10" />
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
            VSFit Personal
          </p>

          <h1 className="mt-2 text-[28px] font-black uppercase italic tracking-[-0.06em] text-white">
            Quero treinar
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Preencha seu cadastro para ser acompanhado por{" "}
            {getTrainerName(signupData?.trainer)}.
          </p>

          {signupData?.link?.message && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-sm leading-relaxed text-zinc-300">
              {signupData.link.message}
            </div>
          )}
        </section>

        {success ? (
          <section className="rounded-[30px] border border-emerald-400/20 bg-emerald-400/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
            <h2 className="mt-5 text-xl font-black text-white">
              Cadastro enviado!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100/80">
              Seu cadastro foi enviado com sucesso. O personal entrará em
              contato com você.
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5"
          >
            <div className="space-y-4">
              <Input
                label="Nome completo *"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
              />

              <Input
                label="Email *"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={formData.email}
                onChange={(event) =>
                  setFormData({ ...formData, email: event.target.value })
                }
              />

              <Input
                label="Telefone"
                placeholder="(34) 99999-9999"
                value={formData.phone}
                onChange={(event) =>
                  setFormData({ ...formData, phone: event.target.value })
                }
              />

              <Input
                label="Data de nascimento"
                type="date"
                value={formData.birthDate}
                onChange={(event) =>
                  setFormData({ ...formData, birthDate: event.target.value })
                }
              />

              <Input
                label="Objetivo"
                placeholder="Ex: emagrecimento, hipertrofia..."
                value={formData.goal}
                onChange={(event) =>
                  setFormData({ ...formData, goal: event.target.value })
                }
              />

              <Textarea
                label="Mensagem"
                placeholder="Conte um pouco sobre você, rotina ou objetivo..."
                value={formData.message}
                onChange={(event) =>
                  setFormData({ ...formData, message: event.target.value })
                }
              />

              {error && (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#ff2a32] text-sm font-black uppercase tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                Enviar cadastro
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SignupPublicPage;
