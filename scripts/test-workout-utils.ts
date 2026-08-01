/**
 * Testes de verificação da Etapa 2 (workoutMath + workoutLogService).
 * Compilar: npx tsc src/utils/workoutMath.ts src/services/workoutLogService.ts scripts/test-workout-utils.ts \
 *   --outDir /tmp/vsfit-workout-test --module commonjs --moduleResolution node \
 *   --target es2020 --lib es2020,dom --skipLibCheck --esModuleInterop
 * Rodar: node /tmp/vsfit-workout-test/scripts/test-workout-utils.js
 */
import {
  buildExerciseRecord,
  buildWorkoutLogData,
  getExerciseVolume,
  getLogCompletedExercisesCount,
  getLogDurationSeconds,
  getLogExercisesCount,
  getLogTotalSets,
  getLogTotalVolume,
  hasStructuredSets,
  normalizeExercisesData,
  toExerciseSetRecord,
} from '../src/services/workoutLogService';
import {
  calculateCompletedExerciseVolume,
  calculateCompletedPercent,
  calculateProgressPercent,
  calculateSetsVolume,
  calculateTotalVolume,
  formatDuration,
  formatWeight,
  getExerciseSetsCount,
  parseWeightKg,
  safeParseFloat,
  safeParseInt,
} from '../src/utils/workoutMath';
import type { WorkoutLog } from '../src/types/database';
import type {
  CompletedExercise,
  ExerciseSetDraft,
} from '../src/types/workout';

/* Process exit apenas para o script standalone (sem @types/node no projeto). */
declare const process: {
  exit(code?: number): never;
};

let failures = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  label: string
) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);

  if (same) {
    console.log(`  ok: ${label} (${JSON.stringify(actual)})`);
  } else {
    failures += 1;
    console.error(
      `  FAIL: ${label} — esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`
    );
  }
}

console.log('== workoutMath ==');

assertEqual(formatDuration(65), '01:05', 'formatDuration 65s');
assertEqual(formatDuration(0), '00:00', 'formatDuration 0');
assertEqual(formatDuration(-5), '00:00', 'formatDuration negativo');
assertEqual(formatDuration(3661), '61:01', 'formatDuration 3661s');

assertEqual(safeParseInt('4', 1), 4, 'safeParseInt "4"');
assertEqual(safeParseInt('abc', 1), 1, 'safeParseInt inválido');
assertEqual(safeParseFloat('20,5', 0), 20.5, 'safeParseFloat vírgula');
assertEqual(safeParseFloat('20 kg', 0), 20, 'safeParseFloat "20 kg"');
assertEqual(safeParseFloat('—', 0), 0, 'safeParseFloat travessão');
assertEqual(safeParseFloat(null, 0), 0, 'safeParseFloat null');

assertEqual(getExerciseSetsCount({ sets: '4' }), 4, 'sets "4"');
assertEqual(getExerciseSetsCount({ sets: null }), 1, 'sets null');
assertEqual(getExerciseSetsCount({ sets: '0' }), 1, 'sets "0"');
assertEqual(getExerciseSetsCount({ sets: 'abc' }), 1, 'sets inválido');

assertEqual(parseWeightKg('20'), 20, 'parseWeightKg "20"');
assertEqual(parseWeightKg('20,5'), 20.5, 'parseWeightKg "20,5"');
assertEqual(parseWeightKg('20 kg'), 20, 'parseWeightKg "20 kg"');
assertEqual(parseWeightKg('—'), null, 'parseWeightKg travessão');
assertEqual(parseWeightKg(null), null, 'parseWeightKg null');
assertEqual(parseWeightKg(''), null, 'parseWeightKg vazio');

assertEqual(formatWeight(20), '20', 'formatWeight 20');
assertEqual(formatWeight(20.5), '20,5', 'formatWeight 20.5');
assertEqual(formatWeight(null), '', 'formatWeight null');

assertEqual(calculateSetsVolume([
  { setNumber: 1, weightKg: 20, reps: 10, completed: true },
  { setNumber: 2, weightKg: 20, reps: 8, completed: true },
] as ExerciseSetDraft[]), 360, 'calculateSetsVolume 200+160');

const exerciseV1: CompletedExercise = {
  exerciseId: 'ex-1',
  exerciseName: 'Supino',
  setsCompleted: 3,
  repsCompleted: '10',
  weightUsed: '20',
};
assertEqual(
  calculateCompletedExerciseVolume(exerciseV1),
  600,
  'volume v1 (20 x 10 x 3)'
);

const exerciseV2: CompletedExercise = {
  exerciseId: 'ex-1',
  exerciseName: 'Supino',
  setsCompleted: 3,
  repsCompleted: '10',
  weightUsed: '20',
  sets: [
    { setNumber: 1, weightKg: 20, reps: 10, completed: true },
    { setNumber: 2, weightKg: 20, reps: 10, completed: true },
    { setNumber: 3, weightKg: 20, reps: 10, completed: true },
  ],
};
assertEqual(
  calculateCompletedExerciseVolume(exerciseV2),
  600,
  'volume v2 (sets reais)'
);
assertEqual(
  calculateTotalVolume([exerciseV1, exerciseV2]),
  1200,
  'volume total mix v1+v2'
);

assertEqual(
  calculateProgressPercent({
    currentExerciseIndex: 1,
    currentSet: 2,
    totalSets: 4,
    totalExercises: 3,
  }),
  ((1 + 1 / 4) / 3) * 100,
  'progresso série 2/4 no exercício 2 de 3'
);
assertEqual(
  calculateProgressPercent({
    currentExerciseIndex: 0,
    currentSet: 1,
    totalSets: 3,
    totalExercises: 0,
  }),
  0,
  'progresso sem exercícios'
);
assertEqual(
  calculateCompletedPercent({ completedCount: 2, totalExercises: 4 }),
  50,
  'percentual concluído 2/4'
);

