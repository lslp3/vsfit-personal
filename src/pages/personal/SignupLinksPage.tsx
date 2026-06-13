import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  Users,
  Loader2,
  UserPlus,
  X,
  CheckCircle2,
  Send,
  Eye,
  MoreVertical,
  Trash2,
  Power,
  Target,
  KeyRound,
} from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input, Textarea } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import * as signupService from '../../services/signupService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import type { SignupLink, SignupLead } from '../../types/database';
import { formatDate, formatPhone } from '../../lib/formatters';
import { cn } from '../../lib/utils';

export function SignupLinksPage() {
  const { trainerProfile } = useAuthStore();
  const navigate = useNavigate();

  const [links, setLinks] = useState<SignupLink[]>([]);
  const [leads, setLeads] = useState<SignupLead[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLinkData, setNewNewLinkData] = useState({
    title: '',
    plan_name: '',
    message: '',
    slug: '',
  });

  const [isLeadsModalOpen, setIsLeadsModalOpen] = useState(false);
  const [selectedLinkLeads, setSelectedLinkLeads] = useState<SignupLead[]>([]);
  const [activeLinkTitle, setActiveLinkTitle] = useState('');

  const [selectedLead, setSelectedLead] = useState<SignupLead | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState(false);
  const [convertError, setConvertError] = useState('');

  const [createdCredentials, setCreatedCredentials] = useState<{
    student: any;
    credentials: { email: string; password: string };
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;
    loadData();
  }, [trainerProfile]);

  const loadData = async () => {
    if (!trainerProfile) return;

    setLoading(true);

    try {
      const [linksData, leadsData] = await Promise.all([
        signupService.getSignupLinks(trainerProfile.id),
        signupService.getLeadsByTrainer(trainerProfile.id),
      ]);

      setLinks(linksData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  async function checkCanCreateLink() {
    if (!trainerProfile) return false;

    const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);
    const planLimits = getPlanLimits(currentPlanSlug);

    if (!planLimits.capture) {
      setPlanModalMessage(
        'Captação de alunos bloqueada no seu plano atual. Assine o plano Pro ou Premium para criar links de captação.'
      );
      setShowPlanModal(true);
      return false;
    }

    const activeLinksCount = links.filter((link) => link.is_active).length;

    if (planLimits.signupLinks !== Infinity && activeLinksCount >= planLimits.signupLinks) {
      setPlanModalMessage(
        `Seu plano (${currentPlanSlug.toUpperCase()}) permite apenas ${planLimits.signupLinks} links de captação ativos. Faça upgrade para o plano Premium para links ilimitados.`
      );
      setShowPlanModal(true);
      return false;
    }

    return true;
  }

  async function checkCanCreateStudentFromLead() {
    if (!trainerProfile) return false;

    const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);
    const planLimits = getPlanLimits(currentPlanSlug);

    const { count, error } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', trainerProfile.id);

    if (error) {
      console.error('[SignupLinksPage] Erro ao contar alunos:', error);
      setConvertError('Não foi possível verificar o limite de alunos.');
      return false;
    }

    const currentStudentCount = count || 0;

    if (planLimits.students !== Infinity && currentStudentCount >= planLimits.students) {
      setPlanModalMessage(
        `Seu plano (${currentPlanSlug.toUpperCase()}) permite apenas ${planLimits.students} aluno(s). Para converter mais leads em alunos, faça upgrade de plano.`
      );

      setConvertModalOpen(false);
      setShowPlanModal(true);
      return false;
    }

    return true;
  }

  const handleOpenCreateModal = async () => {
    const allowed = await checkCanCreateLink();

    if (allowed) {
      setIsCreateModalOpen(true);
    }
  };

  const handleCreateLink = async () => {
    if (!trainerProfile || !newLinkData.title.trim()) return;

    const allowed = await checkCanCreateLink();

    if (!allowed) {
      setIsCreateModalOpen(false);
      return;
    }

    setCreating(true);

    try {
      await signupService.createSignupLink(trainerProfile.id, {
        title: newLinkData.title,
        plan_name: newLinkData.plan_name || undefined,
        message: newLinkData.message || undefined,
        slug: newLinkData.slug || undefined,
      });

      setIsCreateModalOpen(false);
      setNewNewLinkData({ title: '', plan_name: '', message: '', slug: '' });

      await loadData();
    } catch (err) {
      console.error('Error creating link:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (slug: string, id: string) => {
    const url = `${window.location.origin}/signup/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // noop
    }
  };

  async function handleConvertLead(lead: SignupLead) {
    if (!trainerProfile) return;

    try {
      setConvertingLead(true);
      setConvertError('');

      const allowed = await checkCanCreateStudentFromLead();

      if (!allowed) {
        return;
      }

      const result = await signupService.convertLeadToStudent(lead.id, trainerProfile.id);

      setConvertModalOpen(false);
      setCreatedCredentials(result);
      await loadData();
    } catch (err: any) {
      console.error('[CONVERT LEAD]', err);
      setConvertError(err?.message || 'Erro ao converter lead.');
    } finally {
      setConvertingLead(false);
    }
  }

  function handleCopyCredentials() {
    if (!createdCredentials) return;

    const text = `Email: ${createdCredentials.credentials.email}\nSenha: ${createdCredentials.credentials.password}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      })
      .catch(() => {});
  }

  function handleSendWhatsApp(student: any, password?: string) {
    const email = student.email;

    const msg = `Olá ${student.name}, seu acesso ao VSFit Personal foi criado:

Email: ${email}
Senha temporária: ${password}

Acesse o aplicativo e altere sua senha após o primeiro login.`;

    const phone = String(student.phone || '').replace(/\D/g, '');

    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard
        .writeText(msg)
        .then(() => {
          alert('Telefone não informado. Mensagem copiada para envio manual.');
        })
        .catch(() => {});
    }
  }

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Deseja realmente excluir este link?')) return;

    try {
      await signupService.deleteSignupLink(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      await signupService.toggleLinkStatus(id, !current);
      await loadData();
    } catch (err) {
      console.error('Error toggling link status:', err);
    }
  };

  const summary = {
    active: links.filter((link) => link.is_active).length,
    visits: links.reduce((acc, link) => acc + (link.visits_count || 0), 0),
    leads: leads.length,
    converted: leads.filter((lead) => lead.status === 'converted').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-400">Carregando links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Captura de Alunos" showBack />

      <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Captura de Alunos</h1>
              <p className="mt-0.5 text-[13px] font-medium text-zinc-500">
                Crie links para captar alunos automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#ff2a32] px-5 text-[12px] font-black tracking-wide text-white transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              CRIAR
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Links ativos', value: summary.active, icon: LinkIcon, color: 'text-[#ff2a32]' },
              { label: 'Visitas', value: summary.visits, icon: Eye, color: 'text-blue-400' },
              { label: 'Leads', value: summary.leads, icon: Users, color: 'text-amber-400' },
              { label: 'Convertidos', value: summary.converted, icon: CheckCircle2, color: 'text-emerald-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-1 flex items-center gap-2">
                  <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <h3 className="pt-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
            Seus Links
          </h3>

          {links.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                    <LinkIcon className="h-10 w-10 text-zinc-700" />
                  </div>
                }
                title="Nenhum link criado"
                description="Crie seu primeiro link de captação para compartilhar com interessados."
                action={
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white transition-all active:scale-95"
                  >
                    CRIAR PRIMEIRO LINK
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => {
                const linkLeads = leads.filter((lead) => lead.signup_link_id === link.id);
                const convertedCount = linkLeads.filter((lead) => lead.status === 'converted').length;

                return (
                  <div
                    key={link.id}
                    className="group relative overflow-visible rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-all"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/10 bg-[#ff2a32]/10">
                            <Target className="h-5 w-5 text-[#ff2a32]" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate text-[16px] font-black uppercase italic tracking-tight text-white">
                              {link.title || 'Campanha sem nome'}
                            </h4>
                            <p className="truncate text-[12px] font-medium text-zinc-500">
                              /signup/{link.slug}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Badge status={link.is_active ? 'active' : 'inactive'} />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-black/20 p-3">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Visitas
                        </p>
                        <p className="text-[14px] font-black text-white">{link.visits_count || 0}</p>
                      </div>

                      <div className="border-x border-white/5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Leads
                        </p>
                        <p className="text-[14px] font-black text-white">{linkLeads.length}</p>
                      </div>

                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Conv.
                        </p>
                        <p className="text-[14px] font-black text-emerald-400">{convertedCount}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(link.slug, link.id)}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] text-[12px] font-black text-white transition-all active:scale-95"
                      >
                        {copiedId === link.id ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            COPIADO
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            COPIAR
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLinkLeads(linkLeads);
                          setActiveLinkTitle(link.title || '');
                          setIsLeadsModalOpen(true);
                        }}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[12px] font-black text-black shadow-lg transition-all active:scale-95"
                      >
                        <Users className="h-4 w-4" />
                        LEADS
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/signup/${link.slug}`;
                          const msg = `Confira minha consultoria: ${url}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-400 transition-all active:scale-95"
                      >
                        <Send className="h-4 w-4" />
                      </button>

                      <div className="relative group/options">
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-400 transition-all active:scale-95"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        <div className="absolute bottom-full right-0 z-20 mb-2 hidden min-w-[160px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl group-focus-within/options:flex">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(link.id, link.is_active)}
                            className="flex items-center gap-3 px-4 py-3 text-xs font-black text-zinc-400 transition-colors hover:bg-white/5"
                          >
                            <Power className="h-4 w-4" />
                            {link.is_active ? 'DESATIVAR' : 'ATIVAR'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLink(link.id)}
                            className="flex items-center gap-3 border-t border-white/5 px-4 py-3 text-xs font-black text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            EXCLUIR LINK
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <button type="button" onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0" />

          <div className="relative w-full max-w-[400px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative p-6 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#ff2a32]/15 text-[#ff2a32]">
                <LinkIcon className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-center text-[22px] font-black uppercase italic tracking-[-0.04em] text-white">
                Novo Link de Captura
              </h2>

              <p className="mt-2 px-4 text-center text-[13px] leading-relaxed text-zinc-400">
                Personalize seu link para atrair mais alunos para sua consultoria.
              </p>

              <div className="mt-8 space-y-4">
                <Input
                  label="Nome da campanha"
                  placeholder="Ex: Consultoria Online"
                  value={newLinkData.title}
                  onChange={(event) =>
                    setNewNewLinkData({ ...newLinkData, title: event.target.value })
                  }
                />

                <Input
                  label="Objetivo"
                  placeholder="Ex: Emagrecimento, Hipertrofia"
                  value={newLinkData.plan_name}
                  onChange={(event) =>
                    setNewNewLinkData({ ...newLinkData, plan_name: event.target.value })
                  }
                />

                <Textarea
                  label="Mensagem de boas-vindas"
                  placeholder="Ex: Entre para minha consultoria e receba treinos exclusivos..."
                  value={newLinkData.message}
                  onChange={(event) =>
                    setNewNewLinkData({ ...newLinkData, message: event.target.value })
                  }
                  rows={3}
                />

                <div className="space-y-1.5">
                  <label className="pl-1 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                    Slug personalizado
                  </label>

                  <div className="flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.045] px-4 py-3.5">
                    <span className="text-[13px] font-bold text-zinc-600">/signup/</span>

                    <input
                      className="flex-1 border-none bg-transparent p-0 text-[13px] font-black text-white focus:outline-none"
                      placeholder="minha-consultoria"
                      value={newLinkData.slug}
                      onChange={(event) =>
                        setNewNewLinkData({
                          ...newLinkData,
                          slug: event.target.value.toLowerCase().replace(/\s+/g, '-'),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white active:scale-[0.98]"
                >
                  CANCELAR
                </button>

                <button
                  type="button"
                  disabled={creating || !newLinkData.title}
                  onClick={handleCreateLink}
                  className="h-12 rounded-[18px] bg-[#ff2a32] text-[13px] font-black text-white disabled:opacity-50 active:scale-[0.98]"
                >
                  {creating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'CRIAR LINK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLeadsModalOpen && (
        <div className="fixed inset-0 z-[999] flex flex-col bg-[#050505]">
          <div className="flex items-center justify-between border-b border-white/5 bg-[#080808] p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#ff2a32]">
                Leads da campanha
              </p>

              <h2 className="max-w-[240px] truncate text-lg font-black uppercase italic tracking-tight text-white">
                {activeLinkTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsLeadsModalOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-32">
            {selectedLinkLeads.length === 0 ? (
              <div className="py-20">
                <EmptyState
                  icon={<Users className="h-8 w-8 text-zinc-700" />}
                  title="Nenhum lead ainda"
                  description="Interessados que preencherem o formulário aparecerão aqui."
                />
              </div>
            ) : (
              selectedLinkLeads.map((lead) => (
                <div key={lead.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="truncate text-[15px] font-black text-white">{lead.name}</h4>
                        <Badge status={lead.status} />
                      </div>

                      <p className="mb-3 truncate text-[12px] font-medium text-zinc-400">
                        {lead.email}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
                            <Send className="h-3 w-3" />
                            {formatPhone(lead.phone)}
                          </div>
                        )}

                        {lead.goal && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-[#ff2a32]/10 bg-[#ff2a32]/10 px-2.5 py-1 text-[10px] font-black uppercase italic text-[#ff2a32]">
                            <Target className="h-3 w-3" />
                            {lead.goal}
                          </div>
                        )}
                      </div>
                    </div>

                    {lead.status !== 'converted' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLead(lead);
                          setConvertModalOpen(true);
                        }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32] text-white transition-all active:scale-90"
                      >
                        <UserPlus className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    Capturado em {formatDate(lead.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedLead && convertModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 px-4 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setConvertModalOpen(false);
              setSelectedLead(null);
            }}
            className="absolute inset-0"
          />

          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <button
              type="button"
              onClick={() => {
                setConvertModalOpen(false);
                setSelectedLead(null);
              }}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative p-6 pt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-400">
                <UserPlus className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-center text-[22px] font-black uppercase italic leading-tight tracking-tight text-white">
                Converter Lead
              </h2>

              <p className="mt-2 text-center text-[12px] leading-relaxed text-zinc-400">
                Transforme este lead em aluno e gere automaticamente o acesso dele ao app.
              </p>

              <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Lead
                    </p>
                    <p className="text-[15px] font-black uppercase italic leading-tight text-white">
                      {selectedLead.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Email
                    </p>
                    <p className="truncate text-[13px] font-medium text-white">
                      {selectedLead.email}
                    </p>
                  </div>

                  {selectedLead.goal && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Objetivo
                      </p>
                      <p className="text-[13px] font-black uppercase italic text-[#ff2a32]">
                        {selectedLead.goal}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {convertError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-[11px] font-bold uppercase tracking-wide text-red-400">
                  {convertError}
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConvertModalOpen(false);
                    setSelectedLead(null);
                  }}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[12px] font-black text-white active:scale-[0.98]"
                >
                  CANCELAR
                </button>

                <button
                  type="button"
                  disabled={convertingLead}
                  onClick={() => handleConvertLead(selectedLead)}
                  className="h-12 rounded-[18px] bg-emerald-600 text-[12px] font-black text-white disabled:opacity-50 active:scale-[0.98]"
                >
                  {convertingLead ? 'PROCESSANDO...' : 'CONVERTER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createdCredentials && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <div className="relative w-full max-w-[370px] overflow-hidden rounded-[40px] border border-white/10 bg-[#080808] shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <div className="relative p-7 pt-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-500/15 text-emerald-400">
                <KeyRound className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-center text-[24px] font-black uppercase italic tracking-tight text-white">
                Acesso Criado!
              </h2>

              <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
                O aluno foi cadastrado e seu acesso gerado. Compartilhe as credenciais abaixo:
              </p>

              <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                <div className="space-y-3">
                  <div>
                    <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Aluno
                    </p>
                    <p className="text-[15px] font-black uppercase italic text-white">
                      {createdCredentials.student.name}
                    </p>
                  </div>

                  <div>
                    <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Email
                    </p>
                    <p className="truncate text-[13px] font-medium text-white">
                      {createdCredentials.credentials.email}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70">
                      Senha Temporária
                    </p>
                    <p className="text-2xl font-black tracking-widest text-emerald-400">
                      {createdCredentials.credentials.password}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="h-14 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white transition-all active:scale-95"
                >
                  {copiedPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      COPIADO
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Copy className="h-4 w-4" />
                      COPIAR
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendWhatsApp(
                      createdCredentials.student,
                      createdCredentials.credentials.password
                    )
                  }
                  className="h-14 rounded-[20px] bg-emerald-600 text-[13px] font-black text-white transition-all active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    WHATSAPP
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreatedCredentials(null);
                  setIsLeadsModalOpen(false);
                }}
                className="mt-4 h-12 w-full rounded-[20px] border border-white/5 text-[12px] font-black uppercase tracking-widest text-zinc-500 transition-all active:scale-95"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <button type="button" onClick={() => setShowPlanModal(false)} className="absolute inset-0" />

          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent" />

            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative p-7 pt-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-yellow-500/15 text-yellow-400">
                <KeyRound className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-center text-[24px] font-black uppercase italic tracking-tight text-white">
                Limite de Plano
              </h2>

              <p className="mt-2 px-4 text-center text-[13px] leading-relaxed text-zinc-400">
                {planModalMessage}
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="h-14 flex-1 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white transition-all active:scale-95"
                >
                  FECHAR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    setIsCreateModalOpen(false);
                    navigate('/personal/subscription');
                  }}
                  className="h-14 flex-1 rounded-[20px] bg-yellow-600 text-[13px] font-black text-white transition-all active:scale-95"
                >
                  VER PLANOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignupLinksPage;