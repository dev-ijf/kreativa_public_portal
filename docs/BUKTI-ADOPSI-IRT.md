# Bukti Adopsi Item Response Theory (IRT)

Dokumen ini merangkum **jejak yang dapat diverifikasi** bahwa Parent Portal / Adaptive Learning pada proyek **Kreativa Public Portal** mengadopsi prinsip dan mekanisme **Item Response Theory (IRT)**. Rujukan utama: artefak produk (`refs/`) dan kode aplikasi (`app/`, `lib/`).

---

## 1. Definisi singkat IRT dalam konteks produk

IRT menghubungkan **kemampuan laten peserta** (di sini dipetakan ke *mastery* / θ pada skala terbatas) dengan **karakteristik butir** (minimal: **tingkat kesulitan** / *difficulty* / *b*) melalui fungsi respons butir. Sistem kemudian:

1. memperbarui estimasi kemampuan setelah respons benar/salah, dan  
2. memilih butir berikutnya yang **selaras** dengan estimasi kemampuan saat ini.

Itulah inti *computerized adaptive testing* berbasis IRT.

---

## 2. Bukti pada level kebutuhan produk (PRD / TRD)

| Artefak | Bukti |
|--------|--------|
| `refs/PRD-ParentPortal.md.md` | Fitur dijelaskan sebagai **Adaptive Learning berbasis Item Response Theory (IRT)**; tujuan produk menyebut evaluasi **IRT** yang menyesuaikan kesulitan soal; bagian **6.4 Adaptive Learning (Item Response Theory)** mendefinisikan alur tes dan *ability score* (0.0–1.0). |
| `refs/TRD-ParentPortal.md.md` | Bagian **Fitur Adaptive Learning (IRT) Workflow** menyatakan IRT di-handle lewat API Next.js: pembacaan *Mastery* terakhir, penarikan soal dengan penyesuaian **difficulty**, kalkulasi deviasi penguasaan saat submit, dan penyediaan soal berikutnya yang lebih sulah/mudah. |

Dokumen-dokumen tersebut menempatkan IRT sebagai **spesifikasi arsitektur fitur**, bukan sekadar label pemasaran.

---

## 3. Bukti pada level basis data (skema referensi)

Pada `refs/kgs_scheme.sql` modul adaptif direpresentasikan dengan:

- Tabel **`academic_adaptive_tests`**: kolom **`mastery_level`** `numeric(3,2)` — persistensi estimasi penguasaan antar sesi.  
- Tabel **`academic_adaptive_questions`**: kolom **`difficulty`** `numeric(3,2)` — parameter kesulitan per butir yang dilog.  
- Indeks **`idx_acad_adq_subj_grade_diff`** pada `(subject_id, grade_band, difficulty)` — mendukung query seleksi butir yang mempertimbangkan kesulitan dalam konteks mapel dan kelompok jenjang.

Kode server saat ini juga memakai tabel **`academic_adaptive_questions_bank`** (parameter `difficulty` per butir bank) untuk alur produksi bank soal; pastikan objek ini ada di lingkungan deployment yang sesuai dengan migrasi aktual.

---

## 4. Bukti pada level implementasi (kode)

### 4.1 Penamaan dan tanggung jawab modul

File `lib/data/server/adaptive.ts` secara eksplisit mengelompokkan logika di bawah komentar **IRT**, antara lain:

- **`getLastMastery`** — membaca `mastery_level` terakhir dari `academic_adaptive_tests` sebagai inisialisasi θ.  
- **`getLifetimeCorrectIds`** — mendukung kebijakan eksklusi butir yang sudah dikuasai.  
- **`fetchNextIRTQuestion`** — seleksi butir berikutnya dari bank.  
- **`computeNewMastery`** — pembaruan θ setelah respons (diberi label **1PL Rasch Model** di komentar kode).

### 4.2 Fungsi respons butir (inti IRT)

Implementasi memakai bentuk logistik standar untuk probabilitas jawaban benar:

\[
P(\text{benar} \mid \theta, b) = \frac{1}{1 + e^{-1{,}7\,(\theta - b)}}
\]

dengan θ = *mastery* siswa dan *b* = `difficulty` butir. Pembaruan θ memakai selisih antara outcome observasi (0/1) dan \(P(\text{benar})\), diskalakan **learning rate** 0.1, lalu dipetakan ke rentang \([0, 1]\).

Referensi langsung di repositori:

