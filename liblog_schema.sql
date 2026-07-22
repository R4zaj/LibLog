-- ============================================================
--  LibLog - Library Logbook Management System
--  PostgreSQL Database Schema
--  Generated: 2026-06-05
-- ============================================================

-- ============================================================
--  EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('STUDENT', 'FACULTY', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE book_condition AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');
CREATE TYPE fund_source AS ENUM ('General Fund', 'Donation', 'Grant', 'Other');
CREATE TYPE borrow_status AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'LOST');
CREATE TYPE penalty_status AS ENUM ('UNPAID', 'PAID');
CREATE TYPE penalty_type AS ENUM ('OVERDUE', 'DAMAGE', 'LOST');
CREATE TYPE attendance_action AS ENUM ('CHECK_IN', 'CHECK_OUT');
CREATE TYPE notification_category AS ENUM ('ATTENDANCE', 'BORROWING', 'PENALTIES', 'SYSTEM');
CREATE TYPE announcement_priority AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');
CREATE TYPE report_period AS ENUM ('DAILY', 'MONTHLY', 'YEARLY');


-- ============================================================
--  TABLE: programs
--  Academic programs (BS Midwifery, BS Public Administration, etc.)
-- ============================================================

CREATE TABLE programs (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. MW, PA
    name        VARCHAR(100) NOT NULL UNIQUE,   -- e.g. BS Midwifery
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
--  TABLE: genres
--  Book genres / subject categories
-- ============================================================

CREATE TABLE genres (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,   -- e.g. Midwifery, Nursing
    color       VARCHAR(7)   NOT NULL DEFAULT '#6B21A8',  -- hex color for UI dot
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
--  TABLE: users
--  All system users: students, faculty, and admins
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    student_id      VARCHAR(30)  NOT NULL UNIQUE,  -- e.g. 2024-MW-0001, FAC-PA-001
    card_no         VARCHAR(30)  NOT NULL UNIQUE,  -- e.g. LC-MW-0001
    first_name      VARCHAR(50)  NOT NULL,
    middle_initial  CHAR(1),
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    role            user_role    NOT NULL DEFAULT 'STUDENT',
    status          user_status  NOT NULL DEFAULT 'ACTIVE',
    program_id      INT          REFERENCES programs(id) ON DELETE SET NULL,
    qr_code         TEXT         UNIQUE,           -- USR-{student_id} format
    penalty_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_student_id  ON users(student_id);
CREATE INDEX idx_users_card_no     ON users(card_no);
CREATE INDEX idx_users_role        ON users(role);
CREATE INDEX idx_users_status      ON users(status);
CREATE INDEX idx_users_program_id  ON users(program_id);


-- ============================================================
--  TABLE: authors
--  Separate author records (Author Catalog tab)
-- ============================================================

CREATE TABLE authors (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
--  TABLE: books
--  Book catalog / literature records
-- ============================================================

CREATE TABLE books (
    id               SERIAL PRIMARY KEY,
    isbn             VARCHAR(20)    NOT NULL UNIQUE,
    title            VARCHAR(255)   NOT NULL,
    author_id        INT            REFERENCES authors(id) ON DELETE SET NULL,
    publisher        VARCHAR(100),
    year_published   SMALLINT,
    edition          VARCHAR(50),
    genre_id         INT            REFERENCES genres(id) ON DELETE SET NULL,
    lccn             VARCHAR(50),                   -- e.g. RG950.M87 2020
    shelf_number     VARCHAR(20),                   -- e.g. MW-01
    total_copies     INT            NOT NULL DEFAULT 1,
    available_copies INT            NOT NULL DEFAULT 1,
    condition        book_condition NOT NULL DEFAULT 'GOOD',
    source_of_fund   fund_source,
    date_received    DATE,
    pages            INT,
    description      TEXT,
    qr_code          TEXT           UNIQUE,         -- BK-{isbn} format, auto-generated
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_copies_positive      CHECK (total_copies >= 0),
    CONSTRAINT chk_available_non_neg    CHECK (available_copies >= 0),
    CONSTRAINT chk_available_lte_total  CHECK (available_copies <= total_copies)
);

CREATE INDEX idx_books_isbn      ON books(isbn);
CREATE INDEX idx_books_genre_id  ON books(genre_id);
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_books_shelf     ON books(shelf_number);


-- ============================================================
--  TABLE: library_settings
--  Configurable rules (Library Rules tab)
--  Single-row config table
-- ============================================================

CREATE TABLE library_settings (
    id                          SERIAL PRIMARY KEY,
    library_capacity            INT          NOT NULL DEFAULT 40,
    max_books_per_user          INT          NOT NULL DEFAULT 2,
    borrow_duration_students    INT          NOT NULL DEFAULT 3,    -- days
    borrow_duration_faculty     INT          NOT NULL DEFAULT 120,  -- days
    penalty_fee_per_day         NUMERIC(6,2) NOT NULL DEFAULT 5.00, -- PHP
    suspension_threshold        NUMERIC(10,2) NOT NULL DEFAULT 100.00, -- PHP
    damage_fee                  NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    lost_book_fee               NUMERIC(6,2) NOT NULL DEFAULT 5.00,
    library_open_time           TIME         NOT NULL DEFAULT '07:00',
    library_close_time          TIME         NOT NULL DEFAULT '21:00',
    semester_end_date           DATE,
    book_collection_target      INT          NOT NULL DEFAULT 5000,
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed the single config row
INSERT INTO library_settings DEFAULT VALUES;


-- ============================================================
--  TABLE: attendance_logs
--  Every check-in and check-out event (Attendance page)
-- ============================================================

CREATE TABLE attendance_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action      attendance_action NOT NULL,
    scanned_qr  TEXT,                              -- raw QR value scanned
    logged_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    duration_minutes INT                           -- filled on CHECK_OUT: time since last CHECK_IN
);

CREATE INDEX idx_attendance_user_id   ON attendance_logs(user_id);
CREATE INDEX idx_attendance_logged_at ON attendance_logs(logged_at);
CREATE INDEX idx_attendance_action    ON attendance_logs(action);


-- ============================================================
--  TABLE: borrow_records
--  Every book borrow and return transaction (Borrowing page)
-- ============================================================

CREATE TABLE borrow_records (
    id              SERIAL PRIMARY KEY,
    book_id         INT          NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    user_id         INT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    copies          INT          NOT NULL DEFAULT 1,
    borrow_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE         NOT NULL,
    return_date     DATE,
    status          borrow_status NOT NULL DEFAULT 'BORROWED',
    processed_by    INT          REFERENCES users(id) ON DELETE SET NULL,  -- admin who processed
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_due_after_borrow   CHECK (due_date >= borrow_date),
    CONSTRAINT chk_return_after_borrow CHECK (return_date IS NULL OR return_date >= borrow_date)
);

CREATE INDEX idx_borrow_book_id    ON borrow_records(book_id);
CREATE INDEX idx_borrow_user_id    ON borrow_records(user_id);
CREATE INDEX idx_borrow_status     ON borrow_records(status);
CREATE INDEX idx_borrow_due_date   ON borrow_records(due_date);


-- ============================================================
--  TABLE: penalties
--  Penalty records per overdue/damaged/lost borrow (Penalties tab)
-- ============================================================

CREATE TABLE penalties (
    id              SERIAL PRIMARY KEY,
    borrow_id       INT          NOT NULL REFERENCES borrow_records(id) ON DELETE CASCADE,
    user_id         INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            penalty_type NOT NULL DEFAULT 'OVERDUE',
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status          penalty_status NOT NULL DEFAULT 'UNPAID',
    days_overdue    INT          DEFAULT 0,
    paid_at         TIMESTAMPTZ,
    collected_by    INT          REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_penalty_amount_non_neg CHECK (amount >= 0)
);

CREATE INDEX idx_penalties_user_id   ON penalties(user_id);
CREATE INDEX idx_penalties_borrow_id ON penalties(borrow_id);
CREATE INDEX idx_penalties_status    ON penalties(status);


-- ============================================================
--  TABLE: notifications
--  In-app notifications panel
-- ============================================================

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    category        notification_category NOT NULL,
    title           VARCHAR(150) NOT NULL,
    message         TEXT         NOT NULL,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    target_user_id  INT          REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast
    triggered_by    INT          REFERENCES users(id) ON DELETE SET NULL,
    ref_table       VARCHAR(50),   -- e.g. 'borrow_records', 'attendance_logs'
    ref_id          INT,           -- FK to the triggering row
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_target   ON notifications(target_user_id);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_is_read  ON notifications(is_read);
CREATE INDEX idx_notifications_created  ON notifications(created_at);


-- ============================================================
--  TABLE: announcements
--  Library announcements (Settings > Announcements tab)
-- ============================================================

CREATE TABLE announcements (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    body        TEXT         NOT NULL,
    priority    announcement_priority NOT NULL DEFAULT 'NORMAL',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  INT          REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_priority  ON announcements(priority);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);


-- ============================================================
--  TABLE: report_snapshots
--  Stores generated report metadata (Reports page)
-- ============================================================

CREATE TABLE report_snapshots (
    id              SERIAL PRIMARY KEY,
    period          report_period NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    generated_by    INT          REFERENCES users(id) ON DELETE SET NULL,
    payload         JSONB,        -- cached aggregated data for fast reload
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_period      ON report_snapshots(period);
CREATE INDEX idx_reports_generated_at ON report_snapshots(generated_at);


-- ============================================================
--  VIEWS
-- ============================================================

-- Currently inside the library (users whose latest log today is CHECK_IN)
CREATE VIEW v_currently_inside AS
SELECT
    sub.user_id,
    u.student_id,
    u.first_name || ' ' || u.last_name AS full_name,
    p.name AS program,
    sub.checked_in_at
FROM (
    SELECT DISTINCT ON (user_id)
        user_id,
        action,
        logged_at AS checked_in_at
    FROM attendance_logs
    ORDER BY user_id, logged_at DESC
) sub
JOIN users u ON u.id = sub.user_id
LEFT JOIN programs p ON p.id = u.program_id
WHERE sub.action = 'CHECK_IN';

-- Active borrows with overdue flag
CREATE VIEW v_active_borrows AS
SELECT
    br.id,
    br.borrow_date,
    br.due_date,
    br.status,
    br.copies,
    CASE WHEN br.due_date < CURRENT_DATE AND br.status = 'BORROWED'
         THEN TRUE ELSE FALSE END AS is_overdue,
    CURRENT_DATE - br.due_date AS days_overdue,
    b.title   AS book_title,
    b.isbn,
    u.student_id,
    u.first_name || ' ' || u.last_name AS student_name,
    p.name AS program
FROM borrow_records br
JOIN books b  ON b.id = br.book_id
JOIN users u  ON u.id = br.user_id
LEFT JOIN programs p ON p.id = u.program_id
WHERE br.status IN ('BORROWED', 'OVERDUE');

-- Dashboard stats summary
CREATE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM books)                                     AS total_book_titles,
    (SELECT COALESCE(SUM(total_copies), 0) FROM books)               AS total_copies,
    (SELECT COUNT(*) FROM borrow_records WHERE status = 'BORROWED')  AS total_borrowed,
    (SELECT COUNT(*) FROM borrow_records
     WHERE status = 'BORROWED' AND due_date < CURRENT_DATE)          AS total_overdue,
    (SELECT COUNT(*) FROM v_currently_inside)                        AS students_inside,
    (SELECT library_capacity FROM library_settings LIMIT 1)          AS total_seats,
    (SELECT library_capacity FROM library_settings LIMIT 1) -
    (SELECT COUNT(*) FROM v_currently_inside)                        AS available_slots,
    (SELECT COALESCE(SUM(amount),0) FROM penalties WHERE status = 'UNPAID') AS total_unpaid_penalties;


-- ============================================================
--  FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_borrow_updated_at
    BEFORE UPDATE ON borrow_records
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_penalties_updated_at
    BEFORE UPDATE ON penalties
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- Decrement available_copies when a book is borrowed
CREATE OR REPLACE FUNCTION fn_borrow_decrement_copies()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'BORROWED' THEN
        UPDATE books
        SET available_copies = available_copies - NEW.copies
        WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_borrow_decrement
    AFTER INSERT ON borrow_records
    FOR EACH ROW EXECUTE FUNCTION fn_borrow_decrement_copies();


-- Restore available_copies when a book is returned
CREATE OR REPLACE FUNCTION fn_return_restore_copies()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('BORROWED', 'OVERDUE') AND NEW.status = 'RETURNED' THEN
        UPDATE books
        SET available_copies = available_copies + OLD.copies
        WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_return_restore
    AFTER UPDATE ON borrow_records
    FOR EACH ROW EXECUTE FUNCTION fn_return_restore_copies();


-- Auto-generate QR code for new users (USR-{student_id})
CREATE OR REPLACE FUNCTION fn_generate_user_qr()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code IS NULL THEN
        NEW.qr_code = 'USR-' || NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_qr
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION fn_generate_user_qr();


-- Auto-generate QR code for new books (BK-{isbn})
CREATE OR REPLACE FUNCTION fn_generate_book_qr()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_code IS NULL THEN
        NEW.qr_code = 'BK-' || NEW.isbn;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_qr
    BEFORE INSERT ON books
    FOR EACH ROW EXECUTE FUNCTION fn_generate_book_qr();


-- Mark borrow as OVERDUE and create penalty when due_date passes
-- (Run this daily via a cron job or pg_cron)
CREATE OR REPLACE FUNCTION fn_mark_overdue_and_penalize()
RETURNS void AS $$
DECLARE
    rec RECORD;
    daily_fee NUMERIC(6,2);
BEGIN
    SELECT penalty_fee_per_day INTO daily_fee FROM library_settings LIMIT 1;

    FOR rec IN
        SELECT br.id, br.user_id, br.due_date, br.copies
        FROM borrow_records br
        WHERE br.status = 'BORROWED'
          AND br.due_date < CURRENT_DATE
    LOOP
        -- Mark as overdue
        UPDATE borrow_records SET status = 'OVERDUE' WHERE id = rec.id;

        -- Insert or update penalty
        UPDATE penalties 
        SET amount = daily_fee * (CURRENT_DATE - rec.due_date),
            days_overdue = CURRENT_DATE - rec.due_date,
            updated_at = NOW()
        WHERE borrow_id = rec.id AND type = 'OVERDUE';
        
        IF NOT FOUND THEN
            INSERT INTO penalties (borrow_id, user_id, type, amount, days_overdue)
            VALUES (
                rec.id,
                rec.user_id,
                'OVERDUE',
                daily_fee * (CURRENT_DATE - rec.due_date),
                CURRENT_DATE - rec.due_date
            );
        END IF;

        -- Update user penalty balance
        UPDATE users
        SET penalty_balance = (
            SELECT COALESCE(SUM(amount), 0)
            FROM penalties
            WHERE user_id = rec.user_id AND status = 'UNPAID'
        )
        WHERE id = rec.user_id;

        -- Suspend user if threshold exceeded
        UPDATE users u
        SET status = 'SUSPENDED'
        FROM library_settings ls
        WHERE u.id = rec.user_id
          AND u.penalty_balance >= ls.suspension_threshold
          AND u.status = 'ACTIVE';

    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
--  SEED: Programs
-- ============================================================

INSERT INTO programs (code, name) VALUES
    ('MW',   'BS Midwifery'),
    ('PA',   'BS Public Administration'),
    ('NUR',  'BS Nursing'),
    ('ED',   'BS Education'),
    ('ENG',  'BS English'),
    ('FAC',  'Faculty');


-- ============================================================
--  SEED: Genres
-- ============================================================

INSERT INTO genres (name, color) VALUES
    ('Midwifery',              '#EC4899'),
    ('Obstetrics',             '#EF4444'),
    ('Nursing',                '#3B82F6'),
    ('Anatomy & Physiology',   '#10B981'),
    ('Maternal & Child Health','#F59E0B'),
    ('Pharmacology',           '#8B5CF6'),
    ('Education',              '#22C55E'),
    ('English',                '#06B6D4'),
    ('Filipino Language',      '#F97316'),
    ('Governance',             '#10B981'),
    ('Law',                    '#1E3A5F'),
    ('Management',             '#374151'),
    ('Economics',              '#7C3AED'),
    ('Political Science',      '#6366F1'),
    ('Public Administration',  '#4F46E5'),
    ('Research',               '#0EA5E9'),
    ('Social Science',         '#D946EF'),
    ('History',                '#92400E'),
    ('Ethics',                 '#A16207'),
    ('Technology',             '#0F766E');


-- ============================================================
--  SEED: Admin user
-- ============================================================

INSERT INTO programs (code, name) VALUES ('ADM', 'Administration')
    ON CONFLICT DO NOTHING;

INSERT INTO users (student_id, card_no, first_name, last_name, email, role, program_id)
VALUES (
    'ADMIN-001',
    'LC-ADM-0001',
    'Admin',
    'Librarian',
    'admin@library.edu.ph',
    'ADMIN',
    (SELECT id FROM programs WHERE code = 'ADM')
);
