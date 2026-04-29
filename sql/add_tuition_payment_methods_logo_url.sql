ALTER TABLE public.tuition_payment_methods
  ADD COLUMN IF NOT EXISTS logo_url text;
