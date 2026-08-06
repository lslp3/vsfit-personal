import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Camera,
  Dumbbell,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BrandMark } from '../../components/brand/BrandMark';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { markTrainerSetupDone } from '../../services/onboardingService';

/**
 * SPRINT 17 · ETAPA 5 — Configuração inicial do Personal Trainer.
 *
 * Exibida uma única vez, logo após Login/Cadastro, ANTES do Dashboard,
 * quando o perfil ainda não foi configurado (campos opcionais vazios).
 * Usa APENAS campos existentes de trainer_profiles: name, avatar_url, cref,
 * niche (especialidade), phone (WhatsApp), location (cidade). NENHUM campo
 * novo. Ao concluir, chama updateTrainerProfile + marca setup concluído
 * (local) e navega para "Configurar seu primeiro aluno".
 */

function getAvatarExtension(file: File) {
  const type = file.type;
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

export function TrainerFirstSetupPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { trainerProfile, user, profile, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [niche, setNiche] = useState('');
  const [cref, setCref] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;
    setName(trainerProfile.name || '');
    setPhone(trainerProfile.phone || '');
    setNiche(trainerProfile.niche || '');
    setCref(trainerProfile.cref || '');
    setLocation(trainerProfile.location || '');
    setAvatarUrl(trainerProfile.avatar_url || '');
  }, [trainerProfile]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    if (!trainerProfile) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

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
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('trainer-avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { data: updatedTrainer, error: updateError } = await supabase
        .from('trainer_profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trainerProfile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setUser(user, profile, updatedTrainer);
    } catch (err: any) {
      console.error('[TrainerFirstSetup] avatar error:', err);
      setError(err?.message || 'Erro ao salvar foto do perfil.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!trainerProfile) return;

    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const originalCref = String(trainerProfile.cref || '').trim();
      const newCref = cref.trim();
      const crefChanged = originalCref !== newCref;

      const updateData: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim() || null,
        niche: niche.trim() || null,
        cref: newCref || null,
        location: location.trim() || null,
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
      markTrainerSetupDone(trainerProfile.id);

      navigate('/personal/students?new=true', { replace: true });
    } catch (err: any) {
      console.error('[TrainerFirstSetup] save error:', err);
      setError(err?.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pt-[var(--safe-area-inset-top, env(safe-area-inset-top, 0px))] pb-8 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" className="mb-4 rounded-[22px]" />
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
            Configuração inicial
          </p>
          <h1 className="mt-2 text-[24px] font-black tracking-[-0.04em]">
            Complete seu perfil profissional
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Só alguns dados para os alunos te encontrarem.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || 'Foto'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-9 w-9 text-zinc-500" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#ff2a32] text-white disabled:opacity-50 active:scale-95"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
          <Input
            label="Nome completo"
            icon={<User size={18} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
          />

          <Input
            label="Especialidade"
            icon={<Dumbbell size={18} />}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Ex: hipertrofia, emagrecimento..."
          />

          <Input
            label="CREF (opcional)"
            icon={<Award size={18} />}
            value={cref}
            onChange={(e) => setCref(e.target.value)}
            placeholder="Ex: 12345-G/MG"
          />

          <Input
            label="WhatsApp"
            icon={<Phone size={18} />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(34) 99999-9999"
          />

          <Input
            label="Cidade"
            icon={<MapPin size={18} />}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Sua cidade"
          />

          {trainerProfile?.email && (
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-zinc-500">
              <Mail size={16} />
              {trainerProfile?.email}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="button"
            loading={saving}
            onClick={handleSave}
            className="h-14 w-full rounded-[18px] text-sm font-black"
          >
            <Save size={18} />
            Salvar e continuar
          </Button>

          <p className="text-center text-[11px] text-zinc-600">
            Você poderá editar estes dados depois em Meu Perfil.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrainerFirstSetupPage;