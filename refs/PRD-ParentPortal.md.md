

Product Requirements Document (PRD)
## Parent Portal & Student Adaptive Learning —
Multi-Tenant
## Versi: 1.0
## Tanggal: April 2026
## Status: Draft
Pemilik Produk: Tim IT Yayasan (Kreativa & Talenta)
## 1. Ringkasan Eksekutif
Parent Portal adalah aplikasi mobile-first berbasis web yang dirancang sebagai pintu gerbang
utama bagi orang tua murid untuk memantau perkembangan akademik, kehadiran, tagihan
keuangan, hingga aktivitas harian anak. Selain itu, aplikasi ini merangkap sebagai Student
Portal melalui fitur Adaptive Learning berbasis Item Response Theory (IRT). Aplikasi ini melayani
9 sekolah di bawah 2 institusi (Kreativa Global dan Talenta Juara) menggunakan satu codebase
dengan tampilan yang menyesuaikan domain secara otomatis (Multi-Tenant).
## 2. Latar Belakang & Masalah
## 2.1 Konteks Bisnis
Yayasan mengelola 9 entitas sekolah yang terbagi ke dalam dua brand: Kreativa Global (4
sekolah) dan Talenta Juara (5 sekolah). Orang tua membutuhkan satu platform terpadu untuk
mengakses informasi sekolah, membayar SPP, dan memantau evaluasi belajar anak tanpa harus
berpindah-pindah aplikasi.
2.2 Permasalahan yang Dipecahkan
## ●
Fragmentasi Informasi: Orang tua kesulitan melacak tagihan, jadwal, kehadiran, dan
rapor yang tersebar di berbagai saluran.
## ●
Pembayaran Manual: Proses pembayaran SPP/Cicilan masih konvensional dan verifikasi
memakan waktu.
## ●
Evaluasi Belajar Statis: Tes evaluasi anak biasanya statis. Dibutuhkan sistem pembelajaran
yang menyesuaikan dengan tingkat kemampuan anak (Adaptive Learning).
## ●
Manajemen Multi-Anak: Orang tua dengan lebih dari satu anak di sekolah yang
sama/berbeda membutuhkan switcher yang cepat.
## 3. Tujuan Produk

## 1.
Menyediakan pengalaman pengguna (UX) mobile-first yang sangat responsif, cepat, dan
intuitif.
## 2.
Mengotomatisasi siklus penagihan dan pembayaran sekolah dengan integrasi payment
gateway (Multi-channel).
## 3.
Menghadirkan fitur evaluasi belajar berbasis AI (IRT - Item Response Theory) yang
menyesuaikan tingkat kesulitan soal secara real-time.
## 4.
Menyatukan ekosistem 2 brand sekolah dalam 1 codebase efisien berbasis deteksi
hostname.
## 4. Target Pengguna
## Segmen Deskripsi
Orang Tua (Parents) Pengguna utama yang membayar tagihan,
mengecek kehadiran, rapor, dan memantau
pembiasaan harian.
Siswa (Students) Pengguna sekunder yang mengakses menu
Adaptive Learning untuk melakukan tes
mandiri.
- Lingkup Produk (Scope)
5.1 In-Scope
## ●
Autentikasi via Google SSO.
## ●
Sistem Multi-Tenant UI (Warna & Logo berubah berdasarkan domain
parents.kreativaglobal.sch.id vs parents.talentajuara.sch.id).
## ●
Selector Anak Global (Memilih profil anak yang aktif di seluruh sesi).
## ●
Fitur Utama: Keuangan (Tuition & Installment), Akademik (Jadwal), Kehadiran, Rapor,
Agenda Sekolah (Kalender), Pengumuman, Pembiasaan Harian (Habits), Profil & Riwayat
## Medis.
## ●
Fitur Integrasi: Pembayaran Online (Xendit, Midtrans, Flip), Notifikasi WA Otomatis.
## ●
Fitur Khusus: Adaptive Learning (Simulasi tes soal dinamis berbasis tingkat
penguasaan/Mastery).
5.2 Out-of-Scope (di luar batasan Frontend Portal)
## ●
Panel Admin / CRUD Data Master (Telah memiliki sistem terpisah).
## ●
Proses Database Migration dan Seeding (Dikelola oleh Panel Admin).
## 6. Fitur & Spesifikasi Fungsional

