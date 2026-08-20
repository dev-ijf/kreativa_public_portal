import {
  accessUrlFromRequestHeaders,
  getRequestAccessUrl,
} from '@/lib/telegram-notify';

/**
 * Fire-and-forget: notify ERP that a parent posted on a daily-report thread
 * (Telegram ops chat + email to submitting teacher).
 */
export function notifyParentDrMessageBackground(input: {
  studentId: number;
  reportId: number;
  schoolId: number | null;
  messagePreview: string;
  accessUrl?: string | null;
}): void {
  const base = process.env.KREATIVA_ERP_URL;
  const secret = process.env.TELEGRAM_TRIGGER_SECRET;
  if (!base || !secret) return;

  void (async () => {
    try {
      const accessUrl =
        input.accessUrl?.trim() ||
        (await getRequestAccessUrl().catch(() => '')) ||
        '';
      await fetch(`${base.replace(/\/$/, '')}/api/notify/parent-dr-message`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          studentId: input.studentId,
          reportId: input.reportId,
          schoolId: input.schoolId,
          messagePreview: input.messagePreview,
          accessUrl,
        }),
      });
    } catch (err) {
      console.error('[parent-dr-message-notify]', err);
    }
  })();
}

export { accessUrlFromRequestHeaders };
