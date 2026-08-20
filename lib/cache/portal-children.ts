/** Shared key format with kreativa_erp — must stay identical. */
export const PORTAL_CHILDREN_TTL_SEC = 31536000; // 1 year

export function portalChildrenKey(role: string, userId: number): string {
  return `portal:children:v1:${role}:${userId}`;
}
