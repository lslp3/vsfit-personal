/**
 * Testes da AGREGAÇÃO da Central de Alunos (src/lib/studentAudit.ts).
 *
 * Runner nativo do Node (node:test) — sem dependências externas:
 *   node --test tests/unit/
 *
 * Cobre os 8 casos exigidos na spec da Central:
 *   1. Aluno sem nenhum dado complementar → aparece no mapa.
 *   2. Aluno com treino → lastWorkoutAt preenchido.
 *   3. Aluno sem treino → lastWorkoutAt = null.
 *   4. Aluno sem métrica → lastWeight = null (nunca "0 kg").
 *   5. Aluno sem pagamento → nextDueDate = null.
 *   6. Dados de outro trainer → não aparecem (chaves só do roster).
 *   7. Aluno com auth_user_id = null → continua aparecendo.
 *   8. Aluno com app_access_status = invited/no_access → continua aparecendo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Payment, StudentMetrics, WorkoutLog, WorkoutPlan } from '../../src/types/database.ts';

import { buildStudentAuditMap, type StudentCardAudit } from '../../src/lib/studentAudit.ts';

const NOW = new Date('2026-08-08T12:00:00Z');

/** Registro mínimo de progresso (espelha o fetch do progressService). */
type StudentProgressRecord = { id: string; student_id?: string | null; created_at?: string };

function plan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: 'plan-1',
    student_id: 'student-1',
    trainer_id: 'trainer-1',
    name: 'Treino ABC',
    objective: null,
    level: null,
    duration_minutes: null,
    status: 'published',
    start_date: '2026-07-01',
    end_date: '2026-10-01',
    renewal_status: null,
    renewed_from_plan_id: null,
    renewal_created_at: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

function log(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: 'log-1',
    student_id: 'student-1',
    trainer_id: 'trainer-1',
    workout_plan_id: null,
    started_at: null,
    completed_at: '2026-08-08T09:00:00Z',
    duration_seconds: null,
    status: 'completed',
    exercises_data: [],
    notes: null,
    created_at: '2026-08-08T09:00:00Z',
    ...overrides,
  };
}

function metric(overrides: Partial<StudentMetrics> = {}): StudentMetrics {
  return {
    id: 'metric-1',
    student_id: 'student-1',
    date: '2026-08-01',
    height: null,
    weight: 80,
    body_fat: null,
    target_body_fat: null,
    muscle_mass: null,
    water_intake: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    trainer_id: 'trainer-1',
    student_id: 'student-1',
    student_name: null,
    amount: 150,
    due_date: '2026-08-10',
    paid_at: null,
    status: 'pending',
    method: 'pix',
    description: null,
    pix_key: null,
    pix_code: null,
    receipt_url: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...overrides,
  };
}

