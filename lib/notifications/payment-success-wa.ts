import type { PaymentSuccessWhatsAppJobBody } from '@/lib/qstash/payment-success-whatsapp-job';
import { sql } from '@/lib/db/client';
import { formatRupiah } from '@/lib/utils/format';
import { normalizeIdWhatsApp } from '@/lib/notifications/checkout-wa';
import { postStarSenderText } from '@/lib/notifications/starsender';

function substituteTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

async function resolveRecipientPhone(studentId: number, fallbackUserId: number): Promise<string | null> {
  const parentRows = (await sql`
    SELECT phone
    FROM core_student_parent_profiles
    WHERE student_id = ${studentId}
      AND phone IS NOT NULL
      AND trim(phone) <> ''
    ORDER BY
      CASE lower(trim(coalesce(relation_type::text, '')))
        WHEN 'father' THEN 1
        WHEN 'mother' THEN 2
        ELSE 3
      END
    LIMIT 1
  `) as unknown as { phone: string }[];
  if (parentRows.length > 0) {
    const n = normalizeIdWhatsApp(parentRows[0].phone);
    if (n) return n;
  }
  const userRows = (await sql`
    SELECT phone
    FROM core_users
    WHERE id = ${fallbackUserId}
    LIMIT 1
  `) as unknown as { phone: string | null }[];
  if (userRows.length > 0 && userRows[0].phone) {
    return normalizeIdWhatsApp(userRows[0].phone);
  }
  return null;
}

function paymentSuccessTriggerForTheme(themeId: number | null | undefined): string {
  if (themeId === 1) return 'PAYMENT_SUCCESS_EN';
  return 'PAYMENT_SUCCESS';
}

async function loadPaymentSuccessTemplate(trigger: string): Promise<{ id: number; content: string } | null> {
  const rows = (await sql`
    SELECT id, content
    FROM notif_templates
    WHERE trigger_event = ${trigger}
      AND is_active IS TRUE
      AND school_id IS NULL
    ORDER BY id ASC
    LIMIT 1
  `) as unknown as { id: number; content: string }[];
  if (rows.length === 0) return null;
  return { id: Number(rows[0].id), content: String(rows[0].content ?? '') };
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

export type ProcessPaymentSuccessWaResult = {
  outcome: 'sent' | 'skipped' | 'failed';
  retryableFailure: boolean;
  error?: string;
};

/**
 * Kirim WA PAYMENT_SUCCESS (StarSender), `notif_logs`, set `is_whatsapp_paid`.
 */
export async function processPaymentSuccessWhatsAppJob(
  body: PaymentSuccessWhatsAppJobBody,
): Promise<ProcessPaymentSuccessWaResult> {
  console.info('payment_success_wa_start', body);
  const idNum = Number(body.transactionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return { outcome: 'failed', retryableFailure: false, error: 'bad_transaction_id' };
  }

  const head = (await sql`
    SELECT
      t.id,
      t.created_at,
      t.user_id,
      t.reference_no,
      (t.total_amount)::float8 AS total_amount,
      t.payment_method_id,
      t.payment_date,
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

  const dupWa = (await sql`
    SELECT id
    FROM notif_logs
    WHERE user_id = ${body.userId}
      AND type = 'whatsapp'
      AND status = 'success'
      AND request_payload LIKE '%"job":"payment_success"%'
      AND request_payload LIKE ${`%"transactionId":${idNum}%`}
    LIMIT 1
  `) as unknown as { id: number }[];
  if (dupWa.length > 0) {
    return { outcome: 'sent', retryableFailure: false };
  }

  const ctxRows = (await sql`
    SELECT DISTINCT
      b.student_id AS "studentId",
      s.full_name AS "studentName",
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

  const trigger = paymentSuccessTriggerForTheme(themeId);
  const template = await loadPaymentSuccessTemplate(trigger);
  const to = await resolveRecipientPhone(ctx.studentId, body.userId);

  const payMs = h.payment_date ? new Date(String(h.payment_date)).getTime() : Date.now();
  const paymentDateStr = new Date(Number.isFinite(payMs) ? payMs : Date.now()).toLocaleString(
    themeId === 1 ? 'en-GB' : 'id-ID',
    { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' },
  );

  const methodsLabel = `${String(h.pm_name ?? 'Virtual Account')} (${channelLabel(body.channelId)})`;

  const vars: Record<string, string> = {
    student_name: String(ctx.studentName ?? ''),
    bill_title: billTitle,
    amount: formatRupiah(Number(h.total_amount)),
    payment_methods: methodsLabel,
    payment_date: paymentDateStr,
  };

  if (!template || !to) {
    const reason = !template ? 'no_template' : 'no_phone';
    await sql`
      INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
      VALUES (
        ${body.userId},
        ${template?.id ?? null},
        'whatsapp',
        ${to ?? '-'},
        ${JSON.stringify({
          job: 'payment_success',
          transactionId: idNum,
          reason,
          referenceNo: h.reference_no,
        }).slice(0, 5000)},
        NULL,
        'skipped'
      )
    `;
    await sql`
      UPDATE tuition_transactions
      SET is_whatsapp_paid = 't'
      WHERE id = ${idNum} AND user_id = ${body.userId}
    `;
    return { outcome: 'skipped', retryableFailure: false };
  }

  const bodyText = substituteTemplate(template.content, vars);
  const starSenderPayload = { messageType: 'text', to, body: bodyText };

  const star = await postStarSenderText({ to, body: bodyText, themeId });
  const status = star.ok ? 'success' : 'failed';

  await sql`
    INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
    VALUES (
      ${body.userId},
      ${template.id},
      'whatsapp',
      ${to},
      ${JSON.stringify({ job: 'payment_success', transactionId: idNum, ...starSenderPayload }).slice(0, 5000)},
      ${JSON.stringify({ httpStatus: star.status, body: star.responseText }).slice(0, 5000)},
      ${status}
    )
  `;

  if (!star.ok) {
    return { outcome: 'failed', retryableFailure: true, error: 'starsender_failed' };
  }

  await sql`
    UPDATE tuition_transactions
    SET is_whatsapp_paid = 't'
    WHERE id = ${idNum} AND user_id = ${body.userId}
  `;

  return { outcome: 'sent', retryableFailure: false };
}
