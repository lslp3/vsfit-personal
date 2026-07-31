import { useState, type ReactNode } from 'react';
import { CheckCircle2, KeyRound, Loader2, X } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { clearStudentAccountCache } from '../../services/studentService';

type ChangePasswordModalProps = {
  open: boolean;
  studentId?: string | null;
  /** Modo forçado (primeiro login): não exibe botão de fechar e não permite dispensar. */
  mustChange?: boolean;
  onClose?: () => void;
  /** Chamado após a senha ser alterada e o flag must_change_password atualizado. */
  onChanged?: () => void;
};

/**
 * Modal de troca de senha do aluno (mesmo design do fluxo original do
 * StudentProfilePage). Reutilizado em dois contextos:
 * - Manual: aberto pelo botão "Alterar senha" no perfil (mustChange=false);
 * - Forçado: aberto pelo StudentShell quando must_change_password=true
 *   (primeiro login), bloqueando o acesso até a troca ser concluída.
 */
export function ChangePasswordModal({
  open,
  studentId,
  mustChange = false,
  onClose,
  onChanged,
}: ChangePasswordModalProps) {
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordSuccess(false);

    const password = passwordForm.password.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (password.length < 6) {
      setPasswordError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('As senhas não conferem.');
      return;
    }

    setSavingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      if (studentId) {
        const { error: accountError } = await supabase
          .from('student_accounts')
          .update({
            must_change_password: false,
          })
          .eq('student_id', studentId);

        if (accountError) throw accountError;
      }

      // Invalida o cache de conta para que a próxima leitura
      // (initialize/loadProfile) veja must_change_password=false.
      clearStudentAccountCache();

      setPasswordSuccess(true);
      setPasswordForm({
        password: '',
        confirmPassword: '',
      });
      onChanged?.();
    } catch (err: any) {
      console.error('[ChangePasswordModal] change password error:', err);
      setPasswordError(err?.message || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#080808] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
        {!mustChange && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ff2a32]/15 text-[#ff2a32]">
          <KeyRound className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-xl font-black text-white">Alterar senha</h2>

        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Crie uma nova senha para acessar sua conta.
        </p>

        <div className="mt-5 space-y-3 text-left">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Nova senha
            </label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, password: event.target.value })
              }
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-[#ff2a32]/50"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Confirmar senha
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
              }
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-[#ff2a32]/50"
              placeholder="Digite novamente"
            />
          </div>

          {passwordError && <ErrorBox>{passwordError}</ErrorBox>}

          {passwordSuccess && (
            <SuccessBox>Senha alterada com sucesso.</SuccessBox>
          )}
        </div>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
        >
          {savingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
          Salvar senha
        </button>
      </div>
    </div>
  );
}

function SuccessBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-300">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
      {children}
    </div>
  );
}

export default ChangePasswordModal;
