# XIVIZLEY CLI Kılavuzu (`npx xivizley`)

`xivizley` CLI, terminal ortamında Docker konteynerlerini, 115 uygulamalı bağımsız mağazayı, 31 endüstriyel şablonu ve amiral gemisi **XIVIZLEY Cloud Suite** altyapısını interaktif bir TUI (Terminal User Interface) veya doğrudan komut satırı argümanlarıyla dağıtmanızı sağlayan açık kaynaklı bir orkestrasyon motorudur.

---

## ⚡ Gereksinimler

- **Node.js:** v18.0.0 veya üzeri (v20+ LTS önerilir)
- **Docker & Docker Compose:** Docker Engine v24+ ve Compose v2+
- **İşletim Sistemi:** Linux (Ubuntu 20.04/22.04/24.04, Debian 11/12, Rocky Linux, Alpine), macOS veya Windows WSL2
- **İzinler:** Docker daemon erişimi (`sudo usermod -aG docker $USER`)

---

## 🚀 Hızlı Başlangıç

Kuruluma gerek kalmadan doğrudan `npx` ile çalıştırılabilir:

```bash
# İnteraktif TUI Sihirbazı
npx xivizley

# Veya global olarak kurmak için
npm install -g xivizley
xivizley --help
```

---

## 🖥️ İnteraktif TUI Modu

Parametresiz `npx xivizley` çalıştırıldığında `@clack/prompts` destekli modern TUI menüsü açılır:

```text
┌  XIVIZLEY Industrial Engine v1.0.0
│  Mimar: Alperen Celal (14, Bursa)
│
◇  Ne yapmak istiyorsunuz?
│  ● 👑 XIVIZLEY Cloud Suite Kur (Nextcloud Hub, Pass, Drive, Sentinel)
│  ○ 📦 Tekil Uygulama Mağazası (115 Bağımsız Docker Uygulaması)
│  ○ ☑️ Çoklu Uygulama Bestecisi (Multi-Select Composer)
│  ○ 🌟 31 Endüstriyel Şablon Kataloğu (Full Stacks)
│  ○ 🛡️ VDS Doktoru & Port Çakışma Radarı (Pre-flight Audit)
│  ○ 💾 Felaket Kurtarma Motoru (backup.sh & restore.sh)
│  ○ 🌐 Blueprint Senkronizasyonu (xivizley.com.tr)
└
```

### 1. 👑 XIVIZLEY Cloud Suite Kurulumu
- Alan adı veya yerel IP adresi tanımlama (`suite.ornek.com` veya `192.168.1.100`)
- Otomatik güvenli parola ve JWT RS256 anahtar üretimi
- Caddy otomatik TLS/SSL ters vekil yapılandırması
- PostgreSQL veritabanı konteyneri ve kalıcı volüm bağlamaları

### 2. 📦 Tekil Uygulama Mağazası (Standalone App Store)
- 10 kategoride 115 uygulama arasında arama (Fuzzy search)
- Port çakışmalarını önceden tespit edip alternatif port atama
- Gerekli ortam değişkenlerini (`.env`) interaktif sorma

### 3. ☑️ Çoklu Uygulama Bestecisi (Multi-Select Composer)
- Listeden birden fazla uygulama seçme (örneğin: `Nginx Proxy Manager` + `Nextcloud` + `Vaultwarden` + `Portainer`)
- Seçilen uygulamaların portlarını analiz etme; çakışan portları otomatik olarak sonraki boş porta taşıma
- Tek bir birleşik `docker-compose.yml` ve `.env` üretme

---

## ⌨️ Komut Satırı Alt Komutları (CLI Reference)

TUI moduna girmeden doğrudan script veya CI/CD boru hatlarında çalıştırmak için alt komutlar:

### `xivizley suite`
Amiral gemisi XIVIZLEY Cloud Suite dağıtımını başlatır.

```bash
# Etkileşimli Suite sihirbazı
npx xivizley suite

# Parametrelerle doğrudan dağıtım
npx xivizley suite --domain suite.homelab.local --email admin@homelab.local --dir /opt/xivizley-suite
```

### `xivizley install <app-id>`
Katalogdaki 115 uygulamadan herhangi birini tek komutla kurar.

```bash
# Jellyfin medya sunucusu
npx xivizley install jellyfin

# Vaultwarden şifre yöneticisi (özel port ile)
npx xivizley install vaultwarden --port 8085

# PostgreSQL 16 veritabanı
npx xivizley install postgres --dir ./db-data
```

