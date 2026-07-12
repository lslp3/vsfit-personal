-- =============================================
-- REVISÃO DE SEGURANÇA: STORAGE BUCKETS POLICIES
-- Remove políticas públicas e genéricas inseguras e estabelece regras restritas
-- =============================================

-- =============================================
-- 1. BUCKET: coach-avatars (Público)
-- =============================================
DROP POLICY IF EXISTS "Public can view coach avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload coach avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update coach avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete coach avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "coach_avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "coach_avatars_owner_all" ON storage.objects;

-- SELECT público para visualizar avatars
CREATE POLICY "coach_avatars_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'coach-avatars');

-- INSERT/UPDATE/DELETE apenas para o treinador autenticado dono da pasta ou admin
CREATE POLICY "coach_avatars_owner_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'coach-avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'coach-avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));


-- =============================================
-- 2. BUCKET: trainer-avatars (Público)
-- =============================================
DROP POLICY IF EXISTS "Trainers can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view trainer avatars" ON storage.objects;
DROP POLICY IF EXISTS "trainer_avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "trainer_avatars_owner_all" ON storage.objects;

-- SELECT público para visualizar avatars dos treinadores
CREATE POLICY "trainer_avatars_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'trainer-avatars');

-- ALL apenas para o treinador autenticado dono da pasta ou admin
CREATE POLICY "trainer_avatars_owner_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'trainer-avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'trainer-avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));


-- =============================================
-- 3. BUCKET: avatars (Público - Alunos)
-- =============================================
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are manageable by owner" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "avatars_manage_authorized" ON storage.objects;

-- SELECT público para visualizar avatares de alunos
CREATE POLICY "avatars_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

-- ALL restrito ao próprio aluno, seu treinador responsável, ou admin (caminho: students/{student_id}/...)
CREATE POLICY "avatars_manage_authorized" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = 'students' 
        AND (
            EXISTS (
                SELECT 1 FROM public.students s 
                WHERE s.id::text = (storage.foldername(name))[2] 
                  AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
            )
            OR public.is_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = 'students' 
        AND (
            EXISTS (
                SELECT 1 FROM public.students s 
                WHERE s.id::text = (storage.foldername(name))[2] 
                  AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
            )
            OR public.is_admin()
        )
    );


-- =============================================
-- 4. BUCKET: exercicios (Público - Catálogo de Exercícios)
-- =============================================
DROP POLICY IF EXISTS "exercicios_public_select" ON storage.objects;
DROP POLICY IF EXISTS "exercicios_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "exercicios_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "exercicios_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "exercicios_select_public" ON storage.objects;
DROP POLICY IF EXISTS "exercicios_write_admin" ON storage.objects;

-- SELECT público para visualizar o catálogo
CREATE POLICY "exercicios_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'exercicios');

-- INSERT/UPDATE/DELETE estritamente restrito a administradores
CREATE POLICY "exercicios_write_admin" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'exercicios' AND public.is_admin())
    WITH CHECK (bucket_id = 'exercicios' AND public.is_admin());


-- =============================================
-- 5. BUCKETS: exercise-videos & exercise-thumbnails (Privado/Autenticado)
-- =============================================
DROP POLICY IF EXISTS "Exercise media is viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Exercise media is manageable by trainers" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "exercise_media_manage_trainer" ON storage.objects;

-- SELECT permitido para qualquer usuário autenticado
CREATE POLICY "exercise_media_select_authenticated" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id IN ('exercise-videos', 'exercise-thumbnails'));

-- ALL permitido apenas para treinadores (role = personal) ou administradores
CREATE POLICY "exercise_media_manage_trainer" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id IN ('exercise-videos', 'exercise-thumbnails') 
        AND (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.id = auth.uid() 
                  AND (up.role = 'personal' OR up.role = 'admin')
            )
            OR public.is_admin()
        )
    )
    WITH CHECK (
        bucket_id IN ('exercise-videos', 'exercise-thumbnails') 
        AND (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.id = auth.uid() 
                  AND (up.role = 'personal' OR up.role = 'admin')
            )
            OR public.is_admin()
        )
    );


-- =============================================
-- 6. BUCKET: documents (Privado)
-- =============================================
DROP POLICY IF EXISTS "VSFit users can upload cref documents" ON storage.objects;
DROP POLICY IF EXISTS "VSFit users can read own cref documents" ON storage.objects;
DROP POLICY IF EXISTS "VSFit users can update own cref documents" ON storage.objects;
DROP POLICY IF EXISTS "VSFit users can delete own cref documents" ON storage.objects;
DROP POLICY IF EXISTS "Documents manageable by owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_owner_all" ON storage.objects;

-- ALL apenas para o proprietário da pasta ou admin
CREATE POLICY "documents_owner_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));


-- =============================================
-- 7. BUCKET: progress-photos (Privado)
-- =============================================
DROP POLICY IF EXISTS "Photos are manageable by owner" ON storage.objects;
DROP POLICY IF EXISTS "progress_photos_manage_authorized" ON storage.objects;

-- ALL permitido para o próprio aluno, seu treinador vinculado, ou admins
CREATE POLICY "progress_photos_manage_authorized" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'progress-photos'
        AND (
            -- 1: Pasta raiz é o UUID do próprio usuário
            auth.uid()::text = (storage.foldername(name))[1]
            -- 2: Pasta raiz é 'students' e a segunda pasta é o student_id vinculado
            OR (
                (storage.foldername(name))[1] = 'students'
                AND EXISTS (
                    SELECT 1 FROM public.students s 
                    WHERE s.id::text = (storage.foldername(name))[2] 
                      AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
                )
            )
            -- 3: Pasta raiz é o student_id direto
            OR EXISTS (
                SELECT 1 FROM public.students s 
                WHERE s.id::text = (storage.foldername(name))[1] 
                  AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
            )
            OR public.is_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'progress-photos'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR (
                (storage.foldername(name))[1] = 'students'
                AND EXISTS (
                    SELECT 1 FROM public.students s 
                    WHERE s.id::text = (storage.foldername(name))[2] 
                      AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
                )
            )
            OR EXISTS (
                SELECT 1 FROM public.students s 
                WHERE s.id::text = (storage.foldername(name))[1] 
                  AND (s.auth_user_id = auth.uid() OR s.trainer_id = auth.uid())
            )
            OR public.is_admin()
        )
    );


-- =============================================
-- 8. BUCKET: chat-files (Privado)
-- =============================================
DROP POLICY IF EXISTS "chat_files_owner_all" ON storage.objects;

-- ALL apenas para o proprietário da pasta ou admin
CREATE POLICY "chat_files_owner_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'chat-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'chat-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));


-- =============================================
-- 9. BUCKET: evolution (Público)
-- =============================================
DROP POLICY IF EXISTS "evolution_select_public" ON storage.objects;
DROP POLICY IF EXISTS "evolution_owner_all" ON storage.objects;

-- SELECT público para visualizar imagens
CREATE POLICY "evolution_select_public" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'evolution');

-- ALL apenas para o proprietário da pasta ou admin
CREATE POLICY "evolution_owner_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'evolution' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'evolution' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));
