#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# XIVIZLEY Suite — Containerized PostgreSQL Disaster Recovery Script
# Restores compressed SQL archive strictly into xivizley-postgres
# ============================================================

if [ -z "${1:-}" ]; then
  echo "Kullanım: $0 <yedek_dosyasi.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "HATA: '${BACKUP_FILE}' dosyası bulunamadı!" >&2
  exit 1
fi

# Terminal ortamında onay al, non-interactive (CI/script) durumlarında force desteği
if [ -t 0 ] && [ "${FORCE:-false}" != "true" ]; then
  echo "UYARI: Bu işlem mevcut PostgreSQL veritabanını ${BACKUP_FILE} arşivinden geri yükleyecektir."
  read -r -p "Onaylıyor musunuz? (e/H): " confirm
  if [[ "${confirm}" != "e" && "${confirm}" != "E" ]]; then
    echo "İşlem iptal edildi."
    exit 0
  fi
fi

echo "[$(date -Iseconds)] [RESTORE] Veritabanı '${BACKUP_FILE}' arşivinden geri yükleniyor..."
PG_USER="${PG_USER:-xivizley}"
if ! gunzip -c "${BACKUP_FILE}" | docker exec -i xivizley-postgres psql -U "${PG_USER}" 2>/dev/null; then
  PG_USER="postgres"
  gunzip -c "${BACKUP_FILE}" | docker exec -i xivizley-postgres psql -U "${PG_USER}"
fi
echo "[$(date -Iseconds)] [SUCCESS] Veritabanı başarıyla geri yüklendi."
