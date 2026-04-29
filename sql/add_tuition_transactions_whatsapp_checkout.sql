-- Jalankan di Neon bila kolom belum ada (portal: WA checkout async + flag + student_id untuk kwitansi).
ALTER TABLE public.tuition_transactions
  ADD COLUMN IF NOT EXISTS student_id int4;

ALTER TABLE public.tuition_transactions
  ADD COLUMN IF NOT EXISTS is_whatsapp_checkout boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tuition_transactions.is_whatsapp_checkout IS 'True setelah notifikasi WA checkout sukses (StarSender) atau dilewati (tidak ada template/nomor).';
