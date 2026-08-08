# delete-student — Exclusão segura de aluno (VSFit Personal)

Função da Edge alguma gateway de exclusão de aluno. É o **único** ponto do
sistema capaz de remover um aluno — o frontend **nunca** executa `DELETE` em
`students` (não há código de deleção no cliente e as políticas RLS não são
usadas para isso).

---

## Como funciona

```
Personal (app)                                Supabase
─────────────────────────────────────────────────────────────────────
Perfil do aluno
  → modal "Excluir aluno?" (com loading)
  → POST /functions/v1/delete-student
       body: { "studentId": "uuid" }
                         │
      1. valida JWT do personal (auth.admin.getUser)
      2. resolve o trainer (trainer_profiles por id/email)
      3. busca o aluno + snapshot (students + student_accounts)
      4. valida ownership: students.trainer_id === trainer
                         │
      5. FASE A  → RPC public.delete_student_data(student_uuid, trainer_uuid)
                   (SECURITY DEFINER, transação única — rollback total em erro)
                   apaga TODAS as tabelas relacionadas, students por ÚLTIMO
                         │
      6. FASE B  → para cada auth id (deduplicados):
                   admin.auth.admin.deleteUser(id)   ← DEPOIS do commit
                         │
  ← 200 { success, studentId, databaseDeleted, authDeleted, authCleanupError? }
```

## Por que o frontend não faz DELETE direto?

1. **Ownership não pode ser confiada ao client** — o JWT do aluno/cliente pode
   forjar scopes sob RLS mal-configurada; a validação aqui é feita duas vezes
   (Edge Function **e** RPC).
2. **Atomicidade** — a purga de ~28 tabelas precisa ser UMA transação. DELETE
   multiple do client (REST) é N+1 requisições sem rollback.
3. **Auth** — remover `auth.users` exige privilégio de admin nunca exposto ao
   client (a chave `service_role` só existe no ambiente da Edge Function).

## Ordem de exclusão (espelhada na RPC `delete_student_data`)

Filhos antes de pais; `students` por último:

1. `workout_plan_exercises` → 2. `workout_exercise_groups` → 3. `workout_days`
   (por `workout_plan_id` dos planos do aluno)
4. `workout_plans` → 5. `workout_logs`
6. `student_progress_photos` → 7. `progress_photos` → 8. `student_progress` → 9. `student_metrics`
10. `student_goals` → 11. `student_milestones` → 12. `student_achievements`
13. `student_statistics` → 14. `progress_activities` → 15. `water_tracking`
16. `body_measurements` → 17. `historical_metrics` → 18. `student_history` (student_id TEXT)
19. `student_payments` (student_id TEXT) → 20. `payments` → 20b. `invoices`
21. `nutrition_plans` → 22. `messages` → 23. `chat_messages` (legado)
24. `appointments` → 25. `app_presence` → 26. `student_access_invites`
27. `student_accounts` → **28. `students`**

Cada passo só executa se a tabela E a coluna existirem no schema real
(`to_regclass` + `information_schema.columns`) — nada de inventar tabela.
Tabelas legadas com `student_id TEXT` comparamm via cast para texto.

## Auth — duas estruturas, tratadas como uma

`students.auth_user_id` (legado) e `student_accounts.auth_user_id` (atual)
podem ser iguais, diferentes, nulos ou só um preenchido. O snapshot lê os dois
e **deduplica** (Set): nunca se exclui o mesmo `auth.users` duas vezes.
A exclusão de Auth ocorre SOMENTE depois do commit do banco (Fase B) — ela não
participa da transação SQL. Se falhar: **não** restauramos o aluno (o banco já
está limpo); o erro é registrado como `authCleanupError` e o retorno é
determinístico (`databaseDeleted: true, authDeleted: false`). Se o Auth user já
não existir, a remoção é considerada concluída.

## Idempotência

- `studentId` inexistente/já removido → **404 consistente**, nada é alterado
  (a RPC aborta com `RAISE` antes de qualquer DELETE).
- `delete_student_data` é `CREATE OR REPLACE` — aplicar a migration de novo é
  inócuo.
- remoção de Auth com "user not found" → considerada concluída.

## Ownership

- **Edge Function**: JWT verificado com `admin.auth.getUser`; o trainer é
  resolvido em `trainer_profiles` (id → email) e precisa existir.
- **RPC (SECURITY DEFINER)**: re-verifica `students.trainer_id =
  p_trainer_uuid` e aborta com exceção caso falhe → garante que nem um chamador
  `service_role` externo consiga purgar aluno de outro trainer.
- `EXECUTE` da RPC está revogado de `PUBLIC`/`anon`/`authenticated` — só
  `service_role` pode invocar. (Sem bypass pela app.)

## Como implantar

1. Aplicar `supabase/migrations/20260808000000_delete_student_purge.sql`
   no SQL Editor (manual — nunca automatizado).
2. Deploy da função:
   `supabase functions deploy delete-student` (segredo padrão:
   `SUPABASE_SERVICE_ROLE_KEY` já injetado pelo runtime).

## Testes

`npm test` → `tests/unit/deleteStudentFlow.test.ts` (lógica pura, zero deps)
cobre: 401/403/404, ownership, dedup Auth, purga atômica, Auth parcial
(`databaseDeleted=true / authDeleted=false`), idempotência e proteção de UI.