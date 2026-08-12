import { sql } from '@/lib/db/client';
import { getWhatsAppMeUrl } from '@/lib/data/server/portal-theme';

/** schoolId → wa.me URL, or null when the school has no WhatsApp number. */
export async function getSchoolWhatsappUrlsByIds(
  schoolIds: number[],
): Promise<Record<number, string | null>> {
  const unique = [...new Set(schoolIds.filter((id) => Number.isFinite(id) && id > 0))];
  const map: Record<number, string | null> = {};
  for (const id of unique) map[id] = null;
  if (unique.length === 0) return map;

  const rows = (await sql`
    SELECT id, whatsapp_number
    FROM core_schools
    WHERE id = ANY(${unique}::int[])
  `) as { id: number; whatsapp_number: string | null }[];

  for (const row of rows) {
    map[row.id] = getWhatsAppMeUrl(row.whatsapp_number);
  }
  return map;
}

/**
 * Pre-login: wa.me for the portal tenant (theme).
 * Uses the first school under `theme_id` that has a non-empty `whatsapp_number` (by sort).
 * Returns null when none are configured — bubble must stay hidden.
 */
export async function getThemeWhatsappUrl(themeId: number): Promise<string | null> {
  if (!Number.isFinite(themeId) || themeId <= 0) return null;

  const rows = (await sql`
    SELECT whatsapp_number
    FROM core_schools
    WHERE theme_id = ${themeId}
      AND whatsapp_number IS NOT NULL
      AND BTRIM(whatsapp_number) <> ''
    ORDER BY sort ASC NULLS LAST, id ASC
    LIMIT 1
  `) as { whatsapp_number: string | null }[];

  return getWhatsAppMeUrl(rows[0]?.whatsapp_number);
}
