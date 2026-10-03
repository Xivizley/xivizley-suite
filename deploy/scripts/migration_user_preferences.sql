-- ============================================================
-- XIVIZLEY Hub Migration: User Preferences (R2 & R6)
-- Strictly non-destructive schema extension (purely additive CREATE TABLE IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS sso.hub_preferences (
  user_id UUID PRIMARY KEY REFERENCES sso.users(id) ON DELETE CASCADE,
  widgets TEXT NOT NULL DEFAULT '[]',
  theme VARCHAR(50) NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
