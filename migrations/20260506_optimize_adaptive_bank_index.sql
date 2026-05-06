-- Composite index for the IRT question selection query:
-- WHERE subject_id = ? AND grade_band = ? AND is_approved = true
-- This covers the filter columns and allows index-only scan for filtering.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_bank_subj_grade_approved
  ON public.academic_adaptive_questions_bank (subject_id, grade_band)
  WHERE is_approved = true;

-- Index for lifetime correct IDs lookup (used in start session)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_q_student_subject_bank
  ON public.academic_adaptive_questions (subject_id, bank_question_id)
  WHERE bank_question_id IS NOT NULL;
