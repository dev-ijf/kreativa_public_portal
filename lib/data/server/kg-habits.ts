import { sql } from '@/lib/db/client';
import { isStudentVisibleToViewer } from '@/lib/data/server/attendance';
import {
  buildHabitTree,
  emptyItems,
  isTopLevelHabitDone,
  isValidISODate,
  toggleableCodes,
  type KgHabitDayResponse,
  type KgHabitDefinition,
  type KgHabitMonthStat,
  type KgHabitTreeItem,
} from '@/lib/portal/kg-habits-shared';

function toBool(v: unknown): boolean {
  if (v === true || v === false) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 't' || s === 'true' || s === '1';
  }
  return Boolean(v);
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function mapDefinition(r: Record<string, unknown>): KgHabitDefinition {
  return {
    id: Number(r.id),
    code: String(r.code),
    parentCode: r.parent_code == null ? null : String(r.parent_code),
    nameEn: String(r.name_en ?? ''),
    nameId: String(r.name_id ?? ''),
    descriptionEn: r.description_en == null ? null : String(r.description_en),
    descriptionId: r.description_id == null ? null : String(r.description_id),
    sortOrder: Number(r.sort_order ?? 0),
    accentColor: r.accent_color == null ? null : String(r.accent_color),
    bgColor: r.bg_color == null ? null : String(r.bg_color),
    iconKey: r.icon_key == null ? null : String(r.icon_key),
  };
}

