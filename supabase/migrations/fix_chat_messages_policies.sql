-- Fix chat_messages policies to support both student_id (uuid) and studentid (text)
DROP POLICY IF EXISTS chat_messages_student_all_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_trainer_all ON public.chat_messages;

-- Policy for students: can access all chat messages where they are the student
CREATE POLICY chat_messages_student_all_own ON public.chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = chat_messages.student_id OR s.id::text = chat_messages.studentid)
              AND s.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = chat_messages.student_id OR s.id::text = chat_messages.studentid)
              AND s.auth_user_id = auth.uid()
        )
    );

-- Policy for trainers: can access all chat messages where they are the trainer of the student
CREATE POLICY chat_messages_trainer_all ON public.chat_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = chat_messages.student_id OR s.id::text = chat_messages.studentid)
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE (s.id = chat_messages.student_id OR s.id::text = chat_messages.studentid)
              AND (s.trainer_id = auth.uid() OR is_admin())
        )
    );