#!/bin/bash
set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

DB_CONTAINER="${PACKAGE_NAME}_db"
DB_NAME="$DB_CONTAINER"
DB_USER="postgres"

# Input: S3 backup file to restore
if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file-name.sql>"
    echo "Example: $0 tomsliv_backend_db_2026-01-19_02-00-00.sql"
    exit 1
fi

BACKUP_FILE_NAME="$1"
LOCAL_BACKUP="/tmp/$BACKUP_FILE_NAME"

# Download backup from S3
echo "Downloading backup from S3: $BACKUP_FILE_NAME"
aws s3 cp s3://$AWS_S3_BUCKET_NAME/backups/$BACKUP_FILE_NAME $LOCAL_BACKUP --region $AWS_REGION

# Drop the database if it exists
echo "Dropping existing database: $DB_NAME"
sudo docker exec -i $DB_CONTAINER psql -U $DB_USER -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

# Create a fresh database
echo "Creating database: $DB_NAME"
sudo docker exec -i $DB_CONTAINER psql -U $DB_USER -c "CREATE DATABASE \"$DB_NAME\";"

# Restore PostgreSQL database inside Docker
echo "Restoring database into container: $DB_CONTAINER"
sudo docker exec -i $DB_CONTAINER psql -U $DB_USER -d "$DB_NAME" < $LOCAL_BACKUP

# Clean up local backup file
rm $LOCAL_BACKUP

echo "Database restore completed successfully!"
