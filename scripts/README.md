# Database Management Scripts

This directory contains scripts for managing the Cook-Eat database.

## Backup and Restore

### Creating a Backup

To create a backup of your database:

```
node scripts/backup-database.js
```

This will:
- Create a backup file in the `backups` directory
- Export all records from User, Post, Reaction, and Comment tables
- Save them in a JSON file with a timestamp in the filename

### Restoring from a Backup

To restore from a backup:

```
node scripts/restore-database.js [optional_path_to_backup_file]
```

If you don't specify a backup file, the script will use the most recent backup in the `backups` directory.

**Important Notes about Restoration:**
- This is a non-destructive operation
- It will insert/upsert records from the backup
- It will not delete existing data
- Records with the same ID will be skipped (not updated)

## User Management

### Creating a Test User

To create a test user:

```
node scripts/create-user.js
```

This creates a user with:
- Email: test@example.com
- Password: password123

### Creating a Sample Recipe

To create a sample recipe:

```
node scripts/create-sample-recipe.js
```

This creates a simple pasta recipe associated with the test user (requires the test user to exist first).

## Best Practices

1. **Always create a backup before making schema changes**
2. **For production environments:**
   - Use proper migrations instead of direct schema pushes
   - Test migrations on a staging environment first
   - Consider using a proper database backup tool for production

3. **When making schema changes:**
   - Use `prisma migrate dev` for development environments
   - Avoid using `prisma db push --accept-data-loss` on production databases

4. **For local development:**
   - Make frequent backups
   - Use the `.env.development` file to override production settings
