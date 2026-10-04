# XIVIZLEY Suite — System Architecture & Engineering Specification

## 1. System Overview

XIVIZLEY Suite is an open-source, self-hosted homelab operating system and cloud workspace. It provides a centralized Nextcloud Hub-compatible user experience, an integrated 115-app Docker application store, real-time container inspection and lifecycle controls, and background sentinel health telemetry.

```
                                  ┌────────────────────────┐
                                  │   Caddy Reverse Proxy  │
                                  │  (Automatic SSL / TLS) │
                                  └───────────┬────────────┘
                                              │ :3000
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 XIVIZLEY Unified Hub Runtime                                    │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              Fastify Microservices Core                                   │  │
│  │                                                                                           │  │
│  │  • Global Security Pre-Handler (Mutation Guard / Read-Only Demo Shield)                   │  │
│  │  • Auth Engine: RS256 JWT Access Tokens + Family-Rotated Refresh Tokens                  │  │
│  │  • Storage & Drive Routes: User-scoped file storage, chunked uploads, and shares          │  │
│  │  • Store Engine: 115 Docker templates, native YAML generation, Docker socket daemon      │  │
│  │  • Vault Engine: Zero-knowledge AES-256-GCM encrypted passwords & RFC 6238 TOTP 2FA      │  │
│  │  • Sentinel Daemon: Host CPU, RAM, NVMe disk statistics, and container health pings       │  │
│  │  • Game Server Cockpit: RCON, backup studio, and FiveM/Minecraft plugin installer        │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                              │ Fallback / SSR                                   │
│                                              ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Next.js 15 App Router                                     │  │
│  │                                                                                           │  │
│  │  • Nextcloud Hub 9 Signature UI (Header app switcher, Cmd+K search, dynamic theming)       │  │
│  │  • Dynamic Dashboard: Live widgets (Recent Files, Quick Notes, Sentinel, Vault, Game)     │  │
│  │  • App Store Client: Category browsing, instant search, and Container Management Drawer   │  │
│  │  • Progressive Web App (PWA v2): Standalone manifest and offline service worker caching   │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ├──────────────────────────┐
                                               ▼                          ▼
                                 ┌────────────────────────┐ ┌────────────────────────┐
                                 │ PostgreSQL 16 (Drizzle)│ │      Docker Engine     │
                                 │   • sso, pass, drive   │ │     (/var/run/docker)  │
                                 └────────────────────────┘ └────────────────────────┘
```

---

## 2. Authentication & Session Security (SSO)

XIVIZLEY implements an enterprise-grade stateless authentication pipeline:

1. **Access Tokens (RS256 JWT):**
   - Signed using an asymmetric 2048-bit RSA private key (`JWT_PRIVATE_KEY`).
   - Verified statelessly across all subdomains (`suite.xivizley.com.tr`, `drive.xivizley.com.tr`, `pass.xivizley.com.tr`, `pulse.xivizley.com.tr`) using public key (`JWT_PUBLIC_KEY`).
   - Carries identity claims: `sub` (User UUID), `email`, `role` (`owner` | `admin` | `member` | `guest`), and `displayName`.
   - 7-day expiration with sliding HttpOnly cookie storage (`xivizley_access_token`).

2. **Refresh Token Rotation (Family IDs):**
   - Cryptographically random 256-bit entropy token stored in PostgreSQL table `sso.refresh_tokens` as a SHA-256 hash.
   - Enforces automatic token rotation: reuse of an old refresh token invalidates the entire family group, preventing replay attacks.

3. **Global Demo Mutation Guard:**
   - Designed for live public demonstrations and evaluation sandboxes.
   - Fastify-level `preHandler` intercepts all incoming requests before dispatching to routes:
   - If `req.user?.role === "guest"` and HTTP method matches `["POST", "PUT", "PATCH", "DELETE"]`, the request is immediately aborted with `HTTP 403 Forbidden` (`DEMO_READ_ONLY`), unless explicitly whitelisted (`/api/auth/demo`, `/api/auth/logout`).
   - Demo sessions run under a hardcoded, isolated UUID (`d0000000-0000-0000-0000-000000000001`), ensuring complete partitioning from administrative data.

---

## 3. Storage & App Management Standard

To ensure maximum host cleanliness, data predictability, and seamless backup automation:

* **App Installations:** Every application installed via the Store or CLI is provisioned strictly inside `/opt/xivizley-apps/<app-id>/`.
* **Directory Structure:**
  ```text
  /opt/xivizley-apps/<app-id>/
  ├── docker-compose.yml     # Deterministic, self-contained service definition
  ├── .env                   # Auto-generated credentials and port variables
  ├── data/                  # Persistent database and app storage volume
  └── config/                # Service configurations
  ```
* **Port Conflict Detection:** Pre-flight scanning inspects host socket availability before launching any container, resolving collisions automatically or notifying the operator.

---

## 4. Disaster Recovery & Non-blocking Automation

* **Nightly Automated Backup (`scripts/backup-daily.sh`):**
  - Runs daily via cron at `03:00`.
  - Non-blocking database cluster dump executed directly inside the database container (`docker exec -i xivizley-postgres pg_dumpall -U xivizley`).
  - Gzip compressed archive saved to `/var/backups/xivizley/db_YYYYMMDD_HHMMSS.sql.gz`.
  - Automated 7-day retention cleanup.
* **Disaster Recovery (`scripts/restore.sh`):**
  - 1-command decompression and database restoration into the active database container.
