/**
 * Helpers compartilhados de identidade (nome/avatar) de aluno e personal.
 * Consolidado na Sprint 10.1 — antes duplicados em StudentChatPage.tsx
 * e StudentNotificationsPage.tsx.
 *
 * Fonte canônica dos mapeamentos: src/pages/student/StudentChatPage.tsx
 * (getStudentAvatarUrl / getTrainerAvatarUrl / getStudentName / getTrainerName).
 */

export function getStudentAvatarUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    null
  );
}

export function getTrainerAvatarUrl(trainer: any) {
  return (
    trainer?.avatar_url ||
    trainer?.photo_url ||
    trainer?.profile_photo_url ||
    trainer?.image_url ||
    trainer?.avatar ||
    null
  );
}

export function getStudentName(student: any) {
  return student?.name || student?.full_name || student?.email || 'Aluno';
}

export function getTrainerName(trainer: any) {
  return trainer?.name || trainer?.full_name || trainer?.email || 'Personal';
}
