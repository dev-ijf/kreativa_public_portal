-- Fix: PAYMENT_SUCCESS (Talenta / non-EN) was incorrectly seeded in English.
-- Code maps theme_id ≠ 1 → trigger_event = 'PAYMENT_SUCCESS'.
-- Placeholders used by lib/notifications/payment-success-wa.ts:
--   {student_name} {bill_title} {amount} {payment_methods} {payment_date}

UPDATE public.notif_templates
SET
  name = 'Payment Success WA (Bahasa)',
  content = E'*Pembayaran Berhasil!* ✅\n\nHalo Bapak/Ibu Wali Murid,\n\nKabar baik! Pembayaran untuk *{student_name}* telah *berhasil kami terima*. Terima kasih atas ketepatannya.\n\n*📋 DETAIL TRANSAKSI:*\n• Item: {bill_title}\n• Total: {amount}\n• Metode pembayaran: {payment_methods}\n• Tanggal: {payment_date}\n\nKwitansi digital dapat diunduh melalui aplikasi sekolah.\n\n_Salam hangat,_\n*Tim Keuangan*',
  updated_at = now()
WHERE trigger_event = 'PAYMENT_SUCCESS'
  AND school_id IS NULL;
