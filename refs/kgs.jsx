import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  CheckCircle, 
  ChevronLeft, 
  User, 
  Wallet, 
  Info, 
  Copy, 
  Check, 
  CheckCircle2, 
  CreditCard,
  ChevronRight,
  Receipt,
  BookOpen,
  CalendarDays,
  Award,
  Activity,
  MoreHorizontal,
  History,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Book,
  FileText,
  HeartPulse,
  Thermometer,
  Camera,
  CheckSquare,
  XCircle,
  AlertTriangle,
  Stethoscope,
  Circle,
  BarChart2,
  Calendar,
  Edit2,
  Save,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Microscope,
  Globe,
  Palette,
  ChevronDown,
  LogOut,
  Brain,
  PlayCircle,
  Loader2,
  Target
} from 'lucide-react';

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    welcome: "Welcome to Parent Portal",
    loginDesc: "Monitor your child's academic journey, attendance, and school activities seamlessly.",
    loginGoogle: "Sign in with Google",
    logout: "Logout",

    greeting: "Good Morning,",
    parents: "Parents!",
    langBtn: "ID",
    selectChild: "Select Child Profile",
    quickMenus: "Quick Menus",
    comingSoon: "Coming soon!",
    backHome: "Back to Home",
    seeAll: "See All",
    todayDate: "Today's Date",
    
    tuition: "Tuition",
    academic: "Academic",
    attendance: "Attendance",
    report: "Report Card",
    agenda: "Agenda",
    updates: "Updates",
    adaptiveLearning: "Adaptive Learning",
    habits: "Habits",

    detail: "Detail",
    totalOutstanding: "Total Outstanding",
    paymentHistory: "Payment History",
    viewHistory: "View past successful transactions",
    digitalTuition: "Digital Tuition Card",
    ay: "AY",
    tapUnpaid: "Tap unpaid months to add to cart.",
    pendingInstallments: "Pending Installments",
    paid: "Paid",
    left: "Left",
    fullyPaid: "Fully Paid",
    inCart: "In Cart",
    cancel: "Cancel",
    payAmount: "Pay Amount",
    min: "Min.",
    add: "Add",
    total: "Total",
    items: "items",
    checkout: "Checkout",
    noHistory: "No History Found",
    paymentCart: "Payment Cart",
    emptyCart: "Empty Cart",
    emptyCartDesc: "Please select tuition or installments from the Tuition menu first.",
    remove: "Remove",
    totalDue: "Total Due",
    choosePayment: "Choose Payment Method",
    paymentMethod: "Payment Method",
    totalPayment: "Total Payment",
    selectMethod: "Select Method",
    proceedPayment: "Proceed Payment",
    instruction: "Payment Instruction",
    deadline: "Payment Deadline",
    tomorrow: "Tomorrow",
    vaNumber: "VA Number",
    copy: "Copy",
    copied: "Copied",
    howToPay: "How to Pay (BCA ATM)",
    step1: "Insert BCA ATM Card & PIN",
    step2: "Select menu Other Transactions > Transfer > to BCA Virtual Account",
    step3: "Input the Virtual Account number above",
    step4: "Verify payment details, then click Yes/Benar",
    step5: "Keep the receipt as proof of payment",
    iHavePaid: "I Have Paid",
    successTitle: "Payment Successful!",
    successDesc: "Thank you, your payment has been received and recorded in our system.",
    txDetails: "Transaction Details",
    pastDue: "Past Due (Previous AY)",
    upcomingEvents: "Upcoming Events",
    installmentHistory: "Installment History",
    
    todaySchedule: "Today's Schedule",
    subject: "Subject",
    teacher: "Teacher",
    attendanceSummary: "Attendance Summary",
    present: "Present",
    sick: "Sick",
    permission: "Permission",
    absent: "Absent",
    recentAbsence: "Recent Absences",
    semester: "Semester",
    grades: "Grades",
    average: "Average",
    
    monthEvents: "Events This Month",
    noEvents: "No events scheduled.",
    schoolAnnouncements: "School Announcements",
    readMore: "Read More",
    healthRecord: "Health Record",
    height: "Height",
    weight: "Weight",
    bloodType: "Blood Type",
    clinicVisits: "Clinic Visit History",

    dailyEntry: "Daily Entry",
    summary: "Summary",
    obligatoryPrayers: "Obligatory Prayers",
    sunnahPrayers: "Sunnah Prayers",
    goodHabits: "Daily Good Habits",
    fajr: "Fajr",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
    dhuha: "Dhuha",
    tahajud: "Tahajud",
    readQuran: "Read Quran after Maghrib",
    wakeUpEarly: "Wake up before 5 AM",
    helpParents: "Help Parents",
    weeklySummary: "Weekly Progress Summary",
    completionRate: "Completion Rate",

    profile: "Profile",
    parentInfo: "Parent Information",
    childInfo: "Children Information",
    editProfile: "Edit Profile",
    saveChanges: "Save Changes",
    name: "Full Name",
    phone: "Phone Number",
    email: "Email Address",
    address: "Home Address",
    medicalNotes: "Medical Notes / Allergies",
    studentId: "Student ID (NIS)",
    grade: "Grade",
    updateSuccess: "Profile updated successfully!",

    scoreboard: "Scoreboard",
    testHistory: "Test History",
    startTest: "Start Test",
    question: "Question",
    submitAnswer: "Submit Answer",
    correct: "Correct!",
    incorrect: "Incorrect!",
    explanation: "Explanation",
    nextQuestion: "Next Question",
    finishTest: "Finish Test",
    loadingTest: "AI is generating question...",
    avgScore: "Avg Score",
    totalTests: "Total Tests",
    mastery: "Mastery",

    "July": "July", "August": "August", "September": "September", "October": "October", 
    "November": "November", "December": "December", "January": "January", "February": "February", 
    "March": "March", "April": "April", "May": "May", "June": "June",
    "Jul": "Jul", "Aug": "Aug", "Sep": "Sep", "Oct": "Oct", "Nov": "Nov", "Dec": "Dec",
    "Jan": "Jan", "Feb": "Feb", "Mar": "Mar", "Apr": "Apr", "Jun": "Jun",
    "Building Fund": "Building Fund",
    "Annual Activity Fee": "Annual Activity Fee",
    "Admission Fee": "Admission Fee",
    "Tuition November": "Tuition November",
    "Tuition October & Building Fund": "Tuition October & Building Fund",
    "Tuition September": "Tuition September",
    "Tuition July, August & Admission Fee": "Tuition July, August & Admission Fee",
    "Success": "Success",
    "Tuition ": "Tuition ",
    "Math": "Mathematics",
    "Science": "Science",
    "English": "English",
    "History": "History",
    "Art": "Art"
  },
  id: {
    welcome: "Selamat Datang di Portal Orang Tua",
    loginDesc: "Pantau perjalanan akademik, kehadiran, dan aktivitas sekolah anak Anda dengan mudah.",
    loginGoogle: "Masuk dengan Google",
    logout: "Keluar",

    greeting: "Selamat Pagi,",
    parents: "Bapak/Ibu!",
    langBtn: "EN",
    selectChild: "Pilih Profil Anak",
    quickMenus: "Menu Utama",
    comingSoon: "Segera hadir!",
    backHome: "Kembali ke Beranda",
    seeAll: "Lihat Semua",
    todayDate: "Tanggal Hari Ini",

    tuition: "Tagihan & SPP",
    academic: "Akademik",
    attendance: "Kehadiran",
    report: "Rapor",
    agenda: "Agenda Sekolah",
    updates: "Info",
    adaptiveLearning: "Pembelajaran Adaptif",
    habits: "Pembiasaan",

    detail: "Detail",
    totalOutstanding: "Total Tagihan",
    paymentHistory: "Riwayat Pembayaran",
    viewHistory: "Lihat transaksi sukses sebelumnya",
    digitalTuition: "Kartu SPP Digital",
    ay: "TA",
    tapUnpaid: "Ketuk bulan yang belum lunas untuk membayar.",
    pendingInstallments: "Cicilan Tertunda",
    paid: "Dibayar",
    left: "Sisa",
    fullyPaid: "Lunas",
    inCart: "Di Keranjang",
    cancel: "Batal",
    payAmount: "Nominal Bayar",
    min: "Min.",
    add: "Tambah",
    total: "Total",
    items: "item",
    checkout: "Bayar",
    noHistory: "Belum Ada Riwayat",
    paymentCart: "Keranjang Pembayaran",
    emptyCart: "Keranjang Kosong",
    emptyCartDesc: "Silakan pilih tagihan atau cicilan dari menu Tagihan & SPP terlebih dahulu.",
    remove: "Hapus",
    totalDue: "Total Tagihan",
    choosePayment: "Pilih Metode Pembayaran",
    paymentMethod: "Metode Pembayaran",
    totalPayment: "Total Pembayaran",
    selectMethod: "Pilih Metode Bayar",
    proceedPayment: "Lanjutkan Pembayaran",
    instruction: "Instruksi Pembayaran",
    deadline: "Batas Akhir Pembayaran",
    tomorrow: "Besok",
    vaNumber: "Nomor VA",
    copy: "Salin",
    copied: "Tersalin",
    howToPay: "Cara Pembayaran (ATM BCA)",
    step1: "Masukkan Kartu ATM BCA & PIN",
    step2: "Pilih menu Transaksi Lainnya > Transfer > ke BCA Virtual Account",
    step3: "Masukkan nomor Virtual Account di atas",
    step4: "Pastikan detail sesuai, lalu klik Ya/Benar",
    step5: "Simpan struk sebagai bukti pembayaran",
    iHavePaid: "Saya Sudah Bayar",
    successTitle: "Pembayaran Berhasil!",
    successDesc: "Terima kasih, pembayaran Anda telah diterima dan tercatat di sistem.",
    txDetails: "Rincian Transaksi",
    pastDue: "Tunggakan (Tahun Sebelumnya)",
    upcomingEvents: "Agenda Sekolah",
    installmentHistory: "Riwayat Cicilan",

    todaySchedule: "Jadwal Hari Ini",
    subject: "Mata Pelajaran",
    teacher: "Guru Pengajar",
    attendanceSummary: "Ringkasan Kehadiran",
    present: "Hadir",
    sick: "Sakit",
    permission: "Izin",
    absent: "Alpa",
    recentAbsence: "Riwayat Ketidakhadiran",
    semester: "Semester",
    grades: "Nilai",
    average: "Rata-rata",
    
    monthEvents: "Agenda Bulan Ini",
    noEvents: "Tidak ada agenda di bulan ini.",
    schoolAnnouncements: "Pengumuman Sekolah",
    readMore: "Baca Selengkapnya",
    healthRecord: "Data Medis Anak",
    height: "Tinggi",
    weight: "Berat",
    bloodType: "Gol. Darah",
    clinicVisits: "Riwayat Kunjungan UKS",

    dailyEntry: "Entri Harian",
    summary: "Ringkasan",
    obligatoryPrayers: "Shalat 5 Waktu",
    sunnahPrayers: "Shalat Sunnah",
    goodHabits: "Kebaikan Harian",
    fajr: "Subuh",
    dhuhr: "Dzuhur",
    asr: "Ashar",
    maghrib: "Maghrib",
    isha: "Isya",
    dhuha: "Dhuha",
    tahajud: "Tahajud",
    readQuran: "Mengaji ba'da Maghrib",
    wakeUpEarly: "Bangun sebelum jam 5 pagi",
    helpParents: "Membantu orang tua",
    weeklySummary: "Laporan Kemajuan Mingguan",
    completionRate: "Tingkat Penyelesaian",
    
    profile: "Profil",
    parentInfo: "Informasi Orang Tua",
    childInfo: "Informasi Anak",
    editProfile: "Edit Profil",
    saveChanges: "Simpan Perubahan",
    name: "Nama Lengkap",
    phone: "Nomor Telepon",
    email: "Alamat Email",
    address: "Alamat Rumah",
    medicalNotes: "Catatan Medis / Alergi",
    studentId: "Nomor Induk Siswa (NIS)",
    grade: "Kelas",
    updateSuccess: "Profil berhasil diperbarui!",

    scoreboard: "Papan Skor",
    testHistory: "Riwayat Tes",
    startTest: "Mulai Tes",
    question: "Pertanyaan",
    submitAnswer: "Kirim Jawaban",
    correct: "Benar!",
    incorrect: "Salah!",
    explanation: "Penjelasan",
    nextQuestion: "Pertanyaan Selanjutnya",
    finishTest: "Selesai Tes",
    loadingTest: "AI sedang membuat soal...",
    avgScore: "Rata-rata Nilai",
    totalTests: "Total Tes",
    mastery: "Penguasaan",

    "July": "Juli", "August": "Agustus", "September": "September", "October": "Oktober", 
    "November": "November", "December": "Desember", "January": "Januari", "February": "Februari", 
    "March": "Maret", "April": "April", "May": "Mei", "June": "Juni",
    "Jul": "Jul", "Aug": "Ags", "Sep": "Sep", "Oct": "Okt", "Nov": "Nov", "Dec": "Des",
    "Jan": "Jan", "Feb": "Feb", "Mar": "Mar", "Apr": "Apr", "Jun": "Jun",
    "Building Fund": "Uang Gedung",
    "Annual Activity Fee": "Biaya Kegiatan Tahunan",
    "Admission Fee": "Uang Pangkal",
    "Tuition November": "SPP November",
    "Tuition October & Building Fund": "SPP Oktober & Uang Gedung",
    "Tuition September": "SPP September",
    "Tuition July, August & Admission Fee": "SPP Juli, Agustus & Uang Pangkal",
    "Success": "Sukses",
    "Tuition ": "SPP ",
    "Math": "Matematika",
    "Science": "Ilmu Pengetahuan Alam",
    "English": "Bahasa Inggris",
    "History": "Sejarah",
    "Art": "Seni Budaya"
  }
};

