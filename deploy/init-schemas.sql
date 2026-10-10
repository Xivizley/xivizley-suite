-- XIVIZLEY Suite — PostgreSQL 16 Multi-Schema Bootstrap
-- Bu dosya, ilk `docker compose up` sırasında otomatik çalışır.
-- Her uygulama kendi schema'sını ve tablolarını burada alır.

CREATE SCHEMA IF NOT EXISTS sso;
CREATE SCHEMA IF NOT EXISTS game_panel;
CREATE SCHEMA IF NOT EXISTS drive;
CREATE SCHEMA IF NOT EXISTS cinema;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS pulse;
CREATE SCHEMA IF NOT EXISTS sound;
CREATE SCHEMA IF NOT EXISTS docs;
CREATE SCHEMA IF NOT EXISTS shield;
CREATE SCHEMA IF NOT EXISTS fortress;
CREATE SCHEMA IF NOT EXISTS brain;
CREATE SCHEMA IF NOT EXISTS talk;
CREATE SCHEMA IF NOT EXISTS pass;
CREATE SCHEMA IF NOT EXISTS notes;
CREATE SCHEMA IF NOT EXISTS calendar;

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    title TEXT NOT NULL DEFAULT 'Başlıksız Not',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Genel',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pass.vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES sso.users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL DEFAULT 'login',
    title VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    encrypted_password TEXT NOT NULL,
    url TEXT,
    totp_secret TEXT,
    notes TEXT,
    folder VARCHAR(128) DEFAULT 'Genel',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pass.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES sso.users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    icon VARCHAR(64) DEFAULT 'Folder',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES sso.users(id) ON DELETE CASCADE,
    parent_id UUID,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES sso.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES drive.folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash VARCHAR(64),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drive.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES drive.files(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES drive.folders(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES sso.users(id) ON DELETE CASCADE,
    share_token VARCHAR(64) NOT NULL UNIQUE,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    download_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    uid VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(32) DEFAULT '#0082c9',
    reminder_minutes INTEGER,
    notify_email VARCHAR(255),
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar.settings (
    user_id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    cal_token VARCHAR(64) NOT NULL,
    from_email VARCHAR(255),
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_user VARCHAR(255),
    smtp_pass_enc TEXT,
    mail_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
