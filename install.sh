#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# XIVIZLEY Suite — Self-Hosted Kurulum Sihirbazı (CasaOS / Coolify Tarzı)
# Kullanıcıların kendi sunucularında, kendi domain ve verileriyle kurulumu
# ============================================================================

echo "============================================================"
echo "  🚀 XIVIZLEY Suite — Self-Hosted Kurulum Sihirbazı"
echo "============================================================"

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/deploy" && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"

if [ -f "${ENV_FILE}" ]; then
  echo "ℹ️  Mevcut ${ENV_FILE} dosyası bulundu. Mevcut anahtarlar korunuyor."
else
  read -rp "🌐 Kullanmak istediğiniz Domain (örn: panel.domainim.com veya sadece IP için :80) [:80]: " USER_DOMAIN
  USER_DOMAIN="${USER_DOMAIN:-:80}"

  read -rp "📧 SSL Sertifikası (Let's Encrypt) için E-posta [admin@example.com]: " USER_EMAIL
  USER_EMAIL="${USER_EMAIL:-admin@example.com}"

  echo "🔐 Kriptografik anahtarlar (PostgreSQL, Vault AES-256 ve RS256 JWT) üretiliyor..."
  PG_PASS="$(openssl rand -hex 16)"
  COOKIE_SEC="$(openssl rand -hex 24)"
  VAULT_KEY="$(openssl rand -hex 32)"

  TMP_KEY="$(mktemp)"
  openssl genpkey -algorithm RSA -out "${TMP_KEY}" -pkeyopt rsa_keygen_bits:2048 2>/dev/null
  JWT_PRIV="$(awk '{printf "%s\\n", $0}' "${TMP_KEY}")"
  JWT_PUB="$(openssl rsa -pubout -in "${TMP_KEY}" 2>/dev/null | awk '{printf "%s\\n", $0}')"
  rm -f "${TMP_KEY}"

  cat > "${ENV_FILE}" <<EOF
DOMAIN=${USER_DOMAIN}
ACME_EMAIL=${USER_EMAIL}
COOKIE_DOMAIN=
POSTGRES_PASSWORD=${PG_PASS}
COOKIE_SECRET=${COOKIE_SEC}
VAULT_MASTER_KEY=${VAULT_KEY}
JWT_PRIVATE_KEY="${JWT_PRIV}"
JWT_PUBLIC_KEY="${JWT_PUB}"
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EOF

  echo "✅ ${ENV_FILE} başarıyla oluşturuldu!"
fi

echo "🐳 Docker konteynerleri derleniyor ve başlatılıyor..."
cd "${DEPLOY_DIR}"
docker compose up -d --build

echo ""
echo "============================================================"
echo "  🎉 Kurulum Tamamlandı!"
echo "  🌐 Erişim Adresi: https://$(grep '^DOMAIN=' "${ENV_FILE}" | cut -d= -f2)"
echo "  👤 İlk yönetici hesabınızı oluşturmak için /register sayfasını ziyaret edin."
echo "============================================================"