// --- MOCK DATA ---
const CHILDREN = [
  { id: 'c1', name: 'Budi Santoso', grade: 'Grade 4A', nis: '10029384', avatar: '👦', address: 'Jl. Merdeka No. 45, Jakarta Selatan', medicalNotes: 'Tidak ada' },
  { id: 'c2', name: 'Ani Santoso', grade: 'Grade 1B', nis: '10029385', avatar: '👧', address: 'Jl. Merdeka No. 45, Jakarta Selatan', medicalNotes: 'Alergi kacang' },
];

const BANNERS = [
  { 
    title: { en: 'School Website', id: 'Website Sekolah' },
    desc: { en: 'Visit our official website for general information.', id: 'Kunjungi website resmi kami untuk informasi umum.' },
    image: 'https://images.pexels.com/photos/5088008/pexels-photo-5088008.jpeg?auto=compress&cs=tinysrgb&w=600',
    type: 'web',
    link: 'https://kreativaglobal.sch.id'
  },
  { 
    title: { en: 'Sports Day 2023', id: 'Pekan Olahraga 2023' },
    desc: { en: 'Join the annual sports competition next week.', id: 'Ikuti kompetisi olahraga tahunan minggu depan.' },
    image: 'https://images.pexels.com/photos/298244/pexels-photo-298244.jpeg?auto=compress&cs=tinysrgb&w=600',
    type: 'update',
    updateId: 3
  },
  { 
    title: { en: 'Parent Meeting', id: 'Pertemuan Orang Tua' },
    desc: { en: 'Online meeting scheduled for this Friday.', id: 'Pertemuan online dijadwalkan hari Jumat ini.' },
    image: 'https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=600',
    type: 'update',
    updateId: 4
  },
];

const MOCK_UPDATES = [
  { id: 1, date: '18 Nov 2023', titleEn: 'New School Bus Route', titleId: 'Rute Bus Sekolah Baru', descEn: 'Starting next month, we are adding a new route covering the South District.', descId: 'Mulai bulan depan, kami menambahkan rute baru yang mencakup Area Selatan.' },
  { id: 2, date: '15 Nov 2023', titleEn: 'Library Renovation Completed', titleId: 'Renovasi Perpustakaan Selesai', descEn: 'Students can now enjoy the newly renovated library with more seating areas. This project has been ongoing since last year and we are proud to announce its completion.', descId: 'Siswa kini dapat menikmati perpustakaan yang baru direnovasi dengan lebih banyak area tempat duduk. Proyek ini telah berjalan sejak tahun lalu dan kami bangga mengumumkan penyelesaiannya.' },
  { id: 3, date: '10 Nov 2023', titleEn: 'Sports Day 2023', titleId: 'Pekan Olahraga 2023', descEn: 'Join the annual sports competition next week. Various sports will be held including basketball, futsal, and track events. Please make sure your children bring their sports uniforms.', descId: 'Ikuti kompetisi olahraga tahunan minggu depan. Berbagai cabang olahraga akan dipertandingkan termasuk basket, futsal, dan atletik. Harap pastikan anak-anak membawa seragam olahraga mereka.' },
  { id: 4, date: '08 Nov 2023', titleEn: 'Parent Meeting', titleId: 'Pertemuan Orang Tua', descEn: 'Online meeting scheduled for this Friday to discuss student progress and upcoming final exams. Zoom link will be shared via email to all registered parents.', descId: 'Pertemuan online dijadwalkan hari Jumat ini untuk membahas perkembangan siswa dan ujian akhir yang akan datang. Tautan Zoom akan dibagikan melalui email kepada semua orang tua yang terdaftar.' },
];

const UPCOMING_EVENTS = [
  { id: 1, date: '20', month: 'Nov', titleEn: 'Mid-term Examinations', titleId: 'Ujian Tengah Semester', time: '07:30 - 12:00 WIB' },
  { id: 2, date: '25', month: 'Nov', titleEn: 'Museum Field Trip (Grade 4)', titleId: 'Kunjungan Museum (Kelas 4)', time: '08:00 - 14:00 WIB' },
  { id: 3, date: '01', month: 'Dec', titleEn: 'National Teacher\'s Day', titleId: 'Peringatan Hari Guru Nasional', time: '07:00 - 10:00 WIB' },
];

const MOCK_SCHEDULE = {
  'c1': [{ time: '07:30 - 09:00', subject: 'Math', teacher: 'Mr. Hendra' }, { time: '09:00 - 10:30', subject: 'Science', teacher: 'Mrs. Rina' }, { time: '10:30 - 11:00', subject: 'Break', teacher: '-' }, { time: '11:00 - 12:30', subject: 'English', teacher: 'Mr. John' }],
  'c2': [{ time: '08:00 - 09:30', subject: 'Art', teacher: 'Mrs. Susi' }, { time: '09:30 - 10:00', subject: 'Break', teacher: '-' }, { time: '10:00 - 11:30', subject: 'Math', teacher: 'Mr. Hendra' }]
};

const MOCK_ATTENDANCE = {
  'c1': { present: 45, sick: 2, permission: 1, absent: 0, history: [{ date: '12 Nov 2023', status: 'sick', noteEn: 'Fever', noteId: 'Demam' }, { date: '05 Oct 2023', status: 'permission', noteEn: 'Family event', noteId: 'Acara keluarga' }] },
  'c2': { present: 48, sick: 0, permission: 0, absent: 0, history: [] }
};

const MOCK_GRADES = {
  'c1': { semester: '1 (2023/2024)', subjects: [{ name: 'Math', score: 88 }, { name: 'Science', score: 92 }, { name: 'English', score: 85 }, { name: 'History', score: 78 }] },
  'c2': { semester: '1 (2023/2024)', subjects: [{ name: 'Math', score: 95 }, { name: 'Science', score: 90 }, { name: 'Art', score: 98 }] }
};

const MOCK_AGENDA = {
  'c1': [
    { id: 1, date: '2023-11-20', titleEn: 'Mid-term Examinations', titleId: 'Ujian Tengah Semester', time: '07:30 - 12:00 WIB', type: 'exam' },
    { id: 2, date: '2023-11-25', titleEn: 'Museum Field Trip (Grade 4)', titleId: 'Kunjungan Museum (Kelas 4)', time: '08:00 - 14:00 WIB', type: 'event' },
    { id: 3, date: '2023-12-01', titleEn: 'National Teacher\'s Day', titleId: 'Peringatan Hari Guru Nasional', time: '07:00 - 10:00 WIB', type: 'event' },
  ],
  'c2': [
    { id: 4, date: '2023-11-22', titleEn: 'Coloring Competition', titleId: 'Lomba Mewarnai', time: '08:00 - 10:00 WIB', type: 'event' },
    { id: 5, date: '2023-12-01', titleEn: 'National Teacher\'s Day', titleId: 'Peringatan Hari Guru Nasional', time: '07:00 - 10:00 WIB', type: 'event' },
  ]
};

const MOCK_CLINIC = {
  'c1': { height: '135 cm', weight: '32 kg', bloodType: 'O', visits: [{ date: '12 Nov 2023', complaintEn: 'Fever', complaintId: 'Demam', actionEn: 'Given paracetamol and rested', actionId: 'Diberi paracetamol dan istirahat' }] },
  'c2': { height: '115 cm', weight: '20 kg', bloodType: 'A', visits: [{ date: '02 Sep 2023', complaintEn: 'Scraped knee', complaintId: 'Lutut lecet', actionEn: 'Cleaned and bandaged', actionId: 'Dibersihkan dan diperban' }] }
};

const INITIAL_ADAPTIVE_HISTORY = {
  'c1': [
    { id: 1, date: '18 Nov 2023', subject: 'Math', score: 85, mastery: 'Grade 4-ready' },
    { id: 2, date: '15 Nov 2023', subject: 'Science', score: 70, mastery: 'Grade 3-mastered' }
  ],
  'c2': []
};

