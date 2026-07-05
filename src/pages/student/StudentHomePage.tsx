import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Apple,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Loader2,
  MessageCircle,
  Play,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';

type StudentHomeState = {
  student: any | null;
  trainer: any | null;
  workouts: any[];
  workoutLogs: any[];
  nutritionPlans: any[];
  unreadMessages: number;
};

const WORKOUT_CARD_IMAGE =
  '/images/workout-card-muscle.png';

function getStudentInitials(
  name?: string
) {
  const safeName = String(
    name || 'Aluno'
  ).trim();

  const parts = safeName
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName
    .slice(0, 2)
    .toUpperCase();
}

function getStudentAvatarUrl(
  student: any
) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    student?.avatar ||
    ''
  );
}

function getStudentName(student: any) {
  return (
    student?.name ||
    student?.full_name ||
    'Aluno'
  );
}

function getFirstName(student: any) {
  const firstName =
    String(getStudentName(student))
      .trim()
      .split(/\s+/)[0] || 'Aluno';

  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1).toLowerCase()
  );
}

function getTrainerName(trainer: any) {
  return (
    trainer?.name ||
    trainer?.full_name ||
    'Personal'
  );
}

function getWorkoutName(workout: any) {
  return (
    workout?.name ||
    workout?.title ||
    workout?.plan_name ||
    workout?.planName ||
    'Treino personalizado'
  );
}

function toPositiveNumber(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const parsed = Number(
    String(value).replace(',', '.')
  );

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}

function readArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    try {
      return readArray(
        JSON.parse(value)
      );
    } catch {
      return [];
    }
  }

  return [];
}

function readGroups(value: any): any[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    try {
      return readGroups(
        JSON.parse(value)
      );
    } catch {
      return [];
    }
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return Object.values(value).filter(
      Boolean
    );
  }

  return [];
}

function getWorkoutExercises(
  workout: any
) {
  const collected: any[] = [];

  const directSources = [
    workout?.workout_plan_exercises,
    workout?.exercises,
    workout?.selectedExercises,
    workout?.selected_exercises,
    workout?.workoutExercises,
    workout?.workout_exercises,
    workout?.exerciseList,
    workout?.exercise_list,
    workout?.items,
  ];

  directSources.forEach((source) => {
    readArray(source).forEach(
      (exercise) => {
        collected.push(exercise);
      }
    );
  });

  const groupSources = [
    workout?.day_groups,
    workout?.dayGroups,
    workout?.days,
    workout?.workout_days,
    workout?.workoutDays,
    workout?.sections,
    workout?.groups,
    workout?.blocks,
  ];

  groupSources.forEach((source) => {
    readGroups(source).forEach(
      (group: any) => {
        const groupSources = [
          group?.exercises,
          group?.selectedExercises,
          group?.selected_exercises,
          group?.workoutExercises,
          group?.workout_exercises,
          group?.items,
        ];

        groupSources.forEach(
          (exerciseSource) => {
            readArray(
              exerciseSource
            ).forEach((exercise) => {
              collected.push(exercise);
            });
          }
        );
      }
    );
  });

  const uniqueExercises =
    new Map<string, any>();

  collected.forEach(
    (exercise, index) => {
      const key = String(
        exercise?.id ||
          exercise?.exercise_id ||
          exercise?.exerciseId ||
          exercise?.name ||
          exercise?.title ||
          `exercise-${index}`
      );

      if (!uniqueExercises.has(key)) {
        uniqueExercises.set(
          key,
          exercise
        );
      }
    }
  );

  return Array.from(
    uniqueExercises.values()
  );
}

function getWorkoutExerciseCount(
  workout: any
) {
  const relationCount =
    readArray(
      workout?.workout_plan_exercises
    ).length;

  if (relationCount > 0) {
    return relationCount;
  }

  const directCounts = [
    workout?.exercise_count,
    workout?.exerciseCount,
    workout?.exercises_count,
    workout?.exercisesCount,
    workout?.total_exercises,
    workout?.totalExercises,
  ];

  for (const candidate of directCounts) {
    const count =
      toPositiveNumber(candidate);

    if (count > 0) {
      return Math.round(count);
    }
  }

  return getWorkoutExercises(
    workout
  ).length;
}

