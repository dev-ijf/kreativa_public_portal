import { cacheGetJson, cacheSetJson } from '@/lib/cache/upstash-redis';
import type { PortalPaymentInstructionRow, PortalPaymentMethodOption } from '@/lib/data/portal-payment';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';
import { sql } from '@/lib/db/client';

function methodsCacheKey(schoolIds: number[]): string {
  const part = [...new Set(schoolIds)].sort((a, b) => a - b).join(',') || 'none';
  return `portal:payment_methods:v2:${part}`;
}

function instructionsCacheKey(methodId: number): string {
  return `portal:payment_instructions:v1:${methodId}`;
}

async function fetchPublishedMethodsFromDb(schoolIds: number[]): Promise<PortalPaymentMethodOption[]> {
  const unique = [...new Set(schoolIds)].filter((n) => Number.isFinite(n) && n > 0);

  const rows =
    unique.length === 0
      ? ((await sql`
          SELECT
            id AS "dbMethodId",
            name,
            code,
            category,
            vendor,
            logo_url AS "logoUrl",
            sort_order AS "sortOrder"
          FROM tuition_payment_methods
          WHERE is_active IS TRUE
            AND is_publish IS TRUE
            AND school_id IS NULL
          ORDER BY sort_order ASC NULLS LAST, id ASC
        `) as unknown as PortalPaymentMethodOption[])
      : ((await sql`
          SELECT
            id AS "dbMethodId",
            name,
            code,
            category,
            vendor,
            logo_url AS "logoUrl",
            sort_order AS "sortOrder"
          FROM tuition_payment_methods
          WHERE is_active IS TRUE
            AND is_publish IS TRUE
            AND (school_id IS NULL OR school_id = ANY(${unique}::int4[]))
          ORDER BY sort_order ASC NULLS LAST, id ASC
        `) as unknown as PortalPaymentMethodOption[]);

  return rows.map((r) => {
    const logoRaw = (r as { logoUrl?: unknown }).logoUrl;
    const logoUrl =
      typeof logoRaw === 'string' && logoRaw.trim() !== '' ? logoRaw.trim() : null;
    return {
      dbMethodId: Number(r.dbMethodId),
      name: String(r.name ?? ''),
      code: String(r.code ?? ''),
      category: String(r.category ?? ''),
      vendor: r.vendor != null && String(r.vendor).trim() !== '' ? String(r.vendor) : null,
      logoUrl,
      sortOrder: r.sortOrder != null ? Number(r.sortOrder) : null,
    };
  });
}

/** Metode pembayaran yang dipublikasikan, difilter sekolah anak portal. Cache Upstash (TTL 10 menit). */
export async function getPublishedPaymentMethodsForSchools(schoolIds: number[]): Promise<PortalPaymentMethodOption[]> {
  const key = methodsCacheKey(schoolIds);
  const hit = await cacheGetJson<PortalPaymentMethodOption[]>(key);
  if (hit && Array.isArray(hit)) return hit;

  const fresh = await fetchPublishedMethodsFromDb(schoolIds);
  await cacheSetJson(key, fresh);
  return fresh;
}

export async function fetchInstructionsFromDb(methodId: number): Promise<PortalPaymentInstructionRow[]> {
  const rows = (await sql`
    SELECT
      id,
      title,
      description,
      step_order AS "stepOrder"
    FROM tuition_payment_instructions
    WHERE payment_channel_id = ${methodId}
    ORDER BY step_order ASC NULLS LAST, id ASC
  `) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    stepOrder: r.stepOrder != null ? Number(r.stepOrder) : null,
  }));
}

/** True jika metode publish+active dan cocok dengan sekolah anak yang boleh diakses viewer. */
export async function viewerCanUsePublishedPaymentMethod(
  viewerUserId: number,
  viewerRole: string,
  methodId: number,
): Promise<boolean> {
  if (!Number.isFinite(methodId) || methodId <= 0) return false;

  const allowedStudentIds = await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole);
  if (allowedStudentIds.length === 0) return false;

  const schoolRows = (await sql`
    SELECT DISTINCT s.school_id AS "schoolId"
    FROM core_students s
    WHERE s.id = ANY(${allowedStudentIds}::int4[])
      AND s.enrollment_status = 'active'
  `) as unknown as { schoolId: number }[];

  const schoolIds = [...new Set(schoolRows.map((r) => Number(r.schoolId)).filter((n) => Number.isFinite(n) && n > 0))];

  const allowedRows =
    schoolIds.length === 0
      ? ((await sql`
          SELECT 1 AS ok
          FROM tuition_payment_methods pm
          WHERE pm.id = ${methodId}
            AND pm.is_active IS TRUE
            AND pm.is_publish IS TRUE
            AND pm.school_id IS NULL
          LIMIT 1
        `) as unknown as { ok: number }[])
      : ((await sql`
          SELECT 1 AS ok
          FROM tuition_payment_methods pm
          WHERE pm.id = ${methodId}
            AND pm.is_active IS TRUE
            AND pm.is_publish IS TRUE
            AND (pm.school_id IS NULL OR pm.school_id = ANY(${schoolIds}::int4[]))
          LIMIT 1
        `) as unknown as { ok: number }[]);

  return allowedRows.length > 0;
}

/**
 * Instruksi pembayaran per channel. Hanya jika metode itu boleh diakses viewer (publish + active + sekolah).
 */
export async function getPaymentInstructionsForPortalViewer(
  viewerUserId: number,
  viewerRole: string,
  methodId: number,
): Promise<PortalPaymentInstructionRow[] | null> {
  if (!Number.isFinite(methodId) || methodId <= 0) return null;

  const allowed = await viewerCanUsePublishedPaymentMethod(viewerUserId, viewerRole, methodId);
  if (!allowed) return null;

  const key = instructionsCacheKey(methodId);
  const hit = await cacheGetJson<PortalPaymentInstructionRow[]>(key);
  if (hit && Array.isArray(hit)) return hit;

  const fresh = await fetchInstructionsFromDb(methodId);
  await cacheSetJson(key, fresh);
  return fresh;
}
