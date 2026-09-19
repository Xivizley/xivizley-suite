-- XIVIZLEY Suite — PostgreSQL 16 Multi-Schema Bootstrap
-- Bu dosya, ilk `docker compose up` sırasında otomatik çalışır.
-- Her uygulama kendi schema'sını burada alır.

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
