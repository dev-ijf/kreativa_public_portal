-- Portal finance: views consumed by Next.js (lib/data/server/finance.ts).
-- Jalankan sekali di Neon / Postgres:
--   psql "$DATABASE_URL" -f sql/portal_finance_views.sql
--
-- Depends on: tuition_bills, tuition_products, core_academic_years,
--              tuition_transaction_details, tuition_transactions
-- (schema: refs/kgs_scheme.sql)
--
-- Neon produksi: jika `tuition_bills.discount_amount` ada, ganti ekspresi
-- balance di view menjadi:
--   GREATEST(b.total_amount - b.paid_amount - COALESCE(b.discount_amount, 0::numeric), 0::numeric(15,2))
-- lalu CREATE OR REPLACE VIEW v_portal_finance_bills AS ...
--
-- Kolom `is_installment` harus di AKHIR SELECT agar CREATE OR REPLACE VIEW valid:
-- Postgres melarang mengubah urutan/nama kolom tengah (error: cannot change name of view column "title" to "is_installment").

CREATE OR REPLACE VIEW v_portal_finance_bills AS
SELECT
  b.id AS bill_id,
  b.student_id,
  b.academic_year_id,
  ay.name AS academic_year_name,
  b.product_id,
  p.name AS product_name,
  p.payment_type,
  b.title,
  b.total_amount,
  b.paid_amount,
  b.min_payment,
  GREATEST(b.total_amount - b.paid_amount, 0::numeric(15, 2)) AS balance_amount,
  (b.paid_amount >= b.total_amount OR lower(coalesce(b.status, '')) = 'paid') AS is_fully_paid,
  b.due_date,
  b.status AS bill_status,
  b.bill_month,
  b.bill_year,
  b.related_month,
  b.created_at AS bill_created_at,
  b.updated_at AS bill_updated_at,
  COALESCE(p.is_installment, false) AS is_installment
FROM tuition_bills b
INNER JOIN tuition_products p ON p.id = b.product_id
INNER JOIN core_academic_years ay ON ay.id = b.academic_year_id;

COMMENT ON VIEW v_portal_finance_bills IS 'Portal: flat bill rows with product + AY + balance for finance dashboard GET.';

CREATE OR REPLACE VIEW v_portal_tuition_payment_lines AS
SELECT
  td.bill_id,
  td.product_id,
  td.amount_paid,
  td.created_at AS detail_created_at,
  t.id AS transaction_id,
  t.created_at AS transaction_created_at,
  t.user_id AS payer_user_id,
  t.status AS transaction_status,
  t.payment_date,
  t.reference_no
FROM tuition_transaction_details td
INNER JOIN tuition_transactions t
  ON t.id = td.transaction_id
 AND t.created_at = td.transaction_created_at;

COMMENT ON VIEW v_portal_tuition_payment_lines IS 'Portal: payment lines per bill for installment history (reads parent tuition_transactions + partitions).';
