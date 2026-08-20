import { sql } from '@/lib/db/client';
import {
  PORTAL_ANNOUNCEMENTS_SCHOOL_LIMIT,
  PORTAL_ANNOUNCEMENTS_TTL_SEC,
  portalAnnouncementItemKey,
  portalAnnouncementsSchoolKey,
} from '@/lib/cache/portal-announcements';
import { cacheGetJson, cacheSetJsonTtl } from '@/lib/cache/upstash-redis';
import { getPortalChildren } from '@/lib/data/server/children';

export type PortalAnnouncementRow = {
  id: string;
  schoolId: number;
  publishDate: string;
  titleEn: string;
  titleId: string;
  contentEn: string;
  contentId: string;
  featuredImage: string | null;
};

function normalizePublishDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value ?? '');
}

function mapRow(r: Record<string, unknown>): PortalAnnouncementRow {
  return {
    id: String(r.id),
    schoolId: r.schoolId as number,
    publishDate: normalizePublishDate(r.publishDate),
    titleEn: r.titleEn as string,
    titleId: r.titleId as string,
    contentEn: r.contentEn as string,
    contentId: r.contentId as string,
    featuredImage: (r.featuredImage as string | null) ?? null,
  };
}

function compareAnnouncements(a: PortalAnnouncementRow, b: PortalAnnouncementRow): number {
  if (a.publishDate !== b.publishDate) {
    return a.publishDate < b.publishDate ? 1 : -1;
  }
  const ai = Number(a.id);
  const bi = Number(b.id);
  if (Number.isFinite(ai) && Number.isFinite(bi)) return bi - ai;
  return String(b.id).localeCompare(String(a.id));
}

async function resolveViewerSchoolIds(
  viewerUserId: number,
  viewerRole: string,
): Promise<number[]> {
  if (viewerRole !== 'parent' && viewerRole !== 'student') return [];
  const children = await getPortalChildren(viewerUserId, viewerRole);
  return [...new Set(children.map((c) => c.schoolId).filter((id) => Number.isFinite(id) && id > 0))];
}

