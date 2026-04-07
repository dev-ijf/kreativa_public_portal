export type SessionUser = { userId: number };

// UI-only auth phase: we treat the user as logged in with a static id.
export async function getSessionUser(): Promise<SessionUser> {
  return { userId: 2 };
}

