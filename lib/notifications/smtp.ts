import nodemailer from 'nodemailer';

export type SendTenantEmailParams = {
  themeId?: number | null;
  to: string;
  subject: string;
  html: string;
};

export type SendTenantEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

type TenantSmtpConfig = {
  user: string;
  pass: string;
  from: string;
};

function envTruthy(v: string | undefined): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function resolveTenantSmtp(themeId: number | null | undefined): TenantSmtpConfig | null {
  const isKreativa = themeId === 1;
  const user = (
    isKreativa ? process.env.SMTP_USER_KREATIVA : process.env.SMTP_USER_TALENTA
  )?.trim();
  const pass = (
    isKreativa ? process.env.SMTP_PASS_KREATIVA : process.env.SMTP_PASS_TALENTA
  )?.trim();
  const from = (
    isKreativa ? process.env.SMTP_FROM_KREATIVA : process.env.SMTP_FROM_TALENTA
  )?.trim();
  if (!user || !pass || !from) return null;
  return { user, pass, from };
}

/**
 * Kirim email HTML via Gmail SMTP.
 * - theme_id 1 (Kreativa) → SMTP_*_KREATIVA
 * - selain itu (Talenta) → SMTP_*_TALENTA
 */
export async function sendTenantEmail(params: SendTenantEmailParams): Promise<SendTenantEmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 465;
  const secure = process.env.SMTP_SECURE != null ? envTruthy(process.env.SMTP_SECURE) : true;
  const cfg = resolveTenantSmtp(params.themeId);

  if (!host || !Number.isFinite(port) || !cfg) {
    return {
      ok: false,
      error: `missing_smtp_env(themeId=${params.themeId ?? 'null'})`,
    };
  }

  const to = params.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, error: 'invalid_recipient' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });

    const info = await transporter.sendMail({
      from: cfg.from,
      to,
      subject: params.subject,
      html: params.html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('smtp_send_failed', {
      themeId: params.themeId ?? null,
      to,
      error: msg.slice(0, 300),
    });
    return { ok: false, error: msg.slice(0, 500) };
  }
}
