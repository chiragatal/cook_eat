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

    // Create an array of models to export
    const models = ['User', 'Post', 'Reaction', 'Comment'];

    // Object to store all data
    const allData = {};

    for (const model of models) {
      console.log(`Exporting ${model} data...`);

      try {
        // Get the data using Prisma's findMany
        const modelLowerCase = model.toLowerCase();
        const data = await prisma[modelLowerCase].findMany();

        allData[model] = data;
        console.log(`Exported ${data.length} ${model} records`);
      } catch (error) {
        console.error(`Error exporting ${model} data:`, error.message);
        allData[model] = [];
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
