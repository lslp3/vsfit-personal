import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Loader2,
  Dumbbell,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import * as exerciseService from '../../services/exerciseService';
import type { Exercise } from '../../types/database';
import { cn } from '../../lib/utils';

const MUSCLE_GROUPS = Object.values(exerciseService.MUSCLE_GROUP_LABELS);

function normalizeEx(ex: Exercise) {
  const r = ex as unknown as Record<string, string>;
  return {
    imageUrl: ex.image_url || r.imageUrl || '',
    videoUrl: ex.video_url || r.videoUrl || '',
    muscleGroup: ex.muscle_group || r.muscleGroup || '',
    difficulty: ex.difficulty || r.difficulty || 'Iniciante',
    category: ex.category || r.category || '',
    equipment: ex.equipment || r.equipment || '',
    instructions: ex.instructions || r.instructions || '',
    tips: ex.tips || r.tips || '',
  };
}

export function ExerciseLibraryPage() {
  const { trainerProfile } = useAuthStore();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null);
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMuscle, setFormMuscle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formEquipment, setFormEquipment] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formTips, setFormTips] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    setLoading(true);
    setError(null);
    try {
      const data = await exerciseService.getExercises();
   
      setExercises(data || []);
    } catch (err) {
      console.error('[ExerciseLibraryPage] load error:', err);
      setError('Erro ao carregar exercícios.');
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await exerciseService.syncStorageExercises(trainerProfile?.id);
      setSyncResult(`${result.upserted} de ${result.scanned} exercícios sincronizados`);
      await loadExercises();
    } catch (err) {
      console.error('[ExerciseLibrary] sync error:', err);
      setSyncResult('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  }

  const filtered = exercises.filter((ex) => {
    const n = normalizeEx(ex);
    const matchSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      n.muscleGroup.toLowerCase().includes(search.toLowerCase()) ||
      n.category.toLowerCase().includes(search.toLowerCase());
    const label = n.muscleGroup
      ? exerciseService.MUSCLE_GROUP_LABELS[n.muscleGroup] || n.muscleGroup
      : '';
    const matchMuscle = !activeMuscle || label === activeMuscle;
    return matchSearch && matchMuscle;
  });

  const handleCreate = async () => {
    if (!trainerProfile || !formName.trim()) return;
    setCreating(true);
    try {
      const ex = await exerciseService.createExercise(trainerProfile.id, {
        name: formName.trim(),
        muscle_group: formMuscle || null,
        category: formCategory || null,
        equipment: formEquipment || null,
        difficulty: formDifficulty || null,
        instructions: formInstructions || null,
        tips: formTips || null,
      });
      setExercises((prev) => [ex, ...prev]);
      setShowCreate(false);
      setFormName('');
      setFormMuscle('');
      setFormCategory('');
      setFormEquipment('');
      setFormDifficulty('');
      setFormInstructions('');
      setFormTips('');
    } catch {
      //
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Header
        title="Biblioteca de Exercícios"
        showBack
        right={
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium text-vs-primary bg-vs-primary/10 px-3 py-1.5 rounded-lg hover:bg-vs-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Storage'}
          </button>
        }
      />

      <div className="page-container space-y-4">
        {syncResult && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {syncResult}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vs-muted" />
          <input
            className="input-field pl-10"
            placeholder="Buscar exercícios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveMuscle(null)}
            className={cn('chip whitespace-nowrap shrink-0', !activeMuscle && 'chip-active')}
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              type="button"
              onClick={() => setActiveMuscle(activeMuscle === mg ? null : mg)}
              className={cn('chip whitespace-nowrap shrink-0', activeMuscle === mg && 'chip-active')}
            >
              {mg}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-vs-muted" />
            <p className="text-sm text-vs-muted">Carregando exercícios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="w-8 h-8 text-vs-muted" />}
            title="Nenhum exercício"
            description="Nenhum exercício encontrado. Clique em Sincronizar Storage para carregar seus exercícios reais."
            action={
              <div className="flex gap-2">
                <Button onClick={handleSync} loading={syncing}>
                  <RefreshCw className="w-4 h-4" /> Sincronizar Catálogo
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" /> Criar
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((ex) => {
              const n = normalizeEx(ex);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedEx(ex)}
                  className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left shadow-xl active:scale-[0.98] transition-all"
                >
                  <div className="relative aspect-[16/10] bg-zinc-950">
                    {n.imageUrl ? (
                      <img
                        src={n.imageUrl}
                        alt={ex.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : n.videoUrl ? (
                      <video
                        src={n.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Dumbbell className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}

                    {n.videoUrl && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                        Vídeo
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="line-clamp-2 text-[13px] font-black text-white leading-tight">
                      {ex.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {n.category || n.muscleGroup}
                      {n.difficulty && ` • ${n.difficulty}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-vs-primary text-white shadow-lg shadow-vs-primary/30 flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Criar Exercício">
        <div className="space-y-4">
          <Input label="Nome" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do exercício" />
          <Input label="Grupo muscular" value={formMuscle} onChange={(e) => setFormMuscle(e.target.value)} placeholder="Ex: Peito" />
          <Input label="Categoria" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="Ex: Empurrar" />
          <Input label="Equipamento" value={formEquipment} onChange={(e) => setFormEquipment(e.target.value)} placeholder="Ex: Halteres" />
          <Select
            label="Dificuldade"
            options={[
              { value: 'Iniciante', label: 'Iniciante' },
              { value: 'Intermediário', label: 'Intermediário' },
              { value: 'Avançado', label: 'Avançado' },
            ]}
            value={formDifficulty}
            onChange={(e) => setFormDifficulty(e.target.value)}
          />
          <Textarea label="Instruções" value={formInstructions} onChange={(e) => setFormInstructions(e.target.value)} />
          <Textarea label="Dicas" value={formTips} onChange={(e) => setFormTips(e.target.value)} />
          <Button className="w-full" onClick={handleCreate} loading={creating}>
            Criar exercício
          </Button>
        </div>
      </Modal>

      {selectedEx && (
        <DetailsModal
          exercise={selectedEx}
          onClose={() => setSelectedEx(null)}
        />
      )}
    </div>
  );
}

function DetailsModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [exercise.id]);

  const r = exercise as unknown as Record<string, string>;
  const imageUrl = exercise.image_url || r.imageUrl || '';
  const videoUrl = exercise.video_url || r.videoUrl || '';
  const name = exercise.name || 'Exercício';
  const muscleGroup = exercise.muscle_group || r.muscleGroup || '';
  const category = exercise.category || r.category || muscleGroup || 'Grupo muscular';
  const equipment = exercise.equipment || r.equipment || 'Não informado';
  const difficulty = exercise.difficulty || r.difficulty || 'Iniciante';
  const instructions = exercise.instructions || r.instructions || '';
  const tips = exercise.tips || r.tips || '';

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md">
      <button
        type="button"
        aria-label="Fechar detalhe"
        onClick={onClose}
        className="absolute inset-0"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
        className="absolute inset-x-0 bottom-0 max-h-[100dvh] overflow-y-auto rounded-t-[34px] border border-white/10 bg-[#070707] shadow-[0_-28px_90px_rgba(0,0,0,0.85)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />

        <div className="relative mt-3 aspect-video overflow-hidden bg-black sm:aspect-[16/12]">
          {videoUrl && !videoError ? (
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              onError={() => setVideoError(true)}
              className="h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-950">
              <Dumbbell className="h-14 w-14 text-zinc-700" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070707] via-black/10 to-black/35" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          {videoUrl && (
            <div className="absolute left-4 top-4 rounded-full border border-[#ff2a32]/30 bg-[#ff2a32]/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#ff2a32] backdrop-blur-md">
              Vídeo demonstrativo
            </div>
          )}
        </div>

        <div className="px-5 pb-7 pt-5">
          <div>
            <h2 className="text-[22px] font-black leading-[1.02] tracking-[-0.04em] text-white">
              {name}
            </h2>

            <p className="mt-2 text-[13px] font-medium text-zinc-400">
              {category} • {difficulty}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#ff2a32]/25 bg-[#ff2a32]/12 px-3 py-1.5 text-[11px] font-black text-[#ff2a32]">
                {category}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                {difficulty}
              </span>

              {videoUrl && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-zinc-300">
                  Com vídeo
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Grupo
              </p>
              <p className="mt-1 line-clamp-1 text-[12px] font-black text-white">
                {category}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Nível
              </p>
              <p className="mt-1 line-clamp-1 text-[12px] font-black text-white">
                {difficulty}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Equip.
              </p>
              <p className="mt-1 line-clamp-1 text-[12px] font-black text-white">
                {equipment}
              </p>
            </div>
          </div>

          <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[#ff2a32]/15 text-[#ff2a32]">
                <ListChecks className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-black uppercase tracking-[0.16em] text-zinc-300">
                Como executar
              </h3>
            </div>

            <p className="mt-3 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-line">
              {instructions || 'Execute o movimento com controle, mantendo a postura firme e respeitando a amplitude correta. Ajuste a carga conforme o nível do aluno.'}
            </p>
          </section>

          <section className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-yellow-500/15 text-yellow-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-[13px] font-black uppercase tracking-[0.16em] text-zinc-300">
                Dicas do treinador
              </h3>
            </div>

            <p className="mt-3 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-line">
              {tips || 'Controle a fase excêntrica, evite compensações e mantenha o foco no músculo alvo durante toda a execução.'}
            </p>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-3 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-[18px] bg-[#ff2a32] px-4 text-[14px] font-black text-white shadow-[0_16px_40px_rgba(255,42,48,0.32)] active:scale-[0.98]"
            >
              Usar no treino
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-[18px] border border-white/10 bg-white/[0.05] px-4 text-[14px] font-black text-white active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
