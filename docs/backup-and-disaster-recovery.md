# XIVIZLEY Suite — Backup & Disaster Recovery Runbook

This document details the automated backup pipeline, data integrity verification, and step-by-step disaster recovery workflow for XIVIZLEY Suite.

---

## 1. Architecture & Design Principles

1. **Host Binary Independence:**
   The host machine does not require native PostgreSQL (`pg_dump`, `psql`) client tools. Database dumps and restores are executed directly inside the active `xivizley-postgres` container via standard I/O pipes.

2. **Zero-Downtime Non-Blocking Operation:**
   `pg_dumpall` is executed online without locking tables, allowing continuous reads and writes during backup execution.

3. **Compact Gzip Storage:**
   All dumps are streamed through gzip on the fly, reducing disk storage by ~85% compared to raw SQL text.

4. **Deterministic Retention Policy:**
   Backups older than 7 days are automatically purged to prevent disk exhaustion on resource-constrained VDS environments.

---

## 2. Directory Layout & Paths

```text
/var/backups/xivizley/
├── db_20261003_030000.sql.gz      # Day 1 Backup
├── db_20261004_030000.sql.gz      # Day 2 Backup
└── db_YYYYMMDD_HHMMSS.sql.gz      # Timestamped Archive
```

* Backup executable: `/opt/xivizley-suite/scripts/backup-daily.sh`
* Restore executable: `/opt/xivizley-suite/scripts/restore.sh`
* Crontab schedule: Every night at `03:00` server time.

---

## 3. Automation Setup (Crontab)

To enable automatic nightly backups on your Linux VDS:

```bash
# Install cron job for root user
(crontab -l 2>/dev/null | grep -v 'backup-daily.sh' ; echo "0 3 * * * /bin/bash /opt/xivizley-suite/scripts/backup-daily.sh >> /var/log/xivizley-backup.log 2>&1") | crontab -

# Verify installation
crontab -l
```

Expected output:
```text
0 3 * * * /bin/bash /opt/xivizley-suite/scripts/backup-daily.sh >> /var/log/xivizley-backup.log 2>&1
```

---

## 4. Manual Backup Execution

To trigger a backup on-demand (e.g. before major updates or migrations):

```bash
/bin/bash /opt/xivizley-suite/scripts/backup-daily.sh
```

Example successful log output:
```text
[2026-10-04T01:57:20+03:00] [BACKUP] Konteyner içi PostgreSQL yedeği alınıyor: /var/backups/xivizley/db_20261004_015720.sql.gz...
[2026-10-04T01:57:21+03:00] [SUCCESS] Yedekleme tamamlandı (16K).
[2026-10-04T01:57:21+03:00] [CLEANUP] 7 günden eski arşivler temizlendi.
```

---

## 5. Step-by-Step Disaster Recovery Procedure

In case of server hardware failure, database corruption, or accidental deletion:

### Step 1: Identify Target Backup
List all available archives ordered by timestamp:
```bash
ls -lht /var/backups/xivizley/db_*.sql.gz
```

### Step 2: Execute Recovery
Run `restore.sh` with the path to the selected backup archive:

```bash
/bin/bash /opt/xivizley-suite/scripts/restore.sh /var/backups/xivizley/db_20261004_015720.sql.gz
```

The script will ask for interactive confirmation:
```text
UYARI: Bu işlem mevcut PostgreSQL veritabanını /var/backups/xivizley/db_20261004_015720.sql.gz arşivinden geri yükleyecektir.
Onaylıyor musunuz? (e/H): e
[2026-10-04T01:58:00+03:00] [RESTORE] Veritabanı '/var/backups/xivizley/db_20261004_015720.sql.gz' arşivinden geri yükleniyor...
[2026-10-04T01:58:05+03:00] [SUCCESS] Veritabanı başarıyla geri yüklendi.
```

*(For headless/scripted environments, set `FORCE=true`: `FORCE=true /bin/bash /opt/xivizley-suite/scripts/restore.sh <file>`)*

### Step 3: Verify Restoration Integrity
Check table row counts and service response:
```bash
docker exec -i xivizley-postgres psql -U xivizley -d xivizley_suite -c "SELECT count(*) FROM sso.users;"
curl -s -o /dev/null -w "%{http_code}\n" https://suite.xivizley.com.tr/store
```
A return code of `200` confirms successful service restoration.
