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
