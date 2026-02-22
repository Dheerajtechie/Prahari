-- ═══════════════════════════════════════════════════════════════════════════
-- PRAHARI — Production Database Schema
-- PostgreSQL 15+
-- Run: psql -U postgres -d prahari < schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";          -- For geolocation queries

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(80)  NOT NULL,
  phone            VARCHAR(15)  UNIQUE NOT NULL,
  email            VARCHAR(255) UNIQUE,
  password_hash    TEXT NOT NULL,
  
  -- Profile
  city             VARCHAR(100),
  badge            VARCHAR(10)  DEFAULT '⚔️',
  title            VARCHAR(50)  DEFAULT 'TRUTH WARRIOR',
  avatar_url       TEXT,
  bio              TEXT,

  -- Gamification
  pts              INTEGER      DEFAULT 0 NOT NULL CHECK (pts >= 0),
  reports          INTEGER      DEFAULT 0 NOT NULL CHECK (reports >= 0),
  streak           INTEGER      DEFAULT 0,
  streak_last_date DATE,
  rank             INTEGER,

  -- Trust & Verification
  is_phone_verified BOOLEAN DEFAULT false,
  is_aadhaar_linked BOOLEAN DEFAULT false,  -- optional, for high-trust reporters
  is_journalist     BOOLEAN DEFAULT false,
  trust_score       SMALLINT DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),

  -- Moderation
  is_banned         BOOLEAN DEFAULT false,
  ban_reason        TEXT,
  false_report_count INTEGER DEFAULT 0,

  -- Security
  last_login        TIMESTAMPTZ,
  login_attempts    SMALLINT DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_phone    ON users(phone);
CREATE INDEX idx_users_pts      ON users(pts DESC);
CREATE INDEX idx_users_city     ON users(city);
CREATE INDEX idx_users_rank     ON users(rank);

-- ─── REPORTS ────────────────────────────────────────────────────────────────
CREATE TYPE report_category AS ENUM (
  'corruption', 'encroach', 'pollution', 'road',
  'litter', 'water', 'power', 'forest'
);

CREATE TYPE report_status AS ENUM (
  'pending', 'under_review', 'verified', 'action_taken', 'resolved', 'rejected', 'duplicate'
);

CREATE TYPE priority_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Content
  category          report_category NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT CHECK (LENGTH(description) <= 2000),
  location          VARCHAR(300) NOT NULL,
  city              VARCHAR(100) NOT NULL,
  state             VARCHAR(100),
  pincode           VARCHAR(6),

  -- Geolocation (PostGIS)
  lat               DECIMAL(10,8),
  lng               DECIMAL(11,8),
  geo_point         GEOGRAPHY(POINT, 4326),  -- auto-populated

  -- Media
  evidence_urls     JSONB DEFAULT '[]',
  video_url         TEXT,

  -- AI Analysis
  ai_score          SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
  ai_priority       priority_level DEFAULT 'MEDIUM',
  ai_dept_assigned  VARCHAR(100),
  ai_analysis       JSONB,  -- full AI response stored

  -- Blockchain
  blockchain_hash   VARCHAR(64) UNIQUE,
  blockchain_tx     VARCHAR(100),  -- Polygon transaction ID
  blockchain_at     TIMESTAMPTZ,

  -- Status & Resolution
  status            report_status DEFAULT 'pending' NOT NULL,
  assigned_dept     VARCHAR(100),
  sla_deadline      DATE,
  resolved_at       TIMESTAMPTZ,
  resolution_note   TEXT,
  govt_ticket_id    VARCHAR(100),  -- govt portal reference

  -- RTI
  rti_filed         BOOLEAN DEFAULT false,
  rti_filed_at      TIMESTAMPTZ,
  rti_reference     VARCHAR(50),

  -- Engagement
  votes             INTEGER DEFAULT 0 NOT NULL CHECK (votes >= 0),
  impact_note       TEXT,  -- what changed after resolution

  -- Rewards
  pts_potential     INTEGER DEFAULT 100 NOT NULL,
  pts_awarded       INTEGER DEFAULT 0,

  -- Privacy
  is_anonymous      BOOLEAN DEFAULT true,
  is_urgent         BOOLEAN DEFAULT false,
  is_whistleblower  BOOLEAN DEFAULT false,  -- extra protection

  -- Moderation
  is_deleted        BOOLEAN DEFAULT false,
  is_featured       BOOLEAN DEFAULT false,
  moderation_note   TEXT,
  moderator_id      UUID REFERENCES users(id),

  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-populate geo_point from lat/lng