console.log('== workoutLogService ==');

const setDraft: ExerciseSetDraft = {
  setNumber: 1,
  weightKg: 20,
  reps: 10,
  completed: true,
  restAfterSeconds: 90,
};
assertEqual(
  toExerciseSetRecord(setDraft),
  {
    set_number: 1,
    weight_kg: 20,
    reps: 10,
    completed: true,
    rest_after_seconds: 90,
  },
  'toExerciseSetRecord com rest'
);
assertEqual(
  toExerciseSetRecord({
    setNumber: 2,
    weightKg: null,
    reps: null,
    completed: true,
  }),
  { set_number: 2, weight_kg: null, reps: null, completed: true },
  'toExerciseSetRecord sem rest'
);

const recordV1 = buildExerciseRecord(exerciseV1, 'seg');
assertEqual(recordV1, {
  exercise_id: 'ex-1',
  exercise_name: 'Supino',
  sets_completed: 3,
  reps_completed: '10',
  weight_used: '20',
  day_key: 'seg',
}, 'buildExerciseRecord v1 (sem sets)');

const recordV2 = buildExerciseRecord(exerciseV2, 'seg');
assertEqual(recordV2.sets_completed, 3, 'v2 agregado sets_completed');
assertEqual(recordV2.reps_completed, '10', 'v2 agregado reps (todas iguais)');
assertEqual(recordV2.weight_used, '20', 'v2 agregado weight');
assertEqual(recordV2.sets?.length, 3, 'v2 sets[] presente');
assertEqual(
  recordV2.sets?.[0],
  { set_number: 1, weight_kg: 20, reps: 10, completed: true },
  'v2 set[0] serializado'
);

const variedExercise: CompletedExercise = {
  exerciseId: 'ex-2',
  exerciseName: 'Rosca',
  setsCompleted: 3,
  repsCompleted: '10',
  weightUsed: '15',
  sets: [
    { setNumber: 1, weightKg: 15, reps: 12, completed: true },
    { setNumber: 2, weightKg: 15, reps: 10, completed: true },
    { setNumber: 3, weightKg: 15, reps: 8, completed: true },
  ],
};
const recordVaried = buildExerciseRecord(variedExercise, 'seg');
assertEqual(
  recordVaried.reps_completed,
  '12, 10, 8',
  'v2 agregado reps variadas'
);
assertEqual(recordVaried.weight_used, '15', 'v2 agregado weight igual');

const logData = buildWorkoutLogData({
  exercises: [exerciseV2, variedExercise],
  dayKey: 'seg',
});
assertEqual(logData.exercises_data.length, 2, 'buildWorkoutLogData count');
assert(
  hasStructuredSets({ exercises_data: logData.exercises_data } as WorkoutLog),
  'hasStructuredSets true para v2'
);

const legacyLog: WorkoutLog = {
  id: 'l1',
  student_id: 's1',
  trainer_id: 't1',
  workout_plan_id: 'p1',
  started_at: null,
  completed_at: null,
  duration_seconds: 1800,
  status: 'completed',
  exercises_data: [
    {
      exercise_name: 'Supino',
      sets_completed: 3,
      reps_completed: '10',
      weight_used: '20',
      day_key: 'seg',
    },
  ],
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
};

assertEqual(
  normalizeExercisesData(null),
  [],
  'normalizeExercisesData null -> []'
);
assertEqual(
  normalizeExercisesData({ exercise_name: 'X' }),
  [],
  'normalizeExercisesData objeto -> []'
);
assertEqual(
  normalizeExercisesData(legacyLog.exercises_data).length,
  1,
  'normalizeExercisesData v1'
);
assertEqual(
  normalizeExercisesData([{ foo: 1 }, ...legacyLog.exercises_data]).length,
  1,
  'normalizeExercisesData filtra itens sem exercise_name'
);

assertEqual(getLogExercisesCount(legacyLog), 1, 'getLogExercisesCount v1');
assertEqual(getLogCompletedExercisesCount(legacyLog), 1, 'completed count v1');
assertEqual(getLogTotalSets(legacyLog), 3, 'getLogTotalSets v1');
assertEqual(getLogTotalVolume(legacyLog), 600, 'getLogTotalVolume v1');
assertEqual(getLogDurationSeconds(legacyLog), 1800, 'duration v1');
assert(
  !hasStructuredSets(legacyLog),
  'hasStructuredSets false para v1'
);

const v2Log: WorkoutLog = {
  ...legacyLog,
  exercises_data: logData.exercises_data,
};
assertEqual(getLogTotalSets(v2Log), 6, 'getLogTotalSets v2');
assertEqual(
  getLogTotalVolume(v2Log),
  600 + 15 * (12 + 10 + 8),
  'getLogTotalVolume v2 (usa sets[])'
);
assertEqual(
  getExerciseVolume(logData.exercises_data[0]),
  600,
  'getExerciseVolume v2 (supino 3x20x10)'
);
assert(
  hasStructuredSets(v2Log),
  'hasStructuredSets true v2'
);

console.log('');
if (failures === 0) {
  console.log(`RESULTADO: ${failures} falhas — TODOS OS TESTES PASSARAM`);
  process.exit(0);
} else {
  console.error(`RESULTADO: ${failures} falha(s)`);
  process.exit(1);
}
