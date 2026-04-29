import { isBmiPaymentMethod } from '@/lib/utils/bmi-method';
import { computePortalPaymentExpiryIso } from '@/lib/utils/payment-deadline';
import { buildBmiVa16 } from '@/lib/va/bmi-va';
import type { PortalCheckoutCartItem, PortalPaymentInstructionRow } from '@/lib/data/portal-payment';
import { fetchInstructionsFromDb, viewerCanUsePublishedPaymentMethod } from '@/lib/data/server/payment-methods';
import { paymentInstructionDbLangFromThemeId } from '@/lib/utils/payment-instruction-lang';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';
import { sql } from '@/lib/db/client';

export class CheckoutValidationError extends Error {
  readonly code: string;

  readonly messageEn: string;

  readonly messageId: string;

  constructor(code: string, messageId: string, messageEn: string) {
    super(messageId);
    this.code = code;
    this.messageId = messageId;
    this.messageEn = messageEn;
  }
}

export type PortalCheckoutDbResult = {
  transactionId: string;
  transactionCreatedAt: string;
  referenceNo: string;
  totalAmount: number;
  studentId: number;
  studentName: string;
  schoolId: number;
  schoolName: string;
  academicYearId: number;
  isBmi: boolean;
  vaNo: string | null;
  vaDisplay: string | null;
  expiryAt: string;
  billLines: { billId: number; title: string; amount: number }[];
  paymentMethodLabel: string;
  paymentMethodId: number;
  instructionRows: PortalPaymentInstructionRow[];
};

