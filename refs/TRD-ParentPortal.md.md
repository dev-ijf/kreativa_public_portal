

## Technical Requirements Document
## (TRD)
## Parent Portal & Student Adaptive Learning —
Multi-Tenant
## Versi: 1.0
## Tanggal: April 2026
## Status: Draft
## Tech Lead: —
Referensi PRD: PRD-ParentPortal v1.0
## 1. Stack Teknologi & Filosofi
## Layer Teknologi Catatan Eksekusi
Framework Next.js 15 (App Router) SSR (Server-Side
Rendering) untuk data
dinamis, RSC.
Styling Tailwind CSS v4 Utility-first, sangat
dioptimasi untuk
mobile-viewport.
Font & Image Source Sans Pro (Source
## Sans 3)
next/font/google dan
next/image dengan cache
agresif.
Database Neon Postgres Serverless Strictly Raw SQL via
neon() HTTP Driver.
ORM / Migration TIDAK ADA ORM Schema & seed di-generate
via Admin Panel. Parent
Portal murni konsumsi DB
via raw SQL.
File Storage Vercel Blob Penyimpanan bukti bayar &

aset media profil/sekolah.
Cache & Limit Upstash Redis Caching query, rate limiter
API, circuit breaker state.
Background Job Upstash Workflow Antrean notif WA,
sinkronisasi pembayaran.
Payment Xendit, Midtrans, Flip Xendit (Primary), Midtrans
(Fallback), Flip
(Manual/Disbursement).
Notifikasi WA Fonnte, StarSender Fonnte (Primary),
StarSender (Fallback
otomatis).
Deployment Vercel Skalabilitas instan, Edge
## Network Middleware.
- Arsitektur Multi-Tenant (Middleware)
Aplikasi melayani dua institusi dalam Satu Codebase dan Satu Vercel Project.
## Alur Deteksi:
## 1.
Pengguna mengakses parents.kreativaglobal.sch.id atau parents.talentajuara.sch.id.
## 2.
Vercel Edge Middleware mencegat request, membaca req.headers.get('host').
## 3.
Middleware menyisipkan header kustom x-tenant-id (contoh: kreativa atau talenta).
## 4.
Root Layout membaca x-tenant-id, lalu menginjeksi CSS Variables (--color-primary,
--color-secondary) ke tag <html>.
## 5.
Tailwind menggunakan warna dinamis tersebut. Tidak ada komponen UI yang diduplikasi.
- Aturan Database: Raw SQL Only
Parent Portal dirancang untuk kecepatan (lightning-fast) dan overhead yang nol. Oleh karena
itu, runtime aplikasi dilarang keras menggunakan Drizzle, Prisma, atau ORM lainnya.
## 3.1 Singleton Database Client
Semua koneksi menggunakan HTTP Driver Neon untuk meminimalkan cold-start dan masalah
koneksi pooler pada serverless.
// lib/db/client.ts
import { neon } from '@neondatabase/serverless';


// Pool koneksi HTTP dari environment variable
export const sql = neon(process.env.DATABASE_URL!);

3.2 Contoh Eksekusi Raw SQL
Eksekusi data selalu menggunakan Tagged Template Literals yang menjamin keamanan
terhadap SQL Injection.
// app/api/tuition/route.ts
import { sql } from '@/lib/db/client';

export async function GET(req: Request) {
const studentId = 123; // Didapat dari session/token

// Raw SQL Query murni, cepat, dan predictable
const tuitions = await sql`
SELECT id, month, amount, status
FROM academic_tuitions
WHERE student_id = ${studentId}
ORDER BY id ASC
## `;

return Response.json({ success: true, data: tuitions });
## }

- Performa: Caching, Image, dan Rendering
4.1 Strategi SSR & Next Image
## ●
Keuangan & Rapor: Dirender secara dinamis (SSR) agar tidak ada data basi (Tagihan yang
sudah dibayar langsung hilang).
## ●
Pengumuman & Agenda: Dirender dengan ISR (revalidate: 300) karena data tidak
berubah setiap detik.
## ●
Aset & Gambar: Semua logo sekolah, banner berita, dan foto profil dilewatkan melalui
komponen <Image /> bawaan Next.js untuk kompresi ke format WebP/AVIF secara
otomatis.
## 4.2 Upstash Redis: Rate Limiting & Query Cache
Untuk mencapai resilience, semua endpoint API publik (khususnya Checkout) dilindungi rate
limiter via Redis.

Data Master (seperti Profil Yayasan, Pengaturan Bank) di-cache di Upstash Redis selama 1 jam.
## 5. Sistem Integrasi Eksternal
5.1 Payment Gateway (Circuit Breaker Pattern)
Pembayaran SPP dan Cicilan sangat krusial. Sistem menggunakan metode Circuit Breaker yang
disimpan state-nya di Redis.
## 1.
Percobaan generate VA ke Xendit.
## 2.
Jika Xendit down atau timeout 3 kali berturut-turut, Circuit Breaker terbuka.
## 3.
Traffic pembayaran otomatis dialihkan (failover) menggunakan API Midtrans.
## 4.
Untuk orang tua yang memilih Transfer Manual, bukti transfer (gambar) diunggah
menggunakan Vercel Blob melalui API Route, lalu disimpan URL-nya ke tabel transaksi.
Modul Flip dapat digunakan untuk proses verifikasi dana.
5.2 WhatsApp Failover
Seluruh proses konfirmasi bayar dan rapor dikirim asinkron agar UI tidak loading lama.
## 1.
triggerWorkflow('sendWA', { phone, message })
## 2.
Upstash Workflow memanggil API worker.
## 3.
Sistem mencoba menembak API Fonnte. Jika respons gagal/error, blok catch akan
langsung mencoba menembak API StarSender.
- Fitur Adaptive Learning (IRT) Workflow
Sistem IRT (Item Response Theory) di-handle via API Next.js.
## 1.
Klien mengirim payload tes baru dengan subjek tertentu.
## 2.
Backend (API) mengambil skor Mastery terakhir anak dari database.
## 3.
Backend menarik Raw SQL ke bank soal academic_adaptive_questions (Atau melempar
prompt dinamis jika menggunakan integrasi Gemini AI) menyesuaikan nilai difficulty yang
sepadan dengan skor Mastery.
## 4.
Saat anak Submit Answer, Backend menghitung deviasi penguasaan, merespons
Benar/Salah beserta penjelasannya, dan menyediakan ID soal berikutnya yang lebih
sulit/mudah.
## 5.
Akhir sesi tes memicu Upstash Workflow untuk mengkompilasi Scoreboard dan
menyimpan rekap ke database.
## 7. Keamanan & Lingkungan Deployment
## ●
## Deployment Platform: Vercel Edge.
## ●
Environment Variables (Rahasia):
## ○
DATABASE_URL (Neon Postgres Proxy)
## ○
## UPSTASH_REDIS_REST_URL & TOKEN
## ○
BLOB_READ_WRITE_TOKEN (Vercel)

## ○
QSTASH_TOKEN (Upstash Workflow)
## ○
## XENDIT_SECRET_KEY, MIDTRANS_SERVER_KEY, FONNTE_TOKEN
## ●
Header Security: Mengimplementasikan keamanan CSP (Content Security Policy) di
next.config.ts, X-Frame-Options: DENY, dan X-Content-Type-Options: nosniff.
## ●
JSON Web Tokens (JWT): Autentikasi sesi dienkripsi dengan status HttpOnly Cookies
pada level browser.