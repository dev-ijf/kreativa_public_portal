-- Period (haid) excuse flag for habit / secondary daily scoring.
-- Female students (core_students.gender = 'P') may mark a day as on period;
-- prayer/ibadah items that day are excluded from score denominators.

ALTER TABLE public.dr_daily_reports
  ADD COLUMN IF NOT EXISTS is_on_period boolean NOT NULL DEFAULT false;

ALTER TABLE public.academic_habits
  ADD COLUMN IF NOT EXISTS is_on_period boolean NOT NULL DEFAULT false;
