# Database Migration: Integer IDs to UUIDs

This document outlines the migration process from integer-based IDs to UUID string-based IDs in the Cook & Eat application database.

## Migration Summary

The migration process converted all database tables from using auto-incrementing integer IDs to UUID strings. This included:

1. Updating the Prisma schema to use UUID strings for all models
2. Creating scripts to handle the migration of existing data
3. Mapping old integer IDs to new UUID strings
4. Restoring relationships between entities

## Migration Steps

### 1. Schema Update

The first step was to update the `schema.prisma` file to use UUID strings for all model IDs:

```prisma
model User {
  id String @id @default(uuid())
  // other fields...
}

model Post {
  id String @id @default(uuid())
  // other fields...
}

// Other models similarly updated
```

### 2. Custom Migration

We created custom migration scripts to:

- Create users with UUID IDs based on backup data
- Generate mappings between old integer IDs and new UUID strings
- Restore posts, comments, reactions, and other related data
- Maintain all relationships between entities

### 3. Data Restoration

The data restoration process followed these steps:

1. Created users first with new UUID IDs
2. Generated and stored mapping files between old and new IDs
3. Restored posts using the user ID mappings
4. Restored comments and reactions using both user and post ID mappings

## Script Files

The following scripts were created to facilitate the migration:

1. `scripts/map-user-ids.js` - Maps old integer user IDs to new UUID strings
2. `scripts/restore-database-uuid.js` - Comprehensive script for restoring all data with UUID IDs
3. `scripts/check-backup-users.js` - Utility script to examine user data in backup files
4. `scripts/check-db.js` - Utility script to verify database state after migration

## Backup Files

The migration used JSON backup files containing the original data with integer IDs. These files were processed to create new records with UUID IDs while maintaining all relationships.

## Post-Migration Verification

After completing the migration, we verified:

- All users were successfully migrated with preserved information
- All posts were associated with the correct users
- Comments and reactions maintained their relationships with posts and users
- Data integrity was maintained throughout the migration process

## Default Passwords

During the migration, default passwords were set for all users. These should be reset by the users upon their next login.

## Potential Issues

If any issues are discovered after migration, the following steps may help:

1. Check the mapping files in the `backups` directory
2. Verify that all relationships are maintained correctly
3. If necessary, run targeted scripts to fix specific relation issues

---

Last updated: March 30, 2025