const INITIAL_SPP = {
  'c1': [{ month: 'Jul', fullName: 'July', status: 'paid', amount: 500000 }, { month: 'Aug', fullName: 'August', status: 'paid', amount: 500000 }, { month: 'Sep', fullName: 'September', status: 'paid', amount: 500000 }, { month: 'Oct', fullName: 'October', status: 'paid', amount: 500000 }, { month: 'Nov', fullName: 'November', status: 'paid', amount: 500000 }, { month: 'Dec', fullName: 'December', status: 'unpaid', amount: 500000 }, { month: 'Jan', fullName: 'January', status: 'unpaid', amount: 500000 }, { month: 'Feb', fullName: 'February', status: 'unpaid', amount: 500000 }, { month: 'Mar', fullName: 'March', status: 'unpaid', amount: 500000 }, { month: 'Apr', fullName: 'April', status: 'unpaid', amount: 500000 }, { month: 'May', fullName: 'May', status: 'unpaid', amount: 500000 }, { month: 'Jun', fullName: 'June', status: 'unpaid', amount: 500000 }],
  'c2': [{ month: 'Jul', fullName: 'July', status: 'paid', amount: 450000 }, { month: 'Aug', fullName: 'August', status: 'paid', amount: 450000 }, { month: 'Sep', fullName: 'September', status: 'unpaid', amount: 450000 }, { month: 'Oct', fullName: 'October', status: 'unpaid', amount: 450000 }, { month: 'Nov', fullName: 'November', status: 'unpaid', amount: 450000 }, { month: 'Dec', fullName: 'December', status: 'unpaid', amount: 450000 }, { month: 'Jan', fullName: 'January', status: 'unpaid', amount: 450000 }, { month: 'Feb', fullName: 'February', status: 'unpaid', amount: 450000 }, { month: 'Mar', fullName: 'March', status: 'unpaid', amount: 450000 }, { month: 'Apr', fullName: 'April', status: 'unpaid', amount: 450000 }, { month: 'May', fullName: 'May', status: 'unpaid', amount: 450000 }, { month: 'Jun', fullName: 'June', status: 'unpaid', amount: 450000 }]
};

const INITIAL_INSTALLMENTS = {
  'c1': [
    { 
      id: 'inst-c1-1', name: 'Building Fund', total: 5000000, paid: 2500000, minPayment: 500000,
      paymentHistory: [{ date: '10 Oct 2023', amount: 500000 }, { date: '15 Sep 2023', amount: 2000000 }]
    }, 
    { 
      id: 'inst-c1-2', name: 'Annual Activity Fee', total: 1000000, paid: 200000, minPayment: 100000,
      paymentHistory: [{ date: '01 Nov 2023', amount: 200000 }]
    }
  ],
  'c2': [
    { 
      id: 'inst-c2-1', name: 'Admission Fee', total: 7500000, paid: 5000000, minPayment: 500000,
      paymentHistory: [{ date: '12 Aug 2023', amount: 5000000 }]
    }
  ]
};

const PREVIOUS_BILLS = {
  'c1': [{ id: 'prev-spp-may', type: 'tuition', titleEn: 'Tuition May 2023', titleId: 'SPP Mei 2023', amount: 500000, ay: '2022/2023' }, { id: 'prev-spp-jun', type: 'tuition', titleEn: 'Tuition June 2023', titleId: 'SPP Juni 2023', amount: 500000, ay: '2022/2023' }, { id: 'prev-inst-act', type: 'installment', titleEn: 'Activity Fee 22/23', titleId: 'Biaya Kegiatan 22/23', amount: 350000, ay: '2022/2023' }],
  'c2': []
};

const PAYMENT_HISTORY = {
  'c1': [
    { 
      id: 'tx-1', date: '10 Nov 2023, 14:20', description: 'Tuition November', amount: 500000, status: 'Success', method: 'GoPay',
      items: [{ titleEn: 'Tuition November', titleId: 'SPP November', amount: 500000 }]
    }, 
    { 
      id: 'tx-2', date: '10 Oct 2023, 09:15', description: 'Tuition October & Building Fund', amount: 1000000, status: 'Success', method: 'BCA Virtual Account',
      items: [
        { titleEn: 'Tuition October', titleId: 'SPP Oktober', amount: 500000 },
        { titleEn: 'Building Fund (Installment)', titleId: 'Uang Gedung (Cicilan)', amount: 500000 }
      ]
    }
  ],
  'c2': [
    { 
      id: 'tx-4', date: '12 Aug 2023, 10:00', description: 'Tuition July, August & Admission Fee', amount: 5900000, status: 'Success', method: 'Mandiri Virtual Account',
      items: [
        { titleEn: 'Tuition July', titleId: 'SPP Juli', amount: 450000 },
        { titleEn: 'Tuition August', titleId: 'SPP Agustus', amount: 450000 },
        { titleEn: 'Admission Fee', titleId: 'Uang Pangkal', amount: 5000000 }
      ]
    }
  ]
};

