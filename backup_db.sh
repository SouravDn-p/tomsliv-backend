#!/bin/bash

# Load environment variables from .env
export $(grep -v '^#' .env | xargs)

# Timestamp for the backup file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="/tmp/${PACKAGE_NAME}_db_${TIMESTAMP}.sql"

# Docker container name
DB_CONTAINER="${PACKAGE_NAME}_db"

# Dump PostgreSQL database from Docker container
sudo docker exec -i $DB_CONTAINER pg_dump -U postgres $DB_CONTAINER > $BACKUP_FILE

# Upload backup to S3
aws s3 cp $BACKUP_FILE s3://$AWS_S3_BUCKET_NAME/backups/ --region $AWS_REGION

# Remove local backup file
rm $BACKUP_FILE

# Remove S3 backups older than 30 days
aws s3 ls s3://$AWS_S3_BUCKET_NAME/backups/ --region $AWS_REGION | awk '{print $4}' | while read -r file; do
    FILE_DATE=$(echo $file | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    if [ -n "$FILE_DATE" ]; then
        FILE_TIMESTAMP=$(date -d $FILE_DATE +%s)
        CURRENT_TIMESTAMP=$(date +%s)
        DIFF=$(( (CURRENT_TIMESTAMP - FILE_TIMESTAMP) / 86400 ))
        if [ $DIFF -gt 30 ]; then
            aws s3 rm s3://$AWS_S3_BUCKET_NAME/backups/$file --region $AWS_REGION
        fi
    fi
done
