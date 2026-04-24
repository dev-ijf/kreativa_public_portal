import { sql } from '@/lib/db/client';

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

/** Announcements for schools linked to the viewer (same access pattern as academic_agendas). Only `active = true` rows are returned. */
export async function getAnnouncementsForPortal(
  viewerUserId: number,
  viewerRole: string,
  opts: { limit: number },
): Promise<PortalAnnouncementRow[]> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  if (viewerRole === 'parent') {
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
      LIMIT ${limit}
    `;
    return (rows as Record<string, unknown>[]).map(mapRow);
  }

  if (viewerRole === 'student') {
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
      LIMIT ${limit}
    `;
    return (rows as Record<string, unknown>[]).map(mapRow);
  }

  return [];
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

export async function getAnnouncementsPage(
  viewerUserId: number,
  viewerRole: string,
  opts: { limit: number; cursor: AnnouncementPageCursor | null },
): Promise<{ rows: PortalAnnouncementRow[]; nextCursor: AnnouncementPageCursor | null }> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
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
      const mapped = (rows as Record<string, unknown>[]).map(mapRow);
      return pageSlice(mapped, limit);
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
    const mapped = (rows as Record<string, unknown>[]).map(mapRow);
    return pageSlice(mapped, limit);
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
      const mapped = (rows as Record<string, unknown>[]).map(mapRow);
      return pageSlice(mapped, limit);
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
    const mapped = (rows as Record<string, unknown>[]).map(mapRow);
    return pageSlice(mapped, limit);
  }

  return { rows: [], nextCursor: null };
}

export async function getAnnouncementByIdForPortal(
  viewerUserId: number,
  viewerRole: string,
  announcementId: string,
): Promise<PortalAnnouncementRow | null> {
  const idNum = Number(announcementId);
  if (!Number.isFinite(idNum)) return null;

  if (viewerRole === 'parent') {
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
      WHERE ann.id = ${idNum}
        AND ann.active = true
        AND EXISTS (
          SELECT 1
          FROM core_students s
          JOIN core_parent_student_relations r ON r.student_id = s.id AND r.user_id = ${viewerUserId}
          WHERE s.school_id = ann.school_id
            AND s.enrollment_status = 'active'
        )
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return mapRow(rows[0] as Record<string, unknown>);
  }

  if (viewerRole === 'student') {
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
      WHERE ann.id = ${idNum}
        AND ann.active = true
        AND EXISTS (
          SELECT 1
          FROM core_students s
          WHERE s.school_id = ann.school_id
            AND s.user_id = ${viewerUserId}
            AND s.enrollment_status = 'active'
        )
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return mapRow(rows[0] as Record<string, unknown>);
  }

  return null;
}
