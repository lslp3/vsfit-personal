import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import * as trainerService from '../../services/trainerService';
import type { UpdateTrainerData } from '../../types/trainer';

export function TrainerProfilePage() {
  const navigate = useNavigate();
  const { trainerProfile, setUser, user, profile } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [cref, setCref] = useState('');
  const [instagram, setInstagram] = useState('');
  const [location, setLocation] = useState('');
  const [niche, setNiche] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (trainerProfile) {
      setName(trainerProfile.name || '');
      setPhone(trainerProfile.phone || '');
      setBio(trainerProfile.bio || '');
      setCref(trainerProfile.cref || '');
      setInstagram(trainerProfile.instagram || '');
      setLocation(trainerProfile.location || '');
      setNiche(trainerProfile.niche || '');
    }
  }, [trainerProfile]);

  const handleSave = async () => {
    if (!trainerProfile) return;
    setSaving(true);
    setSuccess(false);
    try {
      const data: UpdateTrainerData = {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        cref: cref.trim() || undefined,
        instagram: instagram.trim() || undefined,
        location: location.trim() || undefined,
        niche: niche.trim() || undefined,
      };
      const updated = await trainerService.updateTrainerProfile(trainerProfile.id, data);
      setUser(user, profile, updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  const crefStatus = trainerProfile?.cref_status || 'not_submitted';

  return (
    <div>
      <Header title="Meu Perfil" showBack />

      <div className="page-container space-y-5">
        <Card>
          <div className="flex flex-col items-center py-4">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-vs-primary to-orange-500 flex items-center justify-center">
                {trainerProfile?.avatar_url ? (
                  <img
                    src={trainerProfile.avatar_url}
                    alt={name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-vs-primary text-white flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-white">{name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge status={crefStatus} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <Input
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              placeholder="Seu nome"
            />

            <Input
              label="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
              placeholder="(11) 99999-9999"
            />

            <Textarea
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
            />

            <Input
              label="CREF"
              value={cref}
              onChange={(e) => setCref(e.target.value)}
              icon={<FileText className="w-4 h-4" />}
              placeholder="Ex: 123456-G/SP"
            />

            <Input
              label="Instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              icon={<Globe className="w-4 h-4" />}
              placeholder="@seuinstagram"
            />

            <Input
              label="Localização"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              icon={<MapPin className="w-4 h-4" />}
              placeholder="Cidade - UF"
            />

            <Input
              label="Nicho / Especialidade"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              icon={<Target className="w-4 h-4" />}
              placeholder="Ex: Emagrecimento, Hipertrofia"
            />
          </div>
        </Card>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Perfil atualizado com sucesso!
          </motion.div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
