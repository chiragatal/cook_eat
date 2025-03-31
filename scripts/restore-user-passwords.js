// Restore user passwords from a specific backup
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Specific backup to use for passwords
const TARGET_BACKUP = 'db-backup-2025-03-30T18-18-03-085Z.json';

async function restoreUserPasswords() {
  try {
    console.log('Starting user password restoration...');

    // Check if the specific backup file exists
    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, TARGET_BACKUP);

    if (!fs.existsSync(backupPath)) {
      console.error(`Specified backup file not found: ${TARGET_BACKUP}`);
      return;
    }

    console.log(`Using backup file: ${TARGET_BACKUP}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);

    if (!backupData.User || !Array.isArray(backupData.User)) {
      console.error('No User data found in backup!');
      return;
    }

    // Process users and update the passwords
    const backupUsers = backupData.User;
    console.log(`Found ${backupUsers.length} users in backup`);

    // Get all current users from the database
    const currentUsers = await prisma.user.findMany();
    console.log(`Found ${currentUsers.length} users in database`);

    let updatedCount = 0;

    // For each user in the database, find its matching backup by email
    for (const currentUser of currentUsers) {
      // Match by email since IDs may have changed
      const matchingBackupUser = backupUsers.find(backupUser =>
        backupUser.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      );

      if (matchingBackupUser) {
        // Check if password hash is different
        if (currentUser.passwordHash !== matchingBackupUser.passwordHash) {
          console.log(`Updating password for user: ${currentUser.name} (${currentUser.email})`);

          await prisma.user.update({
            where: { id: currentUser.id },
            data: { passwordHash: matchingBackupUser.passwordHash }
          });

          updatedCount++;
        } else {
          console.log(`Password already correct for user: ${currentUser.email}`);
        }
      } else {
        console.log(`Warning: No matching backup found for user: ${currentUser.email}`);
      }
    }

    console.log(`Restoration complete! Updated passwords for ${updatedCount} users.`);
  } catch (error) {
    console.error('Error during password restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
restoreUserPasswords()
  .then(() => console.log('Script completed.'))
  .catch(error => console.error('Script failed:', error));