type BillRow = {
  bill_id: number;
  student_id: number;
  academic_year_id: number;
  product_id: number;
  title: string;
  balance_amount: unknown;
  min_payment: unknown;
  is_installment: boolean;
  payment_type: string;
};

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const t = v.trim().replace(/\s/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Neon/JSON kadang mengembalikan `bill_id` string atau bigint — Map harus pakai number konsisten. */
function normBillId(v: unknown): number {
  const n = num(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : NaN;
}

function parseCartBillKey(item: PortalCheckoutCartItem): { billId: number; childIdFromPrefix: number | null } {
  const { id, childId } = item;
  if (id.includes('-empty')) {
    throw new CheckoutValidationError(
      'INVALID_CART_ITEM',
      'Item keranjang tidak valid.',
      'Invalid cart item.',
    );
  }
  const spp = /^spp-(\d+)-(\d+)$/.exec(id);
  if (spp) {
    const cid = Number(spp[1]);
    const billId = Number(spp[2]);
    if (cid !== childId || !Number.isFinite(billId)) {
      throw new CheckoutValidationError('INVALID_CART_ITEM', 'Item keranjang tidak cocok dengan siswa.', 'Cart item does not match student.');
    }
    return { billId, childIdFromPrefix: cid };
  }
  const prev = /^prev-(\d+)-(\d+)$/.exec(id);
  if (prev) {
    const cid = Number(prev[1]);
    const billId = Number(prev[2]);
    if (cid !== childId || !Number.isFinite(billId)) {
      throw new CheckoutValidationError('INVALID_CART_ITEM', 'Item keranjang tidak cocok dengan siswa.', 'Cart item does not match student.');
    }
    return { billId, childIdFromPrefix: cid };
  }
  const inst = /^inst-(\d+)$/.exec(id);
  if (inst) {
    const billId = Number(inst[1]);
    if (!Number.isFinite(billId)) {
      throw new CheckoutValidationError('INVALID_CART_ITEM', 'Tagihan cicilan tidak valid.', 'Invalid installment bill id.');
    }
    return { billId, childIdFromPrefix: null };
  }
  throw new CheckoutValidationError('INVALID_CART_ITEM', 'Format item keranjang tidak dikenal.', 'Unknown cart item id format.');
}

function pickSchoolVaParts(row: Record<string, unknown>): { bankChannel: string; schoolCode: string } {
  const id = Number(row.id ?? 0);
  const rawBin = row.bank_channel_code ?? row.bankChannelCode;
  const rawSc = row.school_code ?? row.schoolCode;
  const binStr = typeof rawBin === 'string' && rawBin.trim() !== '' ? rawBin : String(id);
  const scStr = typeof rawSc === 'string' && rawSc.trim() !== '' ? rawSc : String(id);
  return { bankChannel: binStr, schoolCode: scStr };
}

function isInstallmentBill(r: BillRow): boolean {
  if (r.payment_type === 'monthly') return false;
  if (r.is_installment) return true;
  return r.payment_type === 'installment';
}

function validateAmountAgainstBill(row: BillRow, payAmount: number): void {
  const balance = num(row.balance_amount);
  const minPay = num(row.min_payment);
  if (payAmount <= 0) {
    throw new CheckoutValidationError('INVALID_AMOUNT', 'Jumlah pembayaran harus lebih dari 0.', 'Amount must be positive.');
  }
  if (payAmount > balance + 0.005) {
    throw new CheckoutValidationError(
      'AMOUNT_EXCEEDS_BALANCE',
      'Jumlah melebihi sisa tagihan.',
      'Amount exceeds bill balance.',
    );
  }
  if (isInstallmentBill(row) && payAmount < balance) {
    const floor = minPay > 0 ? minPay : 1;
    if (payAmount + 0.005 < floor) {
      throw new CheckoutValidationError(
        'BELOW_MIN_PAYMENT',
        `Minimum pembayaran untuk cicilan adalah ${floor}.`,
        `Minimum payment for this installment is ${floor}.`,
      );
    }
  }
}

function newReferenceNo(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRX-${Date.now()}-${rand}`;
}

export async function finalizePortalCheckout(params: {
  viewerUserId: number;
  viewerRole: string;
  cart: PortalCheckoutCartItem[];
  paymentMethodId: number;
}): Promise<PortalCheckoutDbResult> {
  const { viewerUserId, viewerRole, cart, paymentMethodId } = params;

  if (!Array.isArray(cart) || cart.length === 0) {
    throw new CheckoutValidationError('EMPTY_CART', 'Keranjang kosong.', 'Cart is empty.');
  }

  const childIds = [...new Set(cart.map((c) => Math.trunc(num(c.childId))))].filter((id) => id > 0);
  if (childIds.length !== 1) {
    throw new CheckoutValidationError(
      'MULTI_STUDENT',
      'Untuk saat ini pembayaran hanya untuk satu siswa per transaksi. Kosongkan keranjang atau bayar per anak.',
      'Checkout supports one student per transaction. Please pay per child.',
    );
  }
  const studentId = childIds[0];

  const allowed = await getStudentIdsAccessibleToViewer(viewerUserId, viewerRole);
  if (!allowed.includes(studentId)) {
    throw new CheckoutValidationError('FORBIDDEN_STUDENT', 'Akses ditolak untuk siswa ini.', 'Access denied for this student.');
  }

  const methodOk = await viewerCanUsePublishedPaymentMethod(viewerUserId, viewerRole, paymentMethodId);
  if (!methodOk) {
    throw new CheckoutValidationError('METHOD_FORBIDDEN', 'Metode pembayaran tidak tersedia.', 'Payment method is not available.');
  }

  const pmRows = (await sql`
    SELECT id, name, code, vendor
    FROM tuition_payment_methods
    WHERE id = ${paymentMethodId}
      AND is_active IS TRUE
      AND is_publish IS TRUE
    LIMIT 1
  `) as unknown as { id: number; name: string; code: string; vendor: string | null }[];
  if (pmRows.length === 0) {
    throw new CheckoutValidationError('METHOD_NOT_FOUND', 'Metode pembayaran tidak ditemukan.', 'Payment method not found.');
  }
  const pm = pmRows[0];
  const bmi = isBmiPaymentMethod(pm.vendor, pm.code);

  const billKeys = cart.map((item) => parseCartBillKey(item));
  const billIds = [...new Set(billKeys.map((k) => normBillId(k.billId)).filter((id) => Number.isFinite(id)))];

  const billRowsRaw = (await sql`
    SELECT
      bill_id,
      student_id,
      academic_year_id,
      product_id,
      title,
      balance_amount,
      min_payment,
      is_installment,
      payment_type
    FROM v_portal_finance_bills
    WHERE student_id = ${studentId}
      AND bill_id = ANY(${billIds}::int4[])
  `) as unknown as Record<string, unknown>[];

  const billRows: BillRow[] = billRowsRaw
    .map((raw) => ({
      bill_id: normBillId(raw.bill_id ?? raw.billId),
      student_id: num(raw.student_id ?? raw.studentId),
      academic_year_id: num(raw.academic_year_id ?? raw.academicYearId),
      product_id: num(raw.product_id ?? raw.productId),
      title: String(raw.title ?? ''),
      balance_amount: raw.balance_amount ?? raw.balanceAmount,
      min_payment: raw.min_payment ?? raw.minPayment,
      is_installment:
        raw.is_installment === true ||
        raw.is_installment === 't' ||
        raw.is_installment === 'true' ||
        raw.isInstallment === true,
      payment_type: String(raw.payment_type ?? raw.paymentType ?? ''),
    }))
    .filter((r) => Number.isFinite(r.bill_id) && r.bill_id > 0);

  const rowIds = new Set(billRows.map((r) => r.bill_id).filter((id) => Number.isFinite(id)));
  if (rowIds.size !== billIds.length) {
    throw new CheckoutValidationError('BILL_NOT_FOUND', 'Salah satu tagihan tidak ditemukan.', 'One or more bills were not found.');
  }

  const byBillId = new Map(billRows.map((r) => [r.bill_id, r]));
  const academicYears = new Set<number>();
  for (const r of billRows) {
    academicYears.add(r.academic_year_id);
  }
  if (academicYears.size > 1) {
    throw new CheckoutValidationError(
      'MIXED_ACADEMIC_YEAR',
      'Gabung tagihan lintas tahun ajaran belum didukung dalam satu transaksi.',
      'Mixing bills from different academic years in one checkout is not supported.',
    );
  }
  const academicYearId = billRows[0].academic_year_id;

  const billLines: { billId: number; title: string; amount: number }[] = [];
  for (const item of cart) {
    const { billId: rawBid } = parseCartBillKey(item);
    const billId = normBillId(rawBid);
    const row = byBillId.get(billId);
    if (!row) {
      throw new CheckoutValidationError('BILL_NOT_FOUND', 'Tagihan tidak ditemukan.', 'Bill not found.');
    }
    validateAmountAgainstBill(row, item.amount);
    billLines.push({ billId, title: item.title || row.title, amount: item.amount });
  }

  const totalAmount = cart.reduce((s, i) => s + i.amount, 0);

  const stRows = (await sql`
    SELECT s.id AS "studentId", s.full_name AS "fullName", s.school_id AS "schoolId"
    FROM core_students s
    WHERE s.id = ${studentId}
      AND s.enrollment_status = 'active'
    LIMIT 1
  `) as unknown as { studentId: number; fullName: string; schoolId: number }[];
  if (stRows.length === 0) {
    throw new CheckoutValidationError('STUDENT_NOT_FOUND', 'Siswa tidak ditemukan.', 'Student not found.');
  }
  const st = stRows[0];
  const schoolId = Number(st.schoolId);
  if (!Number.isFinite(schoolId) || schoolId <= 0) {
    throw new CheckoutValidationError('SCHOOL_NOT_FOUND', 'Sekolah siswa tidak valid.', 'Invalid student school.');
  }

  const schoolRows = (await sql`
    SELECT *
    FROM core_schools
    WHERE id = ${schoolId}
    LIMIT 1
  `) as unknown as Record<string, unknown>[];
  if (schoolRows.length === 0) {
    throw new CheckoutValidationError('SCHOOL_NOT_FOUND', 'Sekolah tidak ditemukan.', 'School not found.');
  }
  const schoolRow = schoolRows[0];
  const schoolName = String(schoolRow.name ?? '');
  const vaParts = pickSchoolVaParts(schoolRow);

  const referenceNo = newReferenceNo();

  const ins = (await sql`
    INSERT INTO tuition_transactions (
      user_id,
      student_id,
      academic_year_id,
      reference_no,
      total_amount,
      payment_method_id,
      va_no,
      status,
      is_whatsapp_checkout,
      created_at
    )
    VALUES (
      ${viewerUserId},
      ${studentId},
      ${academicYearId},
      ${referenceNo},
      ${totalAmount},
      ${paymentMethodId},
      NULL,
      'pending',
      false,
      NOW()
    )
    RETURNING id AS "transactionId"
  `) as unknown as { transactionId: bigint | number }[];

  if (ins.length === 0) {
    throw new CheckoutValidationError('INSERT_FAILED', 'Gagal membuat transaksi.', 'Failed to create transaction.');
  }

  const transactionId = ins[0].transactionId;
  const tidStr = String(transactionId);

  let vaNo: string | null = null;
  let vaDisplay: string | null = null;

  try {
    if (bmi) {
      const va = buildBmiVa16({
        bankChannelCode: vaParts.bankChannel,
        schoolCode: vaParts.schoolCode,
        transactionId: typeof transactionId === 'bigint' ? transactionId : Number(transactionId),
      });
      vaNo = va;
      vaDisplay = va.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

      await sql`
        UPDATE tuition_transactions
        SET va_no = ${vaNo}
        WHERE (id, created_at) = (
          SELECT id, created_at
          FROM tuition_transactions
          WHERE id = ${transactionId}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;
    }

    const maxRow = (await sql`
      SELECT COALESCE(MAX(d.id), 0)::int8 AS "m"
      FROM tuition_transaction_details d
      WHERE d.transaction_id = ${transactionId}
        AND d.transaction_created_at = (
          SELECT created_at
          FROM tuition_transactions
          WHERE id = ${transactionId}
          ORDER BY created_at DESC
          LIMIT 1
        )
    `) as unknown as { m: bigint | number }[];
    const nextDetailId = Number(maxRow[0]?.m ?? 0) + 1;

    if (billLines.length > 0) {
      const detailIds = billLines.map((_, i) => nextDetailId + i);
      const billIdsArr = billLines.map((l) => l.billId);
      const productIdsArr = billLines.map((l) => {
        const r = byBillId.get(l.billId);
        if (!r) {
          throw new CheckoutValidationError('INTERNAL', 'Data tagihan tidak konsisten.', 'Inconsistent bill data.');
        }
        return Number(r.product_id);
      });
      const amountsArr = billLines.map((l) => l.amount);

      await sql`
        INSERT INTO tuition_transaction_details (
          id,
          transaction_id,
          transaction_created_at,
          bill_id,
          product_id,
          amount_paid,
          student_id,
          created_at
        )
        SELECT
          u.detail_id,
          t.id,
          t.created_at,
          u.bill_id,
          u.product_id,
          u.amount_paid,
          ${studentId},
          NOW()
        FROM unnest(
          ${detailIds}::int8[],
          ${billIdsArr}::int4[],
          ${productIdsArr}::int4[],
          ${amountsArr}::float8[]
        ) AS u(detail_id, bill_id, product_id, amount_paid)
        INNER JOIN LATERAL (
          SELECT id, created_at
          FROM tuition_transactions
          WHERE id = ${transactionId}
          ORDER BY created_at DESC
          LIMIT 1
        ) t ON true
      `;
    }
  } catch (e) {
    try {
      await sql`
        DELETE FROM tuition_transaction_details
        WHERE (transaction_id, transaction_created_at) IN (
          SELECT id, created_at
          FROM tuition_transactions
          WHERE id = ${transactionId}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;
    } catch {
      /* ignore */
    }
    try {
      await sql`
        DELETE FROM tuition_transactions
        WHERE (id, created_at) IN (
          SELECT id, created_at
          FROM tuition_transactions
          WHERE id = ${transactionId}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;
    } catch {
      /* ignore */
    }
    throw e;
  }

  const tailRows = (await sql`
    SELECT created_at AS "transactionCreatedAt"
    FROM tuition_transactions
    WHERE id = ${transactionId}
    ORDER BY created_at DESC
    LIMIT 1
  `) as unknown as { transactionCreatedAt: Date | string }[];
  const tailCa = tailRows[0]?.transactionCreatedAt;
  const tcat =
    tailCa == null
      ? new Date().toISOString()
      : typeof tailCa === 'string'
        ? tailCa
        : tailCa instanceof Date
          ? tailCa.toISOString()
          : String(tailCa);

  const createdMsForExpiry = new Date(tcat).getTime();
  const expiryAt = computePortalPaymentExpiryIso(Number.isFinite(createdMsForExpiry) ? createdMsForExpiry : Date.now());

  const themeIdForInstr = num(schoolRow.theme_id);
  const instructionRows = await fetchInstructionsFromDb(
    paymentMethodId,
    paymentInstructionDbLangFromThemeId(themeIdForInstr),
  );

  return {
    transactionId: tidStr,
    transactionCreatedAt: tcat,
    referenceNo,
    totalAmount,
    studentId,
    studentName: st.fullName,
    schoolId,
    schoolName,
    academicYearId,
    isBmi: bmi,
    vaNo,
    vaDisplay,
    expiryAt,
    billLines,
    paymentMethodLabel: String(pm.name ?? ''),
    paymentMethodId: Number(pm.id),
    instructionRows,
  };
}
