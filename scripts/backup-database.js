const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { PrismaClient } = require('@prisma/client');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Create a backup directory if it doesn't exist
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

async function main() {
  try {
    console.log('Starting database backup process...');

    // Get current timestamp for the backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `db-backup-${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Use Prisma to export data
    console.log('Exporting all tables...');

    // Map of model names to their corresponding Prisma client methods
    const modelMap = {
      'User': 'user',
      'Post': 'post',
      'Reaction': 'reaction',
      'Comment': 'comment',
      'CommentReaction': 'commentReaction',
      'Notification': 'notification',
      'NotificationPreference': 'notificationPreference'
    };

    // Object to store all data
    const allData = {};

    for (const [modelName, prismaMethod] of Object.entries(modelMap)) {
      console.log(`Exporting ${modelName} data...`);

      try {
        // Check if the method exists in the Prisma client
        if (typeof prisma[prismaMethod]?.findMany === 'function') {
          const data = await prisma[prismaMethod].findMany();
          allData[modelName] = data;
          console.log(`Exported ${data.length} ${modelName} records`);
        } else {
          console.log(`Skipping ${modelName} - method not found in Prisma client`);
          allData[modelName] = [];
        }
      } catch (error) {
        console.error(`Error exporting ${modelName} data:`, error.message);
        allData[modelName] = [];
      }
    }

    // Write all data to a single JSON file
    fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2));

    console.log(`Backup completed successfully! File saved to: ${backupPath}`);
  } catch (error) {
    console.error('Error creating backup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