### `xivizley apps`
115 uygulamalık kataloğu kategorilerine göre listeler veya terminal üzerinden filtreleme sağlar.

```bash
npx xivizley apps
npx xivizley apps --category media
npx xivizley apps --category ai
```

### `xivizley templates`
DIN 40719 standartlarındaki 31 hazır yığını inceler ve dağıtır.

```bash
# Şablon listesi
npx xivizley templates

# Belirli bir şablonu çıkarma (Örn: supabase-selfhost veya local-ai-ollama)
npx xivizley templates --id supabase-selfhost --out ./supabase-stack
```

### `xivizley doctor`
Sunucu soketlerini pre-flight denetiminden geçirir:

- Açık ve kullanımda olan TCP/UDP portlarını tarar.
- `80`, `443`, `3000`, `5432`, `8080`, `9000` gibi kritik portların çakışmalarını raporlar.
- Docker Engine sürümü, depolama alanı ve RAM kullanımını test eder.

```bash
npx xivizley doctor
```

Çıktı Örneği:
```text
[DOKTOR] Soket Taraması Başlatılıyor...
  ✓ Port 80: BOŞ (Caddy HTTP hazır)
  ✓ Port 443: BOŞ (Caddy HTTPS hazır)
  ! Port 5432: DOLU (Mevcut postgres süreci tespit edildi -> 5433'e yönlendirildi)
  ✓ Docker Daemon: v26.1.3 (Aktif)
  ✓ RAM: 16.00 GB (11.2 GB Boş)
  ✓ Disk: 180 GB Boş (/dev/nvme0n1p2)
[DOKTOR] Sistem Dağıtıma Hazır (Skor: 98/100)
```

### `xivizley backup`
Otomatik sıcak veritabanı ve Docker volüm yedekleme betiklerini oluşturur:

```bash
npx xivizley backup --retention 7 --cron "0 3 * * *"
```

Üretilen Dosyalar:
- `backup.sh`: Veritabanı dump'ı alır (`pg_dumpall`, `mariadb-dump`, `sqlite3`), volümleri `tar.gz` ile sıkıştırır, 7 günden eski yedekleri temizler.
- `restore.sh`: Belirtilen arşivi tek komutla konteynerlere geri yükler.

### `xivizley sync <blueprint-id>`
[xivizley.com.tr](https://xivizley.com.tr/architect) üzerinde çizdiğiniz tuval mimarisini ID veya URL ile çekip yerel sunucunuza `docker-compose.yml` olarak derler.

```bash
npx xivizley sync arc_982bf7a1
```

---

## 📂 Çıktı Dosya Yapısı

Dağıtım tamamlandığında çalışma dizininde aşağıdaki yapı oluşturulur:

```text
/opt/xivizley/ (veya çalışma dizini)
├── docker-compose.yml       # Standardize edilmiş Compose dosyası
├── .env                     # Rastgele üretilmiş parola ve anahtarlar
├── data/                    # Konteyner kalıcı veri dizinleri
├── backup.sh                # Otomatik yedekleme betiği
├── restore.sh               # Tek tıkla felaket kurtarma betiği
└── README.md                # Yerel erişim ve port tablosu
```

---

## ❓ Sıkça Sorulan Sorular (SSS)

**S: Port çakışması olursa ne olur?**  
C: `xivizley` motoru port çakışması algıladığında sizi uyarır ve host portunu otomatik olarak bir sonraki müsait porta (örneğin 8080 doluysa 8081'e) bağlar. Konteyner içi port sabit kalır.

**S: Mevcut bir sunucuda çalıştırırsam diğer konteynerlerim durur mu?**  
C: Hayır. `xivizley` yalnızca kendi oluşturduğu projenin ağını (`xivizley-net`) ve konteynerlerini yönetir. Var olan `fivem`, `jellyfin` veya `casaos` gibi harici konteynerlere asla müdahale etmez.

---

## 📜 Lisans & Yapımcı

- **Mimar & Geliştirici:** Alperen Celal (14, Bursa)
- **Web:** [xivizley.com.tr](https://xivizley.com.tr)
- **GitHub:** [github.com/Xivizley/xivizley-cli](https://github.com/Xivizley/xivizley-cli)
- **Lisans:** MIT
