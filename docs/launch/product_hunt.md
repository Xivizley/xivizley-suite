# Product Hunt Launch Kit

**Platform:** [producthunt.com](https://www.producthunt.com)  
**Product Name:** XIVIZLEY Suite  

---

## 📌 Tagline (Max 60 characters)
`Nextcloud-styled private cloud with 115 Docker apps & telemetry`

---

## 🏷️ Category Tags
- Developer Tools
- Open Source
- Self-Hosted / Homelab
- Productivity

---

## 📝 Short Description (Max 260 characters)
An open-source private cloud built with Next.js 15 & Fastify. Features a Nextcloud Hub design, centralized RS256 SSO, a 115-app Docker catalog with dynamic port collision resolution, host telemetry, and 1-command disaster recovery.

---

## 💬 Maker Comment (First Comment by Alperen)

Hi Product Hunt community! 👋

I'm Alperen Celal, a 14-year-old developer from Bursa, Turkey. Over the past several months, I've been building **XIVIZLEY Suite** to solve a problem every self-hoster faces: managing personal cloud services without relying on cluttered dashboards, complex network setups, or heavy proprietary OS images.

### 🌟 Why XIVIZLEY Suite?

- 🎨 **Nextcloud Hub Design Language:** Calm, human-friendly, high-contrast UI (Aurora Design System) that feels familiar and professional.
- 📦 **115-App Docker Catalog:** One-click deployment for media (Jellyfin/Plex), security (Vaultwarden), privacy (AdGuard/Pi-hole), AI (Ollama), and databases.
- 🛡️ **Dynamic Port Collision Radar:** Never see "port 8080 already in use" again. Our engine inspects listening sockets and remaps ports automatically.
- 📊 **Built-in VDS Sentinel & Telegram Bot:** Real-time CPU, RAM, NVMe health telemetry and instant notifications when containers go down.
- ⚡ **Instant CLI Experience:** Deploy in under 60 seconds with `npx xivizley`.

### 🚀 Try it Live Right Now:
You don't even need to spin up a server to try it:
👉 [https://suite.xivizley.com.tr](https://suite.xivizley.com.tr) *(Click "Canlı Demo Olarak Keşfet")*

The code is 100% open source under the MIT license on GitHub:  
👉 [github.com/Xivizley/xivizley-suite](https://github.com/Xivizley/xivizley-suite)

I'm hanging out here all day to answer your questions and hear your feedback! What's the one app you'd love to see in our catalog next?

---

## ❓ FAQ for Product Hunt Page

**Q: Do I need a domain name to use XIVIZLEY Suite?**  
A: No! You can run it on `localhost` or your local homelab IP (e.g. `192.168.1.100`). If you have a public domain, Caddy automatically provisions free Let's Encrypt SSL certificates.

**Q: How does it compare to CasaOS or Umbrel?**  
A: CasaOS and Umbrel often replace system-level network management and wrap containers in custom abstractions. XIVIZLEY Suite generates standard, portable `docker-compose.yml` files, respects your host's existing services, and integrates native SSO, Drive, and Pass modules.

**Q: Is it safe to deploy on a shared or production server?**  
A: Yes. It runs completely isolated inside dedicated Docker bridges (`xivizley-net`) and will never modify or stop existing foreign containers (like your games, VPNs, or web servers).
