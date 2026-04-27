-- Jalankan di Neon jika tabel sudah ada tanpa kolom favicon_url.
ALTER TABLE public.core_portal_themes
  ADD COLUMN IF NOT EXISTS favicon_url text;
