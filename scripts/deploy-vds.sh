#!/usr/bin/env bash
set -e

REPO_DIR="/opt/xivizley-suite"
DEPLOY_DIR="${REPO_DIR}/deploy"

cd "$DEPLOY_DIR"

echo "=== [XIVIZLEY SUITE VDS DEPLOY] ==="

# 1. Mevcut çalışan imaj ID'sini rollback için etiketle
PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' xivizley-hub 2>/dev/null || echo "")
if [ -n "$PREV_IMAGE_ID" ]; then
  docker tag "$PREV_IMAGE_ID" xivizley-hub-prev:rollback || true
  echo "✓ Mevcut imaj yedeklendi: xivizley-hub-prev:rollback ($PREV_IMAGE_ID)"
fi

# 2. Hazır GHCR imajını çek ve ayağa kaldır (fallback destekli)
echo "→ GHCR pre-built imajı çekiliyor: ghcr.io/xivizley/xivizley-suite-hub:latest..."
if docker compose pull hub; then
  echo "✓ GHCR imajı başarıyla indirildi. Servis başlatılıyor..."
  docker compose up -d --wait hub
else
  echo "⚠️ GHCR pull başarısız oldu, yerel build fallback devreye giriyor..."
  docker compose up -d --build --wait hub
fi

# 3. Uçtan Uca Sağlık Doğrulaması (Caddy TLS arkasından)
echo "→ Sağlık kontrolü yapılıyor (https://suite.xivizley.com.tr/api/health)..."
HEALTHY=0
for i in $(seq 1 15); do
  if curl -sf https://suite.xivizley.com.tr/api/health >/dev/null 2>&1; then
    HEALTHY=1
    echo "🟢 Canlı servis uçtan uca sağlıklı (deneme $i)!"
    break
  fi
  sleep 2
done

# 4. Sağlık testi başarısızsa Rollback
if [ "$HEALTHY" -ne 1 ]; then
  echo "🚨 SAĞLIK KONTROLÜ BAŞARISIZ! Acil Rollback yapılıyor..."
  if docker image inspect xivizley-hub-prev:rollback >/dev/null 2>&1; then
    echo "Önceki yedeklenen imaja dönülüyor: xivizley-hub-prev:rollback"
    HUB_IMAGE=xivizley-hub-prev:rollback docker compose up -d --force-recreate hub
    echo "⚠️ Rollback başarılı. Canlı servis korundu."
  fi
  exit 1
fi

# 5. Başarılı olduysa dangling katmanları temizle
docker image prune -f >/dev/null 2>&1 || true
echo "✓ Deploy OK: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
