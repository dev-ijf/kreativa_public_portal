/** Shared key format with kreativa_erp — must stay identical. */
export const PORTAL_ANNOUNCEMENTS_TTL_SEC = 31536000; // 1 year
export const PORTAL_ANNOUNCEMENTS_SCHOOL_LIMIT = 50;

export function portalAnnouncementsSchoolKey(schoolId: number): string {
  return `portal:announcements:v1:school:${schoolId}`;
}

export function portalAnnouncementItemKey(announcementId: number | string): string {
  return `portal:announcements:v1:item:${announcementId}`;
}
