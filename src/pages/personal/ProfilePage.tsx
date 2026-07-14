import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  FileText,
  Globe,
  MapPin,
  Target,
  Camera,
  Save,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Award,
  Loader2,
  Upload,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

function getCrefStatusLabel(status?: string | null) {
  switch (status) {
    case 'approved':
      return 'CREF aprovado';
    case 'pending':
      return 'CREF em análise';
    case 'rejected':
      return 'CREF recusado';
    default:
      return 'CREF não enviado';
  }
}

function getCrefStatusClass(status?: string | null) {
  switch (status) {
    case 'approved':
      return 'border-green-500/25 bg-green-500/10 text-green-400';
    case 'pending':
      return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-400';
    case 'rejected':
      return 'border-red-500/25 bg-red-500/10 text-red-400';
    default:
      return 'border-white/10 bg-white/[0.06] text-zinc-400';
  }
}

function getAvatarExtension(file: File) {
  const type = file.type;

  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';

  return 'jpg';
}

export function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { trainerProfile, setUser, user, profile } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [cref, setCref] = useState('');
  const [instagram, setInstagram] = useState('');
  const [location, setLocation] = useState('');
  const [niche, setNiche] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;

    setName(trainerProfile.name || '');
    setPhone(trainerProfile.phone || '');
    setBio(trainerProfile.bio || '');
    setCref(trainerProfile.cref || '');
    setInstagram(trainerProfile.instagram || '');
    setLocation(trainerProfile.location || '');
    setNiche(trainerProfile.niche || '');
  }, [trainerProfile]);

  async function handleSave() {
    if (!trainerProfile) return;

    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    setSaving(true);
    setSuccess(false);
    setAvatarSuccess(false);
    setError('');

    try {
      const originalCref = String(trainerProfile.cref || '').trim();
      const newCref = cref.trim();
      const crefChanged = originalCref !== newCref;

      const updateData: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        cref: newCref || null,
        instagram: instagram.trim() || null,
        location: location.trim() || null,
        niche: niche.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (crefChanged) {
        updateData.cref_status = newCref ? 'pending' : 'not_submitted';
        updateData.cref_submitted_at = newCref ? new Date().toISOString() : null;
        updateData.cref_verified_at = null;
        updateData.cref_rejection_reason = null;
      }

      const { data: updatedTrainer, error: updateError } = await supabase
        .from('trainer_profiles')
        .update(updateData)
        .eq('id', trainerProfile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await supabase
        .from('user_profiles')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainerProfile.id);

      setUser(user, profile, updatedTrainer);
      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[ProfilePage] update error:', err);
      setError(err?.message || 'Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    if (!trainerProfile) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setError('');
    setSuccess(false);
    setAvatarSuccess(false);

    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingAvatar(true);

    try {
      const extension = getAvatarExtension(file);
      const filePath = `${trainerProfile.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('trainer-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('trainer-avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { data: updatedTrainer, error: updateError } = await supabase
        .from('trainer_profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainerProfile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setUser(user, profile, updatedTrainer);
      setAvatarSuccess(true);

      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: any) {
      console.error('[ProfilePage] avatar upload error:', err);
      setError(err?.message || 'Erro ao salvar foto do perfil.');
    } finally {
      setUploadingAvatar(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (!trainerProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#ff2a32]" />
          <p className="text-sm font-medium text-zinc-400">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const crefStatus = trainerProfile.cref_status || 'not_submitted';

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Meu Perfil" showBack />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-950">
                {trainerProfile.avatar_url ? (
                  <img
                    src={trainerProfile.avatar_url}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-white">
                    {(name || trainerProfile.name || 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#ff2a32] text-white disabled:opacity-50 active:scale-95"
                title="Salvar foto do perfil"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>

            <h2 className="text-xl font-black tracking-tight text-white">
              {name || trainerProfile.name}
            </h2>

            <p className="mt-1 text-[12px] font-medium text-zinc-500">
              {trainerProfile.email}
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white disabled:opacity-50 active:scale-95"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
            </button>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${getCrefStatusClass(
                  crefStatus
                )}`}
              >
                {getCrefStatusLabel(crefStatus)}
              </span>

              {niche && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-zinc-300">
                  {niche}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff2a32]/10">
              <User className="h-5 w-5 text-[#ff2a32]" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Dados principais
              </p>
              <h3 className="text-lg font-black text-white">Informações do treinador</h3>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <User className="h-3.5 w-3.5" />
                Nome
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <Mail className="h-3.5 w-3.5" />
                E-mail
              </span>
              <input
                value={trainerProfile.email || ''}
                disabled
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.025] px-4 py-4 text-sm font-bold text-zinc-500 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <Phone className="h-3.5 w-3.5" />
                Telefone
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(34) 99999-9999"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <FileText className="h-3.5 w-3.5" />
                Bio
              </span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Conte um pouco sobre você, sua experiência e seu método de trabalho..."
                rows={4}
                className="w-full resize-none rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
              <Award className="h-5 w-5 text-yellow-400" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Profissional
              </p>
              <h3 className="text-lg font-black text-white">CREF e especialidade</h3>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <FileText className="h-3.5 w-3.5" />
                CREF
              </span>
              <input
                value={cref}
                onChange={(event) => setCref(event.target.value)}
                placeholder="Ex: 123456-G/MG"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
              <p className="mt-2 text-[11px] font-bold text-zinc-500">
                Ao alterar o CREF, o status volta para análise do admin.
              </p>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <Target className="h-3.5 w-3.5" />
                Nicho / especialidade
              </span>
              <input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="Ex: Hipertrofia, Emagrecimento, Glúteos"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <MapPin className="h-3.5 w-3.5" />
                Localização
              </span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Uberlândia - MG"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                <Globe className="h-3.5 w-3.5" />
                Instagram
              </span>
              <input
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                placeholder="@seuinstagram"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />
            </label>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Perfil atualizado com sucesso!
          </div>
        )}

        {avatarSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Foto do perfil salva com sucesso!
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            VOLTAR
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#ff2a32] text-[13px] font-black text-white disabled:opacity-50 active:scale-95"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;