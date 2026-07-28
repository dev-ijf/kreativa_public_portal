/** Default character limit for note / free-text fields across the portal. */
export const TEXTAREA_NOTE_MAX = 1000;

export function clampTextareaNote(value: string | null | undefined): string {
  return String(value ?? '').slice(0, TEXTAREA_NOTE_MAX);
}
