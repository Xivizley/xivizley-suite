# XIVIZLEY App Store — Curated Catalog Specification (115 Applications)

The XIVIZLEY App Store provides 1-click Docker deployment, automatic persistent volume pathing (`/opt/xivizley-apps/<app-id>`), and pre-configured environment templates.

## Summary of Categories

| Category | Apps Count | Focus & Description |
| :--- | :---: | :--- |
| **Media & Streaming** | 10 | Home theater, video streaming, music servers, podcast managers |
| **Storage & Cloud** | 12 | Personal cloud storage, file synchronization, photo backup |
| **Productivity & Tools** | 40 | Office suites, note taking, password vaults, document indexing |
| **Platform & Dev** | 17 | Git servers, CI/CD runners, container management, IDEs |
| **Network & DNS** | 11 | Ad-blocking DNS, VPNs, zero-trust tunnels, dynamic DNS |
| **Reverse Proxy & SSL** | 3 | Traefik, Caddy, Nginx Proxy Manager with automatic Let's Encrypt |
| **Security & Privacy** | 8 | WAF engines, vulnerability scanners, remote desktop relays |
| **Database & Analytics** | 7 | Relational, key-value, and document databases with telemetry |
| **Game Servers** | 4 | Minecraft, FiveM, Palworld, Pterodactyl panel |
| **AI & LLM** | 3 | Ollama local inference, Open WebUI, SearXNG |

---

## 1. Media & Streaming

| App ID | Name | Default Port | Docker Image | Min RAM | Description |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `jellyfin` | Jellyfin | `8096` | `jellyfin/jellyfin:latest` | 1024 MB | Open-source home media system with hardware transcoding |
| `plex` | Plex Media Server | `32400` | `plexinc/pms-docker:latest` | 1024 MB | Streaming server for movies, TV shows, and music |
| `emby` | Emby Server | `8096` | `emby/embyserver:latest` | 1024 MB | Personal media server with DLNA streaming |
| `navidrome` | Navidrome | `4533` | `deluan/navidrome:latest` | 256 MB | Lightweight modern music server compatible with Subsonic |
| `audiobookshelf` | Audiobookshelf | `13378` | `ghcr.io/advplyr/audiobookshelf:latest` | 256 MB | Self-hosted audiobook and podcast server |
| `calibre-web` | Calibre-Web | `8083` | `lscr.io/linuxserver/calibre-web:latest` | 256 MB | Clean web interface for browsing and reading Calibre e-books |
| `kavita` | Kavita | `5000` | `jvmilazz0/kavita:latest` | 512 MB | Fast manga, comic, and book reader with OPDS support |
| `radarr` | Radarr | `7878` | `lscr.io/linuxserver/radarr:latest` | 256 MB | Movie collection manager and automation tool |
| `sonarr` | Sonarr | `8989` | `lscr.io/linuxserver/sonarr:latest` | 256 MB | TV series collection manager and RSS downloader |
| `prowlarr` | Prowlarr | `9696` | `lscr.io/linuxserver/prowlarr:latest` | 256 MB | Indexer manager integrating with Torrent and Usenet clients |

---

## 2. Storage & Personal Cloud

| App ID | Name | Default Port | Docker Image | Min RAM | Description |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `nextcloud` | Nextcloud Hub | `8080` | `nextcloud:latest` | 1024 MB | Enterprise self-hosted productivity suite and file sync |
| `immich` | Immich | `2283` | `ghcr.io/immich-app/immich-server:release` | 2048 MB | High-performance self-hosted photo and video backup |
| `photoprism` | PhotoPrism | `2342` | `photoprism/photoprism:latest` | 2048 MB | AI-powered autonomous photo management and categorization |
| `filebrowser` | FileBrowser | `8088` | `filebrowser/filebrowser:latest` | 128 MB | Ultra-lightweight web-based file management interface |
| `seafile` | Seafile | `80` | `seafileltd/seafile-mc:latest` | 1024 MB | High reliability cloud storage with client drive mapping |
| `syncthing` | Syncthing | `8384` | `syncthing/syncthing:latest` | 256 MB | Decentralized peer-to-peer continuous file synchronization |
| `minio` | MinIO | `9000` | `minio/minio:latest` | 512 MB | High-performance S3-compatible object storage server |
| `owncloud` | ownCloud Infinite Scale | `9200` | `owncloud/ocis:latest` | 512 MB | Microservices-based modern personal cloud |
| `duplicati` | Duplicati | `8200` | `lscr.io/linuxserver/duplicati:latest` | 256 MB | Encrypted, incremental backup client with cloud targets |
| `restic` | Restic Server | `8000` | `restic/rest-server:latest` | 128 MB | Secure REST backend for Restic backup repositories |
| `qbittorrent` | qBittorrent | `8080` | `lscr.io/linuxserver/qbittorrent:latest` | 512 MB | Native BitTorrent client with Web UI and search engine |
| `transmission` | Transmission | `9091` | `lscr.io/linuxserver/transmission:latest` | 256 MB | Fast, lightweight BitTorrent client with RPC daemon |

---

## 3. Productivity & Workspace