6.1 Login & SSO
## ●
Tampilan mengambil tema sesuai domain (Kreativa/Talenta).
## ●
Autentikasi diwajibkan menggunakan Sign In with Google untuk kemudahan akses dan
keamanan (hanya email terdaftar yang dapat masuk).
6.2 Beranda (Home)
## ●
Header: Logo dinamis, tombol Language Switcher, tanggal real-time (berdetik), dan foto
profil.
## ●
Carousel Banner: Berita/Acara terbaru. Mengarahkan ke detail berita atau external link.
## ●
Menu Cepat: Akses ke Keuangan, Akademik, Kehadiran, Rapor, Agenda, Info, Adaptive
Learning, dan Pembiasaan.
## ●
Agenda Sekolah: Menampilkan tiga acara sekolah terdekat.
6.3 Manajemen Keuangan (Tuition & Installments)
## ●
Digital Tuition Card: Tampilan 12 bulan SPP (Juli-Juni). Indikator visual untuk status Lunas,
Di Keranjang, dan Belum Bayar.
## ●
Pending Installments: Pembayaran uang pangkal/gedung dengan UI Circular Progress.
Orang tua dapat menginput nominal cicilan bebas (rata kanan, separator ribuan) selama di
atas batas minimal.
## ●
Payment Cart: Akumulasi tagihan SPP dan Cicilan dari semua anak ke dalam 1 keranjang
pembayaran.
## ●
Checkout & Multi-Gateway: Pilihan QRIS, Virtual Account (Mandiri, BCA, BSI, BRI),
E-Wallet, dan Manual Transfer.
## ●
Riwayat Pembayaran: Menampilkan rekapitulasi transaksi sukses (termasuk rincian item
tagihan yang dibayar secara kolektif).
6.4 Adaptive Learning (Item Response Theory)
Fitur latihan soal untuk siswa dengan mekanisme dinamis:
## ●
Test Configuration: Memilih mata pelajaran (Math, Science, English).
## ●
Test Execution (IRT Flow):
## ○
Sistem melacak "ability score" (tingkat kemampuan 0.0 - 1.0).
## ○
Jika siswa menjawab Benar → Tingkat kesulitan soal berikutnya naik (+0.25).
## ○
Jika siswa menjawab Salah → Tingkat kesulitan soal berikutnya turun (-0.25).
## ○
Soal digenerate/diambil dari bank soal secara dinamis.
## ●
Test Result: Menampilkan skor rata-rata, penguasaan (Mastery Level), dan mencatatnya di
## Scoreboard & Test History.
## 6.5 Akademik, Kehadiran & Agenda
## ●
Akademik: Jadwal pelajaran anak hari ini.
## ●
Kehadiran: Statistik total (Hadir, Izin, Sakit, Alpa) dan log riwayat ketidakhadiran.
## ●
Agenda: Kalender interaktif bulan ini beserta markah acara (Ujian, Kunjungan, Libur).

## ●
Rapor: Menampilkan IPK (Rata-rata) dan daftar nilai akhir semester per mata pelajaran.
6.6 Pembiasaan Harian (Habits)
## ●
Fitur checklist harian untuk Shalat Wajib (Subuh-Isya), Shalat Sunnah, dan Kebaikan Harian.
## ●
Tab Rekapitulasi (Summary) menampilkan persentase kepatuhan mingguan dengan grafik
progress bar.
## 6.7 Profil & Riwayat Medis
## ●
Data Orang Tua: Menampilkan dan dapat mengubah data kontak.
## ●
Data Anak: Identitas siswa, kelas, dan riwayat kunjungan UKS (Medis) berupa tinggi/berat
badan dan catatan keluhan/tindakan klinik.
- Notifikasi WhatsApp (Event-Triggered)
Pengiriman pesan WhatsApp terotomasi kepada orang tua pada event berikut:
## 1.
Tagihan baru dibuat/Pengingat tagihan.
## 2.
Pembayaran SPP/Cicilan sukses terkonfirmasi.
## 3.
Rapor/Laporan evaluasi Adaptive Learning telah diterbitkan.
## 4.
Notifikasi absensi jika anak tercatat tidak hadir.
- Metrik Keberhasilan (KPI)
## ●
Waktu loading halaman utama dan dashboard < 1.5 detik (TTFB).
## ●
Tingkat penyelesaian pembayaran mandiri (self-service checkout) > 85%.
## ●
Penggunaan fitur Adaptive Learning minimal 2 tes per anak per minggu.