import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Check,
  Trash2,
  Wallet,
  AlertTriangle,
  Loader2,
  Calendar,
  Copy,
  Send,
  Settings,
  X,
  KeyRound,
  Search,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as paymentService from '../../services/paymentService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits, getFinancialLevel } from '../../lib/planLimits';
import type { Payment } from '../../types/database';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';

type CreatedCharge = {
  payment: Payment;
  pixCode: string;
};

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Pagos' },
  { value: 'overdue', label: 'Atrasados' },
];

const pixKeyTypes = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

function normalizeWhatsappPhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function getStudentPhone(students: any[], studentId?: string | null) {
  if (!studentId) return '';
  const student = students.find((item) => item.id === studentId);
  return student?.phone || '';
}

function getStudentEmail(students: any[], studentId?: string | null) {
  if (!studentId) return '';
  const student = students.find((item) => item.id === studentId);
  return student?.email || '';
}

export function FinancialPage() {
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showPixSettings, setShowPixSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formStudentId, setFormStudentId] = useState('');
  const [formStudentName, setFormStudentName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const [pixSettings, setPixSettings] = useState<paymentService.TrainerPaymentSettings | null>(
    null
  );
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixOwnerName, setPixOwnerName] = useState('');
  const [pixCity, setPixCity] = useState('UBERLANDIA');
  const [savingPix, setSavingPix] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');
  const [financialLevel, setFinancialLevel] = useState<'none' | 'basic' | 'advanced'>('none');

  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [createdCharge, setCreatedCharge] = useState<CreatedCharge | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;

    fetchStudents(trainerProfile.id);
    loadFinancialData();
  }, [trainerProfile?.id, fetchStudents]);

  async function loadFinancialData() {
    if (!trainerProfile) return;

    setLoading(true);

    try {
      const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);
      const planLimits = getPlanLimits(currentPlanSlug);
      const level = getFinancialLevel(currentPlanSlug);

      setFinancialLevel(level);

      if (!planLimits.financial) {
        setPlanModalMessage(
          'Recursos financeiros bloqueados no seu plano atual. Assine o plano Pro ou Premium para gerenciar cobranças.'
        );
        setShowPlanModal(true);
        setLoading(false);
        return;
      }

      const [paymentsData, settingsData] = await Promise.all([
        paymentService.getPaymentsByTrainer(trainerProfile.id),
        paymentService.getTrainerPaymentSettings(trainerProfile.id),
      ]);

      setPayments(paymentsData || []);
      setPixSettings(settingsData);

      if (settingsData) {
        setPixKey(settingsData.pix_key || '');
        setPixKeyType(settingsData.pix_key_type || 'cpf');
        setPixOwnerName(settingsData.pix_owner_name || trainerProfile.name || '');
        setPixCity(settingsData.pix_city || 'UBERLANDIA');
      } else {
        setPixOwnerName(trainerProfile.name || '');
      }
    } catch (err) {
      console.error('[FinancialPage] loadFinancialData error:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetCreateForm() {
    setFormStudentId('');
    setFormStudentName('');
    setFormAmount('');
    setFormDueDate('');
    setFormDescription('');
    setStudentSearch('');
    setError('');
  }

  function openCreateModal() {
    setError('');

    if (!pixSettings?.pix_key) {
      setShowPixSettings(true);
      setError('Configure sua chave Pix antes de criar uma cobrança.');
      return;
    }

    setShowCreate(true);
  }

  async function handleSavePixSettings() {
    if (!trainerProfile) return;

    if (!pixKey.trim()) {
      setError('Informe sua chave Pix.');
      return;
    }

    if (!pixOwnerName.trim()) {
      setError('Informe o nome do recebedor do Pix.');
      return;
    }

    setSavingPix(true);
    setError('');

    try {
      const saved = await paymentService.saveTrainerPaymentSettings(trainerProfile.id, {
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
        pix_owner_name: pixOwnerName.trim(),
        pix_city: pixCity.trim() || 'UBERLANDIA',
      });

      setPixSettings(saved);
      setShowPixSettings(false);
    } catch (err: any) {
      console.error('[FinancialPage] save pix settings error:', err);
      setError(err?.message || 'Erro ao salvar chave Pix.');
    } finally {
      setSavingPix(false);
    }
  }

  async function handleCreate() {
    if (!trainerProfile) return;

    if (!formStudentId) {
      setError('Selecione um aluno.');
      return;
    }

    if (!formAmount || Number(formAmount) <= 0) {
      setError('Informe um valor válido.');
      return;
    }

    if (!pixSettings?.pix_key) {
      setError('Configure sua chave Pix antes de criar a cobrança.');
      setShowPixSettings(true);
      return;
    }

    setCreating(true);
    setError('');

    try {
      const amount = Number(formAmount);
      const description = formDescription || 'Mensalidade / consultoria';

      const pixCode = paymentService.generatePixCopyPaste({
  pixKey: pixSettings.pix_key,
  pixKeyType: pixSettings.pix_key_type,
  amount,
  ownerName: pixSettings.pix_owner_name || trainerProfile.name || 'PERSONAL',
  city: pixSettings.pix_city || 'UBERLANDIA',
  description,
});

      const payment = await paymentService.createPayment(trainerProfile.id, {
        student_id: formStudentId,
        student_name: formStudentName,
        amount,
        due_date: formDueDate || undefined,
        description,
        method: 'pix',
        pix_key: pixSettings.pix_key,
        pix_code: pixCode,
      });

      setPayments((prev) => [payment, ...prev]);
      setCreatedCharge({ payment, pixCode });
      setShowCreate(false);
      resetCreateForm();
    } catch (err: any) {
      console.error('[FinancialPage] create payment error:', err);
      setError(err?.message || 'Erro ao criar cobrança.');
    } finally {
      setCreating(false);
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await paymentService.markPaymentAsPaid(id);

      setPayments((prev) =>
        prev.map((payment) =>
          payment.id === id
            ? {
                ...payment,
                status: 'paid' as const,
                paid_at: new Date().toISOString(),
              }
            : payment
        )
      );
    } catch (err) {
      console.error('[FinancialPage] mark paid error:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await paymentService.deletePayment(id);
      setPayments((prev) => prev.filter((payment) => payment.id !== id));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('[FinancialPage] delete payment error:', err);
    }
  }

  function getPixCodeForPayment(payment: Payment, pixCode?: string) {
    if (pixCode) return pixCode;
    if (payment.pix_code) return payment.pix_code;

    const key = payment.pix_key || pixSettings?.pix_key;

    if (!key) return '';

    return paymentService.generatePixCopyPaste({
  pixKey: key,
  pixKeyType: pixSettings?.pix_key_type,
  amount: payment.amount,
  ownerName: pixSettings?.pix_owner_name || trainerProfile?.name || 'PERSONAL',
  city: pixSettings?.pix_city || 'UBERLANDIA',
  description: payment.description || 'Mensalidade / consultoria',
});
  }

  function handleCopyPix(payment: Payment, pixCode?: string) {
    const code = getPixCodeForPayment(payment, pixCode).replace(/\s+/g, '').trim();

    if (!code) {
      alert('Pix copia e cola não encontrado. Configure sua chave Pix novamente.');
      return;
    }

    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedPixId(payment.id);
        setTimeout(() => setCopiedPixId(null), 2000);
      })
      .catch(() => {
        alert('Não foi possível copiar o Pix.');
      });
  }

  function handleSendWhatsApp(payment: Payment, pixCode?: string) {
    const phone = normalizeWhatsappPhone(getStudentPhone(students, payment.student_id));
    const code = getPixCodeForPayment(payment, pixCode).replace(/\s+/g, '').trim();

    const message = paymentService.buildPaymentWhatsAppMessage({
      studentName: payment.student_name,
      amount: payment.amount,
      dueDate: payment.due_date,
      description: payment.description,
      pixKey: payment.pix_key || pixSettings?.pix_key,
      pixCode: code,
    });

    if (!phone) {
      navigator.clipboard
        .writeText(message)
        .then(() => {
          alert('Telefone do aluno não encontrado. A cobrança foi copiada para envio manual.');
        })
        .catch(() => {
          alert('Telefone do aluno não encontrado.');
        });

      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  const filtered = payments.filter((payment) => {
    if (statusFilter === 'all') return true;
    return payment.status === statusFilter;
  });

  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalPending = payments
    .filter((payment) => payment.status === 'pending')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalOverdue = payments
    .filter((payment) => payment.status === 'overdue')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const paidThisMonth = payments
    .filter((payment) => {
      if (payment.status !== 'paid' || !payment.paid_at) return false;

      const date = new Date(payment.paid_at);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const filteredStudents = students.filter((student: any) => {
    const searchValue = studentSearch.toLowerCase();

    return (
      String(student.name || '').toLowerCase().includes(searchValue) ||
      String(student.email || '').toLowerCase().includes(searchValue)
    );
  });

  const selectedStudentEmail = getStudentEmail(students, formStudentId);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Financeiro" />

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        {showPlanModal ? (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-yellow-500/20 to-transparent" />

              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-yellow-500/15 text-yellow-400">
                <Wallet className="h-10 w-10" />
              </div>

              <h2 className="relative text-xl font-black uppercase italic tracking-tight text-white">
                Acesso bloqueado
              </h2>

              <p className="relative mt-2 text-[13px] leading-relaxed text-zinc-400">
                {planModalMessage}
              </p>

              <div className="relative mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="h-12 flex-1 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-4 text-[13px] font-black text-white"
                >
                  FECHAR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    navigate('/personal/subscription');
                  }}
                  className="h-12 flex-1 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white"
                >
                  VER PLANOS
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </div>
            ) : (
              <>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                        Chave Pix
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                        {pixSettings?.pix_key ? 'Pix configurado' : 'Configure seu Pix'}
                      </h2>

                      <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                        {pixSettings?.pix_key
                          ? `Recebedor: ${
                              pixSettings.pix_owner_name || trainerProfile?.name || 'Personal'
                            }`
                          : 'Cadastre sua chave Pix para gerar cobranças com copia e cola.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPixSettings(true)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white active:scale-95"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>

                  {pixSettings?.pix_key && (
                    <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Chave cadastrada
                      </p>

                      <p className="mt-1 break-all text-[13px] font-bold text-white">
                        {pixSettings.pix_key}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-1 text-xs text-zinc-500">Receita total</p>
                    <p className="text-xl font-black text-white">{formatCurrency(totalRevenue)}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-1 text-xs text-zinc-500">Pago este mês</p>
                    <p className="text-xl font-black text-green-400">
                      {formatCurrency(paidThisMonth)}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-1 text-xs text-zinc-500">Pendente</p>
                    <p className="text-xl font-black text-yellow-400">
                      {formatCurrency(totalPending)}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-1 text-xs text-zinc-500">Atrasado</p>
                    <p className="text-xl font-black text-red-400">
                      {formatCurrency(totalOverdue)}
                    </p>
                  </div>
                </div>

                {financialLevel === 'basic' && (
                  <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-[12px] font-bold leading-relaxed text-yellow-200">
                      Seu plano Pro libera financeiro básico: criar cobrança, copiar Pix e enviar pelo
                      WhatsApp. Relatórios financeiros avançados ficam no Premium.
                    </p>
                  </div>
                )}

                <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={cn(
                        'rounded-full border px-5 py-2.5 text-[12px] font-black tracking-wide transition-all',
                        statusFilter === tab.value
                          ? 'border-[#ff2a32]/40 bg-[#ff2a32]/20 text-[#ff2a32]'
                          : 'border-white/5 bg-white/[0.045] text-zinc-500 hover:border-white/10'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <EmptyState
                    icon={
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                        <Wallet className="h-10 w-10 text-zinc-700" />
                      </div>
                    }
                    title="Nenhum pagamento registrado"
                    description="Registre cobranças dos alunos e envie o Pix pelo WhatsApp."
                  />
                ) : (
                  <div className="space-y-3">
                    {filtered.map((payment) => {
                      const resolvedPixCode = getPixCodeForPayment(payment);

                      return (
                        <div
                          key={payment.id}
                          className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-white">
                                {payment.student_name || 'Aluno'}
                              </p>

                              <p className="mt-0.5 text-xl font-black text-white">
                                {formatCurrency(payment.amount)}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge status={payment.status} />

                                {payment.due_date && (
                                  <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(payment.due_date)}
                                  </span>
                                )}

                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-300">
                                  Pix
                                </span>
                              </div>

                              {payment.description && (
                                <p className="mt-2 truncate text-[12px] text-zinc-500">
                                  {payment.description}
                                </p>
                              )}

                              {resolvedPixCode && (
                                <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    Pix copia e cola
                                  </p>

                                  <p className="mt-1 line-clamp-2 break-all text-[11px] font-medium text-zinc-300">
                                    {resolvedPixCode}
                                  </p>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(payment.id)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyPix(payment, resolvedPixCode)}
                              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] text-[11px] font-black text-white active:scale-95"
                            >
                              {copiedPixId === payment.id ? (
                                <>
                                  <Check className="h-4 w-4 text-emerald-400" />
                                  OK
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  PIX
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(payment, resolvedPixCode)}
                              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] text-[11px] font-black text-white active:scale-95"
                            >
                              <Send className="h-4 w-4 text-emerald-400" />
                              ENVIAR
                            </button>

                            {payment.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(payment.id)}
                                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-green-600 text-[11px] font-black text-white active:scale-95"
                              >
                                <Check className="h-4 w-4" />
                                PAGO
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="flex h-11 items-center justify-center gap-1 rounded-xl border border-green-500/20 bg-green-500/10 text-[11px] font-black text-green-300"
                              >
                                <Check className="h-4 w-4" />
                                PAGO
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {!showPlanModal && (
        <button
          type="button"
          onClick={openCreateModal}
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff2a32] text-white shadow-[0_18px_45px_rgba(255,42,48,0.35)] transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {showPixSettings && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/85 px-3 backdrop-blur-xl sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setShowPixSettings(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.9)] sm:rounded-[32px]">
            <div className="shrink-0 border-b border-white/5 px-5 py-5">
              <button
                type="button"
                onClick={() => setShowPixSettings(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                Configuração Pix
              </p>

              <h2 className="mt-1 text-xl font-black uppercase italic tracking-tight text-white">
                Minha chave Pix
              </h2>

              <p className="mt-1 pr-12 text-[12px] text-zinc-500">
                Essa chave será usada para gerar as cobranças dos alunos.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Tipo de chave
                </label>

                <select
                  value={pixKeyType}
                  onChange={(event) => setPixKeyType(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none"
                >
                  {pixKeyTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-[#080808]">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Chave Pix
                </label>

                <input
                  value={pixKey}
                  onChange={(event) => setPixKey(event.target.value)}
                  placeholder="Digite sua chave Pix"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Nome do recebedor
                </label>

                <input
                  value={pixOwnerName}
                  onChange={(event) => setPixOwnerName(event.target.value)}
                  placeholder="Nome que aparece no Pix"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Cidade
                </label>

                <input
                  value={pixCity}
                  onChange={(event) => setPixCity(event.target.value)}
                  placeholder="UBERLANDIA"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={handleSavePixSettings}
                disabled={savingPix}
                className="w-full rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white disabled:opacity-50 active:scale-[0.98]"
              >
                {savingPix ? 'SALVANDO...' : 'SALVAR CHAVE PIX'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/85 px-3 backdrop-blur-xl sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowCreate(false);
              resetCreateForm();
            }}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.9)] sm:rounded-[32px]">
            <div className="shrink-0 border-b border-white/5 px-5 py-5">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                Nova cobrança
              </p>

              <h2 className="mt-1 text-xl font-black uppercase italic tracking-tight text-white">
                Criar Pix
              </h2>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Aluno
                </label>

                <div className="relative mb-2">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                    placeholder="Buscar aluno..."
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                  />
                </div>

                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {filteredStudents.map((student: any) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setFormStudentId(student.id);
                        setFormStudentName(student.name);
                        setStudentSearch(student.name);
                      }}
                      className={cn(
                        'w-full rounded-xl px-3 py-3 text-left text-sm font-bold transition-colors',
                        formStudentId === student.id
                          ? 'bg-[#ff2a32]/15 text-[#ff2a32]'
                          : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
                      )}
                    >
                      <span className="block">{student.name}</span>
                      <span className="block text-[11px] font-medium text-zinc-500">
                        {student.email || 'Sem email'}
                      </span>
                    </button>
                  ))}
                </div>

                {formStudentId && (
                  <p className="mt-2 text-[11px] font-bold text-zinc-500">
                    Selecionado: {formStudentName}{' '}
                    {selectedStudentEmail ? `• ${selectedStudentEmail}` : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Valor
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={formAmount}
                  onChange={(event) => setFormAmount(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Data de vencimento
                </label>

                <input
                  type="date"
                  value={formDueDate}
                  onChange={(event) => setFormDueDate(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                  Descrição
                </label>

                <input
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder="Ex: Mensalidade de Janeiro"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                />
              </div>

              {pixSettings?.pix_key && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <p className="text-[12px] font-bold text-emerald-200">
                      A cobrança será gerada com sua chave Pix cadastrada.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white disabled:opacity-50 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                {creating ? 'CRIANDO...' : 'CRIAR COBRANÇA PIX'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createdCharge && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <div className="relative w-full max-w-[390px] overflow-hidden rounded-[36px] border border-white/10 bg-[#080808] p-5 shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={() => setCreatedCharge(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-10 w-10" />
            </div>

            <h2 className="mt-6 text-center text-xl font-black uppercase italic tracking-tight text-white">
              Cobrança criada!
            </h2>

            <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
              Copie o Pix ou envie a cobrança pelo WhatsApp.
            </p>

            <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Aluno
              </p>

              <p className="text-[15px] font-black text-white">
                {createdCharge.payment.student_name || 'Aluno'}
              </p>

              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Valor
              </p>

              <p className="text-2xl font-black text-emerald-400">
                {formatCurrency(createdCharge.payment.amount)}
              </p>

              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Pix copia e cola
              </p>

              <p className="mt-1 max-h-24 overflow-y-auto break-all rounded-2xl border border-white/5 bg-black/25 p-3 text-[11px] font-medium text-zinc-300">
                {createdCharge.pixCode}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCopyPix(createdCharge.payment, createdCharge.pixCode)}
                className="h-12 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <Copy className="h-4 w-4" />
                  COPIAR
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(createdCharge.payment, createdCharge.pixCode)}
                className="h-12 rounded-[20px] bg-emerald-600 text-[13px] font-black text-white active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  WHATSAPP
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCreatedCharge(null)}
              className="mt-4 h-12 w-full rounded-[20px] border border-white/5 text-[12px] font-black uppercase tracking-widest text-zinc-500 active:scale-95"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] p-6 shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <span className="text-sm font-bold">
                Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
              </span>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="h-12 flex-1 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-4 text-[13px] font-black text-white"
              >
                CANCELAR
              </button>

              <button
                type="button"
                onClick={() => handleDelete(showDeleteConfirm)}
                className="h-12 flex-1 rounded-[18px] bg-red-600 px-4 py-4 text-[13px] font-black text-white"
              >
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialPage;