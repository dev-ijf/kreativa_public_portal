export const TRANSLATIONS = {
  en: {
    welcome: 'Welcome to Parent Portal',
    loginDesc: "Monitor your child's academic journey, attendance, and school activities seamlessly.",
    loginGoogle: 'Sign in with Google',
    loginError: 'Your email is not registered in the system. Please contact the school admin.',
    logout: 'Logout',
    greeting: 'Welcome,',
    honorific: 'Mr/Mrs',
    langBtn: 'ID',
    selectChild: 'Select Child Profile',
    quickMenus: 'Quick Menus',
    seeAll: 'See All',
    todayDate: "Today's Date",
    tuition: 'Tuition',
    academic: 'Academic',
    attendance: 'Attendance',
    report: 'Report Card',
    agenda: 'Agenda',
    updates: 'Updates',
    adaptiveLearning: 'Adaptive Learning',
    habits: 'Habits',
    upcomingEvents: 'Upcoming Events',
  },
  id: {
    welcome: 'Selamat datang di Parent Portal',
    loginDesc: 'Pantau perjalanan akademik anak, kehadiran, dan aktivitas sekolah dengan mudah.',
    loginGoogle: 'Masuk dengan Google',
    loginError: 'Email Anda tidak terdaftar di sistem. Silakan hubungi admin sekolah.',
    logout: 'Keluar',
    greeting: 'Selamat Datang,',
    honorific: 'Bpk/Ibu',
    langBtn: 'EN',
    selectChild: 'Pilih Profil Anak',
    quickMenus: 'Menu Cepat',
    seeAll: 'Lihat Semua',
    todayDate: 'Tanggal Hari Ini',
    tuition: 'Keuangan',
    academic: 'Akademik',
    attendance: 'Kehadiran',
    report: 'Rapor',
    agenda: 'Agenda',
    updates: 'Info',
    adaptiveLearning: 'Adaptive Learning',
    habits: 'Pembiasaan',
    upcomingEvents: 'Agenda Terdekat',
  },
} as const;

export type Lang = keyof typeof TRANSLATIONS;

type TranslationKey = keyof (typeof TRANSLATIONS)['en'];

export function t(lang: Lang, key: TranslationKey) {
  const table: Record<TranslationKey, string> = TRANSLATIONS[lang];
  return table[key] ?? key;
}

