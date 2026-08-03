import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Dumbbell,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import {
  getPreferences,
  updatePreferences,
  type PushPreferences,
} from '../../services/pushService';
import { cn } from '../../lib/utils';

/**
 * Sprint 12 — ETAPA 7 — Preferências de Push Notifications.
 * Todo acesso ao banco passa por pushService (sem consulta Supabase aqui).
 * Alterar um switch salva IMEDIATAMENTE (upsert via updatePreferences) com
 * feedback de sucesso/erro.
 */

type Category = keyof PushPreferences;

const CATEGORIES: { key: Category; label: string; icon: typeof Bell; hint: string }[] = [
  { key: 'messages', label: 'Mensagens', icon: Bell, hint: 'Nova mensagem no chat' },
  { key: 'workouts', label: 'Treinos', icon: Dumbbell, hint: 'Treinos concluídos e planos' },
  { key: 'payments', label: 'Pagamentos', icon: CreditCard, hint: 'Pagamentos aprovados' },
  { key: 'system', label: 'Notificações do Sistema', icon: Bell, hint: 'Avisos e notificações administrativas' },
];

export function PushPreferencesPage() {
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getPreferences();
        if (active) setPrefs(data);
      } catch (e) {
        if (active) setError('Não foi possível carregar as preferências.');
        console.warn('[PushPreferences] load error:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleToggle(category: Category, current: boolean) {
    const next = !current;

    // Otimista: aplica na UI e salva imediatamente.
    setPrefs((prev) => (prev ? { ...prev, [category]: next } : prev));
    setSavingKey(category);
    setError('');
    setSuccess(false);

    try {
      await updatePreferences({ [category]: next });
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 2200);
    } catch (e) {
      console.warn('[PushPreferences] update error:', e);
      // Reverte em caso de erro.
      setPrefs((prev) => (prev ? { ...prev, [category]: current } : prev));
      setError(`Não foi possível salvar "${category}". Tente novamente.`);
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050505] px-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <p className="text-[12px] font-black uppercase tracking-[0.24em] text-[#FF2B2B]">
            Notificações
          </p>
          <h1 className="mt-1 text-[22px] font-black leading-none tracking-tight">
            Preferências de Push
          </h1>
          <p className="mt-2 text-[13px] font-semibold text-[#909090]">
            Escolha quais notificações deseja receber. As alterações são
            salvas imediatamente.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Preferências salvas.
          </div>
        )}

        <div className="space-y-3">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const value = prefs?.[category.key] ?? true;

            return (
              <div
                key={category.key}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32]/15 text-[#ff2a32]">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{category.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{category.hint}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={value}
                  disabled={savingKey === category.key}
                  onClick={() => handleToggle(category.key, value)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    value ? 'bg-[#ff2a32]' : 'bg-white/10',
                    savingKey === category.key && 'opacity-60'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                      value ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PushPreferencesPage;