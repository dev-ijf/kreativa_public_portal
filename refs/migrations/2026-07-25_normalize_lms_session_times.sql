-- Normalize overlapping LMS session times (seed used 08:00–08:45 for every subject).
-- Rules:
-- 1) Per class + date, order courses, then sessions within each course (P1 then P2).
-- 2) Assign sequential 45-min slots from 07:30 with 5-min gaps (no same-time clashes).
-- 3) period_number becomes the daily slot index (1-based).

WITH session_order AS (
  SELECT
    s.id,
    c.class_id,
    s.session_date,
    s.course_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.class_id, s.session_date, s.course_id
      ORDER BY
        CASE WHEN s.title ILIKE '%(P2)%' THEN 1 ELSE 0 END,
        s.id
    ) AS within_course,
    MIN(s.id) OVER (
      PARTITION BY c.class_id, s.session_date, s.course_id
    ) AS course_first_id
  FROM lms_sessions s
  JOIN lms_courses c ON c.id = s.course_id
  WHERE c.deleted_at IS NULL
),
ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY class_id, session_date
      ORDER BY course_first_id, within_course, id
    ) AS slot
  FROM session_order
),
slots AS (
  SELECT
    id,
    slot,
    (TIME '07:30' + ((slot - 1) * INTERVAL '50 minutes'))::time AS new_start,
    (TIME '07:30' + ((slot - 1) * INTERVAL '50 minutes') + INTERVAL '45 minutes')::time AS new_end
  FROM ranked
)
UPDATE lms_sessions s
SET
  start_time = slots.new_start,
  end_time = slots.new_end,
  period_number = slots.slot,
  updated_at = NOW()
FROM slots
WHERE s.id = slots.id
  AND (
    s.start_time IS DISTINCT FROM slots.new_start
    OR s.end_time IS DISTINCT FROM slots.new_end
    OR s.period_number IS DISTINCT FROM slots.slot
  );
