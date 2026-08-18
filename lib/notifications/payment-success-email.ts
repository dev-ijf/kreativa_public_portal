import { sql } from '@/lib/db/client';
import { formatRupiah } from '@/lib/utils/format';
import { formatDateTimeAsiaJakarta, parsePortalDbTimestamp } from '@/lib/utils/datetime-jakarta';
import { substituteAtTemplate, wrapPaymentEmailHtml } from '@/lib/notifications/email-template';
import { sendTenantEmail } from '@/lib/notifications/smtp';

export type PaymentSuccessEmailJobBody = {
  transactionId: string;
  userId: number;
  /** Channel BMI: 1 ATM, 2 Teller, 3 iBanking, 4 EDC, 5 mBanking */
  channelId?: string;
};

export type ProcessPaymentSuccessEmailResult = {
  outcome: 'sent' | 'skipped' | 'failed';
  retryableFailure: boolean;
  error?: string;
};

function paymentSuccessEmailTriggerForTheme(themeId: number | null | undefined): string {
  if (themeId === 1) return 'ON_PAYMENT_PAID_EN';
  return 'ON_PAYMENT_PAID';
}

async function loadEmailConfigByTrigger(
  trigger: string,
): Promise<{ id: number; subject: string; message: string } | null> {
  const rows = (await sql`
    SELECT id, subject_template AS subject, message_template AS message
    FROM email_notif_configs
    WHERE trigger_event = ${trigger}
      AND is_active IS TRUE
    ORDER BY id ASC
    LIMIT 1
  `) as unknown as { id: number; subject: string; message: string }[];
  if (rows.length === 0) return null;
  return {
    id: Number(rows[0].id),
    subject: String(rows[0].subject ?? ''),
    message: String(rows[0].message ?? ''),
  };
}

async function resolveRecipientEmail(userId: number): Promise<string | null> {
  const rows = (await sql`
    SELECT email
    FROM core_users
    WHERE id = ${userId}
    LIMIT 1
  `) as unknown as { email: string | null }[];
  const email = String(rows[0]?.email ?? '').trim();
  if (!email || !email.includes('@')) return null;
  return email;
}

function channelLabel(channelId: string | undefined): string {
  const m: Record<string, string> = {
    '1': 'ATM',
    '2': 'Teller',
    '3': 'Internet Banking',
    '4': 'EDC',
    '5': 'Mobile Banking',
  };
  const k = String(channelId ?? '').trim();
  return m[k] ?? (k ? `Channel ${k}` : 'Virtual Account');
}

/**
 * Kirim email pembayaran sukses dari email_notif_configs (ON_PAYMENT_PAID / _EN).
 * Recipient = core_users.email untuk user_id transaksi.
 */
