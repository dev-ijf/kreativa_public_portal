export type StarSenderTextResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

export type StarSenderTextParams = {
  to: string;
  body: string;
  /** theme_id sekolah — menentukan token StarSender yang dipakai. */
  themeId?: number | null;
};

function resolveStarSenderToken(themeId: number | null | undefined): string | undefined {
  if (themeId === 2) return process.env.STARSENDER_TOKEN_TALENTA?.trim();
  return process.env.STARSENDER_TOKEN?.trim();
}

/**
 * Kirim pesan teks WhatsApp lewat StarSender.
 * - theme_id 1 (Kreativa) → env `STARSENDER_TOKEN`
 * - theme_id 2 (Talenta)  → env `STARSENDER_TOKEN_TALENTA`
 */
export async function postStarSenderText(params: StarSenderTextParams): Promise<StarSenderTextResult> {
  const base = process.env.STARSENDER_URL?.trim();
  const token = resolveStarSenderToken(params.themeId);
  if (!base || !token) {
    return { ok: false, status: 0, responseText: `missing_starsender_env(themeId=${params.themeId ?? 'null'})` };
  }

  const url = base.startsWith('http') ? base : `https://${base}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({
      messageType: 'text',
      to: params.to,
      body: params.body,
    }),
  });

  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, responseText: text.slice(0, 4000) };
}
