import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Cake,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Edit3,
  Goal,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Ruler,
  Save,
  Scale,
  ShieldCheck,
  Target,
  Trophy,
  User,
  UserRound,
  Weight,
  X,
  Zap,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { formatDate, formatPhone } from '../../lib/formatters';
import { useAuthStore } from '../../store/authStore';
import * as studentService from '../../services/studentService';

type ProfileState = {
  student: any | null;
  account: any | null;
  goals: any | null;
  latestMetric: any | null;
  trainer: any | null;
};

type ProfileFormState = {
  name: string;
  phone: string;
  birthDate: string;
};

function getStudentName(student: any) {
  return student?.name || student?.full_name || 'Aluno';
}

function getStudentPhone(student: any) {
  return student?.phone || student?.whatsapp || student?.cellphone || '';
}

function getStudentBirthDate(student: any) {
  return student?.birth_date || student?.birthDate || student?.birthday || '';
}

function getFirstName(student: any) {
  const name = getStudentName(student);
  const first = String(name).trim().split(/\s+/)[0] || 'Aluno';

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function getInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getAvatarUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    student?.avatar ||
    ''
  );
}

function getTrainerName(trainer: any) {
  return trainer?.name || trainer?.full_name || trainer?.email || 'Personal';
}

function getTrainerPhone(trainer: any) {
  return trainer?.phone || trainer?.whatsapp || trainer?.cellphone || '';
}

function getTrainerEmail(trainer: any) {
  return trainer?.email || '';
}

function toDisplay(value: any, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}

