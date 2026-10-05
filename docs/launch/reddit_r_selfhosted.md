# Reddit `r/selfhosted` Post Template

**Target Subreddit:** [r/selfhosted](https://reddit.com/r/selfhosted)  
**Post Type:** Text Post  
**Flair:** `[Self-Promotion]` or `[Software]`

---

## 📌 Post Title

`XIVIZLEY Suite v0.2: An open-source private cloud & 115-app Docker catalog with Nextcloud aesthetics, pre-flight port resolver & telemetry`

---

## 📝 Post Body

Hey r/selfhosted,

I wanted to share **XIVIZLEY Suite**, an open-source, modular self-hosted platform I’ve been developing.

Most self-hosted dashboards are either strictly bookmark launchers (like Homepage/Flame) or complete OS distributions (like CasaOS/Umbrel) that demand full control over your server. I wanted something in the middle: a platform that feels like **Nextcloud Hub**, provides integrated native modules (SSO, Cloud Drive, Vaultwarden-compatible Passwords, Host Telemetry), while letting you deploy 115 standalone Docker applications without locking you into proprietary formats.

### 🔗 Links

- **Live Demo (Instant Guest Mode):** [https://suite.xivizley.com.tr](https://suite.xivizley.com.tr)
- **Visual Canvas Architect:** [https://xivizley.com.tr/architect](https://xivizley.com.tr/architect)
- **GitHub Repository (MIT):** [github.com/Xivizley/xivizley-suite](https://github.com/Xivizley/xivizley-suite)
- **CLI Tool:** `npx xivizley`

---

### 🔑 Key Highlights

1. **Human, Grounded UI (Aurora Design System):**
   - Designed to match the calm, trusted visual language of Nextcloud Hub (`#181e24` soft dark / `#ffffff` light mode).
   - Zero AI-generated neon glows or flashy sci-fi badges.

2. **115 Standalone Docker Apps in One Unified Catalog:**
   - Pre-configured manifests for media servers (Jellyfin, Plex), privacy/DNS (Pi-hole, AdGuard), cloud storage, local LLMs (Ollama), and databases.
   - Built-in multi-select composer with dynamic port collision resolution: automatically moves conflicting host ports (e.g. 8080 -> 8081) without touching container internals.

3. **Built-in Host Sentinel & Hardware Telemetry:**
   - Live CPU load, RAM usage, NVMe disk wear, and Docker container health monitoring.
   - Automated Telegram bot notifications with a 30-minute debounce to prevent alert fatigue.

4. **1-Command Hot Disaster Recovery:**
   - Automated `backup-daily.sh` taking non-blocking containerized PostgreSQL dumps via gzip.
   - 7-day automated retention rotation and a single-command `restore.sh`.

5. **Terminal TUI & Doctor (`npx xivizley`):**
   - Pre-flight diagnostic engine that audits listening network sockets, validates Docker engine health, and sets up automated Caddy TLS in under 60 seconds.

---

### 💻 Installation

```bash
# Interactive TUI Wizard
npx xivizley suite

# Or direct bash script on Debian/Ubuntu/Alpine
curl -fsSL https://suite.xivizley.com.tr/install.sh | bash
```

### 🔒 Privacy & Open Source

- 100% MIT Licensed.
- Zero tracking scripts, zero telemetry phone-home calls, and zero external SaaS dependencies.
- Runs entirely on your own hardware or VDS.

I would love to get your feedback on the architecture, features you'd like to see added, and any compatibility issues.

_Alperen Celal (14, Bursa)_
