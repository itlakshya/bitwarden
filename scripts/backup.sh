#!/bin/bash

# Lakshya Copycat Backup Script
# Usage: ./scripts/backup.sh [backup_type]
# backup_type: daily, weekly, monthly (default: daily)

set -e

# Configuration
BACKUP_DIR="/backups"
APP_NAME="lakshya-copycat"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE=${1:-daily}

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Database backup
echo "Starting database backup..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U lakshya_user lakshya_production > "$BACKUP_DIR/db_${BACKUP_TYPE}_${DATE}.sql"

# Application files backup (if weekly or monthly)
if [[ "$BACKUP_TYPE" == "weekly" ]] || [[ "$BACKUP_TYPE" == "monthly" ]]; then
    echo "Creating application backup..."
    tar -czf "$BACKUP_DIR/app_${BACKUP_TYPE}_${DATE}.tar.gz" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude=backups \
        .
fi

# Environment configuration backup (encrypted)
if [[ "$BACKUP_TYPE" == "weekly" ]] || [[ "$BACKUP_TYPE" == "monthly" ]]; then
    echo "Backing up configuration..."
    if [ -f .env.production ]; then
        gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/config_${BACKUP_TYPE}_${DATE}.env.gpg" .env.production
    fi
fi

# Cleanup old backups
echo "Cleaning up old backups..."

# Keep last 7 daily backups
find $BACKUP_DIR -name "db_daily_*.sql" -mtime +7 -delete

# Keep last 4 weekly backups
find $BACKUP_DIR -name "db_weekly_*.sql" -mtime +28 -delete
find $BACKUP_DIR -name "app_weekly_*.tar.gz" -mtime +28 -delete
find $BACKUP_DIR -name "config_weekly_*.env.gpg" -mtime +28 -delete

# Keep last 12 monthly backups
find $BACKUP_DIR -name "db_monthly_*.sql" -mtime +365 -delete
find $BACKUP_DIR -name "app_monthly_*.tar.gz" -mtime +365 -delete
find $BACKUP_DIR -name "config_monthly_*.env.gpg" -mtime +365 -delete

echo "Backup completed successfully!"
echo "Database backup: $BACKUP_DIR/db_${BACKUP_TYPE}_${DATE}.sql"

# Optional: Upload to cloud storage
# Uncomment and configure for your cloud provider
# aws s3 cp "$BACKUP_DIR/db_${BACKUP_TYPE}_${DATE}.sql" s3://your-backup-bucket/
# gsutil cp "$BACKUP_DIR/db_${BACKUP_TYPE}_${DATE}.sql" gs://your-backup-bucket/