export const MOCK_SCHEDULE: Record<number, { time: string; subject: string; teacher: string }[]> = {
  1: [
    { time: '07:15 - 08:00', subject: 'Math', teacher: 'Ms. Rina' },
    { time: '08:00 - 08:45', subject: 'English', teacher: 'Mr. David' },
    { time: '08:45 - 09:15', subject: 'Break', teacher: '-' },
    { time: '09:15 - 10:00', subject: 'Science', teacher: 'Ms. Nadia' },
  ],
  2: [
    { time: '07:00 - 07:45', subject: 'Science', teacher: 'Mr. Hasan' },
    { time: '07:45 - 08:30', subject: 'Math', teacher: 'Ms. Tika' },
    { time: '08:30 - 09:00', subject: 'Break', teacher: '-' },
    { time: '09:00 - 09:45', subject: 'English', teacher: 'Ms. Sarah' },
  ],
};

export const MOCK_ATTENDANCE: Record<
  number,
  {
    present: number;
    sick: number;
    permission: number;
    absent: number;
    history: { date: string; status: 'sick' | 'permission'; noteEn: string; noteId: string }[];
  }
> = {
  1: {
    present: 42,
    sick: 1,
    permission: 2,
    absent: 0,
    history: [
      { date: '2026-03-04', status: 'sick', noteEn: 'Flu', noteId: 'Flu' },
      { date: '2026-02-18', status: 'permission', noteEn: 'Family event', noteId: 'Acara keluarga' },
    ],
  },
  2: {
    present: 40,
    sick: 0,
    permission: 1,
    absent: 1,
    history: [{ date: '2026-03-11', status: 'permission', noteEn: 'Doctor appointment', noteId: 'Kontrol dokter' }],
  },
};

export const MOCK_GRADES: Record<number, { semester: string; subjects: { name: string; score: number }[] }> = {
  1: {
    semester: '2025/2026 - Semester 2',
    subjects: [
      { name: 'Math', score: 92 },
      { name: 'English', score: 87 },
      { name: 'Science', score: 90 },
      { name: 'Religion', score: 95 },
    ],
  },
  2: {
    semester: '2025/2026 - Semester 2',
    subjects: [
      { name: 'Math', score: 84 },
      { name: 'English', score: 88 },
      { name: 'Science', score: 79 },
      { name: 'Bahasa Indonesia', score: 86 },
    ],
  },
};

export const MOCK_AGENDA: Record<
  number,
  { id: string; date: string; time: string; titleEn: string; titleId: string; type: string }[]
> = {
  1: [
    { id: 'a1', date: '2026-04-10', time: '08:00 - 10:00', titleEn: 'Math Quiz', titleId: 'Kuis Matematika', type: 'Exam' },
    { id: 'a2', date: '2026-04-12', time: '13:00 - 14:00', titleEn: 'Parent Meeting', titleId: 'Pertemuan Orang Tua', type: 'Meeting' },
  ],
  2: [{ id: 'a3', date: '2026-04-15', time: '07:00 - 12:00', titleEn: 'Sports Day', titleId: 'Hari Olahraga', type: 'Event' }],
};

export const MOCK_UPDATES: { id: string; date: string; titleEn: string; titleId: string; descEn: string; descId: string }[] = [
  {
    id: '1',
    date: '2026-04-02',
    titleEn: 'Mid Semester Assessment',
    titleId: 'Penilaian Tengah Semester',
    descEn: 'Mid semester assessment schedule has been published. Please check the agenda for details.',
    descId: 'Jadwal penilaian tengah semester sudah terbit. Silakan cek agenda untuk detailnya.',
  },
  {
    id: '2',
    date: '2026-03-25',
    titleEn: 'New Library Program',
    titleId: 'Program Perpustakaan Baru',
    descEn: 'Students are encouraged to borrow at least one book per week. Rewards available for consistent readers.',
    descId: 'Siswa dianjurkan meminjam minimal satu buku per minggu. Ada reward untuk pembaca konsisten.',
  },
];