function progress(overrides: Partial<StudentProgressRecord> = {}): StudentProgressRecord {
  return {
    id: 'progress-1',
    student_id: 'student-1',
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function build(
  input: {
    studentIds?: string[];
    plans?: WorkoutPlan[];
    logs?: WorkoutLog[];
    metrics?: StudentMetrics[];
    payments?: Payment[];
    progressRecords?: StudentProgressRecord[];
  },
  now: Date = NOW
) {
  return buildStudentAuditMap(
    {
      studentIds: input.studentIds ?? ['student-1'],
      plans: input.plans ?? [],
      logs: input.logs ?? [],
      payments: input.payments ?? [],
      metrics: input.metrics ?? [],
      progressRecords: input.progressRecords ?? [],
    },
    now
  );
}

function auditOf(map: Record<string, StudentCardAudit>, id: string) {
  const entry = map[id];
  assert.ok(entry, `audit do aluno ${id} deve existir no mapa (não sumir)`);
  return entry;
}

/* ── Caso 1: aluno sem NENHUM dado complementar ─────────────────────────── */
test('Caso 1: aluno sem dados complementares continua no mapa com nulos', () => {
  const map = build({ studentIds: ['student-kayara'] });

  const card = auditOf(map, 'student-kayara');

  assert.equal(Object.keys(map).length, 1);
  assert.equal(card.lastWorkoutAt, null);
  assert.equal(card.daysSinceLastWorkout, null);
  assert.equal(card.adherencePercent, null);
  assert.equal(card.lastWeight, null);
  assert.equal(card.weightDelta, null);
  assert.equal(card.lastAssessmentAt, null);
  assert.equal(card.nextDueDate, null);
  assert.equal(card.isOverdue, false);
  assert.equal(card.hasPublishedPlan, false);
  assert.equal(card.activePlanName, null);
  assert.equal(card.workoutPlanCount, 0);
  assert.equal(card.workoutLogCount, 0);
  assert.equal(card.metricCount, 0);
  assert.equal(card.progressCount, 0);
});

/* ── Caso 2: aluno com treino concluído ─────────────────────────────────── */
test('Caso 2: aluno com treino concluído tem lastWorkoutAt e 0 dias', () => {
  const map = build({ logs: [log({ completed_at: '2026-08-08T09:00:00Z' })] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWorkoutAt, '2026-08-08T09:00:00.000Z');
  assert.equal(card.daysSinceLastWorkout, 0);
  assert.equal(card.workoutLogCount, 1);
});

/* ── Caso 3: aluno sem treino ───────────────────────────────────────────── */
test('Caso 3: aluno sem treino tem lastWorkoutAt null', () => {
  const map = build({ studentIds: ['student-1'] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWorkoutAt, null);
  assert.equal(card.daysSinceLastWorkout, null);
});

/* ── Caso 4: aluno sem métrica → peso null (nunca "0 kg") ───────────────── */
test('Caso 4: aluno sem avaliação tem lastWeight null (não 0)', () => {
  const map = build({ studentIds: ['student-1'], metrics: [] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWeight, null);
  assert.equal(card.lastAssessmentAt, null);
});

test('Caso 4b: avaliação com weight null também resulta em lastWeight null', () => {
  const map = build({ metrics: [metric({ weight: null })] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWeight, null);
});

test('Caso 4c: com avaliação, lastWeight usa o peso mais recente', () => {
  const map = build({
    metrics: [
      metric({ id: 'm1', date: '2026-08-01', weight: 80, created_at: '2026-08-01T00:00:00Z' }),
      metric({ id: 'm2', date: '2026-06-01', weight: 85, created_at: '2026-06-01T00:00:00Z' }),
    ],
  });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWeight, 80);
  assert.equal(card.weightDelta, -5);
  assert.equal(card.lastAssessmentAt, '2026-08-01');
});

/* ── Caso 5: aluno sem pagamento ────────────────────────────────────────── */
test('Caso 5: aluno sem pagamento tem nextDueDate null e isOverdue false', () => {
  const map = build({ studentIds: ['student-1'], payments: [] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.nextDueDate, null);
  assert.equal(card.isOverdue, false);
});

test('Caso 5b: próximo vencimento vem do pending/overdue mais próximo', () => {
  const map = build({
    payments: [
      payment({ id: 'p1', due_date: '2026-08-10', status: 'pending' }),
      payment({ id: 'p2', due_date: '2026-08-01', status: 'overdue' }),
    ],
  });

  const card = auditOf(map, 'student-1');

  assert.equal(card.nextDueDate, '2026-08-01');
  assert.equal(card.isOverdue, true);
});

/* ── Caso 6: dados de OUTRO trainer não vazam ───────────────────────────── */
test('Caso 6: registros com student_id fora do roster são ignorados', () => {
  const map = build({
    studentIds: ['student-1'],
    plans: [plan({ student_id: 'student-de-outro-trainer', name: 'Plano Alien' })],
    logs: [log({ student_id: 'student-de-outro-trainer' })],
    metrics: [metric({ student_id: 'student-de-outro-trainer', weight: 99 })],
    payments: [payment({ student_id: 'student-de-outro-trainer' })],
    progressRecords: [progress({ student_id: 'student-de-outro-trainer' })],
  });

  assert.deepEqual(Object.keys(map).sort(), ['student-1']);

  const card = auditOf(map, 'student-1');

  assert.equal(card.workoutPlanCount, 0);
  assert.equal(card.workoutLogCount, 0);
  assert.equal(card.metricCount, 0);
  assert.equal(card.progressCount, 0);
  assert.equal(card.activePlanName, null);
  assert.equal(card.lastWeight, null);
  assert.equal(card.nextDueDate, null);
});

/* ── Caso 7: auth_user_id = null NÃO é requisito ─────────────────────────── */
test('Caso 7: id no roster basta — auth_user_id não participa da agregação', () => {
  // O mapa é chaveado por students.id; auth_user_id é irrelevante aqui.
  const map = build({ studentIds: ['student-leo-santos'] });

  assert.ok(map['student-leo-santos']);
  assert.equal(map['student-leo-santos'].studentId, 'student-leo-santos');
});

/* ── Caso 8: app_access_status não influencia a agregação ────────────────── */
test('Caso 8: alunos invited/no_access continuam no mapa', () => {
  // app_access_status é estado de exibição (nível da página/card), não da
  // agregação — qualquer id do roster sempre gera um card.
  for (const id of ['student-invited', 'student-no-access']) {
    const map = build({ studentIds: [id] });
    assert.ok(map[id], `aluno ${id} deve aparecer`);
  }
});

/* ── Complementos: aderência, plano ativo, fallback started_at, atenção ──── */
test('Aderência: sem logs → null (não inventar 0%)', () => {
  const map = build({ studentIds: ['student-1'] });
  assert.equal(auditOf(map, 'student-1').adherencePercent, null);
});

test('Aderência: logs concluídos recentes → valor entre 1 e 100', () => {
  const map = build({
    logs: [
      log({ id: 'logs-1', completed_at: '2026-08-07T09:00:00Z' }),
      log({ id: 'logs-2', completed_at: '2026-07-31T09:00:00Z' }),
    ],
  });

  const adherence = auditOf(map, 'student-1').adherencePercent;

  assert.ok(adherence !== null && adherence > 0 && adherence <= 100);
});

test('Último treino: fallback para started_at quando não há completed_at', () => {
  const map = build({
    logs: [log({ status: 'completed', completed_at: null, started_at: '2026-08-05T20:00:00Z' })],
  });

  const card = auditOf(map, 'student-1');

  assert.equal(card.lastWorkoutAt, '2026-08-05T20:00:00.000Z');
  assert.equal(card.daysSinceLastWorkout, 2);
});

test('Plano ativo: apenas published no período conta como ativo', () => {
  const map = build({
    plans: [
      plan({ id: 'plano-ativo', name: 'Treino A', created_at: '2026-07-10T00:00:00Z' }),
      plan({ id: 'plano-draft', name: 'Rascunho', status: 'draft', created_at: '2026-08-01T00:00:00Z' }),
      plan({
        id: 'plano-vencido',
        name: 'Vencido',
        status: 'published',
        start_date: '2026-01-01',
        end_date: '2026-02-01',
        created_at: '2026-01-01T00:00:00Z',
      }),
    ],
  });

  const card = auditOf(map, 'student-1');

  assert.equal(card.activePlanName, 'Treino A');
  assert.equal(card.workoutPlanCount, 3);
  assert.equal(card.hasPublishedPlan, true);
});

test('Plano draft não publica: hasPublishedPlan apenas com status published', () => {
  const map = build({ plans: [plan({ status: 'draft', name: 'Rascunho' })] });

  const card = auditOf(map, 'student-1');

  assert.equal(card.hasPublishedPlan, false);
  assert.equal(card.activePlanName, null);
});

test('needsAttention: sem plano, sem treino e sem pagamento → atenção', () => {
  const map = build({ studentIds: ['student-1'] });
  assert.equal(auditOf(map, 'student-1').needsAttention, true);
});

test('needsAttention: aluno com plano ativo e treino recente → false', () => {
  const map = build({
    plans: [plan()],
    logs: [log({ completed_at: '2026-08-08T09:00:00Z' })],
  });

  assert.equal(auditOf(map, 'student-1').needsAttention, false);
});

test('Contagens complementares são agregadas por aluno', () => {
  const map = build({
    studentIds: ['student-1'],
    plans: [plan(), plan({ id: 'plan-2' })],
    logs: [log(), log({ id: 'log-2' })],
    metrics: [metric()],
    progressRecords: [progress()],
  });

  const card = auditOf(map, 'student-1');

  assert.equal(card.workoutPlanCount, 2);
  assert.equal(card.workoutLogCount, 2);
  assert.equal(card.metricCount, 1);
  assert.equal(card.progressCount, 1);
});