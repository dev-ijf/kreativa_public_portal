import { sql } from '@/lib/db/client';
import type { PortalWeekConfig } from '@/lib/portal/weekly-plan-types';

/**
 * Normalize a Postgres DATE to YYYY-MM-DD calendar text.
 * Prefer SQL `date_col::text` so drivers never shift by timezone.
 */
export function normalizeWeekDate(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return calendarDateInJakarta(new Date(parsed));
    }
    return trimmed.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDateInJakarta(value);
  }
  return String(value ?? '').slice(0, 10);
}

/** Civil date in Asia/Jakarta (UTC+7, no DST). */
function calendarDateInJakarta(dt: Date): string {
  const shifted = new Date(dt.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapWeekRow(r: Record<string, unknown>): PortalWeekConfig {
  return {
    id: Number(r.id),
    weekNumber: Number(r.weekNumber),
    weekLabel: (r.weekLabel as string | null) ?? null,
    dateFrom: normalizeWeekDate(r.dateFrom),
    dateTo: normalizeWeekDate(r.dateTo),
  };
}

/** Current (or nearest) active week for school + academic year. */
export async function resolveCurrentWeekConfig(
  schoolId: number,
  academicYearId: number,
): Promise<PortalWeekConfig | null> {
  const rows = await sql`
    SELECT
      id,
      week_number AS "weekNumber",
      week_label AS "weekLabel",
      date_from::text AS "dateFrom",
      date_to::text AS "dateTo"
    FROM wl_week_configs
    WHERE school_id = ${schoolId}
      AND academic_year_id = ${academicYearId}
      AND is_active = true
    ORDER BY
      CASE
        WHEN date_from <= CURRENT_DATE AND date_to >= CURRENT_DATE THEN 0
        WHEN date_from > CURRENT_DATE THEN 1
        ELSE 2
      END,
      CASE WHEN date_from > CURRENT_DATE THEN date_from END ASC NULLS LAST,
      CASE WHEN date_to < CURRENT_DATE THEN date_to END DESC NULLS LAST
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? mapWeekRow(r) : null;
}

export async function getWeekConfigById(
  weekConfigId: number,
): Promise<PortalWeekConfig | null> {
  const rows = await sql`
    SELECT
      id,
      week_number AS "weekNumber",
      week_label AS "weekLabel",
      date_from::text AS "dateFrom",
      date_to::text AS "dateTo"
    FROM wl_week_configs
    WHERE id = ${weekConfigId}
      AND is_active = true
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? mapWeekRow(r) : null;
}

export type WeekDirection = 'prev' | 'next';

/** Previous or next active week in the same school + academic year (by date_from). */
export async function resolveAdjacentWeekConfig(
  schoolId: number,
  academicYearId: number,
  weekConfigId: number,
  direction: WeekDirection,
): Promise<PortalWeekConfig | null> {
  const current = await sql`
    SELECT date_from::text AS "dateFrom"
    FROM wl_week_configs
    WHERE id = ${weekConfigId}
      AND school_id = ${schoolId}
      AND academic_year_id = ${academicYearId}
      AND is_active = true
    LIMIT 1
  `;
  const cur = current[0] as { dateFrom?: string } | undefined;
  if (!cur?.dateFrom) return null;
  const dateFrom = normalizeWeekDate(cur.dateFrom);

  const rows =
    direction === 'prev'
      ? await sql`
          SELECT
            id,
            week_number AS "weekNumber",
            week_label AS "weekLabel",
            date_from::text AS "dateFrom",
            date_to::text AS "dateTo"
          FROM wl_week_configs
          WHERE school_id = ${schoolId}
            AND academic_year_id = ${academicYearId}
            AND is_active = true
            AND date_from < ${dateFrom}::date
          ORDER BY date_from DESC
          LIMIT 1
        `
      : await sql`
          SELECT
            id,
            week_number AS "weekNumber",
            week_label AS "weekLabel",
            date_from::text AS "dateFrom",
            date_to::text AS "dateTo"
          FROM wl_week_configs
          WHERE school_id = ${schoolId}
            AND academic_year_id = ${academicYearId}
            AND is_active = true
            AND date_from > ${dateFrom}::date
          ORDER BY date_from ASC
          LIMIT 1
        `;

  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? mapWeekRow(r) : null;
}

export async function getWeekAdjacency(
  schoolId: number,
  academicYearId: number,
  weekConfigId: number,
): Promise<{ hasPrevWeek: boolean; hasNextWeek: boolean }> {
  const rows = await sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM wl_week_configs w2
        WHERE w2.school_id = w.school_id
          AND w2.academic_year_id = w.academic_year_id
          AND w2.is_active = true
          AND w2.date_from < w.date_from
      ) AS "hasPrevWeek",
      EXISTS (
        SELECT 1
        FROM wl_week_configs w2
        WHERE w2.school_id = w.school_id
          AND w2.academic_year_id = w.academic_year_id
          AND w2.is_active = true
          AND w2.date_from > w.date_from
      ) AS "hasNextWeek"
    FROM wl_week_configs w
    WHERE w.id = ${weekConfigId}
      AND w.school_id = ${schoolId}
      AND w.academic_year_id = ${academicYearId}
      AND w.is_active = true
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  return {
    hasPrevWeek: Boolean(r?.hasPrevWeek),
    hasNextWeek: Boolean(r?.hasNextWeek),
  };
}
