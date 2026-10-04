# Reddit `r/homelab` Post Template

**Target Subreddit:** [r/homelab](https://reddit.com/r/homelab)  
**Post Type:** Text Post (with embedded screenshots / image gallery)  
**Flair:** `[Showoff Saturday]` or `[Software]`  

---

## 📌 Post Title
`[Showoff Saturday] XIVIZLEY Suite v0.2: An open-source, Nextcloud-styled homelab cloud with 115 standalone Docker apps, hardware telemetry & port radar`

---

## 📝 Post Body

Hey r/homelab!

Over the past few months, I got tired of stitching together disjointed web UIs, debugging port conflicts manually, and dealing with over-bloated homelab dashboards that look like 2012 control panels. 

I’ve been building **XIVIZLEY Suite**—an open-source, unified private cloud platform designed around the clean aesthetic of Nextcloud Hub, but engineered with a modern Fastify/Next.js stack, automated Docker orchestration, and hardware telemetry.

### 🌐 Live Demo & GitHub
- **Live Demo (No registration required):** [https://suite.xivizley.com.tr](https://suite.xivizley.com.tr) *(Click "Canlı Demo Olarak Keşfet" / Explore Live Demo)*
- **Interactive Visual Architect:** [https://xivizley.com.tr/architect](https://xivizley.com.tr/architect)
- **GitHub Repository (MIT):** [github.com/Xivizley/xivizley-suite](https://github.com/Xivizley/xivizley-suite)
- **CLI Engine:** `npx xivizley`

---

### 🛠️ What's Inside?

1. **Nextcloud Hub Design Language (Aurora UI):**
   - Clean, authentic homelab look (soft dark `#181e24` and crisp light `#ffffff` mode, `#0082c9` Nextcloud primary). No neon glows or AI gimmicks.
   - Centralized SSO authentication using cryptographic RS256 JWT tokens.

2. **115 Standalone Docker Apps in One Store:**
   - 10 curated categories: Media (Jellyfin, Plex, Radarr, Sonarr), Privacy/Adblock (Pi-hole, AdGuard), Cloud/Storage (Nextcloud, Filebrowser, MinIO), DevOps (Portainer, Caddy, Nginx Proxy Manager), AI/LLM (Ollama, OpenWebUI), and Databases.
   - Built-in port conflict resolver: if 8080 or 5432 is already bound by your host, it dynamically maps to the next free port without breaking container networking.

3. **VDS Sentinel & Telemetry:**
   - Real-time kernel load, RAM usage, NVMe disk wear, and container health checks.
   - Automated Telegram bot dispatch with a 30-minute anti-spam debounce.

4. **Interactive CLI (`npx xivizley`):**
   - A `@clack/prompts` terminal wizard that audits your open ports (pre-flight doctor), scaffolds Compose files, and configures reverse proxies in under 60 seconds.

5. **Disaster Recovery Pipeline:**
   - Hot PostgreSQL dumps directly from the container via gzip pipelines, complete with automated 7-day retention cleanup and one-command `restore.sh`.

---

### 💻 Fast Single-Command Install

```bash
# Via interactive TUI
npx xivizley suite

# Or direct bash deploy on Ubuntu/Debian
curl -fsSL https://suite.xivizley.com.tr/install.sh | bash
```

### 🔒 Security & Data Isolation
The live demo instance runs behind a strict **Global Demo Mutation Guard** (`HTTP 403 Forbidden` on any modifying verbs like `POST`/`DELETE` for guest tokens) with zero access to administrator records or production storage volumes.

---

### 💬 Feedback Welcome!
I'd love to hear your thoughts on the workflow, app catalog additions, or any edge cases in your homelab setups. Feel free to roast the architecture or open an issue on GitHub!

*Built with passion by Alperen Celal (14, Bursa, Turkey).*