export async function getKgHabitDefinitions(): Promise<KgHabitDefinition[]> {
  const rows = await sql`
    SELECT id, code, parent_code, name_en, name_id, description_en, description_id,
           sort_order, accent_color, bg_color, icon_key
    FROM kg_habit_definitions
    WHERE is_active = true
    ORDER BY sort_order ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapDefinition);
}

export async function getKgHabitTree(): Promise<KgHabitTreeItem[]> {
  return buildHabitTree(await getKgHabitDefinitions());
}

export type GetKgHabitDayResult =
  | { ok: true; day: KgHabitDayResponse; tree: KgHabitTreeItem[] }
  | { ok: false; reason: 'forbidden' | 'bad_date' };

export async function getKgHabitDay(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  habitDate: string,
): Promise<GetKgHabitDayResult> {
  if (!isValidISODate(habitDate)) return { ok: false, reason: 'bad_date' };
  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const tree = await getKgHabitTree();
  const dayRows = await sql`
    SELECT
      id,
      habit_date::text AS habit_date,
      notes,
      logged_by_user_id,
      teacher_confirmed_at,
      teacher_confirmed_by
    FROM kg_habit_days
    WHERE student_id = ${studentId}
      AND habit_date = ${habitDate}::date
    LIMIT 1
  `;

  if (dayRows.length === 0) {
    return {
      ok: true,
      tree,
      day: {
        habitDate,
        notes: '',
        items: emptyItems(tree),
        teacherConfirmed: false,
        teacherConfirmedAt: null,
        loggedByUserId: null,
      },
    };
  }

  const day = dayRows[0] as Record<string, unknown>;
  const dayId = Number(day.id);
  const itemRows = await sql`
    SELECT d.code, i.is_done
    FROM kg_habit_day_items i
    JOIN kg_habit_definitions d ON d.id = i.definition_id
    WHERE i.habit_day_id = ${dayId}
  `;

  const items = emptyItems(tree);
  for (const raw of itemRows as Record<string, unknown>[]) {
    const code = String(raw.code);
    if (code in items) items[code] = toBool(raw.is_done);
  }

  const confirmedAt = day.teacher_confirmed_at;
  return {
    ok: true,
    tree,
    day: {
      habitDate: normalizeDate(day.habit_date),
      notes: typeof day.notes === 'string' ? day.notes : '',
      items,
      teacherConfirmed: confirmedAt != null,
      teacherConfirmedAt:
        confirmedAt instanceof Date
          ? confirmedAt.toISOString()
          : confirmedAt == null
            ? null
            : String(confirmedAt),
      loggedByUserId: day.logged_by_user_id == null ? null : Number(day.logged_by_user_id),
    },
  };
}

export type UpsertKgHabitResult =
  | { ok: true; day: KgHabitDayResponse; tree: KgHabitTreeItem[] }
  | { ok: false; reason: 'forbidden' | 'future_date' | 'bad_request' };

export async function upsertKgHabitDay(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  habitDate: string,
  items: Record<string, boolean>,
  notes: string,
): Promise<UpsertKgHabitResult> {
  if (!isValidISODate(habitDate)) return { ok: false, reason: 'bad_request' };
  const ok = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!ok) return { ok: false, reason: 'forbidden' };

  const futureCheck = await sql`SELECT (${habitDate}::date <= CURRENT_DATE) AS ok`;
  if (!(futureCheck[0] as { ok?: boolean })?.ok) {
    return { ok: false, reason: 'future_date' };
  }

  const tree = await getKgHabitTree();
  const allowed = new Set(toggleableCodes(tree));
  const cleanItems: Record<string, boolean> = {};
  for (const code of allowed) {
    cleanItems[code] = items[code] === true;
  }

  const noteText = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';

  const upserted = await sql`
    INSERT INTO kg_habit_days (student_id, habit_date, notes, logged_by_user_id, updated_at)
    VALUES (${studentId}, ${habitDate}::date, ${noteText || null}, ${viewerUserId}, now())
    ON CONFLICT (student_id, habit_date) DO UPDATE
      SET notes = EXCLUDED.notes,
          logged_by_user_id = EXCLUDED.logged_by_user_id,
          teacher_confirmed_at = NULL,
          teacher_confirmed_by = NULL,
          updated_at = now()
    RETURNING
      id,
      habit_date::text AS habit_date,
      notes,
      logged_by_user_id,
      teacher_confirmed_at
  `;

  const dayRow = upserted[0] as Record<string, unknown>;
  const dayId = Number(dayRow.id);

  const defs = await getKgHabitDefinitions();
  const byCode = new Map(defs.map((d) => [d.code, d.id]));

  for (const code of allowed) {
    const defId = byCode.get(code);
    if (defId == null) continue;
    const isDone = cleanItems[code] === true;
    await sql`
      INSERT INTO kg_habit_day_items (habit_day_id, definition_id, is_done)
      VALUES (${dayId}, ${defId}, ${isDone})
      ON CONFLICT (habit_day_id, definition_id) DO UPDATE
        SET is_done = EXCLUDED.is_done
    `;
  }

  return {
    ok: true,
    tree,
    day: {
      habitDate: normalizeDate(dayRow.habit_date),
      notes: typeof dayRow.notes === 'string' ? dayRow.notes : '',
      items: cleanItems,
      teacherConfirmed: false,
      teacherConfirmedAt: null,
      loggedByUserId: dayRow.logged_by_user_id == null ? null : Number(dayRow.logged_by_user_id),
    },
  };
}

export type GetKgHabitMonthResult =
  | { ok: true; year: number; month: number; daysInMonth: number; stats: KgHabitMonthStat[]; tree: KgHabitTreeItem[] }
  | { ok: false; reason: 'forbidden' | 'bad_request' };

export async function getKgHabitMonthSummary(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
  year: number,
  month: number,
): Promise<GetKgHabitMonthResult> {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return { ok: false, reason: 'bad_request' };
  }
  const visible = await isStudentVisibleToViewer(viewerUserId, viewerRole, studentId);
  if (!visible) return { ok: false, reason: 'forbidden' };

  const tree = await getKgHabitTree();
  const daysInMonth = new Date(year, month, 0).getDate();
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const toExclusiveMonth = month === 12 ? 1 : month + 1;
  const toExclusiveYear = month === 12 ? year + 1 : year;
  const toExclusive = `${toExclusiveYear}-${String(toExclusiveMonth).padStart(2, '0')}-01`;

  const rows = await sql`
    SELECT
      d.habit_date::text AS habit_date,
      def.code,
      def.parent_code,
      i.is_done
    FROM kg_habit_days d
    JOIN kg_habit_day_items i ON i.habit_day_id = d.id
    JOIN kg_habit_definitions def ON def.id = i.definition_id
    WHERE d.student_id = ${studentId}
      AND d.habit_date >= ${from}::date
      AND d.habit_date < ${toExclusive}::date
  `;

  // date -> code -> done
  const byDate = new Map<string, Record<string, boolean>>();
  for (const raw of rows as Record<string, unknown>[]) {
    const date = normalizeDate(raw.habit_date);
    const code = String(raw.code);
    if (!byDate.has(date)) byDate.set(date, {});
    byDate.get(date)![code] = toBool(raw.is_done);
  }

  const counts: Record<string, number> = {};
  for (const h of tree) counts[h.code] = 0;

  for (const items of byDate.values()) {
    for (const h of tree) {
      if (isTopLevelHabitDone(h, items)) counts[h.code] = (counts[h.code] ?? 0) + 1;
    }
  }

  const stats: KgHabitMonthStat[] = tree.map((h) => ({
    code: h.code,
    daysDone: counts[h.code] ?? 0,
    daysInMonth,
  }));

  return { ok: true, year, month, daysInMonth, stats, tree };
}