```189:193:lib/data/server/adaptive.ts
export function computeNewMastery(theta: number, difficulty: number, isCorrect: boolean): number {
  const pCorrect = 1 / (1 + Math.exp(-1.7 * (theta - difficulty)));
  const delta = LEARNING_RATE * ((isCorrect ? 1 : 0) - pCorrect);
  return Math.max(0, Math.min(1, theta + delta));
}
```

Ini setara dengan **model satu parameter per butir (kesulitan)** pada skala logit dengan konstanta **1.7** (jembatan ke skala “normal” yang umum dipakai dalam literatur tes).

### 4.3 Seleksi butir adaptif (informasi / target θ)

Butir berikutnya dipilih dengan meminimalkan \(|b - \theta|\) (butir yang “mengapit” kemampuan saat ini), dengan tie-break acak:

```161:162:lib/data/server/adaptive.ts
    ORDER BY ABS(bank.difficulty - ${theta}) ASC, RANDOM()
    LIMIT 1
```

Parameter SQL **`${theta}`** di sini adalah estimasi penguasaan terbaru setelah submit — konsisten dengan paradigma CAT berbasis θ.

### 4.4 Orkestrasi API

| Endpoint | Peran dalam alur IRT |
|----------|----------------------|
| `app/api/portal/adaptive/start/route.ts` | Membaca mastery awal (`getLastMastery`), membuat sesi, memanggil **`fetchNextIRTQuestion`** dengan θ awal. |
| `app/api/portal/adaptive/submit/route.ts` | Membaca `difficulty` butir dari bank, menghitung **`computeNewMastery`**, lalu **`fetchNextIRTQuestion`** dengan θ terbaru. |

Contoh pemanggilan pembaruan mastery dan soal berikutnya:

```54:83:app/api/portal/adaptive/submit/route.ts
  const correctAnswer = String((bankRows[0] as { correctAnswer: string }).correctAnswer);
  const questionDifficulty = Number((bankRows[0] as { difficulty: number }).difficulty);

  const isCorrect = studentAnswer.trim() === correctAnswer.trim();

  const newMastery = computeNewMastery(state.currentMastery, questionDifficulty, isCorrect);
  // ...
  if (!isFinished) {
    nextQuestion = await fetchNextIRTQuestion(
      state.subjectId,
      state.gradeBand,
      newMastery,
      newCorrectIds,
      state.sessionQuestionIds,
    );
```

### 4.5 Antarmuka pengguna

Komponen portal (mis. `AdaptiveTestPageClient.tsx`, `AdaptiveHistoryDetailPageClient.tsx`) menampilkan dan mengirim data yang selaras dengan parameter IRT (mis. **difficulty** pada riwayat), sehingga perilaku adaptif dapat dilacak dari sisi pengguna.

---

## 5. Kesimpulan

| Aspek IRT | Status di codebase |
|-----------|---------------------|
| Parameter butir (*difficulty*) | Ada di model data & query bank soal. |
| Estimasi kemampuan (*mastery* / θ) | Dipersisten (`mastery_level`), diperbarui setiap jawaban. |
| Fungsi respons butir | Logistik 1-parameter dengan faktor skala 1.7. |
| Seleksi adaptif | Berbasis jarak \|b − θ\| pada bank yang disetujui. |
| Dokumentasi produk | PRD & TRD menyebut IRT secara eksplisit. |

Dengan demikian, **adopsi IRT dapat dibuktikan** melalui kombinasi: (1) spesifikasi produk, (2) skema data yang mendukung θ dan *b*, serta (3) implementasi matematika dan alur API yang mengimplementasikan pembaruan θ dan seleksi butir berdasarkan θ.

---

## 6. Catatan untuk auditor / reviewer

- **PRD** (bagian 6.4) memuat ilustrasi penyesuaian ±0.25 sebagai contoh alur bisnis; **implementasi terkini** memakai **kurva logistik dan gradien stokastik** seperti pada cuplikan kode di atas. Untuk laporan formal, sebaiknya selaraskan narasi PRD dengan rumus produksi atau dokumentasikan secara eksplisit bahwa produksi memakai varian 1PL + CAT.  
- Validasi psikometrik penuh (kalibrasi butir, *fit* model, uji asumsi IRT) berada di luar cakupan file aplikasi ini dan biasanya menjadi tanggung jawab tim konten/asesmen.

---

**Versi dokumen:** 1.0  
**Tanggal referensi repositori:** Mei 2026  
**Lokasi bukti kode utama:** `lib/data/server/adaptive.ts`, `app/api/portal/adaptive/start/route.ts`, `app/api/portal/adaptive/submit/route.ts`
