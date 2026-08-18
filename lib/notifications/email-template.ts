export type PaymentEmailKind = 'checkout' | 'paid';

export type WrapPaymentEmailParams = {
  themeId?: number | null;
  kind: PaymentEmailKind;
  innerHtml: string;
  schoolName?: string;
};

/**
 * Replace `@key` placeholders (email_notif_configs style).
 * Longer keys first so `@payment_instructions_en` wins over `@payment_instructions`.
 */
export function substituteAtTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    out = out.split(`@${k}`).join(vars[k] ?? '');
  }
  return out;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isKreativa(themeId: number | null | undefined): boolean {
  return themeId === 1;
}

function wrapTalenta(params: WrapPaymentEmailParams): string {
  const school = escapeHtml(params.schoolName?.trim() || 'Talenta Juara');
  const title =
    params.kind === 'paid' ? 'Informasi pembayaran sekolah' : 'Informasi pembayaran sekolah';
  const badge = 'PEMBAYARAN';
  const notice = `Pesan resmi dari <strong>${school}</strong>.`;

  const callout =
    params.kind === 'paid'
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        <tr>
          <td style="background:#e0f2fe;border:1px solid #7dd3fc;border-radius:10px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#0f172a;">
            <strong style="display:block;margin-bottom:6px;">Jazakumullahu khairan</strong>
            Terima kasih atas kepercayaan dan kerjasamanya. Semoga Allah membalas kebaikan Bapak/Ibu dengan sebaik-baiknya.
          </td>
        </tr>
      </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#20A8D8;padding:22px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" valign="top">
                    <div style="width:40px;height:40px;background:#ffffff;border-radius:8px;text-align:center;line-height:40px;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;color:#20A8D8;">T</div>
                  </td>
                  <td valign="middle" style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
                    <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.95;">${school}</div>
                    <div style="font-size:20px;font-weight:700;line-height:1.3;margin-top:4px;">${title}</div>
                    <div style="font-size:13px;margin-top:8px;opacity:0.95;">Assalamu'alaikum warahmatullahi wabarakatuh.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 4px 20px;font-family:Arial,Helvetica,sans-serif;">
              <span style="display:inline-block;background:#20A8D8;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;padding:6px 12px;border-radius:999px;">${badge}</span>
              <span style="display:inline-block;margin-left:10px;font-size:13px;color:#0369a1;vertical-align:middle;">${notice}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#e0f2fe;border:1px solid #bae6fd;border-radius:10px;padding:18px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;">
                    ${params.innerHtml}
                  </td>
                </tr>
              </table>
              ${callout}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px 20px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
              Dikirim melalui <strong>Talenta Juara</strong> untuk <strong>${school}</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function wrapKreativa(params: WrapPaymentEmailParams): string {
  const school = escapeHtml(params.schoolName?.trim() || 'Kreativa Global');
  const title = params.kind === 'paid' ? 'Payment confirmed' : 'School payment notice';
  const subtitle =
    params.kind === 'paid'
      ? 'Official payment confirmation from your school'
      : 'Official billing information from your school';
  const badge = 'PAYMENT';
  const notice = `Official notice from <strong style="color:#1d4ed8;">${school}</strong>`;

  const callout =
    params.kind === 'checkout'
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        <tr>
          <td style="background:#f5f3ff;border-top:2px dashed #c4b5fd;border-radius:0 0 10px 10px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#312e81;">
            <strong style="display:block;margin-bottom:6px;color:#5b21b6;">Thank you for your partnership</strong>
            We appreciate your continued support in your child's education journey.
          </td>
        </tr>
      </table>`
      : params.kind === 'paid'
        ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
        <tr>
          <td style="background:#f5f3ff;border-top:2px dashed #c4b5fd;border-radius:0 0 10px 10px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#312e81;">
            <strong style="display:block;margin-bottom:6px;color:#5b21b6;">Thank you for your partnership</strong>
            Your payment has been recorded. We appreciate your timely support.
          </td>
        </tr>
      </table>`
        : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#7c3aed 55%,#ea580c 100%);padding:24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" valign="top">
                    <div style="width:40px;height:40px;background:#f59e0b;border-radius:999px;text-align:center;line-height:40px;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;color:#ffffff;">K</div>
                  </td>
                  <td valign="middle" style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
                    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.95;">KREATIVA GLOBAL</div>
                    <div style="font-size:22px;font-weight:700;line-height:1.25;margin-top:6px;">${title}</div>
                    <div style="font-size:13px;margin-top:8px;opacity:0.92;">${subtitle}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px 4px 20px;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e2e8f0;">
              <span style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;padding:6px 12px;border-radius:999px;">${badge}</span>
              <span style="display:inline-block;margin-left:10px;font-size:13px;color:#2563eb;vertical-align:middle;">${notice}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px 8px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#eef2ff;border-left:3px solid #2563eb;border-radius:8px;padding:18px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;">
                    ${params.innerHtml}
                  </td>
                </tr>
              </table>
              ${callout}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 20px 20px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
              Sent with care via <strong>Kreativa One</strong> for ${school}. This inbox is automated — please don't reply directly.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Wrap substituted message HTML in tenant-branded email shell. */
export function wrapPaymentEmailHtml(params: WrapPaymentEmailParams): string {
  if (isKreativa(params.themeId)) return wrapKreativa(params);
  return wrapTalenta(params);
}
