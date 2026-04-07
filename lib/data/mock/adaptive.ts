export type AdaptiveTest = { id: string; subject: string; date: string; score: number; mastery: number };

export const MOCK_ADAPTIVE_HISTORY: Record<number, AdaptiveTest[]> = {
  1: [
    { id: 't1', subject: 'Math', date: '2026-03-21', score: 85, mastery: 0.78 },
    { id: 't2', subject: 'English', date: '2026-03-28', score: 90, mastery: 0.84 },
  ],
  2: [{ id: 't3', subject: 'Science', date: '2026-03-30', score: 76, mastery: 0.62 }],
};

export type AdaptiveTestDetailQuestion = {
  id: string;
  gradeBand: string;
  difficulty: number;
  question: string;
  options: string[];
  correctIndex: number;
  studentIndex: number | null;
  explanation: string;
};

export type AdaptiveTestDetail = {
  testId: string;
  studentName: string;
  subject: string;
  score: number;
  mastery: number;
  questions: AdaptiveTestDetailQuestion[];
};

export const MOCK_ADAPTIVE_TEST_DETAILS: Record<string, AdaptiveTestDetail> = {
  t1: {
    testId: 't1',
    studentName: 'Alya Putri',
    subject: 'Matematika',
    score: 85,
    mastery: 0.85,
    questions: [
      {
        id: 'q4',
        gradeBand: 'g4-6',
        difficulty: 0.5,
        question: 'What is 15 + 25?',
        options: ['30', '40', '50', '45'],
        correctIndex: 1,
        studentIndex: 3,
        explanation: '15 + 25 = 40. Basic addition.',
      },
      {
        id: 'q5',
        gradeBand: 'g4-6',
        difficulty: 0.75,
        question: 'What is 12 × 15?',
        options: ['180', '165', '170', '175'],
        correctIndex: 0,
        studentIndex: 0,
        explanation: '12 × 15 = 12×10 + 12×5 = 120 + 60 = 180.',
      },
    ],
  },
  t2: {
    testId: 't2',
    studentName: 'Alya Putri',
    subject: 'Bahasa Inggris',
    score: 90,
    mastery: 0.84,
    questions: [
      {
        id: 'q4e',
        gradeBand: 'g4-6',
        difficulty: 0.5,
        question: 'Choose the correct past tense: “go” → ?',
        options: ['goed', 'went', 'gone', 'going'],
        correctIndex: 1,
        studentIndex: 1,
        explanation: 'Past tense of go is went.',
      },
    ],
  },
  t3: {
    testId: 't3',
    studentName: 'Raka Pratama',
    subject: 'IPA',
    score: 76,
    mastery: 0.62,
    questions: [
      {
        id: 'q3s',
        gradeBand: 'g7-9',
        difficulty: 0.5,
        question: 'Which organ pumps blood?',
        options: ['Lungs', 'Heart', 'Kidney', 'Liver'],
        correctIndex: 1,
        studentIndex: 0,
        explanation: 'The heart pumps blood throughout the body.',
      },
    ],
  },
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

