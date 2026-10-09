#!/usr/bin/env bash
# ==============================================================================
# XIVIZLEY Suite — Otomatik Felaket Kurtarma & Gece Yedekleme Scripti
# PostgreSQL Veritabanı + NVMe ZFS Drive Dosyaları + Telegram Bildirimi
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/root/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="/var/log/xivizley-backup.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 XIVIZLEY Otomatik Gece Yedekleme başlatıldı..."

# ─── 1. PostgreSQL Tam Veritabanı Yedeği (Tüm Şemalar: drive, pass, sso, shield, pulse) ───
DB_BACKUP_FILE="$BACKUP_DIR/xivizley_db_${DATE}.sql.gz"
log "📦 PostgreSQL veritabanı dump alınıyor..."

if docker ps -q -f name=xivizley-postgres | grep -q .; then
  docker exec -t xivizley-postgres pg_dumpall -U xivizley | gzip -9 > "$DB_BACKUP_FILE"
  DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
  log "✅ Veritabanı yedeği alındı: $DB_BACKUP_FILE ($DB_SIZE)"
else
  log "⚠️ UYARI: xivizley-postgres konteyneri çalışmıyor! DB yedeği atlandı."
  DB_SIZE="0 B"
fi

# ─── 2. Drive NVMe Depolama Alanı Arşivleme ────────────────────────────────
DRIVE_BACKUP_FILE="$BACKUP_DIR/xivizley_drive_${DATE}.tar.gz"
log "📂 Drive NVMe depolama alanı arşivleniyor..."

DRIVE_DIR=""
if [ -d "/var/lib/docker/volumes/deploy_drive_data/_data" ]; then
  DRIVE_DIR="/var/lib/docker/volumes/deploy_drive_data/_data"
elif [ -d "/root/xivizley-data/drive" ]; then
  DRIVE_DIR="/root/xivizley-data/drive"
elif [ -d "/root/xivizley-suite/apps/drive/.storage" ]; then
  DRIVE_DIR="/root/xivizley-suite/apps/drive/.storage"
fi

if [ -n "$DRIVE_DIR" ] && [ -d "$DRIVE_DIR" ]; then
  tar -czf "$DRIVE_BACKUP_FILE" -C "$DRIVE_DIR" . 2>/dev/null || true
  DRIVE_SIZE=$(du -h "$DRIVE_BACKUP_FILE" | cut -f1)
  log "✅ Drive deposu arşivlendi: $DRIVE_BACKUP_FILE ($DRIVE_SIZE)"
else
  log "ℹ️ Drive özel klasörü bulunamadı veya boş, atlandı."
  DRIVE_SIZE="0 B"
fi

# ─── 3. Minecraft Dünyası & Yapılandırma Arşivleme ─────────────────────────
MC_BACKUP_FILE="$BACKUP_DIR/xivizley_minecraft_${DATE}.tar.gz"
log "⛏️ Minecraft dünyası arşivleniyor..."
MC_DIR="/var/lib/docker/volumes/xivizley-minecraft-data/_data"

if [ -d "$MC_DIR" ]; then
  tar -czf "$MC_BACKUP_FILE" -C "$MC_DIR" world world_nether world_the_end server.properties 2>/dev/null || tar -czf "$MC_BACKUP_FILE" -C "$MC_DIR" . 2>/dev/null || true
  MC_SIZE=$(du -h "$MC_BACKUP_FILE" | cut -f1)
  log "✅ Minecraft dünyası arşivlendi: $MC_BACKUP_FILE ($MC_SIZE)"
else
  MC_SIZE="0 B"
fi

# ─── 4. 7 Günden Eski Yedekleri Otomatik Temizleme (Rotasyon) ───────────────
log "🧹 7 günden eski arşivler taranıyor ve temizleniyor..."
find "$BACKUP_DIR" -type f \( -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +7 -delete || true

# ─── 5. Disk Durumu ────────────────────────────────────────────────────────
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
log "💾 Kalan Sunucu Disk Alanı: $DISK_AVAIL"

# ─── 6. Telegram & Discord Bildirimi Gönder ────────────────────────────────
if [ -n "$TELEGRAM_CHAT_ID" ] && [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  MESSAGE="✅ *[XIVIZLEY BACKUP]* Günlük Yedekleme Tamamlandı!
📅 Tarih: \`${DATE}\`
🗄️ Veritabanı: \`${DB_SIZE}\`
📁 Drive: \`${DRIVE_SIZE}\`
⛏️ Minecraft: \`${MC_SIZE}\`
💾 Boş Disk: \`${DISK_AVAIL}\`
Sunucu: \`185.233.164.122\`"

  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${MESSAGE}" \
    -d "parse_mode=Markdown" >/dev/null 2>&1 || true
fi

if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
  curl -s -H "Content-Type: application/json" -X POST "$DISCORD_WEBHOOK_URL" \
    -d "{\"content\": \"✅ **[XIVIZLEY BACKUP]** Günlük Yedekleme Tamamlandı!\n📅 Tarih: \`${DATE}\`\n🗄️ Veritabanı: \`${DB_SIZE}\`\n📁 Drive: \`${DRIVE_SIZE}\`\n⛏️ Minecraft: \`${MC_SIZE}\`\n💾 Boş Disk: \`${DISK_AVAIL}\`\"}" >/dev/null 2>&1 || true
fi

log "🎉 XIVIZLEY Yedekleme İşlemi Başarıyla Sonuçlandı!"
