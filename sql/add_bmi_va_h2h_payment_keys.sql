-- Idempotensi callback Payment BMI H2H: kombinasi VANO + REFNO + TRXDATE tidak boleh diproses dua kali.
-- Jalankan sekali di Neon sebelum produksi VA H2H.

CREATE TABLE IF NOT EXISTS public.bmi_va_h2h_payment_keys (
  va_no varchar(32) NOT NULL,
  ref_no varchar(32) NOT NULL,
  trx_date varchar(20) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (va_no, ref_no, trx_date)
);

COMMENT ON TABLE public.bmi_va_h2h_payment_keys IS 'Dedup callback Payment Bank Muamalat VA H2H (VANO+REFNO+TRXDATE).';
