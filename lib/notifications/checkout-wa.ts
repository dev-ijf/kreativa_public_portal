import type { CheckoutWhatsAppJobBody } from '@/lib/qstash/checkout-whatsapp-job';
import { fetchInstructionsFromDb } from '@/lib/data/server/payment-methods';
import { formatRupiah } from '@/lib/utils/format';
import { computePortalPaymentExpiryMs } from '@/lib/utils/payment-deadline';
import { sql } from '@/lib/db/client';
import { postStarSenderText } from '@/lib/notifications/starsender';

async function loadInstructionPlainText(methodId: number): Promise<string> {
  const rows = await fetchInstructionsFromDb(methodId);
  return rows
    .map((r) => {
      const plain = String(r.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${r.title}: ${plain}`;
    })
    .filter(Boolean)
    .join('\n');
}

function substituteTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

export function normalizeIdWhatsApp(phone: string): string | null {
  const raw = phone.trim();
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = `62${d.slice(1)}`;
  else if (d.startsWith('8') && d.length >= 10) d = `62${d}`;
  if (d.length < 10) return null;
  return d;
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

function checkoutTriggerForTheme(themeId: number | null | undefined): string {
  if (themeId === 1) return 'PAYMENT_CHECKOUT_EN';
  return 'PAYMENT_CHECKOUT';
}

async function loadCheckoutTemplateByTrigger(trigger: string): Promise<{ id: number; content: string } | null> {
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

function formatVaSpaced(va: string | null): string {
  if (!va) return '';
  return va.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export type ProcessCheckoutWaResult = {
  outcome: 'sent' | 'skipped' | 'failed';
  retryableFailure: boolean;
  error?: string;
};

/**
 * Proses satu job WA checkout: baca transaksi, kirim StarSender, `notif_logs`, set `is_whatsapp_checkout`.
 * Idempoten jika `is_whatsapp_checkout` sudah true.
 *
 * Query transaksi berdasarkan `id` + `user_id` lalu ambil `created_at` kanonik dari DB
 * (bukan dari body.transactionCreatedAt yang formatnya bisa beda dengan Postgres).
 */
export async function processCheckoutWhatsAppJob(body: CheckoutWhatsAppJobBody): Promise<ProcessCheckoutWaResult> {
  console.info('checkout_wa_start', body);
  const idNum = Number(body.transactionId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    console.warn('checkout_wa_bad_id', body);
    return { outcome: 'failed', retryableFailure: false, error: 'bad_transaction_id' };
  }

  // Ambil transaksi via id + user_id (BUKAN created_at dari JS — presisi beda → 0 rows).
  const head = (await sql`
    SELECT
      t.id,
      t.created_at,
      t.user_id,
      t.is_whatsapp_checkout AS "waDone",
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
    waDone: boolean | null;
    reference_no: string;
    total_amount: number;
    va_no: string | null;
    payment_method_id: number | null;
    pm_name: string | null;
  }[];

  if (head.length === 0) {
    console.warn('checkout_wa_not_found', { transactionId: idNum, userId: body.userId });
    return { outcome: 'failed', retryableFailure: false, error: 'transaction_not_found' };
  }

  const h = head[0];
  // created_at kanonik dari DB — pakai ini untuk semua query detail selanjutnya
  const dbCreatedAt = h.created_at;

  const waDoneRaw = h.waDone as boolean | string | null | undefined;
  const alreadySent =
    waDoneRaw === true ||
    waDoneRaw === 't' ||
    String(waDoneRaw ?? '').toLowerCase() === 'true';
  if (alreadySent) {
    console.info('checkout_wa_already_sent', { transactionId: idNum });
    return { outcome: 'sent', retryableFailure: false };
  }

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
      AND d.transaction_created_at = ${dbCreatedAt}
    LIMIT 1
  `) as unknown as {
    studentId: number;
    studentName: string;
    schoolId: number;
    schoolName: string;
    themeId: number | null;
  }[];

  if (ctxRows.length === 0) {
    console.warn('checkout_wa_no_context', { transactionId: idNum, dbCreatedAt });
    return { outcome: 'failed', retryableFailure: false, error: 'no_bill_context' };
  }

  const ctx = ctxRows[0];
  const themeId = ctx.themeId != null ? Number(ctx.themeId) : null;
  const trigger = checkoutTriggerForTheme(themeId);
  const template = await loadCheckoutTemplateByTrigger(trigger);

  const lineRows = (await sql`
    SELECT
      COALESCE(NULLIF(trim(b.title), ''), p.name, 'Pembayaran') AS title,
      (d.amount_paid)::float8 AS amount
    FROM tuition_transaction_details d
    LEFT JOIN tuition_bills b ON b.id = d.bill_id
    LEFT JOIN tuition_products p ON p.id = d.product_id
    WHERE d.transaction_id = ${idNum}
      AND d.transaction_created_at = ${dbCreatedAt}
    ORDER BY d.id ASC
  `) as unknown as { title: string; amount: number }[];

  const billDetails = lineRows.map((l) => `${l.title}: ${formatRupiah(Number(l.amount))}`).join('\n');
  const totalAmount = Number(h.total_amount);
  const methodId = Number(h.payment_method_id);
  const paymentInstructions =
    Number.isFinite(methodId) && methodId > 0 ? await loadInstructionPlainText(methodId) : '';
  const paymentInstructionsEn = paymentInstructions;

  const createdMs = new Date(String(dbCreatedAt)).getTime();
  const expiryMs = computePortalPaymentExpiryMs(Number.isFinite(createdMs) ? createdMs : Date.now());
  const expiryDateStr =
    themeId === 1
      ? new Date(expiryMs).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date(expiryMs).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  const vaDisplay = formatVaSpaced(h.va_no);
  const to = await resolveRecipientPhone(ctx.studentId, body.userId);
  console.info('checkout_wa_resolve', { transactionId: idNum, trigger, templateId: template?.id ?? null, to: to ?? null });

  const vars: Record<string, string> = {
    school_name: String(ctx.schoolName ?? ''),
    student_name: String(ctx.studentName ?? ''),
    bill_details: billDetails,
    total_amount: formatRupiah(totalAmount),
    payment_methods: String(h.pm_name ?? '—'),
    va_number: vaDisplay || h.va_no || '-',
    expiry_date: expiryDateStr,
    payment_instructions: paymentInstructions || '-',
    payment_instructions_en: paymentInstructionsEn || '-',
  };

  if (!template || !to) {
    const reason = !template ? 'no_template' : 'no_phone';
    console.warn('checkout_wa_skip', { reason, transactionId: idNum, trigger, to: to ?? null });
    await sql`
      INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
      VALUES (
        ${body.userId},
        ${template?.id ?? null},
        'whatsapp',
        ${to ?? '-'},
        ${JSON.stringify({ reason, referenceNo: h.reference_no, job: 'checkout' }).slice(0, 5000)},
        NULL,
        'skipped'
      )
    `;
    await sql`
      UPDATE tuition_transactions
      SET is_whatsapp_checkout = true
      WHERE id = ${idNum}
        AND created_at = ${dbCreatedAt}
    `;
    return { outcome: 'skipped', retryableFailure: false };
  }

  const bodyText = substituteTemplate(template.content, vars);
  const reqPayload = { messageType: 'text', to, bodyPreview: bodyText.slice(0, 200) };

  console.info('checkout_wa_sending', { transactionId: idNum, to, bodyLen: bodyText.length });
  const star = await postStarSenderText({ to, body: bodyText });
  const status = star.ok ? 'success' : 'failed';
  console.info('checkout_wa_result', { transactionId: idNum, ok: star.ok, httpStatus: star.status, responsePreview: star.responseText.slice(0, 200) });

  await sql`
    INSERT INTO notif_logs (user_id, template_id, type, recipient, request_payload, response_payload, status)
    VALUES (
      ${body.userId},
      ${template.id},
      'whatsapp',
      ${to},
      ${JSON.stringify(reqPayload).slice(0, 5000)},
      ${JSON.stringify({ httpStatus: star.status, body: star.responseText }).slice(0, 5000)},
      ${status}
    )
  `;

  if (!star.ok) {
    return { outcome: 'failed', retryableFailure: true, error: 'starsender_failed' };
  }

  await sql`
    UPDATE tuition_transactions
    SET is_whatsapp_checkout = true
    WHERE id = ${idNum}
      AND created_at = ${dbCreatedAt}
  `;

  return { outcome: 'sent', retryableFailure: false };
}