CREATE OR REPLACE FUNCTION set_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_geo_point
BEFORE INSERT OR UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION set_geo_point();

CREATE INDEX idx_reports_user       ON reports(user_id);
CREATE INDEX idx_reports_category   ON reports(category);
CREATE INDEX idx_reports_status     ON reports(status);
CREATE INDEX idx_reports_city       ON reports(city);
CREATE INDEX idx_reports_created    ON reports(created_at DESC);
CREATE INDEX idx_reports_geo        ON reports USING GIST(geo_point);
CREATE INDEX idx_reports_hash       ON reports(blockchain_hash);
CREATE INDEX idx_reports_active     ON reports(created_at DESC) WHERE is_deleted = false;

-- ─── REPORT STATUS HISTORY ───────────────────────────────────────────────────
CREATE TABLE report_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id    UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  changed_by   UUID REFERENCES users(id),
  old_status   report_status,
  new_status   report_status NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_history_report ON report_history(report_id);

-- ─── REPORT VOTES ───────────────────────────────────────────────────────────
CREATE TABLE report_votes (
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (report_id, user_id)
);

-- ─── REPORT COMMENTS ────────────────────────────────────────────────────────
CREATE TABLE report_comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id    UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 2 AND 500),
  is_anonymous BOOLEAN DEFAULT false,
  is_deleted   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_comments_report ON report_comments(report_id);

