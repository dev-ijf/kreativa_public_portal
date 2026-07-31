export type TelegramAuthEvent = 'ON_USER_LOGIN' | 'ON_USER_LOGOUT';

const JAKARTA_TZ = 'Asia/Jakarta';

/** Asia/Jakarta (GMT+7) — use for @time / @created_at_bot */
function formatTimeJakarta(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-GB', {
    timeZone: JAKARTA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function telegramTimeVars(date: Date | string | number = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const created_at = d.toISOString();
  const created_at_bot = formatTimeJakarta(d);
  return { created_at, created_at_bot, time: created_at_bot };
}

export async function getRequestAccessUrl(): Promise<string> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host =
      h.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      h.get('host')?.trim() ||
      '';
    if (!host) return '';
    const proto =
      h.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`;
  } catch {
    return '';
  }
}

export function accessUrlFromRequestHeaders(
  headers: Headers | { get(name: string): string | null }
): string {
  const host =
    headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    headers.get('host')?.trim() ||
    '';
  if (!host) return '';
  const proto =
    headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function notifyTelegramEvent(
  event: TelegramAuthEvent,
  variables: Record<string, string | number | null | undefined>
): Promise<void> {
  const base = process.env.KREATIVA_ERP_URL;
  const secret = process.env.TELEGRAM_TRIGGER_SECRET;
  if (!base || !secret) return;

  try {
    await fetch(`${base.replace(/\/$/, '')}/api/telegram-notifs/trigger`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ event, variables }),
    });
  } catch (err) {
    console.error('[telegram-notify]', event, err);
  }
}

export function authTelegramVars(input: {
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  ipAddress?: string | null;
  accessUrl?: string | null;
  at?: Date | string | number;
}): Record<string, string> {
  return {
    full_name: input.fullName ?? '',
    email: input.email ?? '',
    role: input.role ?? '',
    ...telegramTimeVars(input.at ?? new Date()),
    ip_address: input.ipAddress ?? '',
    source_app: 'parents_portal',
    access_url: input.accessUrl ?? '',
  };
}
