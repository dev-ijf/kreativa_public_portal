-- -------------------------------------------------------------
-- TablePlus 6.8.6(662)
--
-- https://tableplus.com/
--
-- Database: neondb
-- Generation Time: 2026-04-07 11:52:15.6900
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."core_app_modules";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_app_modules_id_seq;

-- Table Definition
CREATE TABLE "public"."core_app_modules" (
    "id" int4 NOT NULL DEFAULT nextval('core_app_modules_id_seq'::regclass),
    "module_code" varchar(50) NOT NULL,
    "module_name" varchar(100) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_cities";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_cities_id_seq;

-- Table Definition
CREATE TABLE "public"."core_cities" (
    "id" int4 NOT NULL DEFAULT nextval('core_cities_id_seq'::regclass),
    "province_id" int4 NOT NULL,
    "name" varchar(100) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_districts";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_districts_id_seq;

-- Table Definition
CREATE TABLE "public"."core_districts" (
    "id" int4 NOT NULL DEFAULT nextval('core_districts_id_seq'::regclass),
    "city_id" int4 NOT NULL,
    "name" varchar(100) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_module_access";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_module_access_id_seq;

-- Table Definition
CREATE TABLE "public"."core_module_access" (
    "id" int4 NOT NULL DEFAULT nextval('core_module_access_id_seq'::regclass),
    "module_id" int4 NOT NULL,
    "school_id" int4,
    "level_grade_id" int4,
    "is_visible" bool DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_parent_student_relations";
-- Table Definition
CREATE TABLE "public"."core_parent_student_relations" (
    "user_id" int4 NOT NULL,
    "student_id" int4 NOT NULL,
    "relation_type" varchar(50) NOT NULL,
    PRIMARY KEY ("user_id","student_id")
);

DROP TABLE IF EXISTS "public"."core_portal_themes";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_portal_themes_id_seq;

-- Table Definition
CREATE TABLE "public"."core_portal_themes" (
    "id" int4 NOT NULL DEFAULT nextval('core_portal_themes_id_seq'::regclass),
    "host_domain" varchar(100) NOT NULL,
    "portal_title" varchar(100) NOT NULL,
    "logo_url" text,
    "primary_color" varchar(20),
    "login_bg_url" text,
    "welcome_text" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_provinces";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_provinces_id_seq;

-- Table Definition
CREATE TABLE "public"."core_provinces" (
    "id" int4 NOT NULL DEFAULT nextval('core_provinces_id_seq'::regclass),
    "name" varchar(100) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_settings";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_settings_id_seq;

-- Table Definition
CREATE TABLE "public"."core_settings" (
    "id" int4 NOT NULL DEFAULT nextval('core_settings_id_seq'::regclass),
    "school_id" int4,
    "setting_key" varchar(100) NOT NULL,
    "setting_value" text,
    "description" varchar(255),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_schools";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_schools_id_seq;

-- Table Definition
CREATE TABLE "public"."core_schools" (
    "id" int4 NOT NULL DEFAULT nextval('core_schools_id_seq'::regclass),
    "theme_id" int4,
    "name" varchar(100) NOT NULL,
    "address" text,
    "school_logo_url" text,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_student_class_histories";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_student_class_histories_id_seq;

-- Table Definition
CREATE TABLE "public"."core_student_class_histories" (
    "id" int4 NOT NULL DEFAULT nextval('core_student_class_histories_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "class_id" int4 NOT NULL,
    "level_grade_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    "status" varchar(50) DEFAULT 'active'::character varying,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_student_documents";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_student_documents_id_seq;

-- Table Definition
CREATE TABLE "public"."core_student_documents" (
    "id" int4 NOT NULL DEFAULT nextval('core_student_documents_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "document_type" varchar(50) NOT NULL,
    "file_name" text NOT NULL,
    "file_path" text NOT NULL,
    "uploaded_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_student_education_histories";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_student_education_histories_id_seq;

-- Table Definition
CREATE TABLE "public"."core_student_education_histories" (
    "id" int4 NOT NULL DEFAULT nextval('core_student_education_histories_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "school_name" varchar(200) NOT NULL,
    "level_label" varchar(50),
    "year_from" int4,
    "year_to" int4,
    "notes" text,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_student_parent_profiles";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_student_parent_profiles_id_seq;

-- Table Definition
CREATE TABLE "public"."core_student_parent_profiles" (
    "id" int4 NOT NULL DEFAULT nextval('core_student_parent_profiles_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "relation_type" varchar(20) NOT NULL,
    "full_name" varchar(100) NOT NULL,
    "nik" varchar(20),
    "birth_year" int4,
    "education" varchar(50),
    "occupation" varchar(100),
    "income_bracket" varchar(50),
    "special_needs_note" varchar(100),
    "phone" varchar(20),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_subdistricts";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_subdistricts_id_seq;

-- Table Definition
CREATE TABLE "public"."core_subdistricts" (
    "id" int4 NOT NULL DEFAULT nextval('core_subdistricts_id_seq'::regclass),
    "district_id" int4 NOT NULL,
    "name" varchar(100) NOT NULL,
    "postal_code" varchar(10),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_teacher_class_assignments";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_teacher_class_assignments_id_seq;

-- Table Definition
CREATE TABLE "public"."core_teacher_class_assignments" (
    "id" int4 NOT NULL DEFAULT nextval('core_teacher_class_assignments_id_seq'::regclass),
    "user_id" int4 NOT NULL,
    "class_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    "assignment_role" varchar(30) DEFAULT 'homeroom'::character varying,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_classes";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_classes_id_seq;

-- Table Definition
CREATE TABLE "public"."core_classes" (
    "id" int4 NOT NULL DEFAULT nextval('core_classes_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "level_grade_id" int4 NOT NULL,
    "name" varchar(50) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_academic_years";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_academic_years_id_seq;

-- Table Definition
CREATE TABLE "public"."core_academic_years" (
    "id" int4 NOT NULL DEFAULT nextval('core_academic_years_id_seq'::regclass),
    "name" varchar(20) NOT NULL,
    "is_active" bool DEFAULT false,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."notif_logs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS notif_logs_id_seq;

-- Table Definition
CREATE TABLE "public"."notif_logs" (
    "id" int4 NOT NULL DEFAULT nextval('notif_logs_id_seq'::regclass),
    "user_id" int4,
    "template_id" int4,
    "type" varchar(50) NOT NULL,
    "recipient" varchar(100) NOT NULL,
    "request_payload" text,
    "response_payload" text,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_users";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_users_id_seq;

-- Table Definition
CREATE TABLE "public"."core_users" (
    "id" int4 NOT NULL DEFAULT nextval('core_users_id_seq'::regclass),
    "school_id" int4,
    "full_name" varchar(100) NOT NULL,
    "email" varchar(100) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "phone" varchar(20),
    "role" varchar(50) NOT NULL,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_bills";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_bills_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_bills" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_bills_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "product_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    "title" varchar(100) NOT NULL,
    "total_amount" numeric(15,2) NOT NULL,
    "paid_amount" numeric(15,2) DEFAULT '0'::numeric,
    "min_payment" numeric(15,2) DEFAULT '0'::numeric,
    "due_date" date,
    "status" varchar(50) DEFAULT 'unpaid'::character varying,
    "bill_month" int4,
    "bill_year" int4,
    "related_month" date,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_payment_logs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_payment_logs_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_payment_logs" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_payment_logs_id_seq'::regclass),
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamp NOT NULL,
    "request_payload" text,
    "response_payload" text,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_product_tariffs";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_product_tariffs_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_product_tariffs" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_product_tariffs_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "product_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    "cohort_id" int4 NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_products";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_products_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_products" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_products_id_seq'::regclass),
    "name" varchar(100) NOT NULL,
    "payment_type" varchar(50) NOT NULL,
    "coa" varchar(50),
    "coa_another" varchar(50),
    "description" text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_level_grades";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_level_grades_id_seq;

-- Table Definition
CREATE TABLE "public"."core_level_grades" (
    "id" int4 NOT NULL DEFAULT nextval('core_level_grades_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "name" varchar(50) NOT NULL,
    "level_order" int4 NOT NULL,
    "is_terminal" bool DEFAULT false,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."notif_templates";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS notif_templates_id_seq;

-- Table Definition
CREATE TABLE "public"."notif_templates" (
    "id" int4 NOT NULL DEFAULT nextval('notif_templates_id_seq'::regclass),
    "school_id" int4,
    "name" varchar(100) NOT NULL,
    "type" varchar(50) NOT NULL,
    "trigger_event" varchar(50) NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "is_active" bool DEFAULT true,
    "subject" text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_payment_methods";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_payment_methods_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_payment_methods" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_payment_methods_id_seq'::regclass),
    "name" varchar(100) NOT NULL,
    "code" varchar(50) NOT NULL,
    "category" varchar(50) NOT NULL,
    "coa" varchar(50),
    "is_active" bool DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    "sort_order" int4,
    "is_publish" bool DEFAULT true,
    "vendor" varchar(100),
    "is_redirect" bool DEFAULT false,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_students";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_students_id_seq;

-- Table Definition
CREATE TABLE "public"."core_students" (
    "id" int4 NOT NULL DEFAULT nextval('core_students_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "user_id" int4,
    "full_name" varchar(100) NOT NULL,
    "nickname" varchar(100),
    "username" varchar(50),
    "nis" varchar(20) NOT NULL,
    "nisn" varchar(20),
    "nik" varchar(20),
    "nationality" varchar(50),
    "photo_url" text,
    "student_type" varchar(50),
    "program" varchar(50),
    "curriculum" varchar(50),
    "previous_school" varchar(100),
    "gender" varchar(10),
    "place_of_birth" varchar(50),
    "date_of_birth" date,
    "religion" varchar(30),
    "child_order" int4,
    "siblings_count" int4,
    "child_status" varchar(50),
    "address" text,
    "rt" varchar(10),
    "rw" varchar(10),
    "hamlet" varchar(100),
    "village_label" varchar(100),
    "district_label" varchar(100),
    "city_label" varchar(100),
    "province_id" int4,
    "city_id" int4,
    "district_id" int4,
    "subdistrict_id" int4,
    "postal_code" varchar(10),
    "phone" varchar(20),
    "email" varchar(100),
    "living_with" varchar(50),
    "daily_language" varchar(100),
    "hobbies" text,
    "aspiration" text,
    "transport_mode" varchar(50),
    "distance_to_school" varchar(50),
    "travel_time" varchar(50),
    "registration_type" varchar(50),
    "enrollment_date" date,
    "diploma_serial" varchar(100),
    "skhun_serial" varchar(100),
    "is_alumni" bool DEFAULT false,
    "boarding_status" varchar(50),
    "entry_academic_year_id" int4,
    "active_academic_year_id" int4,
    "blood_type" varchar(10),
    "weight_kg" numeric(5,2),
    "height_cm" int4,
    "head_circumference_cm" int4,
    "allergies" text,
    "vision_condition" varchar(100),
    "hearing_condition" varchar(100),
    "special_needs" varchar(100),
    "chronic_diseases" text,
    "physical_abnormalities" text,
    "recurring_diseases" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "graduated_at" date,
    "address_latitude" numeric(10,7),
    "address_longitude" numeric(10,7),
    "cohort_id" int4 NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_zains_log";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS tuition_zains_log_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_zains_log" (
    "id" int4 NOT NULL DEFAULT nextval('tuition_zains_log_id_seq'::regclass),
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamp NOT NULL,
    "request_payload" text,
    "response_payload" text,
    "url" text,
    "process" varchar(100),
    "status" varchar(50),
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_cohorts";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_cohorts_id_seq;

-- Table Definition
CREATE TABLE "public"."core_cohorts" (
    "id" int4 NOT NULL DEFAULT nextval('core_cohorts_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "name" varchar(100) NOT NULL,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_payment_instructions";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS payment_instructions_id_seq;

-- Table Definition
CREATE TABLE "public"."tuition_payment_instructions" (
    "id" int8 NOT NULL DEFAULT nextval('payment_instructions_id_seq'::regclass),
    "title" text NOT NULL,
    "description" text NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "step_order" int8,
    "payment_channel_id" int4 NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_schedules";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_schedules_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_schedules" (
    "id" int8 NOT NULL DEFAULT nextval('academic_schedules_id_seq'::regclass),
    "subject_id" int8,
    "teacher_id" int4,
    "day_of_week" varchar NOT NULL,
    "start_time" varchar NOT NULL,
    "end_time" varchar NOT NULL,
    "is_break" bool DEFAULT false,
    "class_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_subjects";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_subjects_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_subjects" (
    "id" int8 NOT NULL DEFAULT nextval('academic_subjects_id_seq'::regclass),
    "code" varchar,
    "name_en" varchar NOT NULL,
    "name_id" varchar NOT NULL,
    "color_theme" varchar,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_attendances";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_attendances_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_attendances" (
    "id" int8 NOT NULL DEFAULT nextval('academic_attendances_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "attendance_date" date NOT NULL,
    "status" varchar NOT NULL,
    "note_en" varchar,
    "note_id" varchar,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_announcements";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_announcements_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_announcements" (
    "id" int8 NOT NULL DEFAULT nextval('academic_announcements_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "publish_date" date NOT NULL,
    "title_en" varchar NOT NULL,
    "title_id" varchar NOT NULL,
    "content_en" text NOT NULL,
    "content_id" text NOT NULL,
    "featured_image" text,
    "active" bool NOT NULL DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_semesters";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_semesters_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_semesters" (
    "id" int8 NOT NULL DEFAULT nextval('academic_semesters_id_seq'::regclass),
    "academic_year" varchar NOT NULL,
    "semester_label" varchar NOT NULL,
    "is_active" bool DEFAULT false,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_grades";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_grades_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_grades" (
    "id" int8 NOT NULL DEFAULT nextval('academic_grades_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "semester_id" int8 NOT NULL,
    "subject_id" int8 NOT NULL,
    "score" numeric(5,2) NOT NULL,
    "letter_grade" varchar,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_agendas";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_agendas_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_agendas" (
    "id" int8 NOT NULL DEFAULT nextval('academic_agendas_id_seq'::regclass),
    "school_id" int4 NOT NULL,
    "target_grade" varchar,
    "event_date" date NOT NULL,
    "title_en" varchar NOT NULL,
    "title_id" varchar NOT NULL,
    "time_range" varchar,
    "event_type" varchar NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_clinic_visits";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_clinic_visits_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_clinic_visits" (
    "id" int8 NOT NULL DEFAULT nextval('academic_clinic_visits_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "visit_date" date NOT NULL,
    "complaint_en" varchar,
    "complaint_id" varchar,
    "action_en" text,
    "action_id" text,
    "handled_by" varchar,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_habits" CASCADE;
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_habits_id_seq;

-- Parent table: RANGE partitioned by habit_date (child partitions route automatically).
-- Application code always reads/writes "academic_habits" only.
CREATE TABLE "public"."academic_habits" (
    "id" int8 NOT NULL DEFAULT nextval('academic_habits_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "habit_date" date NOT NULL,
    "fajr" bool DEFAULT false,
    "dhuhr" bool DEFAULT false,
    "asr" bool DEFAULT false,
    "maghrib" bool DEFAULT false,
    "isha" bool DEFAULT false,
    "dhuha" bool DEFAULT false,
    "tahajud" bool DEFAULT false,
    "read_quran" bool DEFAULT false,
    "sunnah_fasting" bool DEFAULT false,
    "wake_up_early" bool DEFAULT false,
    "help_parents" bool DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "pray_with_parents" bool DEFAULT false,
    "give_greetings" bool DEFAULT false,
    "smile_greet_polite" bool DEFAULT false,
    "on_time_arrival" varchar,
    "parent_hug_pray" bool DEFAULT false,
    "child_tell_parents" bool DEFAULT false,
    "quran_juz_info" text,
    CONSTRAINT "academic_habits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."core_students"("id"),
    PRIMARY KEY ("id", "habit_date")
) PARTITION BY RANGE ("habit_date");

-- Catches rows outside explicit monthly partitions (dev / seed / future months).
CREATE TABLE "public"."academic_habits_p_default" PARTITION OF "public"."academic_habits" DEFAULT;

DROP TABLE IF EXISTS "public"."academic_adaptive_tests";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_adaptive_tests_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_adaptive_tests" (
    "id" int8 NOT NULL DEFAULT nextval('academic_adaptive_tests_id_seq'::regclass),
    "student_id" int4 NOT NULL,
    "subject_id" int8 NOT NULL,
    "test_date" timestamp DEFAULT now(),
    "score" int4 NOT NULL,
    "mastery_level" numeric(3,2) NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."academic_adaptive_questions";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS academic_adaptive_questions_id_seq;

-- Table Definition
CREATE TABLE "public"."academic_adaptive_questions" (
    "id" int8 NOT NULL DEFAULT nextval('academic_adaptive_questions_id_seq'::regclass),
    "subject_id" int8 NOT NULL,
    "grade_band" varchar NOT NULL,
    "difficulty" numeric(3,2) NOT NULL,
    "question_text" text NOT NULL,
    "options_json" jsonb NOT NULL,
    "correct_answer" varchar NOT NULL,
    "explanation" text,
    "adaptive_test_id" int4,
    "student_answer" varchar(255),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."core_teachers";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS core_teachers_id_seq;

-- Table Definition
CREATE TABLE "public"."core_teachers" (
    "id" int4 NOT NULL DEFAULT nextval('core_teachers_id_seq'::regclass),
    "user_id" int4 NOT NULL,
    "nip" varchar(50),
    "join_date" date,
    "latest_education" varchar(100),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."tuition_transaction_details";
-- Table Definition
CREATE TABLE "public"."tuition_transaction_details" (
    "id" int8 NOT NULL,
    "transaction_id" int8 NOT NULL,
    "transaction_created_at" timestamp NOT NULL,
    "bill_id" int4 NOT NULL,
    "product_id" int4 NOT NULL,
    "amount_paid" numeric(15,2) NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("id","created_at")
);

DROP TABLE IF EXISTS "public"."tuition_transactions";
-- Table Definition
CREATE TABLE "public"."tuition_transactions" (
    "id" int8 NOT NULL,
    "user_id" int4 NOT NULL,
    "academic_year_id" int4 NOT NULL,
    "reference_no" varchar(50) NOT NULL,
    "total_amount" numeric(15,2) NOT NULL,
    "payment_method_id" int4,
    "va_no" varchar(100),
    "qr_code" text,
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "payment_date" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("id","created_at")
);

INSERT INTO "public"."core_app_modules" ("id", "module_code", "module_name") VALUES
(1, 'financial', 'Keuangan (SPP)'),
(2, 'academic', 'Nilai Harian & Rapor'),
(3, 'habits', 'Pembiasaan (Ibadah Harian)');

INSERT INTO "public"."core_cities" ("id", "province_id", "name") VALUES
(1, 1, 'Kota Bandung');

INSERT INTO "public"."core_districts" ("id", "city_id", "name") VALUES
(1, 1, 'Coblong');

INSERT INTO "public"."core_module_access" ("id", "module_id", "school_id", "level_grade_id", "is_visible") VALUES
(1, 1, NULL, NULL, 't'),
(2, 2, NULL, NULL, 't'),
(3, 3, NULL, NULL, 'f'),
(4, 3, NULL, 1, 't'),
(5, 1, NULL, NULL, 't'),
(6, 2, NULL, NULL, 't'),
(7, 3, NULL, NULL, 'f'),
(8, 3, NULL, 1, 't');

INSERT INTO "public"."core_parent_student_relations" ("user_id", "student_id", "relation_type") VALUES
(2, 1, 'father'),
(2, 2, 'father');

INSERT INTO "public"."core_portal_themes" ("id", "host_domain", "portal_title", "logo_url", "primary_color", "login_bg_url", "welcome_text", "created_at", "updated_at") VALUES
(1, 'parents.kreativaglobal.sch.id', 'Kreativa Parent Portal', '/assets/brand/kreativa-main.png', '#2563eb', '/assets/bg/kreativa-bg.jpg', 'Selamat Datang di Portal Kreativa Global School.', '2026-03-29 16:29:55.364925', '2026-03-29 16:29:55.364925'),
(2, 'parents.talentajuara.sch.id', 'Talenta Juara Portal', '/assets/brand/talenta-main.png', '#ea580c', '/assets/bg/talenta-bg.jpg', 'Mari bersama membangun generasi juara di Talenta Juara.', '2026-03-29 16:29:55.364925', '2026-03-29 16:29:55.364925');

INSERT INTO "public"."core_provinces" ("id", "name") VALUES
(1, 'Jawa Barat');

INSERT INTO "public"."core_settings" ("id", "school_id", "setting_key", "setting_value", "description", "created_at", "updated_at") VALUES
(2, NULL, 'app_title', 'Kreativa Education Network Apps', 'Judul aplikasi', '2026-03-29 16:39:38.389076', '2026-03-30 06:49:06.787634'),
(3, NULL, 'logo_main_url', 'https://wd3lgpnenu4vqgjs.public.blob.vercel-storage.com/settings/logo/1775014358706-ChatGPT_Image_Mar_13__2026__10_17_41_AM-removebg-preview_copy__1_.png', NULL, '2026-03-30 06:49:34.326752', '2026-04-01 03:32:43.571776'),
(4, NULL, 'logo_login_url', 'https://wd3lgpnenu4vqgjs.public.blob.vercel-storage.com/settings/logo/1774853395284-ChatGPT_Image_Mar_13__2026__10_17_41_AM-removebg-preview.png', NULL, '2026-03-30 06:49:59.887103', '2026-03-30 06:49:59.887103'),
(5, NULL, 'favicon_url', 'https://wd3lgpnenu4vqgjs.public.blob.vercel-storage.com/settings/logo/1774853557266-ChatGPT_Image_Mar_13__2026__10_17_41_AM-removebg-preview.png', NULL, '2026-03-30 06:52:41.123207', '2026-03-30 06:52:41.123207'),
(6, NULL, 'login_title', 'Welcome', NULL, '2026-04-01 07:52:16.494116', '2026-04-01 07:52:16.494116'),
(7, NULL, 'primary_color', '#003df5', NULL, '2026-04-01 07:53:43.40791', '2026-04-01 07:53:43.40791'),
(8, NULL, 'login_welcome_text', 'selamat datang', NULL, '2026-04-01 07:54:42.751452', '2026-04-01 07:54:42.751452'),
(9, NULL, 'login_subtitle', 'subjudul', NULL, '2026-04-01 08:11:32.67344', '2026-04-01 08:11:32.67344'),
(10, NULL, 'login_subtitle', 'subjudul', NULL, '2026-04-01 08:11:33.074078', '2026-04-01 08:11:33.074078'),
(11, NULL, 'login_bg_url', 'https://wd3lgpnenu4vqgjs.public.blob.vercel-storage.com/settings/logo/1775031192460-bg__1_.png', NULL, '2026-04-01 08:13:18.329701', '2026-04-01 08:13:18.329701');

INSERT INTO "public"."core_schools" ("id", "theme_id", "name", "address", "school_logo_url", "created_at") VALUES
(1, 1, 'Kreativa Global Primary', 'Jl. Merpati 1', '/assets/logos/sd-kreativa.png', '2026-03-29 16:29:55.413285'),
(2, 1, 'Kreativa Global Secondary', 'Jl. Merpati 2', '/assets/logos/smp-kreativa.png', '2026-03-29 16:29:55.413285'),
(3, 2, 'SD Talenta Juara Bandung', 'Jl. Terusan Jkt', '/assets/logos/sd-talenta.png', '2026-03-29 16:29:55.413285'),
(4, 2, 'SMP Talenta Juara Bandung', 'Jl. Terusan Jkt', '/assets/logos/smp-talenta.png', '2026-03-29 16:29:55.413285');

INSERT INTO "public"."core_student_class_histories" ("id", "student_id", "class_id", "level_grade_id", "academic_year_id", "status") VALUES
(1, 1, 1, 1, 2, 'active'),
(2, 2, 2, 3, 2, 'active'),
(3, 1, 1, 1, 2, 'active'),
(4, 2, 2, 3, 2, 'active');

INSERT INTO "public"."core_student_documents" ("id", "student_id", "document_type", "file_name", "file_path", "uploaded_at") VALUES
(1, 1, 'Kartu Keluarga', 'kk_revy.pdf', '/storage/documents/kk_revy.pdf', '2026-03-29 16:29:55.973626'),
(2, 1, 'Kartu Keluarga', 'kk_revy.pdf', '/storage/documents/kk_revy.pdf', '2026-03-29 16:39:38.671571');

INSERT INTO "public"."core_student_parent_profiles" ("id", "student_id", "relation_type", "full_name", "nik", "birth_year", "education", "occupation", "income_bracket", "special_needs_note", "phone", "created_at", "updated_at") VALUES
(1, 1, 'father', 'Budi Santoso', NULL, NULL, 'S1', 'Wiraswasta', '3-5 jt', NULL, '081234567890', '2026-03-29 16:29:55.810824', '2026-03-29 16:29:55.810824'),
(2, 1, 'mother', 'Ani Wijaya', NULL, NULL, 'S1', 'Guru', '3-5 jt', NULL, '081298765432', '2026-03-29 16:29:55.810824', '2026-03-29 16:29:55.810824');

INSERT INTO "public"."core_subdistricts" ("id", "district_id", "name", "postal_code") VALUES
(1, 1, 'Dago', '40135');

INSERT INTO "public"."core_classes" ("id", "school_id", "level_grade_id", "name") VALUES
(1, 1, 1, 'KELAS 1 A'),
(2, 4, 3, '7A');

INSERT INTO "public"."core_academic_years" ("id", "name", "is_active") VALUES
(1, '2024/2025', 'f'),
(2, '2025/2026', 't');

INSERT INTO "public"."core_users" ("id", "school_id", "full_name", "email", "password_hash", "phone", "role", "created_at") VALUES
(1, NULL, 'Superadmin Yayasan', 'irvan@cnt.id', 'hash', NULL, 'superadmin', '2026-03-29 16:29:55.548559'),
(2, NULL, 'Budi Santoso', 'budi.ayah@email.com', 'hash', NULL, 'parent', '2026-03-29 16:29:55.548559'),
(3, 4, 'Zevanya', 'zevanya@student.com', 'hash', NULL, 'student', '2026-03-29 16:29:55.548559'),
(5, NULL, 'Riza Anggraeni', 'riza.anggraeni@indonesiajuara.id', 'pbkdf2$df8cbfec2f29f13074f4cf93f5576763$180023bd1740eb4a0e2c7fa97006486d7cb2d5edca36052fab49c054f1755c04d540ab79b96ef3e4ddc32336208732236d234b285ba548be6cc3e939892cee72', NULL, 'superadmin', '2026-03-30 07:04:30.273417'),
(6, NULL, 'Regi', 'regi@cnt.id', 'pbkdf2$b974fcef7a6deddbbea4411115bf2018$a0b5e1c57773ce8ca321846f41c1e9198de5e63bc8006cb8f5b038afde4e91d0d9ca9d1a028f9acaa7c718de8cdc204bc69d419f7aa8c0782abb58c0b1fbb07b', NULL, 'superadmin', '2026-03-30 07:04:49.770339'),
(7, NULL, 'Dev IJF', 'dev@indonesiajuara.id', 'pbkdf2$6269829f1fe98772a601015890362d65$2c0ee908cd24726409b5124b75c0ab2e7c541eec74a1b8e8397303ad74df785267947c2a0d1bd44ec0bedc6c5bf08dfaa3e7cdea939c578922317b1b6191868f', NULL, 'superadmin', '2026-03-30 07:10:20.916314'),
(8, NULL, 'Fitriana', 'fitriana@indonesiajuara.id', 'pbkdf2$4e083b7c6f5baeca70632eed4b600fe0$bc3b5b248dfb2489763a7d6b90c2b9662e51954ae935ca8d3bcfc9b59c5ee44488415bf513c1af8e9ea8f6f1ea273d8c964b27d42f8905be99722b77658fe9c1', NULL, 'superadmin', '2026-03-30 08:45:02.770711'),
(9, NULL, 'Yandri', 'yandri@indonesiajuara.id', 'pbkdf2$57d22bac378b91b20bbf1e4e26d5c830$cb05287eb8349bf97a93dd49884908fd7682061c92238290c821f0f934818630e59e5a7bbafe03adb3e8718fcbc312e7f153639bc42c957f5340fee0949fb3cf', NULL, 'superadmin', '2026-04-02 09:38:11.584989'),
(10, NULL, 'Mr. Hendra', 'migrated_teacher_1@kreativa.seed', 'hash', NULL, 'teacher', '2026-04-06 22:48:45.669362'),
(11, NULL, 'Mrs. Rina', 'migrated_teacher_2@kreativa.seed', 'hash', NULL, 'teacher', '2026-04-06 22:48:45.669362'),
(12, NULL, 'Mr. John', 'migrated_teacher_3@kreativa.seed', 'hash', NULL, 'teacher', '2026-04-06 22:48:45.669362'),
(13, NULL, 'Mrs. Susi', 'migrated_teacher_4@kreativa.seed', 'hash', NULL, 'teacher', '2026-04-06 22:48:45.669362');

INSERT INTO "public"."tuition_bills" ("id", "student_id", "product_id", "academic_year_id", "title", "total_amount", "paid_amount", "min_payment", "due_date", "status", "bill_month", "bill_year", "related_month", "created_at", "updated_at") VALUES
(1, 1, 1, 2, 'SPP Juli 2025', 800000.00, 800000.00, 0.00, NULL, 'paid', 7, 2025, '2025-07-01', '2026-03-29 16:29:56.416213', '2026-03-29 16:29:56.623092'),
(2, 2, 1, 2, 'SPP Juli 2025', 1200000.00, 0.00, 0.00, NULL, 'unpaid', 7, 2025, '2025-07-01', '2026-03-29 16:29:56.416213', '2026-03-29 16:29:56.416213');

INSERT INTO "public"."tuition_product_tariffs" ("id", "school_id", "product_id", "academic_year_id", "cohort_id", "amount", "created_at", "updated_at") VALUES
(1, 1, 1, 1, 1, 750000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102'),
(2, 1, 1, 1, 2, 750000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102'),
(3, 4, 1, 1, 3, 1100000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102'),
(4, 1, 1, 2, 1, 800000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102'),
(5, 1, 1, 2, 2, 850000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102'),
(6, 4, 1, 2, 3, 1200000.00, '2026-03-29 16:29:56.314102', '2026-03-29 16:29:56.314102');

INSERT INTO "public"."tuition_products" ("id", "name", "payment_type", "coa", "coa_another", "description") VALUES
(1, 'SPP Bulanan', 'monthly', NULL, NULL, NULL),
(2, 'DSP', 'installment', NULL, NULL, NULL),
(3, 'DKT', 'annualy', NULL, NULL, NULL);

INSERT INTO "public"."core_level_grades" ("id", "school_id", "name", "level_order", "is_terminal") VALUES
(1, 1, 'Kelas 1', 1, 'f'),
(2, 1, 'Kelas 2', 2, 'f'),
(3, 4, 'Kelas 7', 7, 'f');

INSERT INTO "public"."notif_templates" ("id", "school_id", "name", "type", "trigger_event", "content", "created_at", "updated_at", "is_active", "subject") VALUES
(1, NULL, 'Payment Success WA', 'whatsapp', 'PAYMENT_SUCCESS', 'Halo {name}, pembayaran untuk {bill_title} sebesar {amount} telah berhasil.', '2026-03-29 16:29:56.485838', '2026-04-01 23:05:26.317401', 't', NULL);

INSERT INTO "public"."tuition_payment_methods" ("id", "name", "code", "category", "coa", "is_active", "created_at", "sort_order", "is_publish", "vendor", "is_redirect") VALUES
(1, 'BCA Virtual Account', 'BCA_TF', 'virtual_account', '1101.01.001', 't', '2026-03-29 16:29:56.38243', 1, 't', 'xendit', 'f'),
(2, 'GoPay', 'GOPAY', 'ewallet', '1101.02.002', 't', '2026-03-29 16:29:56.38243', 2, 't', 'midtrans', 'f');

INSERT INTO "public"."core_students" ("id", "school_id", "user_id", "full_name", "nickname", "username", "nis", "nisn", "nik", "nationality", "photo_url", "student_type", "program", "curriculum", "previous_school", "gender", "place_of_birth", "date_of_birth", "religion", "child_order", "siblings_count", "child_status", "address", "rt", "rw", "hamlet", "village_label", "district_label", "city_label", "province_id", "city_id", "district_id", "subdistrict_id", "postal_code", "phone", "email", "living_with", "daily_language", "hobbies", "aspiration", "transport_mode", "distance_to_school", "travel_time", "registration_type", "enrollment_date", "diploma_serial", "skhun_serial", "is_alumni", "boarding_status", "entry_academic_year_id", "active_academic_year_id", "blood_type", "weight_kg", "height_cm", "head_circumference_cm", "allergies", "vision_condition", "hearing_condition", "special_needs", "chronic_diseases", "physical_abnormalities", "recurring_diseases", "created_at", "updated_at", "graduated_at", "address_latitude", "address_longitude", "cohort_id") VALUES
(1, 1, NULL, 'Revy Ahmad', NULL, 'revy.ahmad', 'SD-001', '00112233', NULL, NULL, 'https://wd3lgpnenu4vqgjs.public.blob.vercel-storage.com/students/1/photos/1774803964027-WhatsApp_Image_2026-02-25_at_19.03.38.jpeg', 'Reguler', 'Reguler', 'Merdeka', NULL, 'L', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, 1, 1, '40135', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'f', NULL, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-29 16:29:55.77505', '2026-03-29 17:17:55.555241', NULL, NULL, NULL, 3),
(2, 4, 3, 'Zevanya', NULL, 'zevanya', 'SMP-001', '00112244', NULL, NULL, NULL, 'Reguler', 'Reguler', 'Merdeka', NULL, 'P', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'f', NULL, 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-29 16:29:55.77505', '2026-03-29 16:29:55.77505', NULL, NULL, NULL, 2);

INSERT INTO "public"."core_cohorts" ("id", "school_id", "name", "created_at") VALUES
(1, 3, 'Angkatan 2025/2026', '2026-04-02 03:48:52.056215'),
(2, 4, 'Angkatan 2025/2026', '2026-04-02 03:48:52.056215'),
(3, 1, 'Angkatan 2025/2026', '2026-04-02 03:48:52.056215'),
(4, 2, 'Angkatan 2025/2026', '2026-04-02 03:48:52.056215');

INSERT INTO "public"."tuition_payment_instructions" ("id", "title", "description", "created_at", "updated_at", "step_order", "payment_channel_id") VALUES
(1, 'Pembayaran melalui ATM Mandiri', '<ol><li>Catat kode pembayaran yang anda dapat.</li><li>Gunakan ATM Mandiri untuk menyelesaikan pembayaran.</li><li>Masukkan PIN anda.</li><li>Pilih ''''BAYAR/BELI''''.</li><li>Pilih LAINNYA.</li><li>Cari pilihan MULTI PAYMENT.</li><li>Masukkan kode perusahaan 88558.</li><li>Masukkan kode VIRTUAL ACCOUNT.</li><li>Masukkan atau Pastikan Jumlah Pembayaran sesuai dengan Jumlah Tagihan anda kemudian tekan ''''Benar''''.</li><li>Pilih Tagihan Anda jika sudah sesuai tekan YA.</li><li>Konfirmasikan tagihan anda apakah sudah sesuai lalu tekan YA.</li><li>Harap Simpan Struk Transaksi yang anda dapatkan.</li></ol>', '2026-04-01 23:10:47.296852+00', '2026-04-01 23:10:47.296852+00', 1, 1);

INSERT INTO "public"."academic_subjects" ("id", "code", "name_en", "name_id", "color_theme") VALUES
(1, 'MATH', 'Math', 'Matematika', 'bg-blue-100 text-blue-600'),
(2, 'SCI', 'Science', 'Ilmu Pengetahuan Alam', 'bg-emerald-100 text-emerald-600'),
(3, 'ENG', 'English', 'Bahasa Inggris', 'bg-orange-100 text-orange-600'),
(4, 'ART', 'Art', 'Seni Budaya', 'bg-purple-100 text-purple-600'),
(5, 'HIST', 'History', 'Sejarah', 'bg-yellow-100 text-yellow-600');

INSERT INTO "public"."academic_attendances" ("id", "student_id", "attendance_date", "status", "note_en", "note_id", "created_at") VALUES
(1, 1, '2023-11-12', 'sick', 'Fever', 'Demam', '2026-04-06 15:22:13.286646'),
(2, 1, '2023-10-05', 'permission', 'Family event', 'Acara keluarga', '2026-04-06 15:22:13.286646');

INSERT INTO "public"."academic_announcements" ("id", "school_id", "publish_date", "title_en", "title_id", "content_en", "content_id", "featured_image", "active") VALUES
(1, 4, '2023-11-18', 'New School Bus Route', 'Rute Bus Sekolah Baru', 'Starting next month, we are adding a new route covering the South District.', 'Mulai bulan depan, kami menambahkan rute baru yang mencakup Area Selatan.', '/assets/announcements/school-bus.jpg', true),
(2, 4, '2023-11-15', 'Library Renovation Completed', 'Renovasi Perpustakaan Selesai', 'Students can now enjoy the newly renovated library.', 'Siswa kini dapat menikmati perpustakaan yang baru direnovasi.', '/assets/announcements/library.jpg', true);

INSERT INTO "public"."academic_semesters" ("id", "academic_year", "semester_label", "is_active") VALUES
(1, '2023/2024', '1', 't');

INSERT INTO "public"."academic_grades" ("id", "student_id", "semester_id", "subject_id", "score", "letter_grade", "created_at") VALUES
(1, 2, 1, 1, 95.00, NULL, '2026-04-06 15:22:13.286646'),
(2, 2, 1, 2, 90.00, NULL, '2026-04-06 15:22:13.286646'),
(3, 2, 1, 4, 98.00, NULL, '2026-04-06 15:22:13.286646'),
(4, 1, 1, 3, 85.00, NULL, '2026-04-06 15:22:13.286646'),
(5, 1, 1, 1, 88.00, NULL, '2026-04-06 15:22:13.286646'),
(6, 1, 1, 2, 92.00, NULL, '2026-04-06 15:22:13.286646'),
(7, 1, 1, 5, 78.00, NULL, '2026-04-06 15:22:13.286646');

INSERT INTO "public"."academic_agendas" ("id", "school_id", "target_grade", "event_date", "title_en", "title_id", "time_range", "event_type") VALUES
(1, 4, NULL, '2023-11-20', 'Mid-term Examinations', 'Ujian Tengah Semester', '07:30 - 12:00 WIB', 'exam'),
(2, 4, 'Grade 4', '2023-11-25', 'Museum Field Trip (Grade 4)', 'Kunjungan Museum (Kelas 4)', '08:00 - 14:00 WIB', 'event'),
(3, 4, NULL, '2023-12-01', 'National Teacher''s Day', 'Peringatan Hari Guru Nasional', '07:00 - 10:00 WIB', 'event');

INSERT INTO "public"."academic_clinic_visits" ("id", "student_id", "visit_date", "complaint_en", "complaint_id", "action_en", "action_id", "handled_by") VALUES
(1, 1, '2023-11-12', 'Fever', 'Demam', 'Given paracetamol and rested', 'Diberi paracetamol dan istirahat', NULL),
(2, 2, '2023-09-02', 'Scraped knee', 'Lutut lecet', 'Cleaned and bandaged', 'Dibersihkan dan diperban', NULL);

INSERT INTO "public"."academic_habits" ("id", "student_id", "habit_date", "fajr", "dhuhr", "asr", "maghrib", "isha", "dhuha", "tahajud", "read_quran", "sunnah_fasting", "wake_up_early", "help_parents", "created_at", "updated_at", "pray_with_parents", "give_greetings", "smile_greet_polite", "on_time_arrival", "parent_hug_pray", "child_tell_parents", "quran_juz_info") VALUES
(1, 1, '2023-11-18', 't', 't', 'f', 'f', 'f', 't', 'f', 'f', 'f', 't', 't', '2026-04-06 15:22:13.286646', '2026-04-06 15:22:13.286646', 'f', 'f', 'f', NULL, 'f', 'f', NULL),
(2, 1, '2023-11-17', 't', 't', 't', 't', 't', 'f', 'f', 't', 'f', 't', 't', '2026-04-06 15:22:13.286646', '2026-04-06 15:22:13.286646', 'f', 'f', 'f', NULL, 'f', 'f', NULL);

INSERT INTO "public"."academic_adaptive_tests" ("id", "student_id", "subject_id", "test_date", "score", "mastery_level") VALUES
(1, 1, 1, '2023-11-18 14:00:00', 85, 0.85),
(2, 1, 2, '2023-11-15 09:30:00', 70, 0.70);

INSERT INTO "public"."academic_adaptive_questions" ("id", "subject_id", "grade_band", "difficulty", "question_text", "options_json", "correct_answer", "explanation", "adaptive_test_id", "student_answer") VALUES
(1, 1, 'g4-6', 0.75, 'What is 12 x 15?', '["180", "165", "170", "175"]', '180', '12 x 15 = 12 x 10 + 12 x 5 = 120 + 60 = 180', NULL, '180'),
(2, 1, 'g4-6', 0.50, 'What is 15 + 25?', '["30", "40", "50", "45"]', '40', '15 + 25 = 40. Basic addition.', NULL, '45'),
(3, 1, 'g4-6', 0.50, 'What is 15 + 25?', '["30", "40", "50", "45"]', '40', '15 + 25 = 40. Basic addition.', 1, '45'),
(4, 1, 'g4-6', 0.75, 'What is 12 x 15?', '["180", "165", "170", "175"]', '180', '12 x 15 = 12 x 10 + 12 x 5 = 120 + 60 = 180', 1, '180'),
(5, 2, 'g4-6', 0.60, 'What is H2O?', '["Water", "Salt", "Oxygen", "Iron"]', 'Water', 'H2O is water.', 2, 'Water');

INSERT INTO "public"."core_teachers" ("id", "user_id", "nip", "join_date", "latest_education") VALUES
(1, 10, NULL, NULL, NULL),
(2, 11, NULL, NULL, NULL),
(3, 12, NULL, NULL, NULL),
(4, 13, NULL, NULL, NULL);

INSERT INTO "public"."academic_schedules" ("id", "subject_id", "teacher_id", "day_of_week", "start_time", "end_time", "is_break", "class_id", "academic_year_id") VALUES
(1, 1, 1, 'Senin', '07:30', '09:00', 'f', 1, 2),
(2, 2, 2, 'Senin', '09:00', '10:30', 'f', 1, 2),
(3, NULL, NULL, 'Senin', '10:30', '11:00', 't', 1, 2),
(4, 3, 3, 'Senin', '11:00', '12:30', 'f', 1, 2),
(5, 1, 1, 'Selasa', '07:30', '09:00', 'f', 1, 2),
(6, 4, 4, 'Senin', '08:00', '09:30', 'f', 2, 2);

INSERT INTO "public"."tuition_transaction_details" ("id", "transaction_id", "transaction_created_at", "bill_id", "product_id", "amount_paid", "created_at") VALUES
(1, 1, '2024-10-15 17:00:00', 1, 1, 800000.00, '2024-10-15 17:00:00');

INSERT INTO "public"."tuition_transactions" ("id", "user_id", "academic_year_id", "reference_no", "total_amount", "payment_method_id", "va_no", "qr_code", "status", "payment_date", "created_at") VALUES
(1, 2, 2, 'TRX-OKT-001', 800000.00, 1, NULL, NULL, 'success', '2024-10-15 17:00:00', '2024-10-15 17:00:00');



-- Indices
CREATE UNIQUE INDEX core_app_modules_module_code_unique ON public.core_app_modules USING btree (module_code);


-- Indices
CREATE UNIQUE INDEX unique_access_rule ON public.core_module_access USING btree (module_id, school_id, level_grade_id);


-- Indices
CREATE UNIQUE INDEX core_parent_student_relations_user_id_student_id_pk ON public.core_parent_student_relations USING btree (user_id, student_id);


-- Indices
CREATE UNIQUE INDEX core_portal_themes_host_domain_unique ON public.core_portal_themes USING btree (host_domain);


-- Indices
CREATE UNIQUE INDEX unique_setting_per_school ON public.core_settings USING btree (school_id, setting_key);


-- Indices
CREATE UNIQUE INDEX unique_student_relation ON public.core_student_parent_profiles USING btree (student_id, relation_type);
ALTER TABLE "public"."core_teacher_class_assignments" ADD FOREIGN KEY ("class_id") REFERENCES "public"."core_classes"("id") ON DELETE CASCADE;
ALTER TABLE "public"."core_teacher_class_assignments" ADD FOREIGN KEY ("user_id") REFERENCES "public"."core_users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."core_teacher_class_assignments" ADD FOREIGN KEY ("academic_year_id") REFERENCES "public"."core_academic_years"("id") ON DELETE CASCADE;


-- Indices
CREATE UNIQUE INDEX unique_teacher_class_year ON public.core_teacher_class_assignments USING btree (user_id, class_id, academic_year_id);
CREATE INDEX idx_teacher_class_assign_user ON public.core_teacher_class_assignments USING btree (user_id);
CREATE INDEX idx_teacher_class_assign_year ON public.core_teacher_class_assignments USING btree (academic_year_id);


-- Indices
CREATE UNIQUE INDEX core_users_email_unique ON public.core_users USING btree (email);


-- Indices
CREATE INDEX idx_tuition_bills_period ON public.tuition_bills USING btree (bill_year, bill_month);


-- Indices
CREATE UNIQUE INDEX unique_tariff_matrix ON public.tuition_product_tariffs USING btree (school_id, product_id, academic_year_id, cohort_id);


-- Indices
CREATE UNIQUE INDEX tuition_payment_methods_code_unique ON public.tuition_payment_methods USING btree (code);
CREATE INDEX idx_tuition_payment_methods_sort_order ON public.tuition_payment_methods USING btree (sort_order);
ALTER TABLE "public"."core_students" ADD FOREIGN KEY ("cohort_id") REFERENCES "public"."core_cohorts"("id");


-- Indices
CREATE UNIQUE INDEX core_students_user_id_unique ON public.core_students USING btree (user_id);
CREATE UNIQUE INDEX core_students_nis_unique ON public.core_students USING btree (nis);
ALTER TABLE "public"."core_cohorts" ADD FOREIGN KEY ("school_id") REFERENCES "public"."core_schools"("id");
ALTER TABLE "public"."tuition_payment_instructions" ADD FOREIGN KEY ("payment_channel_id") REFERENCES "public"."tuition_payment_methods"("id") ON DELETE CASCADE;


-- Indices
CREATE UNIQUE INDEX payment_instructions_pkey ON public.tuition_payment_instructions USING btree (id);
CREATE INDEX idx_tuition_payment_instructions_payment_channel_id ON public.tuition_payment_instructions USING btree (payment_channel_id);
CREATE INDEX idx_tuition_payment_instructions_step_order ON public.tuition_payment_instructions USING btree (payment_channel_id, step_order);
CREATE UNIQUE INDEX uniq_tuition_payment_instructions_channel_step_order ON public.tuition_payment_instructions USING btree (payment_channel_id, step_order) WHERE (step_order IS NOT NULL);
ALTER TABLE "public"."academic_schedules" ADD FOREIGN KEY ("teacher_id") REFERENCES "public"."core_teachers"("id") ON DELETE SET NULL;
ALTER TABLE "public"."academic_schedules" ADD FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE SET NULL;
ALTER TABLE "public"."academic_schedules" ADD FOREIGN KEY ("class_id") REFERENCES "public"."core_classes"("id");
ALTER TABLE "public"."academic_schedules" ADD FOREIGN KEY ("academic_year_id") REFERENCES "public"."core_academic_years"("id");


-- Indices
CREATE INDEX idx_acad_sch_class_year_day ON public.academic_schedules USING btree (class_id, academic_year_id, day_of_week);


-- Indices
CREATE INDEX idx_acad_att_student_date ON public.academic_attendances USING btree (student_id, attendance_date);
CREATE INDEX idx_acad_att_status ON public.academic_attendances USING btree (status);


-- Indices
CREATE INDEX idx_acad_ann_school_date ON public.academic_announcements USING btree (school_id, publish_date DESC);
ALTER TABLE "public"."academic_grades" ADD FOREIGN KEY ("semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE CASCADE;
ALTER TABLE "public"."academic_grades" ADD FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_acad_grd_student_sem ON public.academic_grades USING btree (student_id, semester_id);


-- Indices
CREATE INDEX idx_acad_agd_school_date ON public.academic_agendas USING btree (school_id, event_date);


-- Indices
CREATE INDEX idx_acad_cln_student_date ON public.academic_clinic_visits USING btree (student_id, visit_date DESC);


-- Indices
CREATE UNIQUE INDEX academic_habits_student_id_habit_date_key ON public.academic_habits USING btree (student_id, habit_date);
CREATE INDEX idx_acad_hbt_student_date ON public.academic_habits USING btree (student_id, habit_date DESC);
ALTER TABLE "public"."academic_adaptive_tests" ADD FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_acad_adt_student_subj ON public.academic_adaptive_tests USING btree (student_id, subject_id);
ALTER TABLE "public"."academic_adaptive_questions" ADD FOREIGN KEY ("adaptive_test_id") REFERENCES "public"."academic_adaptive_tests"("id") ON DELETE CASCADE;
ALTER TABLE "public"."academic_adaptive_questions" ADD FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE CASCADE;


-- Indices
CREATE INDEX idx_acad_adq_subj_grade_diff ON public.academic_adaptive_questions USING btree (subject_id, grade_band, difficulty);
ALTER TABLE "public"."core_teachers" ADD FOREIGN KEY ("user_id") REFERENCES "public"."core_users"("id") ON DELETE CASCADE;


-- Indices
CREATE UNIQUE INDEX core_teachers_user_id_key ON public.core_teachers USING btree (user_id);
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m03"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m07"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2030m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m06"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2029m09"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m01"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m05"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m02"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2026m10"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2031m11"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2027m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2024m04"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2028m08"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2023m12"("id","created_at") ON DELETE CASCADE;
ALTER TABLE "public"."tuition_transaction_details" ADD FOREIGN KEY ("transaction_id","transaction_created_at") REFERENCES "public"."tuition_transactions_y2025m04"("id","created_at") ON DELETE CASCADE;


-- Indices
CREATE UNIQUE INDEX tuition_transaction_details_id_created_at_pk ON ONLY public.tuition_transaction_details USING btree (id, created_at);


-- Indices
CREATE UNIQUE INDEX tuition_transactions_id_created_at_pk ON ONLY public.tuition_transactions USING btree (id, created_at);
CREATE UNIQUE INDEX unique_ref_no_per_partition ON ONLY public.tuition_transactions USING btree (reference_no, created_at);
