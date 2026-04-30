import type { FinanceInstallmentPaymentLine } from '@/lib/data/portal-finance-payload';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';
import { isBmiPaymentMethod } from '@/lib/utils/bmi-method';
import { computePortalPaymentExpiryIso } from '@/lib/utils/payment-deadline';
import { sql } from '@/lib/db/client';

export type PortalTuitionTransactionLine = { label: string; amount: number };

export type PortalTuitionTransaction = {
  transactionId: string;
  transactionCreatedAt: string;
  referenceNo: string;
  totalAmount: number;
  status: string;
  paymentDate: string | null;
  vaNo: string | null;
  paymentMethodName: string | null;
  lines: PortalTuitionTransactionLine[];
  /** Tab checkout (pending): untuk hidrasi halaman instruksi. */
  paymentMethodId?: number;
  paymentMethodCode?: string;
  paymentMethodCategory?: string;
  paymentMethodVendor?: string | null;
  paymentMethodLogoUrl?: string | null;
  checkoutExpiryIso?: string;
  isBmi?: boolean;
  /** Siswa pemilik transaksi (instruksi bayar per theme sekolah). */
  studentId?: number;
};

export type TuitionReceiptLine = { label: string; amount: number };

export type TuitionReceiptPayload = {
  schoolName: string;
  /** Alamat sekolah dari `core_schools.address`. */
  schoolAddress: string | null;
  schoolLogoDataUrl: string | null;
  referenceNo: string;
  paymentDate: string | null;
  paymentMethodLabel: string;
  vaNo: string | null;
  studentNis: string | null;
  studentName: string;
  programClass: string | null;
  rombelLabel: string | null;
  lines: TuitionReceiptLine[];
  total: number;
  /** theme_id sekolah — 1 = Kreativa (EN), 2 = Talenta (ID). */
  themeId?: number | null;
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  const n = Number(String(v).replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function ts(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

type TxFlatRow = {
  transaction_id: string | number;
  transaction_created_at: string;
  reference_no: string;
  total_amount: number;
  status: string;
  payment_date: string | null;
  va_no: string | null;
  payment_method_name: string | null;
  line_amount: number | null;
  line_label: string | null;
  detail_id: string | number | null;
  payment_method_db_id?: number | null;
  payment_method_code?: string | null;
  payment_method_category?: string | null;
  payment_method_vendor?: string | null;
  payment_method_logo_url?: string | null;
};

export async function getTuitionTransactionsForPortal(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<PortalTuitionTransaction[] | null> {
  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  if (!allowed.has(studentId)) return null;

  const rows = (await sql`
    SELECT
      t.id AS transaction_id,
      t.created_at AS transaction_created_at,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.status,
      t.payment_date,
      t.va_no,
      pm.name AS payment_method_name,
      (d.amount_paid)::float8 AS line_amount,
      COALESCE(NULLIF(TRIM(b.title), ''), p.name, 'Pembayaran') AS line_label,
      d.id AS detail_id
    FROM tuition_transactions t
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    LEFT JOIN tuition_transaction_details d
      ON d.transaction_id = t.id AND d.transaction_created_at = t.created_at
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE t.student_id = ${studentId}
      AND lower(trim(t.status)) = 'success'
    ORDER BY t.payment_date DESC NULLS LAST, t.created_at DESC, d.id ASC NULLS LAST
  `) as unknown as TxFlatRow[];

  const orderKeys: string[] = [];
  const byKey = new Map<string, PortalTuitionTransaction>();

  for (const r of rows) {
    const transactionId = String(r.transaction_id);
    const transactionCreatedAt = ts(r.transaction_created_at);
    if (!transactionId || !transactionCreatedAt) continue;
    const key = `${transactionId}\0${transactionCreatedAt}`;
    let tx = byKey.get(key);
    if (!tx) {
      tx = {
        transactionId,
        transactionCreatedAt,
        referenceNo: String(r.reference_no ?? ''),
        totalAmount: num(r.total_amount),
        status: String(r.status ?? ''),
        paymentDate: r.payment_date,
        vaNo: r.va_no,
        paymentMethodName: r.payment_method_name,
        lines: [],
        studentId,
      };
      byKey.set(key, tx);
      orderKeys.push(key);
    }
    if (r.detail_id != null && r.line_amount != null && r.line_label) {
      tx.lines.push({ label: r.line_label, amount: num(r.line_amount) });
    }
  }

  return orderKeys.map((k) => byKey.get(k)!);
}

/** Transaksi menunggu pembayaran (checkout) untuk riwayat portal. */
export async function getPendingCheckoutTransactionsForPortal(
  viewerUserId: number,
  viewerRole: string,
  studentId: number,
): Promise<PortalTuitionTransaction[] | null> {
  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  if (!allowed.has(studentId)) return null;

  const rows = (await sql`
    SELECT
      t.id AS transaction_id,
      t.created_at AS transaction_created_at,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.status,
      t.payment_date,
      t.va_no,
      pm.name AS payment_method_name,
      (pm.id)::int4 AS payment_method_db_id,
      pm.code AS payment_method_code,
      pm.category AS payment_method_category,
      pm.vendor AS payment_method_vendor,
      pm.logo_url AS payment_method_logo_url,
      (d.amount_paid)::float8 AS line_amount,
      COALESCE(NULLIF(TRIM(b.title), ''), p.name, 'Pembayaran') AS line_label,
      d.id AS detail_id
    FROM tuition_transactions t
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    LEFT JOIN tuition_transaction_details d
      ON d.transaction_id = t.id AND d.transaction_created_at = t.created_at
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE t.student_id = ${studentId}
      AND t.user_id = ${viewerUserId}
      AND lower(trim(t.status)) = 'pending'
    ORDER BY t.created_at DESC, d.id ASC NULLS LAST
  `) as unknown as TxFlatRow[];

  const orderKeys: string[] = [];
  const byKey = new Map<string, PortalTuitionTransaction>();

  for (const r of rows) {
    const transactionId = String(r.transaction_id);
    const transactionCreatedAt = ts(r.transaction_created_at);
    if (!transactionId || !transactionCreatedAt) continue;
    const key = `${transactionId}\0${transactionCreatedAt}`;
    let tx = byKey.get(key);
    if (!tx) {
      const createdMs = epochMs(r.transaction_created_at);
      const pmId = r.payment_method_db_id != null ? num(r.payment_method_db_id) : 0;
      const code = String(r.payment_method_code ?? '');
      const vendor = r.payment_method_vendor;
      tx = {
        transactionId,
        transactionCreatedAt,
        referenceNo: String(r.reference_no ?? ''),
        totalAmount: num(r.total_amount),
        status: String(r.status ?? 'pending'),
        paymentDate: r.payment_date,
        vaNo: r.va_no,
        paymentMethodName: r.payment_method_name,
        lines: [],
        paymentMethodId: Number.isFinite(pmId) && pmId > 0 ? pmId : undefined,
        paymentMethodCode: code || undefined,
        paymentMethodCategory: r.payment_method_category ? String(r.payment_method_category) : undefined,
        paymentMethodVendor: vendor != null ? String(vendor) : null,
        paymentMethodLogoUrl: r.payment_method_logo_url ? String(r.payment_method_logo_url) : null,
        checkoutExpiryIso: Number.isFinite(createdMs)
          ? computePortalPaymentExpiryIso(createdMs)
          : computePortalPaymentExpiryIso(Date.now()),
        isBmi: isBmiPaymentMethod(vendor, code),
        studentId,
      };
      byKey.set(key, tx);
      orderKeys.push(key);
    }
    if (r.detail_id != null && r.line_amount != null && r.line_label) {
      tx.lines.push({ label: r.line_label, amount: num(r.line_amount) });
    }
  }

  return orderKeys.map((k) => byKey.get(k)!);
}

function epochMs(v: unknown): number {
  return Date.parse(ts(v));
}

/**
 * Pilih baris transaksi untuk kuitansi. Kunci komposit (id, created_at) di DB sering
 * `timestamp` tanpa TZ sedangkan URL membawa ISO UTC — equality SQL sering gagal.
 * Strategi: ambil kandidat by id, cocokkan created_at dari URL (string / fuzzy detik),
 * atau satu-satunya baris; join detail memakai created_at **dari baris DB**.
 */
function pickTransactionHeadRow(
  candidates: Record<string, unknown>[],
  transactionCreatedAt: string,
): Record<string, unknown> | null {
  if (candidates.length === 0) return null;
  const urlTrim = transactionCreatedAt.trim();
  const urlMs = Date.parse(urlTrim);

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const byString = candidates.find(
    (r) => ts(r.created_at) === urlTrim || String(r.created_at ?? '').trim() === urlTrim,
  );
  if (byString) return byString;

  if (Number.isFinite(urlMs)) {
    const byFuzzy = candidates.find((r) => {
      const dbMs = epochMs(r.created_at);
      return Number.isFinite(dbMs) && Math.abs(dbMs - urlMs) <= 5000;
    });
    if (byFuzzy) return byFuzzy;
  }

  return null;
}

export async function getReceiptPayloadForPortal(
  viewerUserId: number,
  viewerRole: string,
  transactionId: bigint | number | string,
  transactionCreatedAt: string,
): Promise<TuitionReceiptPayload | null> {
  const idNum = typeof transactionId === 'bigint' ? Number(transactionId) : Number(transactionId);
  if (!Number.isFinite(idNum)) return null;

  const headRows = (await sql`
    SELECT
      t.created_at,
      t.student_id,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.payment_date,
      t.va_no,
      lower(trim(t.status)) AS status_norm,
      pm.name AS payment_method_name,
      s.nis AS student_nis,
      s.full_name AS student_name,
      s.program AS student_program,
      c.name AS class_name,
      lg.name AS level_grade_name,
      sch.name AS school_name,
      sch.address AS school_address,
      sch.school_logo_url,
      sch.theme_id
    FROM tuition_transactions t
    INNER JOIN core_students s ON s.id = t.student_id
    LEFT JOIN core_schools sch ON sch.id = s.school_id
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    LEFT JOIN LATERAL (
      SELECT ch.class_id, ch.academic_year_id, ch.level_grade_id
      FROM core_student_class_histories ch
      WHERE ch.student_id = s.id AND ch.status = 'active'
      ORDER BY ch.id DESC
      LIMIT 1
    ) h ON true
    LEFT JOIN core_classes c ON c.id = h.class_id
    LEFT JOIN core_level_grades lg ON lg.id = h.level_grade_id
    WHERE t.id = ${idNum}
    ORDER BY t.created_at DESC
    LIMIT 24
  `) as unknown as Record<string, unknown>[];

  const h = pickTransactionHeadRow(headRows, transactionCreatedAt);
  if (!h) return null;

  const studentId = num(h.student_id);
  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  if (!allowed.has(studentId)) return null;

  const statusNorm = String(h.status_norm ?? '');
  if (statusNorm !== 'success') return null;

  const resolvedCreatedAt = h.created_at;

  const lineRows = (await sql`
    SELECT
      (d.amount_paid)::float8 AS amount_paid,
      COALESCE(NULLIF(TRIM(b.title), ''), p.name, 'Pembayaran') AS line_label
    FROM tuition_transaction_details d
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE d.transaction_id = ${idNum}
      AND d.transaction_created_at = ${resolvedCreatedAt}
    ORDER BY d.id ASC
  `) as unknown as Record<string, unknown>[];

  const lines: TuitionReceiptLine[] = lineRows.map((r) => ({
    label: String(r.line_label ?? 'Pembayaran'),
    amount: num(r.amount_paid),
  }));

  const logoUrl = h.school_logo_url as string | null;
  let schoolLogoDataUrl: string | null = null;
  if (logoUrl && /^https?:\/\//i.test(logoUrl.trim())) {
    try {
      const res = await fetch(logoUrl.trim(), { next: { revalidate: 3600 } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get('content-type') ?? 'image/png';
        if (ct.startsWith('image/')) {
          schoolLogoDataUrl = `data:${ct};base64,${buf.toString('base64')}`;
        }
      }
    } catch {
      schoolLogoDataUrl = null;
    }
  }

  const programClass = h.student_program as string | null;
  const className = h.class_name as string | null;
  const levelGrade = h.level_grade_name as string | null;

  const addrRaw = h.school_address;
  const schoolAddress =
    typeof addrRaw === 'string' && addrRaw.trim() !== '' ? addrRaw.trim() : null;

  const themeIdRaw = h.theme_id;
  const themeId = themeIdRaw != null ? Number(themeIdRaw) : null;

  return {
    schoolName: String(h.school_name ?? 'Sekolah'),
    schoolAddress,
    schoolLogoDataUrl,
    referenceNo: String(h.reference_no ?? ''),
    paymentDate: h.payment_date as string | null,
    paymentMethodLabel: String(h.payment_method_name ?? '—'),
    vaNo: h.va_no as string | null,
    studentNis: h.student_nis as string | null,
    studentName: String(h.student_name ?? ''),
    programClass: programClass?.trim() || null,
    rombelLabel: [levelGrade, className].filter(Boolean).join(' · ') || null,
    lines,
    total: num(h.total_amount),
    themeId,
  };
}

export async function getPaymentLinesForBillPortal(
  viewerUserId: number,
  viewerRole: string,
  billId: number,
): Promise<{ lines: FinanceInstallmentPaymentLine[]; productName: string | null } | null> {
  const allowed = new Set(await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole));
  const billRows = (await sql`
    SELECT student_id AS "studentId", product_id AS "productId"
    FROM tuition_bills
    WHERE id = ${billId}
    LIMIT 1
  `) as unknown as { studentId: number; productId: number }[];
  if (billRows.length === 0) return null;
  const studentId = Number(billRows[0].studentId);
  if (!allowed.has(studentId)) return null;

  const prodRows = (await sql`
    SELECT name FROM tuition_products WHERE id = ${billRows[0].productId} LIMIT 1
  `) as unknown as { name: string }[];
  const productName = prodRows[0]?.name ?? null;

  const rows = (await sql`
    SELECT
      amount_paid,
      detail_created_at,
      payment_date,
      transaction_id,
      transaction_created_at,
      reference_no,
      transaction_status
    FROM v_portal_tuition_payment_lines
    WHERE bill_id = ${billId}
      AND transaction_status = 'success'
    ORDER BY detail_created_at ASC
  `) as unknown as Record<string, unknown>[];

  const lines: FinanceInstallmentPaymentLine[] = rows.map((ln) => {
    const createdAt = ts(ln.transaction_created_at);
    const dateRaw = ln.payment_date ?? ln.detail_created_at;
    return {
      date: ts(dateRaw).slice(0, 10),
      amount: num(ln.amount_paid),
      transactionId: String(ln.transaction_id ?? ''),
      transactionCreatedAt: createdAt,
      referenceNo: ln.reference_no as string | null,
      transactionStatus: ln.transaction_status as string | null,
    };
  });

  return { lines, productName };
}
