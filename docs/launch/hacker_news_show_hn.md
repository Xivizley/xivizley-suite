# Hacker News `Show HN` Submission

**Platform:** [news.ycombinator.com](https://news.ycombinator.com)  
**Submission Type:** Show HN Link / Text Post

---

## 📌 Title

`Show HN: XIVIZLEY Suite – Nextcloud-styled private cloud with 115 Docker apps and pre-flight port resolver`

---

## 🔗 URL (if submitting as Link)

`https://github.com/Xivizley/xivizley-suite`

---

## 📝 First Comment / Text Body

Hi HN,

I built **XIVIZLEY Suite**, an open-source private cloud and container orchestration platform designed for homelabs and single-node VDS servers:

- **Repository:** https://github.com/Xivizley/xivizley-suite
- **Live Demo (Instant guest session, no sign-up):** https://suite.xivizley.com.tr
- **Architecture Canvas:** https://xivizley.com.tr/architect
- **CLI:** `npx xivizley`

### Why build this?

Most self-hosted dashboards fall into two extremes:

1. Pure bookmark launchers (Dashy, Flame, Homepage) that don't manage state or container orchestration.
2. Heavy appliance OS distributions (Umbrel, CasaOS) that want full control over your OS and often use non-standard Docker wrappers.

I wanted a modular stack with the trusted, human design language of **Nextcloud Hub**, but built on a lean Node.js stack with direct Docker API access and zero proprietary abstractions.

### Architecture & Technical Details

- **Fastify Backend:** A microservice handling asymmetric RS256 JWT Single Sign-On (SSO) across all integrated modules (Drive, Passwords, Pulse telemetry, Game server cockpit).
- **Next.js 15 App Router Frontend:** Standardized under our Aurora UI system (`#181e24` soft dark / `#ffffff` light mode). No AI glow effects or distracting cyberpunk widgets.
- **115-App Catalog & Conflict Resolver:** Manages 115 independent Docker apps across 10 categories. It includes a pre-flight socket inspection engine that checks host port collisions before container initialization and re-maps conflicting ports cleanly.
- **Demo Mode Isolation:** The public demo runs with a global Fastify `preHandler` mutation guard that returns `HTTP 403 Forbidden` (`DEMO_READ_ONLY`) on any mutating HTTP verb (`POST`, `PUT`, `DELETE`) from guest tokens, and scopes database queries away from production records.
- **Disaster Recovery:** Includes non-blocking, containerized PostgreSQL dump automation via gzip pipelines with 7-day retention cleanup.

### Quick Start

```bash
# Interactive TUI
npx xivizley suite

# Or direct bash installation on Linux
curl -fsSL https://suite.xivizley.com.tr/install.sh | bash
```

The project is 100% open-source under the MIT license. I'd love to hear your thoughts, critique on the architectural design, and feedback on the container orchestration pipeline.

_Alperen Celal (14, Bursa, Turkey)_