| App ID | Name | Default Port | Docker Image | Min RAM | Description |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `vaultwarden` | Vaultwarden | `8080` | `vaultwarden/server:latest` | 128 MB | Lightweight Bitwarden-compatible password vault in Rust |
| `uptime-kuma` | Uptime Kuma | `3001` | `louislam/uptime-kuma:latest` | 256 MB | Self-hosted monitoring tool with status pages and alerts |
| `homarr` | Homarr | `7575` | `ghcr.io/ajnart/homarr:latest` | 256 MB | Customizable dashboard for managing homelab applications |
| `heimdall` | Heimdall | `80` | `lscr.io/linuxserver/heimdall:latest` | 128 MB | Elegant application dashboard and launcher |
| `it-tools` | IT-Tools | `80` | `corentinth/it-tools:latest` | 64 MB | Collection of handy online tools for developers and sysadmins |
| `cyberchef` | CyberChef | `80` | `mpepping/cyberchef:latest` | 64 MB | The Cyber Swiss Army Knife for encryption and data parsing |
| `stirling-pdf` | Stirling-PDF | `8080` | `frooodle/s-pdf:latest` | 512 MB | Robust local PDF manipulation suite (merge, split, OCR) |
| `paperless-ngx`| Paperless-ngx | `8000` | `ghcr.io/paperless-ngx/paperless-ngx:latest` | 1024 MB | Document management system transforming physical papers to searchable archive |
| `trilium` | Trilium Notes | `8080` | `zadam/trilium:latest` | 256 MB | Hierarchical note-taking application with knowledge base tree |
| `affine` | AFFiNE | `3010` | `ghcr.io/toeverything/affine:stable` | 1024 MB | Privacy-first workspace uniting docs, whiteboard, and canvas |
| `focalboard` | Focalboard | `8000` | `mattermost/focalboard:latest` | 256 MB | Self-hosted alternative to Trello, Notion, and Asana |
| `wikijs` | Wiki.js | `3000` | `requarks/wiki:2` | 512 MB | Powerful, extensible open-source wiki software on Node.js |
| `bookstack` | BookStack | `80` | `lscr.io/linuxserver/bookstack:latest` | 512 MB | Simple, self-hosted platform for organizing documentation |

---

## 4. Platform & Developer Tools

| App ID | Name | Default Port | Docker Image | Min RAM | Description |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `portainer` | Portainer CE | `9000` | `portainer/portainer-ce:latest` | 128 MB | Web-based container management UI for Docker |
| `dockge` | Dockge | `5001` | `louislam/dockge:latest` | 128 MB | Reactive, elegant Docker Compose manager by Uptime Kuma author |
| `gitea` | Gitea | `3000` | `gitea/gitea:latest` | 256 MB | Painless self-hosted Git service with lightweight footprint |
| `forgejo` | Forgejo | `3000` | `codeberg.org/forgejo/forgejo:latest` | 256 MB | Community-driven Git forge focused on freedom and federation |
| `gitlab-ce` | GitLab CE | `80` | `gitlab/gitlab-ce:latest` | 4096 MB | Complete DevOps platform with Git, CI/CD, and registry |
| `code-server` | Visual Studio Code Server | `8443` | `codercom/code-server:latest` | 1024 MB | Run VS Code on any remote machine accessible via browser |
| `woodpecker` | Woodpecker CI | `8000` | `woodpeckerci/woodpecker-server:latest` | 256 MB | Simple yet powerful continuous integration engine |
| `drone-ci` | Drone CI | `80` | `drone/drone:2` | 256 MB | Container-native continuous delivery platform |

---

## 5. Network, DNS & Security

| App ID | Name | Default Port | Docker Image | Min RAM | Description |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `adguardhome`| AdGuard Home | `53` | `adguard/adguardhome:latest` | 128 MB | Network-wide ads & trackers blocking DNS server |
| `pihole` | Pi-hole | `53` | `pihole/pihole:latest` | 256 MB | Black hole for Internet advertisements via DNS sinkhole |
| `wireguard` | WireGuard | `51820` | `linuxserver/wireguard:latest` | 128 MB | Fast, modern, and secure VPN tunnel daemon |
| `tailscale` | Tailscale | Host | `tailscale/tailscale:latest` | 128 MB | Zero-config mesh VPN based on WireGuard protocol |
| `cloudflared`| Cloudflare Tunnel | Host | `cloudflare/cloudflared:latest` | 64 MB | Zero-trust tunnel exposing local services without open ports |
| `rustdesk` | RustDesk Server | `21115` | `rustdesk/rustdesk-server:latest` | 256 MB | Self-hosted open-source remote desktop relay server |
| `crowdsec` | CrowdSec | `8080` | `crowdsecurity/crowdsec:latest` | 256 MB | Collaborative intrusion detection & IP threat defense system |

---

## 6. Curated Industrial Stacks (All-in-One Compose)

Users can deploy pre-architected multi-service bundles with zero port collisions:
1. **Supabase Self-Host:** PostgreSQL 15, GoTrue Auth, PostgREST, Realtime Server, Kong API Gateway, Supabase Studio UI.
2. **Privacy Search & Cache:** SearXNG Meta-Search Engine + Redis caching backend.
3. **Pterodactyl Gaming Hub:** Pterodactyl Web Panel + MariaDB 10.11 + Redis.
4. **RustDesk Relay Infrastructure:** `hbbs` rendezvous server + `hbbr` relay server.
