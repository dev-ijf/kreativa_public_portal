-- Portal finance: views consumed by Next.js (lib/data/server/finance.ts).
-- Jalankan sekali di Neon / Postgres:
--   psql "$DATABASE_URL" -f sql/portal_finance_views.sql
--
-- Depends on: tuition_bills, tuition_bill_groups, tuition_products, core_academic_years,
--              tuition_transaction_details, tuition_transactions
-- (schema: refs/kgs_scheme.sql)
--
-- DROP + CREATE: menambahkan kolom (bill_group_id, discounts) tidak aman via
-- CREATE OR REPLACE saja di Postgres.

DROP VIEW IF EXISTS v_portal_finance_bills;
CREATE VIEW v_portal_finance_bills AS
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
  GREATEST(
    b.total_amount
      - b.paid_amount
      - COALESCE(b.discount_amount, 0::numeric)
      - COALESCE(b.additional_discount, 0::numeric),
    0::numeric(15, 2)
  ) AS balance_amount,
  (
    GREATEST(
      b.total_amount
        - b.paid_amount
        - COALESCE(b.discount_amount, 0::numeric)
        - COALESCE(b.additional_discount, 0::numeric),
      0::numeric(15, 2)
    ) <= 0
    OR lower(coalesce(b.status, '')) = 'paid'
  ) AS is_fully_paid,
  b.due_date,
  b.status AS bill_status,
  b.bill_month,
  b.bill_year,
  b.related_month,
  b.created_at AS bill_created_at,
  b.updated_at AS bill_updated_at,
  COALESCE(p.is_installment, false) AS is_installment,
  b.bill_group_id,
  b.termin_sequence,
  COALESCE(b.discount_amount, 0::numeric) AS discount_amount,
  COALESCE(b.additional_discount, 0::numeric) AS additional_discount
FROM tuition_bills b
INNER JOIN tuition_products p ON p.id = b.product_id
INNER JOIN core_academic_years ay ON ay.id = b.academic_year_id;

COMMENT ON VIEW v_portal_finance_bills IS 'Portal: flat bill rows with product + AY + balance for finance dashboard GET.';

DROP VIEW IF EXISTS v_portal_finance_bill_groups;
CREATE VIEW v_portal_finance_bill_groups AS
SELECT
  g.id AS bill_group_id,
  g.student_id,
  g.academic_year_id,
  ay.name AS academic_year_name,
  g.product_id,
  p.name AS product_name,
  p.payment_type,
  COALESCE(p.is_installment, false) AS is_installment,
  g.title,
  g.total_amount,
  g.paid_amount,
  g.min_payment,
  COALESCE(g.discount_amount, 0::numeric) AS discount_amount,
  COALESCE(g.additional_discount, 0::numeric) AS additional_discount,
  GREATEST(
    g.total_amount
      - COALESCE(g.discount_amount, 0::numeric)
      - COALESCE(g.additional_discount, 0::numeric),
    0::numeric(15, 2)
  ) AS net_total_amount,
  GREATEST(
    g.total_amount
      - g.paid_amount
      - COALESCE(g.discount_amount, 0::numeric)
      - COALESCE(g.additional_discount, 0::numeric),
    0::numeric(15, 2)
  ) AS balance_amount,
  (
    GREATEST(
      g.total_amount
        - g.paid_amount
        - COALESCE(g.discount_amount, 0::numeric)
        - COALESCE(g.additional_discount, 0::numeric),
      0::numeric(15, 2)
    ) <= 0
    OR lower(coalesce(g.status, '')) = 'paid'
  ) AS is_fully_paid,
  g.due_date,
  g.status AS group_status,
  g.termin_count,
  g.termin_scheme,
  g.notes_ket,
  g.created_at AS group_created_at,
  g.updated_at AS group_updated_at
FROM tuition_bill_groups g
INNER JOIN tuition_products p ON p.id = g.product_id
INNER JOIN core_academic_years ay ON ay.id = g.academic_year_id;

COMMENT ON VIEW v_portal_finance_bill_groups IS 'Portal: master bill groups for Kreativa installment donuts.';

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
