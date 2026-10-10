#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# XIVIZLEY Suite v1.0 — Endüstriyel Açık Kaynak Kurulum Motoru
# Mimar: Alperen Celal (14, Bursa)
# https://xivizley.com.tr | https://github.com/Xivizley/xivizley-suite
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
cat << "EOF"
  ██╗  ██╗██╗██╗   ██╗██╗███████╗██╗     ███████╗██╗   ██╗
  ╚██╗██╔╝██║██║   ██║██║╚══███╔╝██║     ██╔════╝╚██╗ ██╔╝
   ╚███╔╝ ██║██║   ██║██║  ███╔╝ ██║     █████╗   ╚████╔╝ 
   ██╔██╗ ██║╚██╗ ██╔╝██║ ███╔╝  ██║     ██╔══╝    ╚██╔╝  
  ██╔╝ ██╗██║ ╚████╔╝ ██║███████╗███████╗███████╗   ██║   
  ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   
EOF
echo -e "  >> XIVIZLEY Suite v1.0.0 [Endüstriyel Bulut & 115 Uygulama]${NC}"
echo -e "  >> Mimar: Alperen Celal (14, Bursa)\n"

# 1. Root veya Sudo Kontrolü
if [ "$EUID" -ne 0 ] && ! command -v sudo &>/dev/null; then
  echo -e "${RED}[HATA] Bu betiğin çalışması için root veya sudo yetkisi gereklidir.${NC}"
  exit 1
fi

# 2. Docker & Docker Compose Bağımlılık Kontrolü
echo -e "${CYAN}[1/5] Sistem gereksinimleri ve Docker motoru denetleniyor...${NC}"
if ! command -v docker &>/dev/null; then
  echo -e "${RED}[!] Docker bulunamadı. Lütfen önce Docker Engine kurun:${NC}"
  echo "    curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker compose version &>/dev/null && ! command -v docker-compose &>/dev/null; then
  echo -e "${RED}[!] Docker Compose bulunamadı. Lütfen Docker Compose eklentisini kurun.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Docker ve Compose motoru hazır.${NC}"

# 3. Dizin ve Konfigürasyon Yapılandırması
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR}/deploy"

if [ ! -d "${DEPLOY_DIR}" ]; then
  DEPLOY_DIR="${SCRIPT_DIR}"
fi

ENV_FILE="${DEPLOY_DIR}/.env"

echo -e "\n${CYAN}[2/5] Çevre değişkenleri ve kriptografik anahtarlar yapılandırılıyor...${NC}"
if [ -f "${ENV_FILE}" ]; then
  echo -e "${BLUE}  ℹ Mevcut ${ENV_FILE} bulundu. Mevcut anahtarlar korunuyor.${NC}"
else
  # TTY kontrolü (curl | bash boru hattında stdin /dev/tty'ye yönlendirilir)
  if [ -t 0 ]; then
    read -rp "🌐 Alan Adınız (Domain) [örn: panel.alanadiniz.com veya yerel IP için :80] [:80]: " USER_DOMAIN
    read -rp "📧 SSL Bildirim E-postası (Let's Encrypt) [admin@example.com]: " USER_EMAIL
  elif [ -r /dev/tty ]; then
    read -rp "🌐 Alan Adınız (Domain) [örn: panel.alanadiniz.com veya yerel IP için :80] [:80]: " USER_DOMAIN </dev/tty
    read -rp "📧 SSL Bildirim E-postası (Let's Encrypt) [admin@example.com]: " USER_EMAIL </dev/tty
  else
    USER_DOMAIN="${DOMAIN:-:80}"
    USER_EMAIL="${EMAIL:-admin@example.com}"
  fi

  USER_DOMAIN="${USER_DOMAIN:-:80}"
  USER_EMAIL="${USER_EMAIL:-admin@example.com}"

  echo -e "${BLUE}  🔐 RS256 JWT, PostgreSQL ve AES-256 Kasa anahtarları üretiliyor...${NC}"
  PG_PASS="$(openssl rand -hex 16)"
  COOKIE_SEC="$(openssl rand -hex 24)"
  VAULT_KEY="$(openssl rand -hex 32)"

  TMP_KEY="$(mktemp)"
  openssl genpkey -algorithm RSA -out "${TMP_KEY}" -pkeyopt rsa_keygen_bits:2048 2>/dev/null
  JWT_PRIV="$(awk '{printf "%s\\n", $0}' "${TMP_KEY}")"
  JWT_PUB="$(openssl rsa -pubout -in "${TMP_KEY}" 2>/dev/null | awk '{printf "%s\\n", $0}')"
  rm -f "${TMP_KEY}"

  cat > "${ENV_FILE}" <<EOF