function getWorkoutDuration(
  workout: any
) {
  const candidates = [
    workout?.duration_minutes,
    workout?.durationMinutes,
    workout?.estimated_duration_minutes,
    workout?.estimatedDurationMinutes,
    workout?.estimated_duration,
    workout?.estimatedDuration,
    workout?.duration,
    workout?.time_minutes,
    workout?.timeMinutes,
    workout?.time,
  ];

  for (const candidate of candidates) {
    const duration =
      toPositiveNumber(candidate);

    if (duration > 0) {
      return Math.round(duration);
    }
  }

  const exerciseCount =
    getWorkoutExerciseCount(workout);

  return exerciseCount > 0
    ? Math.max(
        6,
        exerciseCount * 7
      )
    : 0;
}

function getExerciseText(
  count: number
) {
  return `${count} ${
    count === 1
      ? 'exercício'
      : 'exercícios'
  }`;
}

function getWorkoutUpdatedTime(
  workout: any
) {
  const raw =
    workout?.updated_at ||
    workout?.updatedAt ||
    workout?.created_at ||
    workout?.createdAt ||
    '';

  const time =
    new Date(raw).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function isPublishedWorkout(
  workout: any
) {
  const status = String(
    workout?.status || ''
  ).toLowerCase();

  return (
    status !== 'draft' &&
    status !== 'rascunho' &&
    status !== 'archived' &&
    status !== 'arquivado'
  );
}

async function enrichWorkoutPlans(
  workouts: any[]
) {
  const results =
    await Promise.allSettled(
      workouts.map(
        async (workout) => {
          if (!workout?.id) {
            return workout;
          }

          try {
            const fullWorkout =
              await workoutService
                .getWorkoutPlanById(
                  workout.id
                );

            if (!fullWorkout) {
              return workout;
            }

            return {
              ...workout,
              ...fullWorkout,
              workout_plan_exercises:
                (fullWorkout as any)
                  .workout_plan_exercises ||
                workout
                  .workout_plan_exercises ||
                [],
            };
          } catch (error) {
            console.warn(
              '[StudentHomePage] detalhes do treino:',
              error
            );

            return workout;
          }
        }
      )
    );

  return results.map(
    (result, index) => {
      if (
        result.status === 'fulfilled'
      ) {
        return result.value;
      }

      return workouts[index];
    }
  );
}

function getLogDate(log: any) {
  return (
    log?.date ||
    log?.completed_at ||
    log?.completedAt ||
    log?.created_at ||
    log?.createdAt ||
    ''
  );
}

function calculateCompletedThisWeek(
  logs: any[]
) {
  const now = new Date();
  const start = new Date(now);

  start.setDate(
    now.getDate() - now.getDay()
  );

  start.setHours(0, 0, 0, 0);

  return logs.filter((log) => {
    const date = new Date(
      getLogDate(log)
    );

    return (
      Number.isFinite(
        date.getTime()
      ) && date >= start
    );
  }).length;
}

function calculateStreak(logs: any[]) {
  const dates = [
    ...new Set(
      logs
        .map((log) => {
          const date = new Date(
            getLogDate(log)
          );

          if (
            !Number.isFinite(
              date.getTime()
            )
          ) {
            return '';
          }

          return date
            .toISOString()
            .slice(0, 10);
        })
        .filter(Boolean)
    ),
  ]
    .sort()
    .reverse();

  let count = 0;

  for (
    let index = 0;
    index < dates.length;
    index++
  ) {
    const current = new Date(
      `${dates[index]}T00:00:00`
    );

    const expected = new Date();

    expected.setHours(0, 0, 0, 0);

    expected.setDate(
      expected.getDate() - index
    );

    if (
      current.toDateString() ===
      expected.toDateString()
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function formatShortDate(
  value?: string | null
) {
  if (!value) return 'Hoje';

  const date = new Date(value);

  if (
    !Number.isFinite(date.getTime())
  ) {
    return 'Hoje';
  }

  return date.toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
    }
  );
}

function getNutritionTitle(
  plan: any
) {
  const objective = String(
    plan?.objective || ''
  ).trim();

  if (objective) {
    return objective;
  }

  const name = String(
    plan?.name || ''
  ).trim();

  return (
    name
      .replace(
        /^plano alimentar\s*[-–—]?\s*/i,
        ''
      )
      .trim() || 'Disponível'
  );
}

export function StudentHomePage() {
  const navigate = useNavigate();

  const carouselRef =
    useRef<HTMLDivElement>(null);

  const frameRef =
    useRef<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    activeWorkoutIndex,
    setActiveWorkoutIndex,
  ] = useState(0);

  const [data, setData] =
    useState<StudentHomeState>({
      student: null,
      trainer: null,
      workouts: [],
      workoutLogs: [],
      nutritionPlans: [],
      unreadMessages: 0,
    });

  useEffect(() => {
    void loadHome();

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(
          frameRef.current
        );
      }
    };
  }, []);

  async function loadHome() {
    setLoading(true);
    setError('');

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const authUser = authData.user;

      if (!authUser?.id) {
        throw new Error(
          'Sessão do aluno não encontrada.'
        );
      }

      const accountResult =
        await studentService
          .getStudentAccountByAuthUser(
            authUser.id
          );

      let studentData =
        accountResult?.student || null;

      if (!studentData) {
        studentData =
          await studentService
            .getStudentByAuthUser(
              authUser.id
            );
      }

      if (!studentData?.id) {
        throw new Error(
          'Perfil do aluno não encontrado.'
        );
      }

      const trainerId =
        studentData.trainer_id || null;

      const [
        trainerResponse,
        workoutsResponse,
        logsResponse,
        nutritionResponse,
        unreadResponse,
      ] = await Promise.allSettled([
        trainerId
          ? supabase
              .from(
                'trainer_profiles'
              )
              .select('*')
              .eq('id', trainerId)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        workoutService
          .getWorkoutPlansByStudent(
            studentData.id
          ),

        supabase
          .from('workout_logs')
          .select('*')
          .eq(
            'student_id',
            studentData.id
          )
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('nutrition_plans')
          .select('*')
          .or(
            `student_id.eq.${studentData.id},studentid.eq.${studentData.id}`
          )
          .eq(
            'status',
            'published'
          )
          .order('created_at', {
            ascending: false,
          }),

        trainerId
          ? supabase
              .from('messages')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'trainer_id',
                trainerId
              )
              .eq(
                'student_id',
                studentData.id
              )
              .eq(
                'sender_role',
                'personal'
              )
              .eq('read', false)
          : Promise.resolve({
              count: 0,
              error: null,
            }),
      ]);

      const trainer =
        trainerResponse.status ===
        'fulfilled'
          ? trainerResponse.value
              ?.data || null
          : null;

      const rawWorkouts =
        workoutsResponse.status ===
          'fulfilled' &&
        Array.isArray(
          workoutsResponse.value
        )
          ? workoutsResponse.value.filter(
              isPublishedWorkout
            )
          : [];

      const workouts =
        await enrichWorkoutPlans(
          rawWorkouts
        );

      const workoutLogs =
        logsResponse.status ===
          'fulfilled' &&
        Array.isArray(
          logsResponse.value?.data
        )
          ? logsResponse.value.data
          : [];

      const nutritionPlans =
        nutritionResponse.status ===
          'fulfilled' &&
        Array.isArray(
          nutritionResponse.value
            ?.data
        )
          ? nutritionResponse.value.data
          : [];

      const unreadMessages =
        unreadResponse.status ===
        'fulfilled'
          ? Number(
              (
                unreadResponse.value as any
              )?.count || 0
            )
          : 0;

      setData({
        student: studentData,
        trainer,
        workouts,
        workoutLogs,
        nutritionPlans,
        unreadMessages,
      });

      setActiveWorkoutIndex(0);
    } catch (loadError: any) {
      console.error(
        '[StudentHomePage] load error:',
        loadError
      );

      setError(
        loadError?.message ||
          'Erro ao carregar a Home.'
      );
    } finally {
      setLoading(false);
    }
  }

  const orderedWorkouts =
    useMemo(() => {
      return [...data.workouts].sort(
        (workoutA, workoutB) =>
          getWorkoutUpdatedTime(
            workoutB
          ) -
          getWorkoutUpdatedTime(
            workoutA
          )
      );
    }, [data.workouts]);

  const latestNutrition =
    data.nutritionPlans[0] || null;

  const completedThisWeek =
    useMemo(
      () =>
        calculateCompletedThisWeek(
          data.workoutLogs
        ),
      [data.workoutLogs]
    );

  const streak = useMemo(
    () =>
      calculateStreak(
        data.workoutLogs
      ),
    [data.workoutLogs]
  );

  function handleStartWorkout(
    workout: any
  ) {
    if (workout?.id) {
      navigate(
        `/student/workout-detail/${workout.id}`
      );

      return;
    }

    navigate('/student/workouts');
  }

  function handleCarouselScroll() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(
        frameRef.current
      );
    }

    frameRef.current =
      requestAnimationFrame(() => {
        const carousel =
          carouselRef.current;

        if (!carousel) return;

        const slides = Array.from(
          carousel.children
        ) as HTMLElement[];

        const center =
          carousel.scrollLeft +
          carousel.clientWidth / 2;

        let selectedIndex = 0;
        let selectedDistance =
          Number.POSITIVE_INFINITY;

        slides.forEach(
          (slide, index) => {
            const slideCenter =
              slide.offsetLeft +
              slide.offsetWidth / 2;

            const distance = Math.abs(
              center - slideCenter
            );

            if (
              distance <
              selectedDistance
            ) {
              selectedDistance =
                distance;

              selectedIndex = index;
            }
          }
        );

        setActiveWorkoutIndex(
          selectedIndex
        );
      });
  }

  function scrollToWorkout(
    index: number
  ) {
    const carousel =
      carouselRef.current;

    const slide = carousel?.children[
      index
    ] as HTMLElement | undefined;

    if (!carousel || !slide) return;

    carousel.scrollTo({
      left: slide.offsetLeft,
      behavior: 'smooth',
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#ff2a32]" />
      </div>
    );
  }

  if (error || !data.student) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pt-10 text-white">
        <div className="mx-auto max-w-lg rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />

          <h1 className="mt-4 text-xl font-black">
            Não foi possível carregar
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={loadHome}
            className="mt-5 h-12 w-full rounded-2xl bg-[#ff2a32] font-black"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl =
    getStudentAvatarUrl(data.student);

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <section className="rounded-[32px] border border-white/10 bg-[#0d0d0e] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 font-black text-[#ff2a32]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={getStudentName(
                    data.student
                  )}
                  className="h-full w-full object-cover"
                />
              ) : (
                getStudentInitials(
                  getStudentName(
                    data.student
                  )
                )
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                VSFit Aluno
              </p>

              <h1 className="mt-1 truncate text-[24px] font-black">
                Olá,{' '}
                {getFirstName(
                  data.student
                )}
              </h1>

              <p className="mt-1 truncate text-xs text-zinc-500">
                Personal:{' '}
                {getTrainerName(
                  data.trainer
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <StatCard
              icon={
                <Flame className="h-4 w-4 text-[#ff2a32]" />
              }
              value={streak}
              label="Sequência"
            />

            <StatCard
              icon={
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              }
              value={completedThisWeek}
              label="Semana"
            />

            <StatCard
              icon={
                <Trophy className="h-4 w-4 text-yellow-400" />
              }
              value={
                data.workoutLogs.length
              }
              label="Total"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
          {orderedWorkouts.length > 0 ? (
            <>
              <div
                ref={carouselRef}
                onScroll={
                  handleCarouselScroll
                }
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {orderedWorkouts.map(
                  (workout, index) => {
                    const exerciseCount =
                      getWorkoutExerciseCount(
                        workout
                      );

                    const duration =
                      getWorkoutDuration(
                        workout
                      );

                    return (
                      <article
                        key={
                          workout.id ||
                          index
                        }
                        className="relative min-h-[270px] w-full shrink-0 snap-center overflow-hidden bg-black"
                      >
                        <img
                          src={
                            WORKOUT_CARD_IMAGE
                          }
                          alt=""
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-right"
                        />

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black from-[0%] via-black/95 via-[48%] to-black/5 to-[100%]" />

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                        <div className="relative z-10 flex min-h-[270px] max-w-[72%] flex-col justify-center px-6 py-7">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                            Treino de hoje
                          </p>

                          <h2 className="mt-3 line-clamp-2 text-[23px] font-black leading-tight">
                            {getWorkoutName(
                              workout
                            )}
                          </h2>

                          <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] font-semibold text-zinc-300">
                            <span className="inline-flex items-center gap-2">
                              <Dumbbell className="h-4 w-4" />

                              {getExerciseText(
                                exerciseCount
                              )}
                            </span>

                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />

                              {duration} min
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleStartWorkout(
                                workout
                              )
                            }
                            className="mt-6 flex h-13 w-fit items-center gap-2 rounded-[15px] bg-[#ff2a32] px-6 py-4 text-[12px] font-black uppercase shadow-[0_15px_35px_rgba(255,42,48,0.28)] active:scale-95"
                          >
                            <Play className="h-4 w-4" />

                            Iniciar treino
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              {orderedWorkouts.length >
                1 && (
                <div className="flex h-10 items-center justify-center gap-1.5 bg-black">
                  {orderedWorkouts.map(
                    (workout, index) => (
                      <button
                        key={
                          workout.id ||
                          index
                        }
                        type="button"
                        onClick={() =>
                          scrollToWorkout(
                            index
                          )
                        }
                        className={cn(
                          'h-2 rounded-full transition-all',
                          activeWorkoutIndex ===
                            index
                            ? 'w-6 bg-[#ff2a32]'
                            : 'w-2 bg-white/20'
                        )}
                      />
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-7">
              <p className="text-sm font-black">
                Nenhum treino liberado
              </p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <HomeAction
            icon={
              <Dumbbell className="h-6 w-6 text-[#ff2a32]" />
            }
            title="Treinos"
            description={`${data.workouts.length} liberado(s)`}
            onClick={() =>
              navigate(
                '/student/workouts'
              )
            }
          />

          <HomeAction
            icon={
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            }
            title="Progresso"
            description="Acompanhar evolução"
            onClick={() =>
              navigate(
                '/student/progress'
              )
            }
          />

          <HomeAction
            icon={
              <MessageCircle className="h-6 w-6 text-blue-400" />
            }
            title="Chat"
            description="Falar com personal"
            onClick={() =>
              navigate('/student/chat')
            }
          />

          <HomeAction
            icon={
              <User className="h-6 w-6 text-zinc-300" />
            }
            title="Perfil"
            description="Dados e conta"
            onClick={() =>
              navigate(
                '/student/profile'
              )
            }
          />
        </div>

        <section className="rounded-[28px] border border-white/10 bg-[#0d0d0e] p-5">
          <button
            type="button"
            onClick={() =>
              navigate(
                '/student/nutrition'
              )
            }
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Apple className="h-7 w-7 text-emerald-400" />

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Plano alimentar
                </p>

                <p className="mt-1 truncate font-black">
                  {latestNutrition
                    ? getNutritionTitle(
                        latestNutrition
                      )
                    : 'Nenhum plano publicado'}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {latestNutrition
                    ? `Atualizado em ${formatShortDate(
                        latestNutrition.updated_at ||
                          latestNutrition.created_at
                      )}`
                    : 'Aguardando publicação'}
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-zinc-600" />
          </button>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0d0d0e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Resumo
              </p>

              <h3 className="mt-1 text-lg font-black">
                Sua rotina
              </h3>
            </div>

            <Sparkles className="h-5 w-5 text-[#ff2a32]" />
          </div>

          <div className="space-y-3">
            <SummaryRow
              icon={
                <CalendarDays className="h-5 w-5 text-[#ff2a32]" />
              }
              label="Treinos publicados"
              value={data.workouts.length}
            />

            <SummaryRow
              icon={
                <Activity className="h-5 w-5 text-emerald-400" />
              }
              label="Treinos concluídos"
              value={
                data.workoutLogs.length
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/30 p-3 text-center">
      <div className="flex justify-center">
        {icon}
      </div>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>

      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function HomeAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[26px] border border-white/10 bg-[#0d0d0e] p-5 text-left active:scale-[0.98]"
    >
      {icon}

      <p className="mt-5 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {description}
      </p>
    </button>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/25 p-3">
      <div className="flex items-center gap-3">
        {icon}

        <span className="text-sm font-bold text-zinc-300">
          {label}
        </span>
      </div>

      <span className="font-black">
        {value}
      </span>
    </div>
  );
}

export default StudentHomePage;