// INITIAL HABITS DATA MOCK
const INITIAL_HABITS = {
  'c1': {
    '2023-11-18': { fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false, dhuha: true, tahajud: false, readQuran: false, wakeUpEarly: true, helpParents: true },
    '2023-11-17': { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, dhuha: false, tahajud: false, readQuran: true, wakeUpEarly: true, helpParents: true },
    '2023-11-16': { fajr: false, dhuhr: true, asr: true, maghrib: true, isha: true, dhuha: false, tahajud: false, readQuran: false, wakeUpEarly: false, helpParents: false },
  },
  'c2': {
    '2023-11-18': { fajr: true, dhuhr: true, asr: true, maghrib: false, isha: false, dhuha: true, tahajud: false, readQuran: true, wakeUpEarly: true, helpParents: false },
    '2023-11-17': { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, dhuha: true, tahajud: false, readQuran: true, wakeUpEarly: true, helpParents: true },
  }
};

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const formatInputNumber = (val) => {
  if (val === undefined || val === null) return '';
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Helper functions for dynamic dates
const formatDateObj = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDatesArray = (baseDateStr) => {
  const dates = [];
  const [y, m, d] = baseDateStr.split('-');
  const baseDate = new Date(y, m - 1, d);
  for(let i=4; i>=0; i--) {
    const temp = new Date(baseDate);
    temp.setDate(temp.getDate() - i);
    dates.push(formatDateObj(temp));
  }
  return dates;
};

const getDisplayDate = (dateStr, lang) => {
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

// Circular Progress Component for Installments
const CircularProgress = ({ percentage }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90 absolute inset-0">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className="text-[#3A2EAE] transition-all duration-500 ease-out" strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold text-slate-700 relative z-10">{Math.round(percentage)}%</span>
    </div>
  );
};


export default function App() {
  // --- STATE ---
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('login'); // login, home, finance, history, cart, payment_method, instruction, success, academic, attendance, report, agenda, updates, adaptive_learning, test_simulation, habits, profile, update_detail, installment_history
  const [previousView, setPreviousView] = useState('home');
  const [activeChildId, setActiveChildId] = useState(CHILDREN[0].id);
  const [cart, setCart] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [installmentInputs, setInstallmentInputs] = useState({});
  const [habitsData, setHabitsData] = useState(INITIAL_HABITS);
  const [selectedUpdateId, setSelectedUpdateId] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [adaptiveHistory, setAdaptiveHistory] = useState(INITIAL_ADAPTIVE_HISTORY);
  const [activeTestSubject, setActiveTestSubject] = useState(null);

  const [parentProfile, setParentProfile] = useState({
    name: 'Ahmad Santoso',
    phone: '+62 812-3456-7890',
    email: 'ahmad.santoso@email.com',
    address: 'Jl. Merdeka No. 45, Jakarta Selatan'
  });
  const [childrenProfile, setChildrenProfile] = useState(CHILDREN);

  const t = (key) => TRANSLATIONS[lang][key] || key;
  const activeChild = childrenProfile.find(c => c.id === activeChildId) || childrenProfile[0];

  // Font setup injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // --- ACTIONS ---
  const handleAddSppToCart = (child, monthData) => {
    const cartId = `spp-${child.id}-${monthData.month}`;
    if (cart.find(item => item.id === cartId)) setCart(cart.filter(item => item.id !== cartId));
    else setCart([...cart, { id: cartId, childId: child.id, childName: child.name, type: 'tuition', title: `${t('Tuition ')}${t(monthData.fullName)}`, amount: monthData.amount }]);
  };

  const handleAddInstallmentToCart = (child, installment) => {
    const cartId = `inst-${installment.id}`;
    const inputAmount = installmentInputs[installment.id] || installment.minPayment;
    if (inputAmount < installment.minPayment) { alert(`${t('min')} ${t('payAmount')} ${t(installment.name)}: ${formatRupiah(installment.minPayment)}`); return; }
    const remaining = installment.total - installment.paid;
    const finalAmount = inputAmount > remaining ? remaining : inputAmount;
    setCart([...cart, { id: cartId, childId: child.id, childName: child.name, type: 'installment', title: t(installment.name), amount: finalAmount }]);
  };

  const handleAddPrevBillToCart = (child, bill) => {
    const cartId = `prev-${child.id}-${bill.id}`;
    if (cart.find(item => item.id === cartId)) setCart(cart.filter(item => item.id !== cartId));
    else setCart([...cart, { id: cartId, childId: child.id, childName: child.name, type: bill.type, title: lang === 'en' ? bill.titleEn : bill.titleId, amount: bill.amount }]);
  };

  const removeFromCart = (cartId) => setCart(cart.filter(item => item.id !== cartId));
  
  const handleInstallmentInputChange = (id, value) => {
    const rawValue = value.replace(/\D/g, ''); // Strip non-digits
    setInstallmentInputs({...installmentInputs, [id]: parseInt(rawValue) || 0});
  };
  
  const totalCartAmount = cart.reduce((sum, item) => sum + item.amount, 0);

  const calculateTotalUnpaid = (childId) => {
    const sppUnpaid = INITIAL_SPP[childId].filter(s => s.status === 'unpaid').reduce((sum, s) => sum + s.amount, 0);
    const instUnpaid = INITIAL_INSTALLMENTS[childId].reduce((sum, i) => sum + (i.total - i.paid), 0);
    const prevUnpaid = (PREVIOUS_BILLS[childId] || []).reduce((sum, b) => sum + b.amount, 0);
    return sppUnpaid + instUnpaid + prevUnpaid;
  };

  // --- SUB-COMPONENTS ---

  const LoginView = () => (
    <div className="w-full h-full bg-[#3A2EAE] relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Educational Background Pattern */}
      <div className="absolute top-10 -left-10 text-white opacity-5 transform -rotate-12"><BookOpen size={120} /></div>
      <div className="absolute top-40 -right-10 text-white opacity-5 transform rotate-12"><GraduationCap size={150} /></div>
      <div className="absolute bottom-40 left-0 text-white opacity-5 transform rotate-45"><Microscope size={100} /></div>
      <div className="absolute top-1/4 left-1/2 text-white opacity-5 transform -rotate-12"><Globe size={100} /></div>
      <div className="absolute -bottom-10 right-10 text-white opacity-5 transform -rotate-45"><Palette size={120} /></div>

      <div className="absolute top-6 right-6 z-20">
        <button onClick={() => setLang(lang === 'en' ? 'id' : 'en')} className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3.5 rounded-full text-xs transition-colors shadow-sm border border-white/10">
          {t('langBtn')}
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm animate-slide-up">
        <img 
          src="https://kreativaglobal.sch.id/wp-content/uploads/2026/01/Kreativa-Cambridge-05-scaled.png" 
          alt="Kreativa Global" 
          className="h-20 object-contain mb-10 drop-shadow-xl"
        />
        
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{t('welcome')}</h1>
          <p className="text-indigo-200 text-sm leading-relaxed">{t('loginDesc')}</p>
        </div>

        <button 
          onClick={() => {
            setView('home');
            setPreviousView('home');
          }}
          className="w-full bg-white text-slate-700 font-bold py-3.5 px-4 rounded-full hover:bg-slate-50 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center group border border-transparent hover:border-slate-200"
        >
          <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('loginGoogle')}
        </button>
      </div>
    </div>
  );

  const Header = ({ title, backView, showCart = false, transparent = false }) => (
    <div className={`px-4 py-4 flex items-center sticky top-0 z-20 transition-all ${transparent ? 'bg-transparent' : 'bg-white shadow-sm'}`}>
      {backView && (
        <button onClick={() => setView(backView)} className={`mr-3 p-1.5 rounded-full transition-colors ${transparent ? 'bg-white/20 text-white hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-100 text-slate-700'}`}>
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className={`text-lg font-bold flex-1 ${transparent ? 'text-white' : 'text-slate-700'}`}>{title}</h1>
      {showCart && (
        <div className="relative">
          <button onClick={() => setView('cart')} className={`p-2 relative rounded-full ${transparent ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}>
            <ShoppingCart size={24} />
            {cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-transparent">{cart.length}</span>}
          </button>
        </div>
      )}
    </div>
  );

  const FloatingCart = () => {
    if (cart.length === 0) return null;
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.15)] flex justify-between items-center animate-slide-up z-30">
        <div onClick={() => setView('cart')} className="cursor-pointer">
          <p className="text-xs text-slate-500 font-semibold">{t('total')} ({cart.length} {t('items')})</p>
          <p className="text-lg font-bold text-[#3A2EAE]">{formatRupiah(totalCartAmount)}</p>
        </div>
        <button onClick={() => setView('cart')} className="bg-[#3A2EAE] text-white font-bold px-6 py-2.5 rounded-full hover:bg-[#2A2180] transition-colors flex items-center shadow-md shadow-indigo-200">
          {t('checkout')} <ChevronRight size={18} className="ml-1" />
        </button>
      </div>
    );
  };

  const ChildSelector = () => (
    <div className="px-4 mb-5 mt-2">
      <p className="text-xs font-bold mb-3 uppercase tracking-wider text-[#3A2EAE]">{t('selectChild')}</p>
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        {childrenProfile.map(child => (
          <button
            key={child.id}
            onClick={() => setActiveChildId(child.id)}
            className={`flex-shrink-0 flex items-center p-2 pr-4 rounded-full border transition-all ${
              activeChildId === child.id ? 'border-[#3A2EAE] bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 text-lg ${
              activeChildId === child.id ? 'bg-[#3A2EAE] text-white border-2 border-indigo-200' : 'bg-slate-100 text-slate-500'
            }`}>
              {child.avatar}
            </div>
            <div className="text-left">
              <p className={`font-bold text-sm leading-tight ${activeChildId === child.id ? 'text-[#3A2EAE]' : 'text-slate-700'}`}>{child.name.split(' ')[0]}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const HomeView = () => {
    const carouselRef = useRef(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
      const intervalId = setInterval(() => {
        if (carouselRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          else carouselRef.current.scrollBy({ left: clientWidth * 0.85, behavior: 'smooth' });
        }
      }, 4000); 

      const clockId = setInterval(() => setNow(new Date()), 1000);

      return () => {
        clearInterval(intervalId);
        clearInterval(clockId);
      };
    }, []);

    const formattedDate = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'id-ID', { 
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' 
    }).format(now);

    const formattedTime = now.toLocaleTimeString('en-GB', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    const menus = [
      { id: 'finance', name: t('tuition'), icon: <Receipt size={28} className="text-[#3A2EAE]"/>, color: 'bg-indigo-100' },
      { id: 'academic', name: t('academic'), icon: <BookOpen size={28} className="text-blue-600"/>, color: 'bg-blue-100' },
      { id: 'attendance', name: t('attendance'), icon: <CheckSquare size={28} className="text-orange-600"/>, color: 'bg-orange-100' },
      { id: 'report', name: t('report'), icon: <Award size={28} className="text-purple-600"/>, color: 'bg-purple-100' },
      { id: 'agenda', name: t('agenda'), icon: <Calendar size={28} className="text-red-600"/>, color: 'bg-red-100' },
      { id: 'updates', name: t('updates'), icon: <Megaphone size={28} className="text-teal-600"/>, color: 'bg-teal-100' },
      { id: 'adaptive_learning', name: t('adaptiveLearning'), icon: <Brain size={28} className="text-pink-600"/>, color: 'bg-pink-100' },
      { id: 'habits', name: t('habits'), icon: <CheckCircle2 size={28} className="text-emerald-600"/>, color: 'bg-emerald-100' },
    ];

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-slate-50 relative">
        <div className="bg-[#3A2EAE] h-[260px] rounded-b-[2.5rem] absolute top-0 w-full z-0 overflow-hidden">
          {/* Educational Background Pattern */}
          <div className="absolute top-2 -left-4 text-white opacity-5 transform -rotate-12"><BookOpen size={80} /></div>
          <div className="absolute top-12 right-4 text-white opacity-5 transform rotate-12"><GraduationCap size={100} /></div>
          <div className="absolute top-32 left-1/4 text-white opacity-5 transform rotate-45"><Microscope size={72} /></div>
          <div className="absolute top-8 left-1/2 text-white opacity-5 transform -rotate-12"><Globe size={64} /></div>
          <div className="absolute bottom-4 right-1/3 text-white opacity-5 transform -rotate-45"><Palette size={60} /></div>
        </div>
        <div className="relative z-10 pt-4">
          
          {/* Logo and Header Section */}
          <div className="flex justify-between items-start px-4 mb-4 text-white">
            <div className="flex flex-col items-start">
              <img 
                src="https://kreativaglobal.sch.id/wp-content/uploads/2026/01/Kreativa-Cambridge-05-scaled.png" 
                alt="Kreativa Global" 
                className="h-10 object-contain mb-4"
              />
              <p className="text-sm opacity-90">{t('greeting')}</p>
              <h1 className="text-xl font-bold">{t('parents')}</h1>
            </div>
            <div className="flex flex-col items-end mt-1">
              <div className="flex items-center space-x-2">
                <button onClick={() => setLang(lang === 'en' ? 'id' : 'en')} className="bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3.5 rounded-full text-xs transition-colors flex items-center shadow-sm border border-white/10">{t('langBtn')}</button>
                <button onClick={() => setView('profile')} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"><User size={18} /></button>
              </div>
              <div className="mt-5 text-right">
                <p className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider mb-0.5">{formattedDate}</p>
                <p className="text-sm font-bold text-white tracking-widest">{formattedTime}</p>
              </div>
            </div>
          </div>

          <div className="mb-2 w-full">
            <div ref={carouselRef} className="flex space-x-3 overflow-x-auto pb-4 pl-4 scrollbar-hide snap-x snap-mandatory scroll-smooth">
              {BANNERS.map((banner, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (banner.type === 'web') window.open(banner.link, '_blank');
                    else if (banner.type === 'update' && banner.updateId) {
                      setSelectedUpdateId(banner.updateId);
                      setPreviousView('home');
                      setView('update_detail');
                    }
                  }}
                  className="relative flex-shrink-0 w-[80vw] max-w-[300px] h-36 rounded-xl overflow-hidden snap-center shadow-lg bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <img src={banner.image} alt={banner.title[lang]} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-4 w-full pr-4">
                    <h4 className="font-bold text-base text-white mb-0.5 leading-tight">{banner.title[lang]}</h4>
                    <p className="text-xs text-white/90 line-clamp-1">{banner.desc[lang]}</p>
                  </div>
                </div>
              ))}
              {/* Spacer to allow the last card to slide all the way to the left, enabling full bleed on the right */}
              <div className="w-1 flex-shrink-0"></div>
            </div>
          </div>

          <div className="px-4 mb-6 relative z-10">
            <h3 className="font-bold text-slate-700 mb-3 px-1 text-lg">{t('quickMenus')}</h3>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 bg-white rounded-3xl p-5 shadow-md border border-slate-100">
              {menus.map(menu => (
                <button 
                  key={menu.id} 
                  onClick={() => setView(menu.id)}
                  className="flex flex-col items-center group"
                >
                  <div className={`w-14 h-14 ${menu.color} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-sm`}>
                    {menu.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{menu.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mb-8 relative z-10">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-slate-700 text-lg">{t('upcomingEvents')}</h3>
              <button onClick={() => setView('agenda')} className="text-xs font-bold text-[#3A2EAE] hover:underline">{t('seeAll')}</button>
            </div>
            <div className="space-y-3">
              {UPCOMING_EVENTS.map(event => (
                <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center hover:border-indigo-200 transition cursor-pointer">
                  <div className="bg-indigo-50 rounded-xl w-14 h-14 flex flex-col items-center justify-center flex-shrink-0 border border-indigo-100 mr-4">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase leading-none mb-1">{event.month}</span>
                    <span className="text-lg font-bold text-[#3A2EAE] leading-none">{event.date}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm mb-1">{lang === 'en' ? event.titleEn : event.titleId}</p>
                    <p className="text-xs text-slate-500 flex items-center"><Clock size={12} className="mr-1.5" />{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <FloatingCart />
      </div>
    );
  };

  const AgendaView = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date(2023, 10, 1)); // Defaulting to Nov 2023 to match mock data
    const [selectedDateStr, setSelectedDateStr] = useState(null);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const childAgenda = MOCK_AGENDA[activeChildId] || [];
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const handleMonthChange = (e) => {
      if(e.target.value) {
        const [y, m] = e.target.value.split('-');
        setCurrentMonth(new Date(y, m - 1, 1));
        setSelectedDateStr(null);
      }
    };

    const prevMonth = () => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDateStr(null); };
    const nextMonth = () => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDateStr(null); };

    const renderCalendar = () => {
      const days = [];
      const weekDaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      const weekDaysId = ['Mi', 'Se', 'Sl', 'Ra', 'Ka', 'Ju', 'Sa'];
      const weekDays = lang === 'en' ? weekDaysEn : weekDaysId;

      const header = weekDays.map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>);

      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-2"></div>);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentMonthPrefix}-${String(d).padStart(2, '0')}`;
        const hasEvent = childAgenda.some(ev => ev.date === dateStr);
        const isSelected = selectedDateStr === dateStr;

        days.push(
          <button 
            key={d}
            onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
            className={`relative p-2 h-10 flex flex-col items-center justify-center rounded-xl transition-colors ${isSelected ? 'bg-[#3A2EAE] text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{d}</span>
            {hasEvent && (
              <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-red-500'}`}></div>
            )}
          </button>
        );
      }

      return (
        <>
          <div className="grid grid-cols-7 mb-2">{header}</div>
          <div className="grid grid-cols-7 gap-1">{days}</div>
        </>
      );
    };

    const displayedEvents = selectedDateStr 
      ? childAgenda.filter(ev => ev.date === selectedDateStr)
      : childAgenda.filter(ev => ev.date.startsWith(currentMonthPrefix));

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('agenda')} backView="home" />
        <ChildSelector />
        
        <div className="px-4 space-y-6">
          {/* Calendar Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"><ChevronLeft size={20}/></button>
              <div className="relative">
                <input type="month" value={currentMonthPrefix} onChange={handleMonthChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <h3 className="font-bold text-slate-700 text-lg flex items-center">
                  {currentMonth.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })}
                  <ChevronDown size={16} className="ml-1 text-slate-400"/>
                </h3>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"><ChevronRight size={20}/></button>
            </div>
            
            {renderCalendar()}
          </div>

          {/* Event List */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3 px-1">
              {selectedDateStr ? getDisplayDate(selectedDateStr, lang) : t('monthEvents')}
            </h3>
            <div className="space-y-3">
              {displayedEvents.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                  {t('noEvents')}
                </div>
              ) : (
                displayedEvents.map(ev => (
                  <div key={ev.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start">
                    <div className="bg-indigo-50 rounded-xl p-2 mr-3 text-[#3A2EAE]">
                       <CalendarDays size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700 text-sm mb-1">{lang === 'en' ? ev.titleEn : ev.titleId}</p>
                      <p className="text-xs text-slate-500 flex items-center mb-1"><Clock size={12} className="mr-1.5" />{ev.time}</p>
                      {!selectedDateStr && (
                        <p className="text-[10px] text-indigo-500 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded-md mt-1">{getDisplayDate(ev.date, lang)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AcademicView = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
      <Header title={t('academic')} backView="home" />
      <ChildSelector />
      <div className="px-4">
        <h3 className="font-bold text-slate-700 mb-3">{t('todaySchedule')}</h3>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          {MOCK_SCHEDULE[activeChildId].map((item, idx) => (
            <div key={idx} className="flex relative pl-6">
              <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-[#3A2EAE] border-2 border-indigo-200"></div>
              {idx !== MOCK_SCHEDULE[activeChildId].length - 1 && <div className="absolute left-[4px] top-3 bottom-[-16px] w-[2px] bg-indigo-100"></div>}
              <div className="flex-1">
                <p className="text-xs text-[#3A2EAE] font-bold mb-0.5">{item.time}</p>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{t(item.subject)}</p>
                    <p className="text-xs text-slate-500">{t('teacher')}: {item.teacher}</p>
                  </div>
                  {item.subject !== 'Break' && <Book size={18} className="text-indigo-300"/>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AttendanceView = () => {
    const data = MOCK_ATTENDANCE[activeChildId];
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('attendance')} backView="home" />
        <ChildSelector />
        <div className="px-4 space-y-6">
          <div>
            <h3 className="font-bold text-slate-700 mb-3">{t('attendanceSummary')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100"><p className="text-xs text-slate-500 font-semibold mb-1">{t('present')}</p><p className="text-2xl font-bold text-green-600">{data.present}</p></div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100"><p className="text-xs text-slate-500 font-semibold mb-1">{t('sick')}</p><p className="text-2xl font-bold text-orange-500">{data.sick}</p></div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100"><p className="text-xs text-slate-500 font-semibold mb-1">{t('permission')}</p><p className="text-2xl font-bold text-blue-500">{data.permission}</p></div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100"><p className="text-xs text-slate-500 font-semibold mb-1">{t('absent')}</p><p className="text-2xl font-bold text-red-500">{data.absent}</p></div>
            </div>
          </div>
          {data.history.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-700 mb-3">{t('recentAbsence')}</h3>
              <div className="space-y-3">
                {data.history.map((h, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div><p className="font-bold text-slate-700 text-sm">{lang === 'en' ? h.noteEn : h.noteId}</p><p className="text-xs text-slate-500">{h.date}</p></div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md capitalize ${h.status === 'sick' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{t(h.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ReportView = () => {
    const data = MOCK_GRADES[activeChildId];
    const totalScore = data.subjects.reduce((sum, subj) => sum + subj.score, 0);
    const average = (totalScore / data.subjects.length).toFixed(1);

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('report')} backView="home" />
        <ChildSelector />
        <div className="px-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div><p className="text-xs text-slate-500">{t('semester')}</p><p className="font-bold text-slate-700">{data.semester}</p></div>
              <div className="text-right"><p className="text-xs text-slate-500">{t('average')}</p><p className="font-bold text-2xl text-[#3A2EAE]">{average}</p></div>
            </div>
            <h4 className="font-bold text-slate-700 mb-3">{t('grades')}</h4>
            <div className="space-y-3">
              {data.subjects.map((subj, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center"><FileText size={16} className="text-slate-400 mr-3"/><span className="font-bold text-slate-600 text-sm">{t(subj.name)}</span></div>
                  <span className={`font-bold text-lg ${subj.score >= 90 ? 'text-green-600' : subj.score >= 80 ? 'text-[#3A2EAE]' : 'text-orange-500'}`}>{subj.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UpdatesView = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
      <Header title={t('updates')} backView="home" />
      <div className="px-4 mt-2 space-y-4">
        <h3 className="font-bold text-slate-700 mb-2">{t('schoolAnnouncements')}</h3>
        {MOCK_UPDATES.map(update => (
          <div key={update.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <span className="text-xs text-slate-400 mb-2 block">{update.date}</span>
            <h4 className="font-bold text-slate-700 text-lg mb-2 leading-tight">{lang === 'en' ? update.titleEn : update.titleId}</h4>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed line-clamp-2">{lang === 'en' ? update.descEn : update.descId}</p>
            <button 
              onClick={() => {
                setSelectedUpdateId(update.id);
                setPreviousView('updates');
                setView('update_detail');
              }}
              className="text-[#3A2EAE] font-bold text-sm hover:underline"
            >
              {t('readMore')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const UpdateDetailView = () => {
    const update = MOCK_UPDATES.find(u => u.id === selectedUpdateId);
    if (!update) return null;
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('updates')} backView={previousView} />
        <div className="px-4 mt-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <span className="text-xs font-semibold text-slate-400 mb-3 block">{update.date}</span>
            <h2 className="font-bold text-slate-700 text-xl mb-4 leading-tight">{lang === 'en' ? update.titleEn : update.titleId}</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm border-t border-slate-100 pt-4">
              {lang === 'en' ? update.descEn : update.descId}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AdaptiveLearningView = () => {
    const history = adaptiveHistory[activeChildId] || [];
    const avgScore = history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;

    const subjects = [
      { id: 'math', nameEn: 'Math', nameId: 'Matematika', color: 'bg-blue-100 text-blue-600' },
      { id: 'science', nameEn: 'Science', nameId: 'Ilmu Pengetahuan Alam', color: 'bg-emerald-100 text-emerald-600' },
      { id: 'english', nameEn: 'English', nameId: 'Bahasa Inggris', color: 'bg-orange-100 text-orange-600' },
    ];

    const startTest = (subj) => {
      setActiveTestSubject(subj);
      setView('test_simulation');
    };

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('adaptiveLearning')} backView="home" />
        <ChildSelector />
        
        <div className="px-4 space-y-6">
          {/* Scoreboard */}
          <div className="bg-[#3A2EAE] rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="font-bold text-lg flex items-center"><Target size={20} className="mr-2"/> {t('scoreboard')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-xs text-indigo-200 mb-1">{t('avgScore')}</p>
                <p className="text-3xl font-bold">{avgScore}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-200 mb-1">{t('totalTests')}</p>
                <p className="text-3xl font-bold">{history.length}</p>
              </div>
            </div>
          </div>

          {/* Subject Selection */}
          <div>
             <div className="space-y-3">
               {subjects.map(subj => (
                 <div key={subj.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${subj.color}`}>
                       <Brain size={24} />
                     </div>
                     <span className="font-bold text-slate-700">{lang === 'en' ? subj.nameEn : subj.nameId}</span>
                   </div>
                   <button 
                     onClick={() => startTest(subj)}
                     className="bg-indigo-50 text-[#3A2EAE] p-2.5 rounded-full hover:bg-indigo-100 transition-colors"
                   >
                     <PlayCircle size={24} />
                   </button>
                 </div>
               ))}
             </div>
          </div>

          {/* History */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3 px-1">{t('testHistory')}</h3>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
                  Belum ada riwayat tes.
                </div>
              ) : (
                history.slice().reverse().map(test => (
                  <div key={test.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-700 text-sm mb-1">{t(test.subject)}</p>
                      <p className="text-[10px] text-slate-400">{test.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-[#3A2EAE]">{test.score}</p>
                      <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold mt-1">{t('mastery')}: {(test.mastery * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TestSimulationView = () => {
    const [loading, setLoading] = useState(true);
    const [qData, setQData] = useState(null);
    const [qIndex, setQIndex] = useState(0);
    const [difficulty, setDifficulty] = useState(0.5); // Range 0.0 to 1.0
    const [selectedOpt, setSelectedOpt] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => {
      loadQuestion();
    }, [qIndex]);

    const loadQuestion = async () => {
      setLoading(true);
      setIsAnswered(false);
      setSelectedOpt(null);
      
      const subjName = lang === 'en' ? activeTestSubject.nameEn : activeTestSubject.nameId;
      const prompt = `Generate a multiple choice question for a 4th grade student about ${subjName}. The difficulty level is ${difficulty} on a scale of 0.0 (very easy) to 1.0 (very hard). Return ONLY a valid JSON object matching this exact schema: { "question": "the question text", "options": ["opt1", "opt2", "opt3", "opt4"], "answer": "the exact string of the correct option from the options array", "explanation": "brief explanation of why the answer is correct" }. Do not add markdown blocks.`;

      const apiKey = ""; 

      try {
        if(!apiKey) throw new Error("No API key");
        
        // Implementing simple retry logic as requested
        let responseData = null;
        for(let i=0; i<3; i++) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
            });
            if(res.ok) {
                const data = await res.json();
                responseData = JSON.parse(data.candidates[0].content.parts[0].text);
                break;
            }
            await new Promise(r => setTimeout(r, 1000 * (i+1))); // backoff
        }
        if(responseData) setQData(responseData);
        else throw new Error("Failed to fetch");

      } catch (e) {
        console.log("Using fallback mock question");
        // Safe Fallback if API fails or no key tailored by subject
        const mockQuestionsMap = {
          'math': [
            { question: `What is 15 + ${Math.floor(difficulty * 50)}?`, options: ["25", (15 + Math.floor(difficulty * 50)).toString(), "40", "10"], answer: (15 + Math.floor(difficulty * 50)).toString(), explanation: "Basic addition logic applies here." },
            { question: `If a square has a side length of ${Math.floor(difficulty * 10) + 2} cm, what is its perimeter?`, options: [((Math.floor(difficulty * 10) + 2) * 4).toString(), "20", "16", "10"], answer: ((Math.floor(difficulty * 10) + 2) * 4).toString(), explanation: "The perimeter of a square is 4 times the side length." }
          ],
          'science': [
            { question: `Which planet is known as the Red Planet?`, options: ["Earth", "Mars", "Jupiter", "Venus"], answer: "Mars", explanation: "Mars appears red due to iron oxide (rust) on its surface." },
            { question: `What do plants need for photosynthesis besides water and sunlight?`, options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"], answer: "Carbon Dioxide", explanation: "Plants absorb carbon dioxide from the air to make their own food." }
          ],
          'english': [
            { question: `Choose the correct past tense of the verb "run":`, options: ["runned", "ran", "running", "rans"], answer: "ran", explanation: "'Ran' is the irregular past tense form of 'run'." },
            { question: `What is the synonym of the word "rapid"?`, options: ["Slow", "Lazy", "Fast", "Heavy"], answer: "Fast", explanation: "'Fast' means moving at high speed, which is a synonym for 'rapid'." }
          ]
        };

        const subjectId = activeTestSubject?.id || 'math';
        const subjectQuestions = mockQuestionsMap[subjectId] || mockQuestionsMap['math'];
        
        setQData(subjectQuestions[qIndex % 2]);
      }
      setLoading(false);
    };

    const handleAnswer = (opt) => {
      setSelectedOpt(opt);
      setIsAnswered(true);
    };

    const handleNext = () => {
      const isCorrect = selectedOpt === qData.answer;
      
      // Update IRT difficulty based on correctness
      const newDiff = isCorrect ? Math.min(1.0, difficulty + 0.25) : Math.max(0.0, difficulty - 0.25);
      
      if (qIndex < 1) { // We only want 2 questions total
        setDifficulty(newDiff);
        setQIndex(qIndex + 1);
      } else {
        // Finish test and calculate score
        const finalMastery = newDiff; 
        const testScore = Math.round(finalMastery * 100); // Simplistic scoring based on final difficulty reached
        
        const newHistoryItem = {
            id: Date.now(),
            date: formatDateObj(new Date()),
            subject: activeTestSubject.id,
            score: testScore,
            mastery: finalMastery
        };

        const updatedHistory = { ...adaptiveHistory };
        if(!updatedHistory[activeChildId]) updatedHistory[activeChildId] = [];
        updatedHistory[activeChildId].push(newHistoryItem);
        
        setAdaptiveHistory(updatedHistory);
        setView('adaptive_learning');
      }
    };

    if (loading || !qData) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
          <Loader2 size={48} className="text-[#3A2EAE] animate-spin mb-4" />
          <p className="font-semibold text-slate-500">{t('loadingTest')}</p>
        </div>
      );
    }

    const isCorrect = selectedOpt === qData.answer;

    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <Header title={`${lang === 'en' ? activeTestSubject.nameEn : activeTestSubject.nameId} Test`} backView="adaptive_learning" />
        
        <div className="flex-1 overflow-y-auto px-4 pb-6 mt-4">
          <div className="flex justify-between items-center mb-6">
             <span className="text-sm font-bold text-slate-500">{t('question')} {qIndex + 1} / 2</span>
             <span className="text-[10px] font-bold bg-indigo-100 text-[#3A2EAE] px-2 py-1 rounded-md">Diff: {difficulty.toFixed(2)}</span>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-700 mb-6">{qData.question}</h2>
            <div className="space-y-3">
              {qData.options.map((opt, i) => {
                let btnClass = "w-full text-left p-4 rounded-xl border-2 font-semibold transition-all ";
                
                if (!isAnswered) {
                  btnClass += selectedOpt === opt ? "border-[#3A2EAE] bg-indigo-50 text-[#3A2EAE]" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200";
                } else {
                   if (opt === qData.answer) btnClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
                   else if (selectedOpt === opt && opt !== qData.answer) btnClass += "border-red-500 bg-red-50 text-red-700";
                   else btnClass += "border-slate-200 bg-slate-50 text-slate-400 opacity-50";
                }

                return (
                  <button 
                    key={i} 
                    disabled={isAnswered}
                    onClick={() => setSelectedOpt(opt)}
                    className={btnClass}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {isAnswered && (
             <div className={`p-5 rounded-3xl mb-6 border animate-slide-up ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <h3 className={`font-bold flex items-center mb-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isCorrect ? <CheckCircle2 size={20} className="mr-2"/> : <XCircle size={20} className="mr-2"/>}
                  {isCorrect ? t('correct') : t('incorrect')}
                </h3>
                <p className="text-sm font-medium text-slate-700 mb-1">{t('explanation')}:</p>
                <p className="text-sm text-slate-600 leading-relaxed">{qData.explanation}</p>
             </div>
          )}

        </div>
        
        <div className="p-4 bg-white border-t border-slate-100">
           {!isAnswered ? (
             <button 
               disabled={!selectedOpt}
               onClick={() => handleAnswer(selectedOpt)} 
               className={`w-full font-bold py-3.5 rounded-full transition-colors ${selectedOpt ? 'bg-[#3A2EAE] text-white hover:bg-[#2A2180]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
               {t('submitAnswer')}
             </button>
           ) : (
             <button 
               onClick={handleNext} 
               className="w-full bg-[#3A2EAE] text-white font-bold py-3.5 rounded-full hover:bg-[#2A2180] transition-colors shadow-lg shadow-indigo-200"
             >
               {qIndex < 1 ? t('nextQuestion') : t('finishTest')}
             </button>
           )}
        </div>
      </div>
    );
  };

  const HabitsView = () => {
    const [activeTab, setActiveTab] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(() => formatDateObj(new Date()));
    
    const displayDates = getDatesArray(selectedDate);

    const currentHabits = habitsData[activeChildId]?.[selectedDate] || {
      fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
      dhuha: false, tahajud: false, readQuran: false, wakeUpEarly: false, helpParents: false
    };

    const handleToggle = (key) => {
      const updated = { ...habitsData };
      if (!updated[activeChildId]) updated[activeChildId] = {};
      if (!updated[activeChildId][selectedDate]) updated[activeChildId][selectedDate] = { ...currentHabits };
      
      updated[activeChildId][selectedDate][key] = !updated[activeChildId][selectedDate][key];
      setHabitsData(updated);
    };

    const ChecklistItem = ({ habitKey, label }) => (
      <div 
        onClick={() => handleToggle(habitKey)}
        className="flex justify-between items-center p-3 mb-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
      >
        <span className={`text-sm font-medium ${currentHabits[habitKey] ? 'text-slate-700' : 'text-slate-500'}`}>{label}</span>
        {currentHabits[habitKey] ? (
          <CheckCircle2 size={20} className="text-emerald-500 transition-transform scale-110" />
        ) : (
          <Circle size={20} className="text-slate-300" />
        )}
      </div>
    );

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('habits')} backView="home" />
        <ChildSelector />
        
        <div className="px-4">
          <div className="flex bg-white rounded-full p-1 mb-5 shadow-sm border border-slate-100">
            <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'daily' ? 'bg-[#3A2EAE] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>{t('dailyEntry')}</button>
            <button onClick={() => setActiveTab('summary')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'summary' ? 'bg-[#3A2EAE] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>{t('summary')}</button>
          </div>

          {activeTab === 'daily' ? (
            <div className="animate-slide-up">
              <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide items-center">
                <div className="relative flex-shrink-0">
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => {
                      if(e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#3A2EAE] shadow-sm hover:bg-indigo-50">
                    <Calendar size={20} />
                  </button>
                </div>

                {displayDates.map(dateStr => (
                  <button 
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      selectedDate === dateStr ? 'bg-indigo-50 border-[#3A2EAE] text-[#3A2EAE] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {getDisplayDate(dateStr, lang)}
                  </button>
                ))}
              </div>

              <div className="space-y-5 mt-2">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-3">{t('obligatoryPrayers')}</h3>
                  <ChecklistItem habitKey="fajr" label={t('fajr')} />
                  <ChecklistItem habitKey="dhuhr" label={t('dhuhr')} />
                  <ChecklistItem habitKey="asr" label={t('asr')} />
                  <ChecklistItem habitKey="maghrib" label={t('maghrib')} />
                  <ChecklistItem habitKey="isha" label={t('isha')} />
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-3">{t('sunnahPrayers')}</h3>
                  <ChecklistItem habitKey="dhuha" label={t('dhuha')} />
                  <ChecklistItem habitKey="tahajud" label={t('tahajud')} />
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-3">{t('goodHabits')}</h3>
                  <ChecklistItem habitKey="readQuran" label={t('readQuran')} />
                  <ChecklistItem habitKey="wakeUpEarly" label={t('wakeUpEarly')} />
                  <ChecklistItem habitKey="helpParents" label={t('helpParents')} />
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="bg-[#3A2EAE] rounded-3xl p-5 text-white shadow-lg shadow-indigo-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold flex items-center"><BarChart2 size={18} className="mr-2"/> {t('weeklySummary')}</span>
                </div>
                <div>
                  <p className="text-xs text-indigo-200 mb-1">{t('completionRate')}</p>
                  <p className="text-4xl font-bold">82%</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-5">
                <div>
                  <div className="flex justify-between text-sm text-slate-700 mb-2">
                    <span className="font-medium">{t('obligatoryPrayers')}</span><span className="font-semibold">90%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '90%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-700 mb-2">
                    <span className="font-medium">{t('sunnahPrayers')}</span><span className="font-semibold">40%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '40%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-700 mb-2">
                    <span className="font-medium">{t('goodHabits')}</span><span className="font-semibold">85%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '85%' }}></div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FinanceView = () => (
    <div className="flex-1 overflow-y-auto pb-24 bg-slate-50">
      <Header title={t('tuition')} backView="home" showCart={true} />
      <ChildSelector />
      <div className="px-4 mb-6 mt-2">
        <div className="bg-[#3A2EAE] rounded-3xl p-5 shadow-lg shadow-indigo-200 flex flex-col relative overflow-hidden text-white">
          <div className="flex justify-between items-center mb-4 relative z-10"><div className="flex items-center font-bold"><Wallet size={20} className="text-indigo-300 mr-2"/>{t('tuition')}</div></div>
          <div className="flex justify-between items-end relative z-10"><div><p className="text-xs text-indigo-200 font-semibold mb-1">{t('totalOutstanding')} ({activeChild.name.split(' ')[0]})</p><p className="text-3xl font-bold text-white">{formatRupiah(calculateTotalUnpaid(activeChildId))}</p></div></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div><div className="absolute bottom-0 right-10 w-20 h-20 bg-white opacity-5 rounded-full -mb-10"></div>
        </div>
      </div>
      <div className="px-4 mb-6">
        <button onClick={() => setView('history')} className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-300 transition-colors">
          <div className="flex items-center"><div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3"><History size={20} className="text-[#3A2EAE]" /></div><div className="text-left"><p className="font-bold text-slate-700">{t('paymentHistory')}</p><p className="text-xs text-slate-500">{t('viewHistory')}</p></div></div><ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>
      
      <div className="px-4 space-y-6">
        {PREVIOUS_BILLS[activeChildId] && PREVIOUS_BILLS[activeChildId].length > 0 && (
          <div className="bg-red-50 rounded-3xl p-5 shadow-sm border border-red-100">
            <div className="flex items-center mb-4"><AlertCircle size={20} className="text-red-500 mr-2" /><h2 className="font-bold text-red-700 text-lg">{t('pastDue')}</h2></div>
            <div className="space-y-3">
              {PREVIOUS_BILLS[activeChildId].map((bill) => {
                const cartId = `prev-${activeChildId}-${bill.id}`;
                const isInCart = cart.find(item => item.id === cartId);
                return (
                  <div key={bill.id} className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isInCart ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-red-100'}`}>
                    <div><p className="font-bold text-slate-700 text-sm mb-0.5">{lang === 'en' ? bill.titleEn : bill.titleId}</p><p className="text-xs text-slate-500">{t('ay')} {bill.ay}</p></div>
                    <div className="flex items-center space-x-3 text-right"><p className={`font-bold text-sm ${isInCart ? 'text-[#3A2EAE]' : 'text-slate-700'}`}>{formatRupiah(bill.amount)}</p><button onClick={() => handleAddPrevBillToCart(activeChild, bill)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isInCart ? 'bg-[#3A2EAE] text-white shadow-md' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>{isInCart ? <Check size={16}/> : <ShoppingCart size={16}/>}</button></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5"><h2 className="font-bold text-slate-700 text-lg flex items-center">{t('digitalTuition')}</h2><span className="text-xs font-bold bg-indigo-50 text-[#3A2EAE] px-2.5 py-1 rounded-md">{t('ay')} 2023/2024</span></div>
          <div className="grid grid-cols-4 gap-2.5">
            {INITIAL_SPP[activeChildId].map((monthData, idx) => {
              const cartId = `spp-${activeChildId}-${monthData.month}`;
              const isInCart = cart.find(item => item.id === cartId);
              const isPaid = monthData.status === 'paid';
              let btnClass = "flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all relative overflow-hidden ";
              if (isPaid) btnClass += "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-80";
              else if (isInCart) btnClass += "bg-[#3A2EAE] border-[#3A2EAE] text-white shadow-md shadow-indigo-200 transform scale-105";
              else btnClass += "bg-white border-slate-200 text-slate-600 hover:border-indigo-400";
              return (
                <button key={idx} disabled={isPaid} onClick={() => handleAddSppToCart(activeChild, monthData)} className={btnClass}>
                  <span className="text-xs font-bold mb-1">{t(monthData.month)}</span>
                  {isPaid ? <CheckCircle2 size={18} className="text-emerald-500 mb-1" /> : isInCart ? <ShoppingCart size={18} className="text-white mb-1" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 mb-1" />}
                  <span className={`text-[9px] font-semibold ${isInCart ? 'text-indigo-200' : 'text-slate-400'}`}>{formatRupiah(monthData.amount)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-5 flex items-center bg-slate-50 p-2 rounded-lg"><Info size={14} className="mr-2 text-[#3A2EAE] flex-shrink-0"/> {t('tapUnpaid')}</p>
        </div>
        
        <div>
          <h2 className="font-bold text-slate-700 mb-3 px-1 text-lg">{t('pendingInstallments')}</h2>
          <div className="space-y-4">
            {INITIAL_INSTALLMENTS[activeChildId].map((installment) => {
              const cartId = `inst-${installment.id}`;
              const cartItem = cart.find(item => item.id === cartId);
              const progressPercentage = (installment.paid / installment.total) * 100;
              const remaining = installment.total - installment.paid;
              const defaultInput = installmentInputs[installment.id] || installment.minPayment;

              return (
                <div key={installment.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  
                  {/* Header & Toggle History Link */}
                  <div className="flex justify-between items-start mb-5">
                    <span className="font-bold text-slate-700 text-lg">{t(installment.name)}</span>
                    {installment.paymentHistory && installment.paymentHistory.length > 0 && (
                      <button 
                        onClick={() => {
                          setSelectedInstallment(installment);
                          setPreviousView('finance');
                          setView('installment_history');
                        }} 
                        className="text-[10px] font-bold text-[#3A2EAE] hover:bg-indigo-100 flex items-center bg-indigo-50 px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        {t('installmentHistory')} <ChevronRight size={14} className="ml-1"/>
                      </button>
                    )}
                  </div>

                  {/* Layout: Kiri Grafis, Kanan Input */}
                  <div className="flex items-center gap-4">
                    {/* LEFT: Circular Graphics */}
                    <div className="flex flex-col items-center flex-shrink-0 w-1/3 border-r border-slate-100 pr-2">
                      <CircularProgress percentage={progressPercentage} />
                      <div className="mt-2 text-center w-full">
                        <p className="text-[10px] text-slate-500 leading-tight">{t('left')}</p>
                        <p className="text-xs font-bold text-slate-700 leading-tight">{formatRupiah(remaining)}</p>
                      </div>
                    </div>

                    {/* RIGHT: Input / Action */}
                    <div className="w-2/3 flex flex-col justify-center">
                      {remaining === 0 ? (
                        <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl flex items-center justify-center font-bold">
                          <CheckCircle2 size={18} className="mr-2"/> {t('fullyPaid')}
                        </div>
                      ) : cartItem ? (
                        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl flex flex-col justify-center items-center h-full space-y-2">
                          <div className="text-center">
                            <p className="text-[10px] text-[#3A2EAE] font-bold mb-0.5">{t('inCart')}</p>
                            <p className="font-bold text-slate-700 text-sm">{formatRupiah(cartItem.amount)}</p>
                          </div>
                          <button onClick={() => removeFromCart(cartId)} className="text-[10px] font-bold text-red-500 px-4 py-1.5 bg-white border border-red-100 rounded-xl hover:bg-red-50 w-full">
                            {t('cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-center">
                          <p className="text-[10px] text-slate-500 mb-1.5 font-semibold">{t('payAmount')} ({t('min')} {formatRupiah(installment.minPayment)})</p>
                          <div className="relative w-full mb-2">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#3A2EAE] focus:ring-1 focus:ring-[#3A2EAE] bg-white text-right" 
                              value={formatInputNumber(defaultInput)} 
                              onChange={(e) => handleInstallmentInputChange(installment.id, e.target.value)} 
                            />
                          </div>
                          <button onClick={() => handleAddInstallmentToCart(activeChild, installment)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-600 transition-colors w-full">
                            {t('add')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <FloatingCart />
    </div>
  );

  const InstallmentHistoryView = () => {
    if (!selectedInstallment) return null;
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <Header title={t('installmentHistory')} backView={previousView} />
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mt-4">
            <h2 className="font-bold text-slate-700 text-lg mb-1">{t(selectedInstallment.name)}</h2>
            <p className="text-xs text-slate-500 mb-5">{t('paymentHistory')}</p>
            
            <div className="space-y-3">
              {selectedInstallment.paymentHistory.map((ph, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600 flex items-center text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500 mr-2"/>
                    {ph.date}
                  </span>
                  <span className="font-bold text-slate-700">{formatRupiah(ph.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HistoryView = () => {
    const historyData = PAYMENT_HISTORY[activeChildId] || [];
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <Header title={t('paymentHistory')} backView="finance" />
        <ChildSelector />
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400"><History size={64} className="mb-4 opacity-30" /><p className="font-semibold text-lg">{t('noHistory')}</p></div>
          ) : (
            <div className="space-y-4 mt-2">
              {historyData.map(tx => (
                <div key={tx.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 flex items-center"><CalendarDays size={14} className="mr-1.5"/> {tx.date}</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{t(tx.status)}</span>
                  </div>
                  
                  <p className="font-bold text-slate-700 mb-1 leading-snug">{t(tx.description)}</p>
                  <p className="text-xs text-slate-500 mb-4">{tx.method}</p>

                  {/* Multi-item breakdown */}
                  {tx.items && tx.items.length > 1 && (
                    <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1.5 uppercase tracking-wider">{t('txDetails')}</p>
                      {tx.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs mb-1.5 last:mb-0">
                          <span className="text-slate-600">{lang === 'en' ? item.titleEn : item.titleId}</span>
                          <span className="font-semibold text-slate-700">{formatRupiah(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-semibold">{t('totalPayment')}</span>
                    <span className="font-bold text-xl text-slate-700">{formatRupiah(tx.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const CartView = () => (
    <div className="flex-1 flex flex-col bg-slate-50">
      <Header title={t('paymentCart')} backView="finance" />
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400"><ShoppingCart size={64} className="mb-4 opacity-50" /><p className="font-semibold text-lg">{t('emptyCart')}</p><p className="text-sm text-center mt-2 px-6">{t('emptyCartDesc')}</p></div>
        ) : (
          <div className="space-y-4">
            {childrenProfile.map(child => {
              const childItems = cart.filter(item => item.childId === child.id);
              if (childItems.length === 0) return null;
              return (
                <div key={`cart-${child.id}`} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center mb-4 pb-3 border-b border-slate-100"><div className="w-8 h-8 rounded-full bg-indigo-100 text-[#3A2EAE] flex items-center justify-center mr-3"><User size={16} /></div><span className="font-bold text-slate-700">{child.name}</span></div>
                  <div className="space-y-4">
                    {childItems.map(item => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div><p className="font-bold text-sm text-slate-700">{item.title}</p><p className="text-xs text-slate-500 capitalize">{item.type}</p></div>
                        <div className="text-right"><p className="font-bold text-sm text-slate-700">{formatRupiah(item.amount)}</p><button onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-500 font-bold mt-1.5 hover:underline">{t('remove')}</button></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="bg-white p-5 rounded-3xl flex justify-between items-center border border-slate-200 mt-6 shadow-sm"><span className="font-bold text-slate-600">{t('totalDue')}</span><span className="font-bold text-2xl text-[#3A2EAE]">{formatRupiah(totalCartAmount)}</span></div>
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]"><button onClick={() => setView('payment_method')} className="w-full bg-[#3A2EAE] text-white font-bold py-3.5 rounded-full hover:bg-[#2A2180] transition-colors flex justify-center items-center shadow-lg shadow-indigo-200">{t('choosePayment')} <ArrowRight size={20} className="ml-2"/></button></div>
      )}
    </div>
  );

  const PaymentMethodView = () => {
    const methods = [{ id: 'bca', name: 'BCA Virtual Account', icon: '🏦', type: 'Virtual Account' }, { id: 'mandiri', name: 'Mandiri Virtual Account', icon: '🏦', type: 'Virtual Account' }, { id: 'gopay', name: 'GoPay', icon: '📱', type: 'E-Wallet' }, { id: 'qris', name: 'QRIS', icon: '🔳', type: 'Scan & Pay' }];
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <Header title={t('paymentMethod')} backView="cart" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center mb-6"><p className="text-sm text-slate-500 mb-1">{t('totalPayment')}</p><p className="text-3xl font-bold text-slate-700">{formatRupiah(totalCartAmount)}</p></div>
          <h3 className="font-bold text-slate-700 px-1 mb-2">{t('selectMethod')}</h3>
          <div className="space-y-3">
            {methods.map(method => (
              <label key={method.id} className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPayment === method.id ? 'border-[#3A2EAE] bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                <input type="radio" name="payment" className="hidden" checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)}/>
                <span className="text-2xl mr-4">{method.icon}</span>
                <div className="flex-1"><p className="font-bold text-slate-700 text-sm">{method.name}</p><p className="text-xs text-slate-500">{method.type}</p></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPayment === method.id ? 'border-[#3A2EAE]' : 'border-slate-300'}`}>{selectedPayment === method.id && <div className="w-2.5 h-2.5 rounded-full bg-[#3A2EAE]" />}</div>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-100"><button disabled={!selectedPayment} onClick={() => setView('instruction')} className={`w-full font-bold py-3.5 rounded-full transition-all shadow-md ${selectedPayment ? 'bg-[#3A2EAE] text-white hover:bg-[#2A2180] shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>{t('proceedPayment')}</button></div>
      </div>
    );
  };

  const InstructionView = () => {
    const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
      <div className="flex-1 flex flex-col bg-white">
        <Header title={t('instruction')} backView="payment_method" />
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-center mb-8 mt-2"><p className="text-sm text-slate-500 mb-2">{t('deadline')}</p><p className="text-lg font-bold text-orange-500 bg-orange-50 inline-block px-4 py-1.5 rounded-full">{t('tomorrow')}, 23:59 WIB</p></div>
          <div className="bg-white shadow-lg shadow-slate-200/50 rounded-3xl p-6 border border-slate-100 mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#3A2EAE]"></div>
            <div className="flex justify-between items-center mb-6"><span className="text-sm font-semibold text-slate-600">BCA Virtual Account</span><img src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg" alt="BCA" className="h-5 opacity-70 grayscale mix-blend-multiply"/></div>
            <p className="text-xs text-slate-500 mb-1">{t('vaNumber')}</p>
            <div className="flex justify-between items-center mb-6"><span className="text-2xl font-bold tracking-widest text-slate-700">8801 2345 6789</span><button onClick={handleCopy} className="text-[#3A2EAE] flex flex-col items-center bg-indigo-50 p-2 rounded-xl hover:bg-indigo-100 transition">{copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}<span className="text-[10px] mt-1 font-bold">{copied ? t('copied') : t('copy')}</span></button></div>
            <p className="text-xs text-slate-500 mb-1">{t('totalDue')}</p>
            <p className="text-2xl font-bold text-slate-700">{formatRupiah(totalCartAmount)}</p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-sm">{t('howToPay')}</h3>
            <ol className="text-sm text-slate-600 space-y-3 list-decimal list-inside pl-2 bg-slate-50 p-4 rounded-2xl">
              <li>{t('step1')}</li><li>{t('step2')}</li><li>{t('step3')}</li><li>{t('step4')}</li><li>{t('step5')}</li>
            </ol>
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-100"><button onClick={() => setView('success')} className="w-full bg-[#3A2EAE] text-white font-bold py-3.5 rounded-full hover:bg-[#2A2180] transition-colors shadow-lg shadow-indigo-200">{t('iHavePaid')}</button></div>
      </div>
    );
  };

  const SuccessView = () => (
    <div className="flex-1 flex flex-col bg-white items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6"><CheckCircle size={56} className="text-emerald-500" /></div>
      <h2 className="text-2xl font-bold text-slate-700 mb-2">{t('successTitle')}</h2>
      <p className="text-slate-500 text-sm mb-8 px-4">{t('successDesc')} <br /> <strong>{formatRupiah(totalCartAmount)}</strong></p>
      <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 text-left mb-8 space-y-4 shadow-sm">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">{t('txDetails')}</p>
        {cart.map(item => (
          <div key={item.id} className="flex justify-between text-sm"><span className="text-slate-600 font-semibold">{item.childName.split(' ')[0]} - {item.title}</span><span className="font-bold text-slate-700">{formatRupiah(item.amount)}</span></div>
        ))}
        <div className="border-t border-slate-200 pt-4 mt-2 flex justify-between font-bold text-slate-700 text-lg"><span>{t('total')}</span><span className="text-[#3A2EAE]">{formatRupiah(totalCartAmount)}</span></div>
      </div>
      <button onClick={() => { setCart([]); setSelectedPayment(null); setView('home'); }} className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3.5 rounded-full hover:bg-slate-50 transition-colors">{t('backHome')}</button>
    </div>
  );

  const ProfileView = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempParent, setTempParent] = useState(parentProfile);
    const [tempChildren, setTempChildren] = useState(childrenProfile);
    const clinicData = MOCK_CLINIC[activeChildId];

    const handleSave = () => {
      setParentProfile(tempParent);
      setChildrenProfile(tempChildren);
      setIsEditing(false);
      alert(t('updateSuccess'));
    };

    const handleChildChange = (index, field, value) => {
      const updated = [...tempChildren];
      updated[index] = { ...updated[index], [field]: value };
      setTempChildren(updated);
    };

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-6">
        <Header title={t('profile')} backView="home" />
        <ChildSelector />

        <div className="px-4 mt-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-700 text-lg">{t('parentInfo')}</h2>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`flex items-center text-sm font-bold px-3 py-1.5 rounded-full transition-colors ${isEditing ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-[#3A2EAE]'}`}
            >
              {isEditing ? <><Save size={16} className="mr-1"/> {t('saveChanges')}</> : <><Edit2 size={16} className="mr-1"/> {t('editProfile')}</>}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-1">{t('name')}</p>
              {isEditing ? (
                <input type="text" value={tempParent.name} onChange={e => setTempParent({...tempParent, name: e.target.value})} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700"/>
              ) : (
                <p className="font-medium text-slate-700 flex items-center"><User size={16} className="mr-2 text-indigo-300"/> {parentProfile.name}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-1">{t('phone')}</p>
              {isEditing ? (
                <input type="tel" value={tempParent.phone} onChange={e => setTempParent({...tempParent, phone: e.target.value})} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700"/>
              ) : (
                <p className="font-medium text-slate-700 flex items-center"><Phone size={16} className="mr-2 text-indigo-300"/> {parentProfile.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-1">{t('email')}</p>
              {isEditing ? (
                <input type="email" value={tempParent.email} onChange={e => setTempParent({...tempParent, email: e.target.value})} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700"/>
              ) : (
                <p className="font-medium text-slate-700 flex items-center"><Mail size={16} className="mr-2 text-indigo-300"/> {parentProfile.email}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold mb-1">{t('address')}</p>
              {isEditing ? (
                <textarea value={tempParent.address} onChange={e => setTempParent({...tempParent, address: e.target.value})} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700" rows="2" />
              ) : (
                <p className="font-medium text-slate-700 flex items-start"><MapPin size={16} className="mr-2 text-indigo-300 mt-0.5 flex-shrink-0"/> {parentProfile.address}</p>
              )}
            </div>
          </div>

          <h2 className="font-bold text-slate-700 text-lg mb-4">{t('childInfo')}</h2>
          
          <div className="space-y-4">
             {/* General Info */}
             <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
               <div className="flex items-center mb-4 pb-3 border-b border-slate-100">
                 <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl mr-3">{activeChild.avatar}</div>
                 <div>
                   <p className="font-bold text-[#3A2EAE]">{activeChild.name}</p>
                   <p className="text-xs text-slate-500">{t('studentId')}: {activeChild.nis}</p>
                 </div>
               </div>
               
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-xs text-slate-500 font-semibold mb-1">{t('grade')}</p>
                     <p className="font-medium text-slate-700 text-sm">{activeChild.grade}</p>
                   </div>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1">{t('address')}</p>
                   {isEditing ? (
                     <input type="text" value={activeChild.address} onChange={e => handleChildChange(childrenProfile.indexOf(activeChild), 'address', e.target.value)} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700 text-sm"/>
                   ) : (
                     <p className="font-medium text-slate-700 text-sm">{activeChild.address}</p>
                   )}
                 </div>
                 <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1">{t('medicalNotes')}</p>
                   {isEditing ? (
                     <input type="text" value={activeChild.medicalNotes} onChange={e => handleChildChange(childrenProfile.indexOf(activeChild), 'medicalNotes', e.target.value)} className="w-full border-b border-indigo-200 focus:outline-none focus:border-[#3A2EAE] pb-1 font-medium text-slate-700 text-sm"/>
                   ) : (
                     <p className="font-medium text-slate-700 text-sm">{activeChild.medicalNotes}</p>
                   )}
                 </div>
               </div>
             </div>

             {/* Health Record */}
             {clinicData && (
                <>
                  <h2 className="font-bold text-slate-700 text-lg mt-6 mb-4">{t('healthRecord')}</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"><Thermometer size={20} className="text-pink-500 mb-1"/><p className="text-[10px] text-slate-500 font-semibold">{t('height')}</p><p className="font-bold text-slate-700">{clinicData.height}</p></div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"><Activity size={20} className="text-blue-500 mb-1"/><p className="text-[10px] text-slate-500 font-semibold">{t('weight')}</p><p className="font-bold text-slate-700">{clinicData.weight}</p></div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center"><HeartPulse size={20} className="text-red-500 mb-1"/><p className="text-[10px] text-slate-500 font-semibold">{t('bloodType')}</p><p className="font-bold text-slate-700">{clinicData.bloodType}</p></div>
                  </div>

                  {clinicData.visits.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-bold text-slate-700 mb-3">{t('clinicVisits')}</h3>
                      <div className="space-y-3">
                        {clinicData.visits.map((v, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start">
                            <div className="bg-pink-50 p-2 rounded-full mr-3 mt-1"><Stethoscope size={16} className="text-pink-500" /></div>
                            <div><p className="font-bold text-slate-700 text-sm">{lang === 'en' ? v.complaintEn : v.complaintId}</p><p className="text-xs text-slate-500 mb-1">{v.date}</p><p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">{lang === 'en' ? v.actionEn : v.actionId}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
             )}
          </div>

          <button 
            onClick={() => setView('login')} 
            className="w-full mt-6 bg-white border border-red-200 text-red-500 font-bold py-3.5 rounded-full hover:bg-red-50 transition-colors flex items-center justify-center shadow-sm"
          >
            <LogOut size={18} className="mr-2"/> {t('logout')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen max-w-md mx-auto bg-slate-50 flex flex-col relative overflow-hidden text-slate-700" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>
      {view === 'login' && <LoginView />}
      {view === 'home' && <HomeView />}
      {view === 'finance' && <FinanceView />}
      {view === 'history' && <HistoryView />}
      {view === 'installment_history' && <InstallmentHistoryView />}
      {view === 'cart' && <CartView />}
      {view === 'payment_method' && <PaymentMethodView />}
      {view === 'instruction' && <InstructionView />}
      {view === 'success' && <SuccessView />}
      {view === 'academic' && <AcademicView />}
      {view === 'attendance' && <AttendanceView />}
      {view === 'report' && <ReportView />}
      {view === 'agenda' && <AgendaView />}
      {view === 'updates' && <UpdatesView />}
      {view === 'update_detail' && <UpdateDetailView />}
      {view === 'adaptive_learning' && <AdaptiveLearningView />}
      {view === 'test_simulation' && <TestSimulationView />}
      {view === 'habits' && <HabitsView />}
      {view === 'profile' && <ProfileView />}

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}