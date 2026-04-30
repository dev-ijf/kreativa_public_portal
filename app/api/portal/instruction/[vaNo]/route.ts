import { NextResponse } from 'next/server';
import { getCachedServerSession } from '@/lib/auth-cached';
import { getPaymentInstructionsForPortalViewer } from '@/lib/data/server/payment-methods';
import { sql } from '@/lib/db/client';
import { computePortalPaymentExpiryIso } from '@/lib/utils/payment-deadline';
import { isBmiPaymentMethod } from '@/lib/utils/bmi-method';
import { parsePortalDbTimestamp, portalDbTimestampToIsoUtc } from '@/lib/utils/datetime-jakarta';
import { getStudentIdsAccessibleToViewer } from '@/lib/data/server/finance';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ vaNo: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getCachedServerSession();
  const userId = session?.user?.userId;
  const role = session?.user?.role ?? '';
  if (userId == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { vaNo } = await ctx.params;
  const vaClean = (vaNo ?? '').replace(/\D/g, '');
  if (!vaClean || vaClean.length < 6) {
    return NextResponse.json({ error: 'Invalid VA number' }, { status: 400 });
  }

  const allowedIds = await getStudentIdsAccessibleToViewer(userId, role);

  const txRows = (await sql`
    SELECT
      t.id,
      (t.created_at AT TIME ZONE 'UTC') AS created_at,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.status,
      t.payment_date,
      t.va_no,
      t.payment_method_id,
      t.student_id,
      pm.name AS pm_name,
      pm.code AS pm_code,
      pm.category AS pm_category,
      pm.vendor AS pm_vendor,
      pm.logo_url AS pm_logo_url
    FROM tuition_transactions t
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.va_no = ${vaClean}
      AND t.user_id = ${userId}
    ORDER BY t.created_at DESC
    LIMIT 1
  `) as unknown as {
    id: number;
    created_at: string;
    reference_no: string;
    total_amount: number;
    status: string;
    payment_date: string | null;
    va_no: string;
    payment_method_id: number | null;
    student_id: number | null;
    pm_name: string | null;
    pm_code: string | null;
    pm_category: string | null;
    pm_vendor: string | null;
    pm_logo_url: string | null;
  }[];

  if (txRows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const tx = txRows[0];

  if (tx.student_id != null && !allowedIds.includes(tx.student_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const methodId = tx.payment_method_id;
  const isBmi = methodId != null ? isBmiPaymentMethod(tx.pm_vendor, tx.pm_code) : false;
  const createdAtMs = parsePortalDbTimestamp(tx.created_at).getTime();
  const expiryAt = computePortalPaymentExpiryIso(Number.isFinite(createdAtMs) ? createdAtMs : Date.now());
  const transactionCreatedAtIso = Number.isFinite(createdAtMs)
    ? new Date(createdAtMs).toISOString()
    : '';

  let instructionRows: { id: number; title: string; description: string; stepOrder: number | null }[] = [];
  if (methodId != null && methodId > 0) {
    const rows = await getPaymentInstructionsForPortalViewer(
      userId,
      role,
      methodId,
      tx.student_id != null ? { studentId: tx.student_id } : undefined,
    );
    if (rows != null) {
      instructionRows = rows;
    }
  }

  const vaDisplay = vaClean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

  return NextResponse.json({
    transactionId: String(tx.id),
    transactionCreatedAt: transactionCreatedAtIso,
    referenceNo: tx.reference_no,
    totalAmount: tx.total_amount,
    status: tx.status,
    paymentDate: tx.payment_date == null ? null : portalDbTimestampToIsoUtc(tx.payment_date) || null,
    vaNo: vaClean,
    vaDisplay,
    expiryAt,
    isBmi,
    studentId: tx.student_id,
    paymentMethodId: methodId,
    paymentMethodName: tx.pm_name,
    paymentMethodCode: tx.pm_code,
    paymentMethodCategory: tx.pm_category,
    paymentMethodVendor: tx.pm_vendor,
    paymentMethodLogoUrl: tx.pm_logo_url,
    instructionRows,
  });
}
