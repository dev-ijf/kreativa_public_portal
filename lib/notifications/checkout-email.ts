import { fetchInstructionsFromDb } from '@/lib/data/server/payment-methods';
import type { PaymentInstructionDbLang } from '@/lib/utils/payment-instruction-lang';
import { formatRupiah } from '@/lib/utils/format';
import { computePortalPaymentExpiryMs } from '@/lib/utils/payment-deadline';
import { formatDateTimeAsiaJakarta, parsePortalDbTimestamp } from '@/lib/utils/datetime-jakarta';
import { sql } from '@/lib/db/client';
import { substituteAtTemplate, wrapPaymentEmailHtml } from '@/lib/notifications/email-template';
import { sendTenantEmail } from '@/lib/notifications/smtp';

export type CheckoutEmailJobBody = {
  transactionId: string;
  transactionCreatedAt?: string;
  userId: number;
};

export type ProcessCheckoutEmailResult = {
  outcome: 'sent' | 'skipped' | 'failed';
  retryableFailure: boolean;
  error?: string;
};

function checkoutEmailTriggerForTheme(themeId: number | null | undefined): string {
  if (themeId === 1) return 'ON_PAYMENT_CHECKOUT_EN';
  return 'ON_PAYMENT_CHECKOUT';
}

async function loadEmailConfigByTrigger(
  trigger: string,
): Promise<{ id: number; subject: string; message: string } | null> {
  // is_active may be boolean or text ('t' / 'true') depending on dump/column type.
  const rows = (await sql`
    SELECT id, subject_template AS subject, message_template AS message
    FROM email_notif_configs
    WHERE trigger_event = ${trigger}
      AND (
        is_active IS TRUE
        OR lower(trim(COALESCE(is_active::text, ''))) IN ('t', 'true', '1', 'yes')
      )
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

/** Digits only — easy to copy/tap; matches WhatsApp checkout VA. */
function formatVaDigits(va: string | null): string {
  if (!va) return '';
  return va.replace(/\D/g, '');
}

async function loadInstructionHtml(methodId: number, lang: PaymentInstructionDbLang): Promise<string> {
  const rows = await fetchInstructionsFromDb(methodId, lang);
  return rows
    .map((r) => {
      const title = String(r.title ?? '').trim();
      const body = String(r.description ?? '').trim();
      if (!title && !body) return '';
      return `<p><strong>${title}</strong></p>${body}`;
    })
    .filter((s) => s.length > 0)
    .join('');
}

/**
 * Kirim email checkout dari email_notif_configs (ON_PAYMENT_CHECKOUT / _EN).
 * Recipient = core_users.email untuk user yang login (pembuat transaksi).
 */
export async function processCheckoutEmailJob(
  body: CheckoutEmailJobBody,
): Promise<ProcessCheckoutEmailResult> {
  console.info('checkout_email_start', { transactionId: body.transactionId, userId: body.userId });
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
      AND request_payload LIKE '%"job":"checkout_email"%'
      AND request_payload LIKE ${`%"transactionId":${idNum}%`}
    LIMIT 1
  `) as unknown as { id: number }[];
  if (dup.length > 0) {
    console.info('checkout_email_already_sent', { transactionId: idNum });
    return { outcome: 'sent', retryableFailure: false };
  }

  const head = (await sql`
    SELECT
      t.id,
      (t.created_at AT TIME ZONE 'UTC') AS created_at,
      t.user_id,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.va_no,
      t.payment_method_id,
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
    va_no: string | null;
    payment_method_id: number | null;
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
      sch.id AS "schoolId",
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
    schoolId: number;
    schoolName: string;
    themeId: number | null;
  }[];

  if (ctxRows.length === 0) {
    return { outcome: 'failed', retryableFailure: false, error: 'no_bill_context' };
  }

  const ctx = ctxRows[0];
  const themeId = ctx.themeId != null ? Number(ctx.themeId) : null;
  const trigger = checkoutEmailTriggerForTheme(themeId);
  const template = await loadEmailConfigByTrigger(trigger);
  const to = await resolveRecipientEmail(body.userId);

  const lineRows = (await sql`
    SELECT
      COALESCE(NULLIF(trim(b.title), ''), p.name, 'Pembayaran') AS title,
      (d.amount_paid)::float8 AS amount
    FROM tuition_transaction_details d
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE d.transaction_id = ${idNum}
    ORDER BY d.id ASC
  `) as unknown as { title: string; amount: number }[];

  const billDetails = lineRows
    .map((l) => `${l.title}: ${formatRupiah(Number(l.amount))}`)
    .join('<br>');

  const methodId = Number(h.payment_method_id);
  const [instrIdHtml, instrEnHtml] = await Promise.all([
    Number.isFinite(methodId) && methodId > 0 ? loadInstructionHtml(methodId, 'ID') : Promise.resolve(''),
    Number.isFinite(methodId) && methodId > 0 ? loadInstructionHtml(methodId, 'EN') : Promise.resolve(''),
  ]);

  const createdMs = parsePortalDbTimestamp(h.created_at).getTime();
  const expiryMs = computePortalPaymentExpiryMs(Number.isFinite(createdMs) ? createdMs : Date.now());
  const expiryDateStr = formatDateTimeAsiaJakarta(
    new Date(expiryMs).toISOString(),
    themeId === 1 ? 'en' : 'id',
  );
  const vaDigits = formatVaDigits(h.va_no);

  const vars: Record<string, string> = {
    school_name: String(ctx.schoolName ?? ''),
    student_name: String(ctx.studentName ?? ''),
    bill_details: billDetails || '-',
    total_amount: formatRupiah(Number(h.total_amount)),
    payment_methods: String(h.pm_name ?? '—'),
    va_number: vaDigits || h.va_no || '-',
    expiry_date: expiryDateStr,
    payment_instructions: instrIdHtml || '-',
    payment_instructions_en: instrEnHtml || '-',
  };

  if (!template || !to) {
    const reason = !template ? 'no_template' : 'no_email';
    console.warn('checkout_email_skip', { reason, transactionId: idNum, trigger, to: to ?? null });
    await sql`
      INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
      VALUES (
        ${body.userId},
        ${template?.id ?? null},
        'email',
        ${to ?? '-'},
        ${JSON.stringify({
          job: 'checkout_email',
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
    kind: 'checkout',
    innerHtml,
    schoolName: String(ctx.schoolName ?? ''),
  });

  console.info('checkout_email_sending', {
    transactionId: idNum,
    to,
    themeId,
    trigger,
    subjectLen: subject.length,
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
        job: 'checkout_email',
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
