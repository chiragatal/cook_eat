#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function clearAndRestoreDatabase() {
  try {
    // Get the backup file path from command line or use default
    const backupFilePath = process.argv[2] || path.join(__dirname, '..', 'backups', 'db-backup-2025-03-30T18-18-03-085Z.json');

    if (!fs.existsSync(backupFilePath)) {
      log(`Backup file not found: ${backupFilePath}`, 'red');
      process.exit(1);
    }

    log(`=== DATABASE CLEANUP AND RESTORATION PROCESS ===`, 'magenta');
    log(`This script will clear your database and restore it from scratch.`, 'yellow');
    log(`Using backup file: ${backupFilePath}`, 'blue');

    // Step 1: Clear all data from the database
    log(`\nStep 1: Clearing all data from the database...`, 'cyan');

    // Drop all records but keep the schema
    log(`Deleting all reactions...`, 'blue');
    await prisma.reaction.deleteMany({});

    log(`Deleting all comments...`, 'blue');
    await prisma.comment.deleteMany({});

    log(`Deleting all notifications...`, 'blue');
    await prisma.notification.deleteMany({});

    log(`Deleting all notification preferences...`, 'blue');
    await prisma.notificationPreference.deleteMany({});

    log(`Deleting all posts...`, 'blue');
    await prisma.post.deleteMany({});

    log(`Deleting all users (except for currently existing ones)...`, 'blue');
    // We'll keep the users since their IDs are already mapped

    log(`✓ Database cleared successfully`, 'green');

    // Step 2: Run the mapping script to ensure we have mappings
    log(`\nStep 2: Running user ID mapping script...`, 'cyan');
    try {
      execSync(`node ${path.join(__dirname, 'map-user-ids.js')} ${backupFilePath}`, { stdio: 'inherit' });
      log(`✓ User ID mapping completed`, 'green');
    } catch (error) {
      log(`Error running user ID mapping: ${error.message}`, 'red');
      process.exit(1);
    }

    // Step 3: Restore the database
    log(`\nStep 3: Restoring database from backup...`, 'cyan');
    try {
      execSync(`node ${path.join(__dirname, 'restore-database.js')} ${backupFilePath}`, { stdio: 'inherit' });
      log(`✓ Database restoration completed`, 'green');
    } catch (error) {
      log(`Error restoring database: ${error.message}`, 'red');
      process.exit(1);
    }

    log(`\n=== DATABASE CLEANUP AND RESTORATION COMPLETE ===`, 'magenta');
    log(`Your database has been successfully cleared and restored.`, 'green');
    log(`Next steps:`, 'cyan');
    log(`1. Start your application: npm run dev`, 'blue');
    log(`2. Check your data in Prisma Studio: npx prisma studio`, 'blue');

  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndRestoreDatabase();
