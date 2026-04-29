import { fetchInstructionsFromDb, viewerCanUsePublishedPaymentMethod } from '@/lib/data/server/payment-methods';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';
import { computePortalPaymentExpiryMs } from '@/lib/utils/payment-deadline';
import { paymentInstructionDbLangFromThemeId } from '@/lib/utils/payment-instruction-lang';
import { sql } from '@/lib/db/client';

/** Baris isi PDF: paragraf, item bernomor (dari `<ol><li>`), atau bullet (`<ul><li>`). */
export type PdfInstructionLine =
  | { kind: 'paragraph'; text: string }
  | { kind: 'ordered'; n: number; text: string }
  | { kind: 'bullet'; text: string };

export type PaymentInstructionsPdfPayload = {
  lang: 'id' | 'en';
  schoolName: string;
  schoolAddress: string | null;
  schoolLogoDataUrl: string | null;
  referenceNo: string;
  methodName: string;
  totalAmount: number;
  vaDisplay: string | null;
  deadlineLabel: string;
  sections: { title: string; lines: PdfInstructionLine[] }[];
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** Hilangkan tag; teks untuk satu blok `<li>` atau paragraf. */
function htmlToPlainChunk(html: string): string {
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/**
 * Parse deskripsi HTML instruksi: `<ol><li>` → baris bernomor, `<ul><li>` → bullet.
 */
export function parseInstructionHtmlToPdfLines(html: string): PdfInstructionLine[] {
  const result: PdfInstructionLine[] = [];
  let rest = String(html ?? '').replace(/\r\n/g, '\n');

  const nextListStart = (s: string): number => {
    const a = s.search(/<ol\b/i);
    const b = s.search(/<ul\b/i);
    if (a === -1) return b;
    if (b === -1) return a;
    return Math.min(a, b);
  };

  while (rest.length) {
    rest = rest.trimStart();
    if (!rest) break;

    const olM = rest.match(/^<ol\b[^>]*>([\s\S]*?)<\/ol>/i);
    if (olM) {
      const inner = olM[1];
      let ord = 1;
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let lm: RegExpExecArray | null;
      while ((lm = liRe.exec(inner))) {
        const t = htmlToPlainChunk(lm[1]);
        if (t) {
          result.push({ kind: 'ordered', n: ord, text: t });
          ord += 1;
        }
      }
      rest = rest.slice(olM[0].length);
      continue;
    }

    const ulM = rest.match(/^<ul\b[^>]*>([\s\S]*?)<\/ul>/i);
    if (ulM) {
      const inner = ulM[1];
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let lm: RegExpExecArray | null;
      while ((lm = liRe.exec(inner))) {
        const t = htmlToPlainChunk(lm[1]);
        if (t) result.push({ kind: 'bullet', text: t });
      }
      rest = rest.slice(ulM[0].length);
      continue;
    }

    const nl = nextListStart(rest);
    if (nl > 0) {
      const chunk = rest.slice(0, nl);
      const t = htmlToPlainChunk(chunk);
      if (t) result.push({ kind: 'paragraph', text: t });
      rest = rest.slice(nl);
      continue;
    }

    if (nl === 0) {
      rest = rest.replace(/^<[^>]+>/, '');
      continue;
    }

    const t = htmlToPlainChunk(rest);
    if (t) result.push({ kind: 'paragraph', text: t });
    break;
  }

  return result;
}

function formatDeadlineLabel(expMs: number, lang: 'id' | 'en'): string {
  if (!Number.isFinite(expMs)) return '—';
  return new Date(expMs).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

async function fetchLogoDataUrl(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl || !/^https?:\/\//i.test(logoUrl.trim())) return null;
  try {
    const res = await fetch(logoUrl.trim(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type') ?? 'image/png';
    if (!ct.startsWith('image/')) return null;
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(String(v).replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export async function getPaymentInstructionsPdfPayloadForPortal(
  viewerUserId: number,
  viewerRole: string,
  methodId: number,
  options: {
    transactionId: string;
    transactionCreatedAt: string;
    expiryAt?: string | null;
    lang: 'id' | 'en';
  },
): Promise<PaymentInstructionsPdfPayload | null> {
  if (!Number.isFinite(methodId) || methodId <= 0) return null;

  const idNum = Number(options.transactionId);
  if (!Number.isFinite(idNum) || idNum <= 0) return null;

  const allowedMethod = await viewerCanUsePublishedPaymentMethod(viewerUserId, viewerRole, methodId);
  if (!allowedMethod) return null;

  // Jangan bandingkan created_at dari query string ke kolom DB (format/presisi beda → 404).
  // PK partisi (id, created_at); ambil baris terbaru untuk id + pemilik portal.
  const head = (await sql`
    WITH tx AS (
      SELECT
        id,
        created_at,
        user_id,
        reference_no,
        (total_amount)::float8 AS total_amount,
        va_no,
        payment_method_id
      FROM tuition_transactions
      WHERE id = ${idNum} AND user_id = ${viewerUserId}
      ORDER BY created_at DESC
      LIMIT 1
    )
    SELECT
      t.user_id,
      t.reference_no,
      t.total_amount,
      t.va_no,
      t.created_at,
      sch.name AS school_name,
      sch.address AS school_address,
      sch.school_logo_url,
      sch.theme_id AS "themeId",
      pm.name AS method_name
    FROM tx t
    INNER JOIN tuition_transaction_details d
      ON d.transaction_id = t.id AND d.transaction_created_at = t.created_at
    INNER JOIN tuition_bills b ON b.id = d.bill_id
    INNER JOIN core_students s ON s.id = b.student_id
    INNER JOIN core_schools sch ON sch.id = s.school_id
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    LIMIT 1
  `) as unknown as Record<string, unknown>[];

  if (head.length === 0) return null;

  const h = head[0];
  if (Number(h.user_id) !== Number(viewerUserId)) return null;

  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  const stRows = (await sql`
    SELECT DISTINCT b.student_id AS "studentId"
    FROM tuition_transaction_details d
    INNER JOIN tuition_bills b ON b.id = d.bill_id
    WHERE d.transaction_id = ${idNum}
      AND d.transaction_created_at = (
        SELECT created_at
        FROM tuition_transactions
        WHERE id = ${idNum} AND user_id = ${viewerUserId}
        ORDER BY created_at DESC
        LIMIT 1
      )
    LIMIT 1
  `) as unknown as { studentId: number }[];
  if (stRows.length === 0 || !allowed.has(Number(stRows[0].studentId))) return null;

  const instrLang = paymentInstructionDbLangFromThemeId(num(h.themeId));
  const rows = await fetchInstructionsFromDb(methodId, instrLang);

  const logoUrl = h.school_logo_url as string | null;
  const schoolLogoDataUrl = await fetchLogoDataUrl(logoUrl);

  const addrRaw = h.school_address;
  const schoolAddress = typeof addrRaw === 'string' && addrRaw.trim() !== '' ? addrRaw.trim() : null;

  const vaRaw = h.va_no != null ? String(h.va_no) : '';
  const vaDisplay = vaRaw ? vaRaw.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim() : null;

  const createdAt = String(h.created_at ?? '');
  const createdMs = new Date(createdAt).getTime();
  const fromClient = options.expiryAt ? new Date(options.expiryAt).getTime() : NaN;
  const expMs = Number.isFinite(fromClient)
    ? fromClient
    : computePortalPaymentExpiryMs(Number.isFinite(createdMs) ? createdMs : Date.now());
  const deadlineLabel = formatDeadlineLabel(expMs, options.lang);

  const sections = rows.map((r) => ({
    title: r.title,
    lines: parseInstructionHtmlToPdfLines(r.description ?? ''),
  }));

  return {
    lang: options.lang,
    schoolName: String(h.school_name ?? 'Sekolah'),
    schoolAddress,
    schoolLogoDataUrl,
    referenceNo: String(h.reference_no ?? ''),
    methodName: String(h.method_name ?? '—'),
    totalAmount: num(h.total_amount),
    vaDisplay,
    deadlineLabel,
    sections,
  };
}