export async function processPaymentSuccessEmailJob(
  body: PaymentSuccessEmailJobBody,
): Promise<ProcessPaymentSuccessEmailResult> {
  console.info('payment_success_email_start', {
    transactionId: body.transactionId,
    userId: body.userId,
  });
  const idNum = Number(body.transactionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return { outcome: 'failed', retryableFailure: false, error: 'bad_transaction_id' };
  }

  const dup = (await sql`
    SELECT id
    FROM notif_logs
    WHERE user_id = ${body.userId}
      AND type = 'email'
      AND status = 'success'
      AND request_payload LIKE '%"job":"payment_success_email"%'
      AND request_payload LIKE ${`%"transactionId":${idNum}%`}
    LIMIT 1
  `) as unknown as { id: number }[];
  if (dup.length > 0) {
    return { outcome: 'sent', retryableFailure: false };
  }

  const head = (await sql`
    SELECT
      t.id,
      t.created_at,
      t.user_id,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.payment_method_id,
      (t.payment_date AT TIME ZONE 'UTC') AS payment_date,
      pm.name AS pm_name
    FROM tuition_transactions t
    LEFT JOIN tuition_payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.id = ${idNum}
      AND t.user_id = ${body.userId}
    ORDER BY t.created_at DESC
    LIMIT 1
  `) as unknown as {
    id: number;
    created_at: string;
    user_id: number;
    reference_no: string;
    total_amount: number;
    payment_method_id: number | null;
    payment_date: string | null;
    pm_name: string | null;
  }[];

  if (head.length === 0) {
    return { outcome: 'failed', retryableFailure: false, error: 'transaction_not_found' };
  }

  const h = head[0];

  const ctxRows = (await sql`
    SELECT DISTINCT
      b.student_id AS "studentId",
      s.full_name AS "studentName",
      sch.name AS "schoolName",
      sch.theme_id AS "themeId"
    FROM tuition_transaction_details d
    INNER JOIN tuition_bills b ON b.id = d.bill_id
    INNER JOIN core_students s ON s.id = b.student_id
    INNER JOIN core_schools sch ON sch.id = s.school_id
    WHERE d.transaction_id = ${idNum}
    LIMIT 1
  `) as unknown as {
    studentId: number;
    studentName: string;
    schoolName: string;
    themeId: number | null;
  }[];

  if (ctxRows.length === 0) {
    return { outcome: 'failed', retryableFailure: false, error: 'no_bill_context' };
  }

  const ctx = ctxRows[0];
  const themeId = ctx.themeId != null ? Number(ctx.themeId) : null;

  const lineRows = (await sql`
    SELECT COALESCE(NULLIF(trim(b.title), ''), p.name, 'Pembayaran') AS title
    FROM tuition_transaction_details d
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE d.transaction_id = ${idNum}
    ORDER BY d.id ASC
  `) as unknown as { title: string }[];

  const billTitle =
    lineRows.length === 0 ? 'Pembayaran' : lineRows.map((r) => r.title).join(', ').slice(0, 200);

  const trigger = paymentSuccessEmailTriggerForTheme(themeId);
  const template = await loadEmailConfigByTrigger(trigger);
  const to = await resolveRecipientEmail(body.userId);

  const payMs = h.payment_date ? parsePortalDbTimestamp(h.payment_date).getTime() : Date.now();
  const paymentDateStr = formatDateTimeAsiaJakarta(
    new Date(Number.isFinite(payMs) ? payMs : Date.now()).toISOString(),
    themeId === 1 ? 'en' : 'id',
  );

  const methodsLabel = `${String(h.pm_name ?? 'Virtual Account')} (${channelLabel(body.channelId)})`;
  const totalFormatted = formatRupiah(Number(h.total_amount));

  const vars: Record<string, string> = {
    student_name: String(ctx.studentName ?? ''),
    school_name: String(ctx.schoolName ?? ''),
    bill_title: billTitle,
    total_amount: totalFormatted,
    amount: totalFormatted,
    payment_methods: methodsLabel,
    payment_date: paymentDateStr,
  };

  if (!template || !to) {
    const reason = !template ? 'no_template' : 'no_email';
    await sql`
      INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
      VALUES (
        ${body.userId},
        ${template?.id ?? null},
        'email',
        ${to ?? '-'},
        ${JSON.stringify({
          job: 'payment_success_email',
          transactionId: idNum,
          reason,
          referenceNo: h.reference_no,
          trigger,
        }).slice(0, 5000)},
        NULL,
        'skipped'
      )
    `;
    return { outcome: 'skipped', retryableFailure: false };
  }

  const subject = substituteAtTemplate(template.subject, vars);
  const innerHtml = substituteAtTemplate(template.message, vars);
  const html = wrapPaymentEmailHtml({
    themeId,
    kind: 'paid',
    innerHtml,
    schoolName: String(ctx.schoolName ?? ''),
  });

  const sent = await sendTenantEmail({ themeId, to, subject, html });
  const status = sent.ok ? 'success' : 'failed';

  await sql`
    INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
    VALUES (
      ${body.userId},
      ${template.id},
      'email',
      ${to},
      ${JSON.stringify({
        job: 'payment_success_email',
        transactionId: idNum,
        trigger,
        subject,
        referenceNo: h.reference_no,
      }).slice(0, 5000)},
      ${JSON.stringify({
        ok: sent.ok,
        messageId: sent.messageId ?? null,
        error: sent.error ?? null,
      }).slice(0, 5000)},
      ${status}
    )
  `;

  if (!sent.ok) {
    return { outcome: 'failed', retryableFailure: true, error: sent.error ?? 'smtp_failed' };
  }

  return { outcome: 'sent', retryableFailure: false };
}
