# XIVIZLEY Suite v0.2

```
██╗  ██╗██╗██╗   ██╗██╗███████╗██╗     ███████╗██╗   ██╗
╚██╗██╔╝██║██║   ██║██║╚══███╔╝██║     ██╔════╝╚██╗ ██╔╝
 ╚███╔╝ ██║██║   ██║██║  ███╔╝ ██║     █████╗   ╚████╔╝ 
 ██╔██╗ ██║╚██╗ ██╔╝██║ ███╔╝  ██║     ██╔══╝    ╚██╔╝  
██╔╝ ██╗██║ ╚████╔╝ ██║███████╗███████╗███████╗   ██║   
╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   
Industrial Homelab & Self-Hosted Cloud Operating Suite • v0.2.0
```

[![Version](https://img.shields.io/badge/version-v0.2.0--beta-0082c9.svg?style=flat-square)](https://github.com/Xivizley/xivizley-suite)
[![Docker](https://img.shields.io/badge/docker-engine_native-2496ed.svg?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Apps](https://img.shields.io/badge/catalog-115+_docker_apps-10b981.svg?style=flat-square)](https://suite.xivizley.com.tr/store)
[![Design](https://img.shields.io/badge/standards-DIN_40719_Spec-8b5cf6.svg?style=flat-square)](https://xivizley.com.tr)
[![Platform](https://img.shields.io/badge/platform-Linux_x86__64_/_ARM64-slate.svg?style=flat-square)](https://xivizley.com.tr)

**XIVIZLEY Suite**, VDS, kiralık sunucu ve yerel homelab ortamları için geliştirilmiş açık kaynaklı, birleşik bir bulut ve konteyner orkestrasyon merkezidir. 

Aşırı süslü pazarlama terimleri ve gereksiz "gamer" jargonu içermez. Doğrudan çalışan mühendislik koduna, **DIN 40719 endüstriyel şema disiplinine**, temiz Docker Compose çıktısına ve sıfır port çakışmasına odaklanır.

---

## ⚡ 1-Komutla Hızlı Kurulum

Sunucunuzda (Ubuntu/Debian/AlmaLinux/Arch) tek komutla tüm ekosistemi ayağa kaldırabilirsiniz:

```bash
# 1-Tıkla Otomatik Kurulum
curl -sSL https://xivizley.com.tr/durum | bash
```

veya interaktif CLI motoru ile:

```bash
# Node.js 18+ ile doğrudan çalıştırın
npx xivizley suite
```

---

## 🌟 Öne Çıkan Özellikler (v0.2)

### 🏬 1. 115+ Küratörlü Docker Uygulama Mağazası (`/store`)
* Medya (Jellyfin, Plex, Navidrome, Kavita), depolama (Nextcloud, Filebrowser, MinIO), şifre kasası (Vaultwarden), ağ araçları (AdGuard Home, Nginx Proxy Manager, Cloudflare Tunnel), veritabanları ve geliştirici araçları tek tıkla kurulabilir.
* Her uygulama için otomatik izole depolama: `/opt/xivizley-apps/<app-id>/`.
* Tek tıkla saf Docker Compose YAML ve doğrudan SSH CLI komutu kopyalama.

### ⚙️ 2. Canlı Konteyner Yönetim Çekmecesi (Container Drawer)
* Sayfayı terk etmeden doğrudan yerel Docker soketinden anlık log akışı (`docker logs -f`).
* Gerçek zamanlı CPU % ve RAM (MB) telemetrisi (her 2.5 saniyede bir güncellenir).
* 1-tıkla konteyner eylemleri: **Yeniden Başlat**, **Durdur**, **Başlat**, **Kaldır**.
* Doğrudan konteyner web arayüzüne yönlendiren akıllı port bağlantısı.

### 🛡️ 3. Çakışma Önleyici Port Radarı
* Sunucunuz üzerindeki `22`, `80`, `443`, `3000`, `5432`, `8080`, `8096` gibi kritik servis portlarını kurulum öncesinde otomatik olarak tarar.
* Port çakışmalarını henüz konteyner oluşturulmadan tespit eder ve otomatik olarak güvenli boş port atar.

### 📱 4. Çevrimdışı Dayanıklı PWA v2 (Progressive Web App)
* Mobil tarayıcılarda bağımsız yerel uygulama (standalone) olarak çalışır.
* `xivizley-pwa-v2` hizmet çalışanı (Service Worker) ile çevrimdışı uygulama kabuğu önbelleklemesi.
* iOS Safari ve Android cihazlar için özel ana ekrana ekleme rehberi.

### 💾 5. Tek Komutla Felaket Kurtarma (Disaster Recovery)
* `backup.sh`: PostgreSQL veritabanlarını ve `/opt/xivizley-apps/` altındaki tüm birimleri otomatik sıkıştırıp timestamped arşivler üretir.
* `restore.sh`: Tek satırla tüm veritabanı ve konteyner hacimlerini geri yükler.

---

## 🏗️ Mimari & Servis Haritası

```
                  ┌──────────────────────────────┐
                  │       Caddy Reverse WAF      │ :80 / :443
                  └──────────────┬───────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   XIVIZLEY Hub   │  │   Pulse Sentinel │  │   Store Apps     │
│   (Next.js 15)   │  │   (VDS Guardian) │  │  (115 Containers)│
│      :3000       │  │    Background    │  │ /opt/xivizley-   │
└──────────┬───────┘  └──────────┬───────┘  └──────────────────┘
           │                     │
           └──────────┬──────────┘
                      ▼
        ┌───────────────────────────┐
        │  PostgreSQL 16 (SSO / DB) │ :5432
        └───────────────────────────┘
```

---

## 📦 Proje Yapısı (Turborepo Monorepo)

```text
xivizley-suite/
├── apps/
│   ├── sso/                 # Hub Dashboard, SSO Portal, 115-App Store & Sentinel
│   ├── drive/               # Hızlı NVMe Dosya Yöneticisi & WebDAV
│   ├── pass/                # Sıfır Bilgili (Zero-Knowledge) Parola & 2FA Kasası
│   ├── pulse/               # Canlı Uptime, Gecikme & Host Sistem Bekçisi
│   ├── shield-agent/        # Caddy WAF Log Analizörü & IP Ban Sistemi
│   └── game-panel/          # Minecraft & FiveM Canlı Konsol & Yedekleme
├── packages/
│   ├── aurora-ui/           # XIVIZLEY Hub Design System & Toast Bileşenleri
│   ├── db/                  # Drizzle ORM PostgreSQL Şemaları & Migrasyonlar
│   ├── resource-gov/        # CPU, RAM ve NVMe Limit Yöneticisi
│   └── xivizley-id/         # JWT / OAuth2 Kimlik Doğrulama Middleware'i
└── deploy/                  # Dockerfile, Compose Manifestleri & Caddyfile
```

---

## 📚 Resmi Dokümantasyon Kütüphanesi

Dış geliştiriciler ve homelab topluluğu için hazırlanmış resmi kılavuzlar:

* 🏛️ [**Sistem Mimarisi Kılavuzu**](docs/architecture.md): Fastify mikroservisleri, Next.js 15, RS256 JWT SSO ve Docker Socket yönetimi.
* 🏬 [**115-Uygulama Mağaza Kataloğu**](docs/app-store-catalog.md): 10 kategoride port, Docker imaj ve minimum RAM gereksinimleri.
* 💾 [**Yedekleme ve Felaket Kurtarma**](docs/backup-and-disaster-recovery.md): Sıcak PostgreSQL yedekleme boru hattı ve kurtarma runbook'u.
* ⌨️ [**XIVIZLEY CLI Kılavuzu**](docs/cli-guide.md): `npx xivizley` interaktif TUI ve terminal komut referansı.
* 🇧🇷 [**Guia de Implantação (Português do Brasil)**](docs/pt-br-guide.md): Brezilya homelab ve VDS topluluğu için yerel kurulum kılavuzu.
* 🚀 [**Topluluk Lansman Belgeleri**](docs/launch/): Reddit (r/homelab, r/CodingTR, r/selfhosted), Hacker News ve Product Hunt gönderi şablonları.

---

## 🌐 Canlı Demolar

* 📐 **Mimari Tuval & Şartname:** [https://xivizley.com.tr](https://xivizley.com.tr)
* 🏬 **Bulut Hub & Mağaza:** [https://suite.xivizley.com.tr](https://suite.xivizley.com.tr)
* 📜 **CLI Paketi:** `npx xivizley --help`

---

## 👨‍💻 Mimar & Geliştirici

* **Kurucu & Geliştirici:** Alperen Celal (14, Bursa)
* **Lisans:** MIT — Tamamen Açık Kaynaklı ve Bağımsız.
* **Katkı:** PR'lar, port düzeltmeleri ve Docker şablon önerileri memnuniyetle karşılanır.
