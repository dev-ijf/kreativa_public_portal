export type AdaptiveTest = { id: string; subject: string; date: string; score: number; mastery: number };

export const MOCK_ADAPTIVE_HISTORY: Record<number, AdaptiveTest[]> = {
  1: [
    { id: 't1', subject: 'Math', date: '2026-03-21', score: 85, mastery: 0.78 },
    { id: 't2', subject: 'English', date: '2026-03-28', score: 90, mastery: 0.84 },
  ],
  2: [{ id: 't3', subject: 'Science', date: '2026-03-30', score: 76, mastery: 0.62 }],
};

export type AdaptiveQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const MOCK_ADAPTIVE_QUESTIONS: Record<string, AdaptiveQuestion[]> = {
  Math: [
    {
      id: 'q1',
      question: 'What is 12 × 8?',
      options: ['86', '96', '108', '112'],
      correctIndex: 1,
      explanation: '12 × 8 = 96.',
    },
    {
      id: 'q2',
      question: 'Which fraction is equal to 0.25?',
      options: ['1/2', '1/3', '1/4', '2/3'],
      correctIndex: 2,
      explanation: '0.25 equals 1/4.',
    },
  ],
  Science: [
    {
      id: 'q3',
      question: 'Which organ pumps blood?',
      options: ['Lungs', 'Heart', 'Kidney', 'Liver'],
      correctIndex: 1,
      explanation: 'The heart pumps blood throughout the body.',
    },
  ],
  English: [
    {
      id: 'q4',
      question: 'Choose the correct past tense: “go” → ?',
      options: ['goed', 'went', 'gone', 'going'],
      correctIndex: 1,
      explanation: 'Past tense of go is went.',
    },
  ],
};

