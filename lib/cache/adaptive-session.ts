import { Redis } from '@upstash/redis';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type AdaptiveSessionAnswer = {
  bankQuestionId: number;
  studentAnswer: string;
  isCorrect: boolean;
  difficulty: number;
};

export type AdaptiveSessionState = {
  studentId: number;
  testId: number;
  subjectId: number;
  gradeBand: string;
  currentMastery: number;
  correctQuestionIds: number[];
  sessionQuestionIds: number[];
  answers: AdaptiveSessionAnswer[];
  questionCount: number;
  answeredCount: number;
};

// ────────────────────────────────────────────────────────────────
// Redis client (lazy singleton, same env as upstash-redis.ts)
// ────────────────────────────────────────────────────────────────

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client === undefined) {
    const url =
      process.env.UPSTASH_REDIS_REST_URL?.trim() ||
      process.env.KV_REST_API_URL?.trim();
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
      process.env.KV_REST_API_TOKEN?.trim();
    if (!url || !token) {
      client = null;
    } else {
      client = new Redis({ url, token });
    }
  }
  return client;
}

const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours

function sessionKey(studentId: number, testId: number): string {
  return `adaptive:session:${studentId}:${testId}`;
}

// ────────────────────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────────────────────

export async function createAdaptiveSession(state: AdaptiveSessionState): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = sessionKey(state.studentId, state.testId);
  await r.set(key, JSON.stringify(state), { ex: SESSION_TTL_SECONDS });
}

export async function getAdaptiveSession(
  studentId: number,
  testId: number,
): Promise<AdaptiveSessionState | null> {
  const r = getRedis();
  if (!r) return null;
  const key = sessionKey(studentId, testId);
  const raw = await r.get(key);
  if (raw == null) return null;
  if (typeof raw === 'string') return JSON.parse(raw) as AdaptiveSessionState;
  return raw as AdaptiveSessionState;
}

export async function updateAdaptiveSession(
  studentId: number,
  testId: number,
  updates: Partial<AdaptiveSessionState>,
): Promise<AdaptiveSessionState | null> {
  const current = await getAdaptiveSession(studentId, testId);
  if (!current) return null;
  const updated = { ...current, ...updates };
  const r = getRedis();
  if (!r) return updated;
  const key = sessionKey(studentId, testId);
  await r.set(key, JSON.stringify(updated), { ex: SESSION_TTL_SECONDS });
  return updated;
}

export async function deleteAdaptiveSession(studentId: number, testId: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = sessionKey(studentId, testId);
  await r.del(key);
}