async function loadSchoolAnnouncementsFromDb(
  schoolId: number,
): Promise<PortalAnnouncementRow[]> {
  const rows = await sql`
    SELECT
      ann.id::text           AS "id",
      ann.school_id          AS "schoolId",
      ann.publish_date       AS "publishDate",
      ann.title_en           AS "titleEn",
      ann.title_id           AS "titleId",
      ann.content_en         AS "contentEn",
      ann.content_id         AS "contentId",
      ann.featured_image     AS "featuredImage"
    FROM academic_announcements ann
    WHERE ann.school_id = ${schoolId}
      AND ann.active = true
    ORDER BY ann.publish_date DESC, ann.id DESC
    LIMIT ${PORTAL_ANNOUNCEMENTS_SCHOOL_LIMIT}
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

async function getSchoolAnnouncementsCached(
  schoolId: number,
): Promise<PortalAnnouncementRow[]> {
  const key = portalAnnouncementsSchoolKey(schoolId);
  const cached = await cacheGetJson<PortalAnnouncementRow[]>(key);
  if (Array.isArray(cached)) return cached;

  const rows = await loadSchoolAnnouncementsFromDb(schoolId);
  await cacheSetJsonTtl(key, rows, PORTAL_ANNOUNCEMENTS_TTL_SEC);
  return rows;
}

async function mergeSchoolAnnouncements(
  schoolIds: number[],
): Promise<PortalAnnouncementRow[]> {
  if (schoolIds.length === 0) return [];
  const lists = await Promise.all(schoolIds.map((id) => getSchoolAnnouncementsCached(id)));
  return lists.flat().sort(compareAnnouncements);
}

function isBeforeCursor(
  row: PortalAnnouncementRow,
  cursor: AnnouncementPageCursor,
): boolean {
  if (row.publishDate < cursor.publishDate) return true;
  if (row.publishDate > cursor.publishDate) return false;
  const rowId = Number(row.id);
  const cursorId = Number(cursor.id);
  if (Number.isFinite(rowId) && Number.isFinite(cursorId)) return rowId < cursorId;
  return String(row.id) < String(cursor.id);
}

/** Announcements for schools linked to the viewer. Only `active = true` rows (via Redis per school). */
export async function getAnnouncementsForPortal(
  viewerUserId: number,
  viewerRole: string,
  opts: { limit: number },
): Promise<PortalAnnouncementRow[]> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const schoolIds = await resolveViewerSchoolIds(viewerUserId, viewerRole);
  const merged = await mergeSchoolAnnouncements(schoolIds);
  return merged.slice(0, limit);
}

export type AnnouncementPageCursor = { publishDate: string; id: string };

function pageSlice(
  mapped: PortalAnnouncementRow[],
  limit: number,
): { rows: PortalAnnouncementRow[]; nextCursor: AnnouncementPageCursor | null } {
  if (mapped.length > limit) {
    const page = mapped.slice(0, limit);
    const last = page[limit - 1];
    return {
      rows: page,
      nextCursor: last ? { publishDate: last.publishDate, id: last.id } : null,
    };
  }
  return { rows: mapped, nextCursor: null };
}

async function loadAnnouncementsPageFromDb(
  viewerUserId: number,
  viewerRole: string,
  opts: { limit: number; cursor: AnnouncementPageCursor | null },
): Promise<{ rows: PortalAnnouncementRow[]; nextCursor: AnnouncementPageCursor | null }> {
  const limit = opts.limit;
  const fetchLimit = limit + 1;
  const cursor = opts.cursor;

  if (viewerRole === 'parent') {
    if (cursor) {
      const idNum = Number(cursor.id);
      const rows = await sql`
        SELECT
          ann.id::text           AS "id",
          ann.school_id          AS "schoolId",
          ann.publish_date       AS "publishDate",
          ann.title_en           AS "titleEn",
          ann.title_id           AS "titleId",
          ann.content_en         AS "contentEn",
          ann.content_id         AS "contentId",
          ann.featured_image     AS "featuredImage"
        FROM academic_announcements ann
        WHERE ann.active = true
          AND EXISTS (
          SELECT 1
          FROM core_students s
          JOIN core_parent_student_relations r ON r.student_id = s.id AND r.user_id = ${viewerUserId}
          WHERE s.school_id = ann.school_id
            AND s.enrollment_status = 'active'
        )
        AND (
          ann.publish_date < ${cursor.publishDate}::date
          OR (ann.publish_date = ${cursor.publishDate}::date AND ann.id < ${idNum})
        )
        ORDER BY ann.publish_date DESC, ann.id DESC
        LIMIT ${fetchLimit}
      `;
      return pageSlice((rows as Record<string, unknown>[]).map(mapRow), limit);
    }

    const rows = await sql`
      SELECT
        ann.id::text           AS "id",
        ann.school_id          AS "schoolId",
        ann.publish_date       AS "publishDate",
        ann.title_en           AS "titleEn",
        ann.title_id           AS "titleId",
        ann.content_en         AS "contentEn",
        ann.content_id         AS "contentId",
        ann.featured_image     AS "featuredImage"
      FROM academic_announcements ann
      WHERE ann.active = true
        AND EXISTS (
        SELECT 1
        FROM core_students s
        JOIN core_parent_student_relations r ON r.student_id = s.id AND r.user_id = ${viewerUserId}
        WHERE s.school_id = ann.school_id
          AND s.enrollment_status = 'active'
      )
      ORDER BY ann.publish_date DESC, ann.id DESC
      LIMIT ${fetchLimit}
    `;
    return pageSlice((rows as Record<string, unknown>[]).map(mapRow), limit);
  }

  if (viewerRole === 'student') {
    if (cursor) {
      const idNum = Number(cursor.id);
      const rows = await sql`
        SELECT
          ann.id::text           AS "id",
          ann.school_id          AS "schoolId",
          ann.publish_date       AS "publishDate",
          ann.title_en           AS "titleEn",
          ann.title_id           AS "titleId",
          ann.content_en         AS "contentEn",
          ann.content_id         AS "contentId",
          ann.featured_image     AS "featuredImage"
        FROM academic_announcements ann
        WHERE ann.active = true
          AND EXISTS (
          SELECT 1
          FROM core_students s
          WHERE s.school_id = ann.school_id
            AND s.user_id = ${viewerUserId}
            AND s.enrollment_status = 'active'
        )
        AND (
          ann.publish_date < ${cursor.publishDate}::date
          OR (ann.publish_date = ${cursor.publishDate}::date AND ann.id < ${idNum})
        )
        ORDER BY ann.publish_date DESC, ann.id DESC
        LIMIT ${fetchLimit}
      `;
      return pageSlice((rows as Record<string, unknown>[]).map(mapRow), limit);
    }

    const rows = await sql`
      SELECT
        ann.id::text           AS "id",
        ann.school_id          AS "schoolId",
        ann.publish_date       AS "publishDate",
        ann.title_en           AS "titleEn",
        ann.title_id           AS "titleId",
        ann.content_en         AS "contentEn",
        ann.content_id         AS "contentId",
        ann.featured_image     AS "featuredImage"
      FROM academic_announcements ann
      WHERE ann.active = true
        AND EXISTS (
        SELECT 1
        FROM core_students s
        WHERE s.school_id = ann.school_id
          AND s.user_id = ${viewerUserId}
          AND s.enrollment_status = 'active'
      )
      ORDER BY ann.publish_date DESC, ann.id DESC
      LIMIT ${fetchLimit}
    `;
    return pageSlice((rows as Record<string, unknown>[]).map(mapRow), limit);
  }

  return { rows: [], nextCursor: null };
}

export async function getAnnouncementsPage(
  viewerUserId: number,
  viewerRole: string,
  opts: { limit: number; cursor: AnnouncementPageCursor | null },
): Promise<{ rows: PortalAnnouncementRow[]; nextCursor: AnnouncementPageCursor | null }> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const schoolIds = await resolveViewerSchoolIds(viewerUserId, viewerRole);
  if (schoolIds.length === 0) return { rows: [], nextCursor: null };

  const lists = await Promise.all(schoolIds.map((id) => getSchoolAnnouncementsCached(id)));
  const anySchoolTruncated = lists.some((l) => l.length >= PORTAL_ANNOUNCEMENTS_SCHOOL_LIMIT);
  const merged = lists.flat().sort(compareAnnouncements);

  let filtered = merged;
  if (opts.cursor) {
    filtered = merged.filter((row) => isBeforeCursor(row, opts.cursor!));
  }

  const fromCache = pageSlice(filtered, limit);

  // Full page from cache, or all schools fit in the 50-row window — no Neon needed.
  if (fromCache.rows.length === limit || !anySchoolTruncated) {
    return fromCache;
  }

  // Cache window may be incomplete for deeper scroll — fall back to Neon.
  return loadAnnouncementsPageFromDb(viewerUserId, viewerRole, { limit, cursor: opts.cursor });
}

async function loadAnnouncementByIdFromDb(
  announcementId: number,
  schoolIds: number[],
): Promise<PortalAnnouncementRow | null> {
  if (schoolIds.length === 0) return null;
  const rows = await sql`
    SELECT
      ann.id::text           AS "id",
      ann.school_id          AS "schoolId",
      ann.publish_date       AS "publishDate",
      ann.title_en           AS "titleEn",
      ann.title_id           AS "titleId",
      ann.content_en         AS "contentEn",
      ann.content_id         AS "contentId",
      ann.featured_image     AS "featuredImage"
    FROM academic_announcements ann
    WHERE ann.id = ${announcementId}
      AND ann.active = true
      AND ann.school_id = ANY(${schoolIds}::int[])
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getAnnouncementByIdForPortal(
  viewerUserId: number,
  viewerRole: string,
  announcementId: string,
): Promise<PortalAnnouncementRow | null> {
  const idNum = Number(announcementId);
  if (!Number.isFinite(idNum)) return null;

  const schoolIds = await resolveViewerSchoolIds(viewerUserId, viewerRole);
  if (schoolIds.length === 0) return null;

  const merged = await mergeSchoolAnnouncements(schoolIds);
  const fromCache = merged.find((r) => r.id === String(announcementId) || Number(r.id) === idNum);
  if (fromCache) return fromCache;

  const itemKey = portalAnnouncementItemKey(idNum);
  const cachedItem = await cacheGetJson<PortalAnnouncementRow>(itemKey);
  if (cachedItem && schoolIds.includes(cachedItem.schoolId) && cachedItem.id) {
    return cachedItem;
  }

  const row = await loadAnnouncementByIdFromDb(idNum, schoolIds);
  if (row) {
    await cacheSetJsonTtl(itemKey, row, PORTAL_ANNOUNCEMENTS_TTL_SEC);
  }
  return row;
}
