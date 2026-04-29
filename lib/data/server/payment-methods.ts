import { cacheGetJson, cacheSetJson } from '@/lib/cache/upstash-redis';
import type { PortalPaymentInstructionRow, PortalPaymentMethodOption } from '@/lib/data/portal-payment';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';
import { sql } from '@/lib/db/client';
import {
  paymentInstructionDbLangFromThemeId,
  type PaymentInstructionDbLang,
} from '@/lib/utils/payment-instruction-lang';

function methodsCacheKey(schoolIds: number[]): string {
  const part = [...new Set(schoolIds)].sort((a, b) => a - b).join(',') || 'none';
  return `portal:payment_methods:v2:${part}`;
}

function instructionsCacheKey(methodId: number, lang: PaymentInstructionDbLang): string {
  return `portal:payment_instructions:v2:${methodId}:${lang}`;
}

/** Cache hasil cek akses viewer → metode (tanpa TTL). */
function methodViewerAllowedCacheKey(viewerUserId: number, viewerRole: string, methodId: number): string {
  const roleSafe = String(viewerRole || 'none').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return `portal:viewer_can_method:v1:${viewerUserId}:${roleSafe}:${methodId}`;
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

/** Metode pembayaran yang dipublikasikan, difilter sekolah anak portal. Cache Upstash tanpa TTL. */
export async function getPublishedPaymentMethodsForSchools(schoolIds: number[]): Promise<PortalPaymentMethodOption[]> {
  const key = methodsCacheKey(schoolIds);
  const hit = await cacheGetJson<PortalPaymentMethodOption[]>(key);
  if (hit && Array.isArray(hit)) return hit;

  const fresh = await fetchPublishedMethodsFromDb(schoolIds);
  await cacheSetJson(key, fresh);
  return fresh;
}

export async function fetchInstructionsFromDb(
  methodId: number,
  lang: PaymentInstructionDbLang,
): Promise<PortalPaymentInstructionRow[]> {
  const rows = (await sql`
    SELECT
      id,
      title,
      description,
      step_order AS "stepOrder"
    FROM tuition_payment_instructions
    WHERE payment_channel_id = ${methodId}
      AND UPPER(TRIM(COALESCE(lang::text, 'ID'))) = ${lang}
    ORDER BY step_order ASC NULLS LAST, id ASC
  `) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    stepOrder: r.stepOrder != null ? Number(r.stepOrder) : null,
  }));
}

async function viewerCanUsePublishedPaymentMethodFromDb(
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
 * Bahasa baris instruksi DB (`tuition_payment_instructions.lang`) dari sekolah siswa.
 * `studentId` opsional: jika valid dan milik viewer, pakai theme sekolah siswa itu.
 * Tanpa `studentId`: jika semua anak aktif viewer berada di sekolah theme_id = 1 → EN, selain itu ID.
 */
export async function resolvePaymentInstructionDbLangForViewer(
  viewerUserId: number,
  viewerRole: string,
  studentId?: number | null,
): Promise<PaymentInstructionDbLang> {
  const allowed = await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole);
  if (allowed.length === 0) return 'ID';

  const sid = studentId != null && Number.isFinite(studentId) ? Math.trunc(Number(studentId)) : null;
  if (sid != null && sid > 0 && allowed.includes(sid)) {
    const one = (await sql`
      SELECT sch.theme_id AS "themeId"
      FROM core_students s
      INNER JOIN core_schools sch ON sch.id = s.school_id
      WHERE s.id = ${sid}
        AND s.enrollment_status = 'active'
      LIMIT 1
    `) as unknown as { themeId: number | null }[];
    if (one.length > 0) {
      return paymentInstructionDbLangFromThemeId(one[0].themeId);
    }
  }

  const agg = (await sql`
    SELECT DISTINCT sch.theme_id AS "themeId"
    FROM core_students s
    INNER JOIN core_schools sch ON sch.id = s.school_id
    WHERE s.id = ANY(${allowed}::int4[])
      AND s.enrollment_status = 'active'
  `) as unknown as { themeId: number | null }[];

  if (agg.length === 0) return 'ID';

  const numericThemes = agg
    .map((r) => (r.themeId == null ? NaN : Number(r.themeId)))
    .filter((n) => Number.isFinite(n));
  const distinct = [...new Set(numericThemes)];

  if (distinct.length === 1 && distinct[0] === 1) return 'EN';
  return 'ID';
}

/** True jika metode publish+active dan cocok dengan sekolah anak yang boleh diakses viewer. Cache Redis tanpa TTL. */
export async function viewerCanUsePublishedPaymentMethod(
  viewerUserId: number,
  viewerRole: string,
  methodId: number,
): Promise<boolean> {
  if (!Number.isFinite(methodId) || methodId <= 0) return false;

  const t0 = Date.now();
  const ckey = methodViewerAllowedCacheKey(viewerUserId, viewerRole, methodId);
  const hit = await cacheGetJson<boolean>(ckey);
  if (hit === true || hit === false) {
    console.info('viewer_method_cache_hit', { methodId, ms: Date.now() - t0, allowed: hit });
    return hit;
  }

  const ok = await viewerCanUsePublishedPaymentMethodFromDb(viewerUserId, viewerRole, methodId);
  await cacheSetJson(ckey, ok);
  console.info('viewer_method_cache_miss', { methodId, ms: Date.now() - t0, allowed: ok });
  return ok;
}

/**
 * Instruksi pembayaran per channel. Hanya jika metode itu boleh diakses viewer (publish + active + sekolah).
 * `studentId` opsional: menentukan `lang` instruksi dari theme sekolah siswa (vs agregat semua anak viewer).
 */
export async function getPaymentInstructionsForPortalViewer(
  viewerUserId: number,
  viewerRole: string,
  methodId: number,
  options?: { studentId?: number | null },
): Promise<PortalPaymentInstructionRow[] | null> {
  if (!Number.isFinite(methodId) || methodId <= 0) return null;

  const t0 = Date.now();
  const allowed = await viewerCanUsePublishedPaymentMethod(viewerUserId, viewerRole, methodId);
  const t1 = Date.now();

  if (!allowed) {
    console.info('payment_instr_denied', { methodId, ms: t1 - t0 });
    return null;
  }

  const instrLang = await resolvePaymentInstructionDbLangForViewer(viewerUserId, viewerRole, options?.studentId);
  const instrKey = instructionsCacheKey(methodId, instrLang);
  const instrHit = await cacheGetJson<PortalPaymentInstructionRow[]>(instrKey);
  const t2 = Date.now();
  if (instrHit && Array.isArray(instrHit)) {
    console.info('payment_instr_cache_hit', { methodId, instrLang, ms: t2 - t0, rows: instrHit.length });
    return instrHit;
  }

  const fresh = await fetchInstructionsFromDb(methodId, instrLang);
  await cacheSetJson(instrKey, fresh);
  const t3 = Date.now();
  console.info('payment_instr_cache_miss', {
    methodId,
    instrLang,
    cacheCheckMs: t2 - t0,
    dbMs: t3 - t2,
    rows: fresh.length,
  });
  return fresh;
}
