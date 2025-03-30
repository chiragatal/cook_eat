const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function mapUserIds() {
  try {
    // Create a mapping between old integer IDs and new UUID string IDs
    const userMapping = {};

    // Get all users from the database
    const users = await prisma.user.findMany();
    console.log('Current users in database:', users.length);

    // Load the backup data
    const backupPath = path.join(__dirname, '../backups/db-backup-2025-03-30T18-18-03-085Z.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupUsers = backupData.User || [];
    console.log('Users in backup:', backupUsers.length);

    // Match users by email since that's a unique identifier
    for (const backupUser of backupUsers) {
      const dbUser = users.find(u => u.email === backupUser.email);
      if (dbUser) {
        userMapping[backupUser.id] = dbUser.id;
        console.log(`Mapped old ID ${backupUser.id} to UUID ${dbUser.id} for ${backupUser.email}`);
      }
    }

    // Save the mapping to a file
    const mappingPath = path.join(__dirname, '../backups/user-id-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(userMapping, null, 2));
    console.log(`Mapping saved to ${mappingPath}`);

    return userMapping;
  } catch (error) {
    console.error('Error mapping user IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

mapUserIds().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