# XIVIZLEY Suite v1.0 Configuration
DOMAIN=${USER_DOMAIN}
ACME_EMAIL=${USER_EMAIL}
COOKIE_DOMAIN=
POSTGRES_USER=xivizley
POSTGRES_DB=xivizley
POSTGRES_PASSWORD=${PG_PASS}
COOKIE_SECRET=${COOKIE_SEC}
VAULT_MASTER_KEY=${VAULT_KEY}
JWT_PRIVATE_KEY="${JWT_PRIV}"
JWT_PUBLIC_KEY="${JWT_PUB}"
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EOF
  echo -e "${GREEN}  ✓ ${ENV_FILE} başarıyla oluşturuldu.${NC}"
fi

# 4. Otomatik Yedekleme Betiği Yetkilendirme
echo -e "\n${CYAN}[3/5] Felaket kurtarma ve bakım betikleri hazırlanıyor...${NC}"
if [ -f "${SCRIPT_DIR}/scripts/backup-daily.sh" ]; then
  chmod +x "${SCRIPT_DIR}/scripts/backup-daily.sh"
  chmod +x "${SCRIPT_DIR}/scripts/restore.sh" 2>/dev/null || true
  mkdir -p /var/backups/xivizley 2>/dev/null || true
  echo -e "${GREEN}  ✓ Yedekleme boru hattı hazır (/var/backups/xivizley).${NC}"
fi

# 5. Konteynerleri Başlatma
echo -e "\n${CYAN}[4/5] Konteynerler ayağa kaldırılıyor (Nextcloud Hub, Caddy TLS, PostgreSQL)...${NC}"
cd "${DEPLOY_DIR}"
docker compose up -d --build

# 6. Sonuç ve CLI Köprüsü
DOMAIN_VAL="$(grep '^DOMAIN=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
if [[ "${DOMAIN_VAL}" == :* ]]; then
  ACCESS_URL="http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')${DOMAIN_VAL}"
else
  ACCESS_URL="https://${DOMAIN_VAL}"
fi

echo -e "\n${CYAN}[5/5] Kurulum Tamamlandı!${NC}"
echo -e "============================================================"
echo -e "  🎉 ${GREEN}XIVIZLEY Suite Başarıyla Kuruldu ve Çalışıyor!${NC}"
echo -e "  🌐 Panel Erişim Adresi: ${CYAN}${ACCESS_URL}${NC}"
echo -e "  🛡️ 115 Uygulama Mağazası: ${CYAN}${ACCESS_URL}/store${NC}"
echo -e "  👤 Yönetici Kaydı: ${CYAN}${ACCESS_URL}/login${NC}"
echo -e "============================================================"
echo -e "  💡 ${BLUE}İpucu: Terminalden yönetmek ve 115 uygulamayı kurmak için:${NC}"
echo -e "     ${PURPLE}npx xivizley${NC} (İnteraktif CLI Sihirbazı)"
echo -e "     ${PURPLE}npx xivizley doctor${NC} (Port ve Sistem Sağlık Radarı)"
echo -e "============================================================\n"
