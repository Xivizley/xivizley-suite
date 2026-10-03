#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# XIVIZLEY Suite — Containerized PostgreSQL Daily Backup Script
# Executes pg_dumpall strictly inside xivizley-postgres container
# ============================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/xivizley}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# 1. Hedef yedekleme dizinini hazırla
mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] [BACKUP] Konteyner içi PostgreSQL yedeği alınıyor: ${BACKUP_FILE}..."

# 2. Dump işlemini host binary'sine bağımlı olmadan doğrudan konteyner üzerinden boru hattıyla al
docker exec -t xivizley-postgres pg_dumpall -U postgres | gzip > "${BACKUP_FILE}"

# 3. Dosya boyutunu doğrula
if [ -s "${BACKUP_FILE}" ]; then
  FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
  echo "[$(date -Iseconds)] [SUCCESS] Yedekleme tamamlandı (${FILE_SIZE})."
else
  echo "[$(date -Iseconds)] [ERROR] Yedek dosyası boş üretildi veya hata oluştu!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# 4. 7 günden eski arşivleri otomatik temizle (Retention Policy)
find "${BACKUP_DIR}" -name "db_*.sql.gz" -mtime +7 -delete
echo "[$(date -Iseconds)] [CLEANUP] 7 günden eski arşivler temizlendi."