function toDateInputValue(value: any) {
  if (!value) return '';

  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function formatNumber(value: any, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';

  const parsed = Number(String(value).replace(',', '.'));

  if (!Number.isFinite(parsed)) return '—';

  return `${parsed.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function formatHeight(value: any) {
  if (value === null || value === undefined || value === '') return '—';

  const parsed = Number(String(value).replace(',', '.'));

  if (!Number.isFinite(parsed)) return '—';

  const heightInCm = parsed > 0 && parsed <= 3 ? parsed * 100 : parsed;

  return `${heightInCm.toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  })}cm`;
}

async function getTrainerProfile(trainerId?: string | null) {
  if (!trainerId) return null;

  const tables = ['trainer_profiles', 'profiles', 'user_profiles'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', trainerId)
        .maybeSingle();

      if (!error && data) return data;
    } catch {
      // tenta a próxima tabela
    }
  }

  return null;
}

function createProfileForm(student: any): ProfileFormState {
  return {
    name: getStudentName(student),
    phone: getStudentPhone(student),
    birthDate: toDateInputValue(getStudentBirthDate(student)),
  };
}

export function StudentProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    phone: '',
    birthDate: '',
  });

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [state, setState] = useState<ProfileState>({
    student: null,
    account: null,
    goals: null,
    latestMetric: null,
    trainer: null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError('');
    setProfileError('');
    setProfileSuccess('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada. Faça login novamente.');
        return;
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      const trainerId = studentData?.trainer_id || null;

      const [goalsResult, metricsResult, trainerResult] = await Promise.allSettled([
        supabase
          .from('student_goals')
          .select('*')
          .eq('student_id', studentData.id)
          .maybeSingle(),

        supabase
          .from('student_metrics')
          .select('*')
          .eq('student_id', studentData.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1),

        getTrainerProfile(trainerId),
      ]);

      const goals =
        goalsResult.status === 'fulfilled' && !goalsResult.value.error
          ? goalsResult.value.data
          : null;

      const latestMetric =
        metricsResult.status === 'fulfilled' &&
        Array.isArray(metricsResult.value.data) &&
        metricsResult.value.data.length > 0
          ? metricsResult.value.data[0]
          : null;

      const trainer =
        trainerResult.status === 'fulfilled' ? trainerResult.value : null;

      setState({
        student: studentData,
        account: accountResult?.account || null,
        goals,
        latestMetric,
        trainer,
      });

      setProfileForm(createProfileForm(studentData));
    } catch (err: any) {
      console.error('[StudentProfilePage] loadProfile error:', err);
      setError(err?.message || 'Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!state.student?.id || savingProfile) return;

    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();
    const birthDate = profileForm.birthDate.trim();

    if (name.length < 2) {
      setProfileError('Informe seu nome corretamente.');
      setSavingProfile(false);
      return;
    }

    try {
      const payload = {
        name,
        phone: phone || null,
        birth_date: birthDate || null,
      };

      const { data, error: updateError } = await supabase
        .from('students')
        .update(payload)
        .eq('id', state.student.id)
        .select('*')
        .maybeSingle();

      if (updateError) throw updateError;

      const updatedStudent = data || {
        ...state.student,
        ...payload,
      };

      setState((prev) => ({
        ...prev,
        student: updatedStudent,
      }));

      setProfileForm(createProfileForm(updatedStudent));
      setEditingProfile(false);
      setProfileSuccess('Dados atualizados com sucesso.');

      if (typeof (studentService as any).clearStudentAccountCache === 'function') {
        (studentService as any).clearStudentAccountCache();
      }

      window.setTimeout(() => {
        setProfileSuccess('');
      }, 3500);
    } catch (err: any) {
      console.error('[StudentProfilePage] save profile error:', err);
      setProfileError(err?.message || 'Erro ao salvar dados do perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelEditProfile() {
    setProfileForm(createProfileForm(state.student));
    setEditingProfile(false);
    setProfileError('');
    setProfileSuccess('');
  }

  async function handleUploadAvatar(file: File) {
    if (!state.student?.id || !file) return;

    setUploadingPhoto(true);

    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `students/${state.student.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('students')
        .update({ avatar_url: avatarUrl })
        .eq('id', state.student.id);

      if (updateError) throw updateError;

      setAvatarPreview(avatarUrl);

      setState((prev) => ({
        ...prev,
        student: {
          ...prev.student,
          avatar_url: avatarUrl,
        },
      }));

      if (typeof (studentService as any).clearStudentAccountCache === 'function') {
        (studentService as any).clearStudentAccountCache();
      }
    } catch (err) {
      console.error('[StudentProfilePage] upload avatar error:', err);
      alert('Erro ao salvar foto do perfil.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function openPasswordModal() {
    setPasswordModalOpen(true);
    setPasswordSuccess(false);
    setPasswordError('');
    setPasswordForm({
      password: '',
      confirmPassword: '',
    });
  }

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

      if (state.student?.id) {
        await supabase
          .from('student_accounts')
          .update({
            must_change_password: false,
          })
          .eq('student_id', state.student.id);
      }

      setPasswordSuccess(true);
      setPasswordForm({
        password: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('[StudentProfilePage] change password error:', err);
      setPasswordError(err?.message || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      await supabase.auth.signOut();
    }

    navigate('/auth/login', { replace: true });
  }

  const avatarUrl = useMemo(() => {
    return avatarPreview || getAvatarUrl(state.student);
  }, [avatarPreview, state.student]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">Carregando perfil...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando seus dados.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !state.student) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">Não foi possível carregar</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error || 'Perfil do aluno não encontrado.'}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  const student = state.student;
  const goals = state.goals;
  const latestMetric = state.latestMetric;
  const trainer = state.trainer;

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-[#ff2a32]/15 text-2xl font-black text-[#ff2a32]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={getStudentName(student)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(getStudentName(student))
                )}
              </div>

              <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-[#101010] text-[#ff2a32]">
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUploadAvatar(file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Perfil do aluno
            </p>

            <h1 className="mt-1 max-w-full truncate text-[27px] font-black uppercase italic tracking-[-0.06em] text-white">
              {getStudentName(student)}
            </h1>

            <p className="mt-1 text-[12px] font-medium text-zinc-500">
              Olá, {getFirstName(student)}. Seus dados estão organizados aqui.
            </p>
          </div>
        </motion.section>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <Scale className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />
            <p className="text-xl font-black text-white">
              {formatNumber(latestMetric?.weight, 'kg')}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Peso
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <Ruler className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
            <p className="text-xl font-black text-white">
              {formatHeight(latestMetric?.height)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Altura
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <Activity className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
            <p className="text-xl font-black text-white">
              {formatNumber(latestMetric?.body_fat, '%')}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
              Gordura
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle
              kicker="Dados pessoais"
              title="Informações"
              icon={<UserRound className="h-5 w-5 text-[#ff2a32]" />}
            />

            {!editingProfile ? (
              <button
                type="button"
                onClick={() => {
                  setProfileForm(createProfileForm(student));
                  setEditingProfile(true);
                  setProfileError('');
                  setProfileSuccess('');
                }}
                className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-black uppercase text-white active:scale-95"
              >
                <Edit3 className="h-4 w-4 text-[#ff2a32]" />
                Editar
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEditProfile}
                className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-black uppercase text-white active:scale-95"
              >
                <X className="h-4 w-4 text-zinc-400" />
                Cancelar
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="space-y-3">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={toDisplay(student.email)}
              />

              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Telefone"
                value={getStudentPhone(student) ? formatPhone(getStudentPhone(student)) : '—'}
              />

              <InfoRow
                icon={<Cake className="h-4 w-4" />}
                label="Data de nascimento"
                value={getStudentBirthDate(student) ? formatDate(getStudentBirthDate(student)) : '—'}
              />

              <InfoRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Status da conta"
                value={student.login_enabled ? 'Acesso liberado' : 'Acesso pendente'}
              />

              {profileSuccess && (
                <SuccessBox>{profileSuccess}</SuccessBox>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <FormField
                label="Nome completo"
                value={profileForm.name}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, name: value }))}
                placeholder="Digite seu nome"
                icon={<UserRound className="h-4 w-4" />}
              />

              <FormField
                label="Telefone / WhatsApp"
                value={profileForm.phone}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
                placeholder="(00) 00000-0000"
                icon={<Phone className="h-4 w-4" />}
                inputMode="tel"
              />

              <FormField
                label="Data de nascimento"
                value={profileForm.birthDate}
                onChange={(value) => setProfileForm((prev) => ({ ...prev, birthDate: value }))}
                placeholder="Data de nascimento"
                icon={<Cake className="h-4 w-4" />}
                type="date"
              />

              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={toDisplay(student.email)}
              />

              {profileError && (
                <ErrorBox>{profileError}</ErrorBox>
              )}

              {profileSuccess && (
                <SuccessBox>{profileSuccess}</SuccessBox>
              )}

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="mt-2 flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] text-[13px] font-black uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(255,42,48,0.28)] transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Salvar dados
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <SectionTitle
            kicker="Objetivo"
            title="Metas do treino"
            icon={<Target className="h-5 w-5 text-[#ff2a32]" />}
          />

          {goals ? (
            <div className="space-y-3">
              <InfoRow icon={<Goal className="h-4 w-4" />} label="Objetivo" value={toDisplay(goals.objective)} highlight />
              <InfoRow icon={<Dumbbell className="h-4 w-4" />} label="Nível" value={toDisplay(goals.level)} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Frequência semanal" value={goals.weekly_frequency ? `${goals.weekly_frequency}x por semana` : '—'} />
              <InfoRow icon={<Weight className="h-4 w-4" />} label="Peso meta" value={goals.target_weight ? `${goals.target_weight}kg` : '—'} />
            </div>
          ) : (
            <EmptyMini
              icon={<Target className="h-9 w-9 text-zinc-700" />}
              title="Sem metas cadastradas"
              description="Quando seu personal cadastrar suas metas, elas aparecerão aqui."
            />
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <SectionTitle
            kicker="Biometria"
            title="Última avaliação"
            icon={<Trophy className="h-5 w-5 text-yellow-400" />}
          />

          {latestMetric ? (
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Peso" value={formatNumber(latestMetric.weight, 'kg')} />
              <MetricCard label="Altura" value={formatHeight(latestMetric.height)} />
              <MetricCard label="Gordura" value={formatNumber(latestMetric.body_fat, '%')} />
              <MetricCard label="Massa muscular" value={formatNumber(latestMetric.muscle_mass, 'kg')} />
              <MetricCard label="Água" value={formatNumber(latestMetric.water_intake, 'L')} />
              <MetricCard label="Data" value={latestMetric.date ? formatDate(latestMetric.date) : '—'} />
            </div>
          ) : (
            <EmptyMini
              icon={<Scale className="h-9 w-9 text-zinc-700" />}
              title="Sem avaliação ainda"
              description="Suas medidas aparecerão aqui quando forem cadastradas."
            />
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <SectionTitle
            kicker="Personal"
            title="Responsável"
            icon={<User className="h-5 w-5 text-[#ff2a32]" />}
          />

          {trainer ? (
            <div className="space-y-3">
              <InfoRow icon={<User className="h-4 w-4" />} label="Nome" value={getTrainerName(trainer)} highlight />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={toDisplay(getTrainerEmail(trainer))} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={getTrainerPhone(trainer) ? formatPhone(getTrainerPhone(trainer)) : '—'} />
            </div>
          ) : (
            <EmptyMini
              icon={<User className="h-9 w-9 text-zinc-700" />}
              title="Personal vinculado"
              description="Seu acompanhamento está ativo no VSFit."
            />
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <SectionTitle
            kicker="Conta"
            title="Acesso"
            icon={<Zap className="h-5 w-5 text-yellow-400" />}
          />

          <div className="space-y-3">
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email de acesso" value={toDisplay(state.account?.email || student.email)} />
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Criado em" value={student.created_at ? formatDate(student.created_at) : '—'} />

            <button
              type="button"
              onClick={openPasswordModal}
              className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black uppercase tracking-wide text-white transition-all active:scale-[0.98]"
            >
              <KeyRound className="h-5 w-5" />
              Alterar senha
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] border border-red-500/25 bg-red-500/10 text-[13px] font-black uppercase tracking-wide text-red-300 transition-all active:scale-[0.98]"
            >
              <LogOut className="h-5 w-5" />
              Sair da conta
            </button>
          </div>
        </section>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#080808] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400"
            >
              <X className="h-4 w-4" />
            </button>

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

              {passwordError && (
                <ErrorBox>{passwordError}</ErrorBox>
              )}

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
      )}
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  icon,
}: {
  kicker: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
        {kicker}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {icon}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.055] text-[#ff2a32]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
          {label}
        </p>
        <p
          className={
            highlight
              ? 'mt-0.5 truncate text-sm font-black text-white'
              : 'mt-0.5 truncate text-sm font-semibold text-zinc-300'
          }
        >
          {value || '—'}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700" />
    </div>
  );
}

function FormField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="block rounded-2xl border border-white/5 bg-black/20 p-3">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-zinc-500">
        <span className="text-[#ff2a32]">{icon}</span>
        {label}
      </span>

      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-[#070707] px-4 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-[#ff2a32]/45"
      />
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value || '—'}</p>
    </div>
  );
}

function EmptyMini({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-center">
      <div className="mx-auto flex justify-center">{icon}</div>
      <p className="mt-3 text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
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

export default StudentProfilePage;