-- ─── REWARDS ────────────────────────────────────────────────────────────────
CREATE TABLE reward_catalog (
  id           VARCHAR(10) PRIMARY KEY,
  label        VARCHAR(100) NOT NULL,
  description  TEXT,
  pts_required INTEGER NOT NULL CHECK (pts_required > 0),
  category     VARCHAR(50),
  partner      VARCHAR(100),
  icon         VARCHAR(10),
  is_active    BOOLEAN DEFAULT true,
  stock        INTEGER,  -- NULL = unlimited
  valid_until  DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO reward_catalog VALUES
  ('r1',  '₹10 UPI Cashback',     'Direct UPI transfer',           100,   'cash',       'PhonePe',          '💵', true, NULL, NULL, NOW()),
  ('r2',  'Free Metro Rides x3',   '3 one-way metro trips',         300,   'transport',  'Metro Rail',       '🚇', true, NULL, NULL, NOW()),
  ('r3',  '₹50 UPI Cashback',      'Direct UPI transfer',           500,   'cash',       'Google Pay',       '💰', true, NULL, NULL, NOW()),
  ('r4',  '1 Month Bus Pass',      'Valid on all city routes',      1000,  'transport',  'City Transport',   '🚌', true, NULL, NULL, NOW()),
  ('r5',  '₹200 Grocery Voucher',  'BigBasket voucher code',        2000,  'voucher',    'BigBasket',        '🛒', true, NULL, NULL, NOW()),
  ('r6',  'Prahari Premium 1yr',   'Advanced features + analytics', 3000,  'premium',    'Prahari',          '⭐', true, NULL, NULL, NOW()),
  ('r7',  'IT Rebate Certificate', 'Income Tax rebate document',    5000,  'govt',       'Income Tax Dept',  '📜', true, NULL, NULL, NOW()),
  ('r8',  '₹5,000 + Hero Award',   'Cash + certificate',            10000, 'award',      'Govt of India',    '🏆', true, NULL, NULL, NOW()),
  ('r9',  'National Prahari Award','Annual top citizen award',      25000, 'award',      'PMO India',        '🎖️', true, NULL, NULL, NOW());

CREATE TABLE redemptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  reward_id    VARCHAR(10) REFERENCES reward_catalog(id),
  pts_spent    INTEGER NOT NULL,
  status       VARCHAR(20) DEFAULT 'processing',  -- processing, fulfilled, failed
  fulfilled_at TIMESTAMPTZ,
  reference_id VARCHAR(100),  -- payment/voucher reference
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_redemptions_user ON redemptions(user_id);

-- ─── POINTS LEDGER ───────────────────────────────────────────────────────────
CREATE TABLE points_ledger (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  amount      INTEGER NOT NULL,  -- positive = earned, negative = spent
  type        VARCHAR(50) NOT NULL,  -- 'report_filed', 'report_verified', 'bonus', 'redemption', 'referral', 'streak'
  reference   UUID,  -- report_id or redemption_id
  balance     INTEGER NOT NULL,  -- balance after transaction
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ledger_user ON points_ledger(user_id, created_at DESC);

-- Function to award points and log to ledger
CREATE OR REPLACE FUNCTION award_points(p_user_id UUID, p_amount INTEGER, p_type VARCHAR, p_ref UUID, p_note TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users SET pts = pts + p_amount WHERE id = p_user_id RETURNING pts INTO new_balance;
  INSERT INTO points_ledger (user_id, amount, type, reference, balance, note)
    VALUES (p_user_id, p_amount, p_type, p_ref, new_balance, p_note);
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,  -- 'report_verified', 'report_resolved', 'points_earned', 'rti_filed'
  title       VARCHAR(100) NOT NULL,
  body        TEXT NOT NULL,
  report_id   UUID REFERENCES reports(id),
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE is_read = false;

-- ─── REFERRALS ───────────────────────────────────────────────────────────────
CREATE TABLE referrals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id  UUID NOT NULL REFERENCES users(id),
  referred_id  UUID NOT NULL REFERENCES users(id),
  pts_awarded  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CITY STATS (materialized view, refresh hourly) ─────────────────────────
CREATE MATERIALIZED VIEW city_stats AS
SELECT
  city,
  COUNT(*) as total_reports,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
  ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END)::NUMERIC / NULLIF(COUNT(*),0) * 100) as resolution_pct,
  COUNT(DISTINCT user_id) as active_reporters,
  MAX(created_at) as last_report_at
FROM reports
WHERE is_deleted = false AND city IS NOT NULL
GROUP BY city
ORDER BY total_reports DESC;

CREATE UNIQUE INDEX idx_city_stats ON city_stats(city);

-- ─── DEPARTMENTS & SLA TRACKING ──────────────────────────────────────────────
CREATE TABLE department_sla (
  dept_name    VARCHAR(100) PRIMARY KEY,
  category     report_category NOT NULL,
  sla_days     SMALLINT NOT NULL,
  escalation_email VARCHAR(255),
  govt_portal  TEXT
);

INSERT INTO department_sla VALUES
  ('Vigilance Bureau',        'corruption', 7,  'vigilance@gov.in',   'https://cvc.gov.in'),
  ('Municipal Corporation',   'encroach',   14, 'mc@gov.in',          NULL),
  ('Pollution Control Board', 'pollution',  10, 'pcb@gov.in',         'https://cpcb.gov.in'),
  ('Public Works Department', 'road',       21, 'pwd@gov.in',         NULL),
  ('Sanitation Department',   'litter',     3,  'sanitation@gov.in',  NULL),
  ('Jal Board',               'water',      5,  'jalboard@gov.in',    NULL),
  ('Electricity Board',       'power',      7,  'electricity@gov.in', NULL),
  ('Forest Department',       'forest',     3,  'forest@gov.in',      'https://moef.gov.in');

-- ─── AUDIT LOG (tamper-proof) ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  VARCHAR(50) NOT NULL,
  record_id   UUID NOT NULL,
  action      VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
  old_values  JSONB,
  new_values  JSONB,
  changed_by  UUID,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_time   ON audit_log(created_at DESC);

-- Audit trigger for reports (critical table)
CREATE OR REPLACE FUNCTION audit_reports()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
    VALUES ('reports', NEW.id, 'UPDATE',
      row_to_json(OLD)::jsonb - 'description' - 'evidence_urls',  -- exclude large fields
      row_to_json(NEW)::jsonb - 'description' - 'evidence_urls');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_reports
AFTER UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION audit_reports();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SECURITY: ROW LEVEL SECURITY ───────────────────────────────────────────
-- Enable RLS (especially important if using Supabase)
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sensitive data
CREATE POLICY users_own_data ON users
  FOR ALL USING (id = current_setting('app.user_id', true)::UUID);

CREATE POLICY redemptions_own ON redemptions
  FOR ALL USING (user_id = current_setting('app.user_id', true)::UUID);

-- ─── SAMPLE DATA (remove in production) ─────────────────────────────────────
-- DO $$
-- BEGIN
--   INSERT INTO users (name, phone, password_hash, city, pts, reports, badge, title) VALUES
--     ('Demo User', '9999999999', crypt('demo1234', gen_salt('bf')), 'Mumbai', 500, 3, '⚔️', 'TRUTH WARRIOR');
-- END $$;
