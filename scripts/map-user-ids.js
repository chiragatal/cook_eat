const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUserIdMapping() {
  try {
    // Get the backup file path from command line or use default
    const backupFilePath = process.argv[2] || path.join(__dirname, '..', 'backups', 'db-backup-2025-03-30T18-18-03-085Z.json');

    if (!fs.existsSync(backupFilePath)) {
      console.error(`Backup file not found: ${backupFilePath}`);
      process.exit(1);
    }

    console.log(`Loading backup data from ${backupFilePath}`);
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    // Get current users from the database
    console.log('Fetching current users from database...');
    const dbUsers = await prisma.user.findMany();
    console.log(`Found ${dbUsers.length} users in the database`);

    // Extract backup users
    const backupUsers = backupData.User || [];
    console.log(`Found ${backupUsers.length} users in the backup`);

    // Create mapping from old integer IDs to new UUID string IDs
    const userIdMapping = {};
    let matchCount = 0;

    for (const backupUser of backupUsers) {
      // Find matching user by email (most reliable way to match)
      const matchingUser = dbUsers.find(dbUser => dbUser.email === backupUser.email);

      if (matchingUser) {
        userIdMapping[backupUser.id] = matchingUser.id;
        matchCount++;
        console.log(`Mapped user: ${backupUser.email} - ID ${backupUser.id} → ${matchingUser.id}`);
      } else {
        console.log(`No match found for user: ${backupUser.email} (ID: ${backupUser.id})`);
      }
    }

    console.log(`\nSuccessfully mapped ${matchCount} out of ${backupUsers.length} users`);

    // Save mapping to file
    const mappingFilePath = path.join(__dirname, '..', 'backups', 'user-id-mapping.json');
    fs.writeFileSync(mappingFilePath, JSON.stringify(userIdMapping, null, 2));
    console.log(`User ID mapping saved to ${mappingFilePath}`);

    console.log('\nNext steps:');
    console.log(`1. Run the restore script: node scripts/restore-database.js ${backupFilePath}`);
    console.log('2. The restore script will automatically use the mapping file');

  } catch (error) {
    console.error('Error creating user ID mapping:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserIdMapping();
