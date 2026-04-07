export type Child = { id: number; name: string; avatar: string; gradeLabel: string };

export const MOCK_CHILDREN: Child[] = [
  { id: 1, name: 'Alya Putri', avatar: '👧', gradeLabel: 'Grade 4' },
  { id: 2, name: 'Raka Pratama', avatar: '👦', gradeLabel: 'Grade 7' },
];

export type Banner =
  | { type: 'web'; title: string; subtitle?: string; image?: string; link: string }
  | { type: 'update'; title: string; subtitle?: string; image?: string; updateId: string };

export const MOCK_BANNERS: Banner[] = [
  {
    type: 'update',
    title: 'Mid Semester Assessment',
    subtitle: 'Jadwal & info penting',
    updateId: '1',
    image: '/assets/banners/banner-1.jpg',
  },
  {
    type: 'web',
    title: 'School Website',
    subtitle: 'Kreativa Global',
    link: 'https://kreativaglobal.sch.id',
    image: '/assets/banners/banner-2.jpg',
  },
];

export type UpcomingEvent = { id: string; title: string; dateLabel: string; type: string };

export const MOCK_UPCOMING_EVENTS: UpcomingEvent[] = [
  { id: 'e1', title: 'Math Quiz', dateLabel: 'Wed, 10 Apr', type: 'Exam' },
  { id: 'e2', title: 'Parent Meeting', dateLabel: 'Fri, 12 Apr', type: 'Meeting' },
  { id: 'e3', title: 'Sports Day', dateLabel: 'Mon, 15 Apr', type: 'Event' },
];

