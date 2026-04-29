export type StarSenderTextResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

/**
 * Kirim pesan teks WhatsApp lewat StarSender.
 * Env: `STARSENDER_URL` (endpoint POST penuh), `STARSENDER_TOKEN` (header Authorization).
 */
export async function postStarSenderText(params: { to: string; body: string }): Promise<StarSenderTextResult> {
  const base = process.env.STARSENDER_URL?.trim();
  const token = process.env.STARSENDER_TOKEN?.trim();
  if (!base || !token) {
    return { ok: false, status: 0, responseText: 'missing_starsender_env' };
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
