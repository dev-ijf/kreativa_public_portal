export type SubjectColor = { bg: string; fg: string };

const DEFAULT_COLOR: SubjectColor = { bg: '#F0F1EC', fg: '#5B6B78' };

/** Subject / category colors aligned with the weekly-plan HTML briefs. */
const COLOR_MAP: Record<string, SubjectColor> = {
  math: { bg: '#E6F1FB', fg: '#0C447C' },
  mathematics: { bg: '#E6F1FB', fg: '#0C447C' },
  'cll-english': { bg: '#EEEDFE', fg: '#3C3489' },
  'english language': { bg: '#EEEDFE', fg: '#3C3489' },
  'english reading': { bg: '#FBEAF0', fg: '#72243E' },
  english: { bg: '#EEEDFE', fg: '#3C3489' },
  'bahasa indonesia': { bg: '#FAEEDA', fg: '#633806' },
  indonesian: { bg: '#FAEEDA', fg: '#633806' },
  stem: { bg: '#E1F5EE', fg: '#085041' },
  science: { bg: '#EAF3DE', fg: '#3B6D11' },
  motoric: { bg: '#FAECE7', fg: '#712B13' },
  art: { bg: '#FBEAF0', fg: '#72243E' },
  'islamic studies': { bg: '#E1F5EE', fg: '#085041' },
  'quran studies': { bg: '#FAECE7', fg: '#712B13' },
  'physical education': { bg: '#F4EAF7', fg: '#6B2E7A' },
  pe: { bg: '#F4EAF7', fg: '#6B2E7A' },
  rutin: { bg: '#F0F1EC', fg: '#5B6B78' },
  routine: { bg: '#F0F1EC', fg: '#5B6B78' },
};

export function subjectColor(name: string | null | undefined): SubjectColor {
  if (!name) return DEFAULT_COLOR;
  const key = name.trim().toLowerCase();
  return COLOR_MAP[key] ?? DEFAULT_COLOR;
}

export const ROUTINE_COLOR: SubjectColor = DEFAULT_COLOR;
