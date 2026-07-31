-- Kreativa bill groups + termin columns on tuition_bills.
-- Safe / idempotent. Run before refreshing portal_finance_views.sql.
-- Full seed data: external kreativa_tagihan_v2.sql + kreativa_bill_group_fk.sql

BEGIN;

CREATE SEQUENCE IF NOT EXISTS tuition_bill_groups_id_seq;

CREATE TABLE IF NOT EXISTS tuition_bill_groups (
  id                  bigserial PRIMARY KEY,
  student_id          int NOT NULL,
  product_id          int NOT NULL,
  academic_year_id    int NOT NULL,
  school_id           bigint NOT NULL,
  cohort_id           bigint NOT NULL,
  title               varchar(100) NOT NULL,
  total_amount        numeric(15,2) NOT NULL,
  discount_amount     numeric(15,2) DEFAULT 0,
  additional_discount numeric(15,2) DEFAULT 0,
  paid_amount         numeric(15,2) DEFAULT 0,
  min_payment         numeric(15,2) NOT NULL,
  status              varchar(50) NOT NULL,
  due_date            date,
  termin_count        int DEFAULT 1,
  termin_scheme       varchar(50),
  notes_ket           varchar(200),
  notes               text,
  created_at          timestamp DEFAULT now(),
  updated_at          timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_bill_group_natural
  ON tuition_bill_groups(student_id, product_id, academic_year_id);

ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS bill_group_id     bigint;
ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS termin_sequence   int DEFAULT 1;
ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS additional_discount numeric(15,2) DEFAULT 0;
ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS termin_scheme     varchar(50);
ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS termin_count      int DEFAULT 1;
ALTER TABLE tuition_bills ADD COLUMN IF NOT EXISTS notes_ket         varchar(200);
CREATE INDEX IF NOT EXISTS ix_bills_group ON tuition_bills(bill_group_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_tuition_bills_bill_group'
  ) THEN
    ALTER TABLE tuition_bills
      ADD CONSTRAINT fk_tuition_bills_bill_group
      FOREIGN KEY (bill_group_id)
      REFERENCES tuition_bill_groups(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
