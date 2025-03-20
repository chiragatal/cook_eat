const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get the backup file path from command line args or use the most recent backup
let backupFilePath = process.argv[2];

if (!backupFilePath) {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    console.error('Backup directory does not exist!');
    process.exit(1);
  }

  // Get all backup files and sort by modification time (descending)
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('db-backup-') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      mtime: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (backupFiles.length === 0) {
    console.error('No backup files found!');
    process.exit(1);
  }

  // Use the most recent backup
  backupFilePath = backupFiles[0].path;
  console.log(`Using most recent backup: ${backupFiles[0].name}`);
}

async function main() {
  try {
    console.log('Starting database restoration process...');
    console.log(`Restoring from: ${backupFilePath}`);

    // Read the backup file
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    // Ask for confirmation
    console.log('This will insert backup data into your database.');
    console.log('!!! IMPORTANT: This is NOT a destructive operation !!!');
    console.log('It will only INSERT data from the backup, not delete existing data.');
    console.log('');
    console.log('Backup contains:');

    // Show a summary of what will be restored
    for (const model of Object.keys(backupData)) {
      console.log(`- ${backupData[model].length} ${model} records`);
    }

    console.log('\nPress CTRL+C to cancel or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Restore data for each model
    for (const [model, records] of Object.entries(backupData)) {
      const modelLowerCase = model.toLowerCase();

      if (!prisma[modelLowerCase]) {
        console.warn(`Model ${model} does not exist in the current schema, skipping.`);
        continue;
      }

      console.log(`Restoring ${records.length} ${model} records...`);

      // Process in smaller batches to avoid overloading the database
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        for (const record of batch) {
          try {
            // Try to create the record, but ignore duplicate key errors
            await prisma[modelLowerCase].upsert({
              where: { id: record.id },
              update: {}, // Don't update if it exists
              create: record
            });
          } catch (error) {
            console.warn(`Error inserting ${model} with ID ${record.id}: ${error.message}`);
          }
        }

        console.log(`Processed ${Math.min(i + batchSize, records.length)} of ${records.length} ${model} records`);
      }
    }

    console.log('Restoration completed!');
  } catch (error) {
    console.error('Error restoring database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
