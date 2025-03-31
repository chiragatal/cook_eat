// Restore missing post fields from backup
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restorePostFields() {
  try {
    console.log('Starting post field restoration...');

    // Read the latest backup file
    const backupDir = path.join(__dirname, '../backups');
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('db-backup-') && file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // Sort in descending order to get newest first

    if (backupFiles.length === 0) {
      console.error('No backup files found!');
      return;
    }

    const latestBackupFile = backupFiles[0];
    console.log(`Using latest backup file: ${latestBackupFile}`);

    const backupContent = fs.readFileSync(path.join(backupDir, latestBackupFile), 'utf8');
    const backupData = JSON.parse(backupContent);

    if (!backupData.Post || !Array.isArray(backupData.Post)) {
      console.error('No Post data found in backup!');
      return;
    }

    // Process posts and update the missing fields
    const backupPosts = backupData.Post;
    console.log(`Found ${backupPosts.length} posts in backup`);

    // Get all current posts from the database
    const currentPosts = await prisma.post.findMany();
    console.log(`Found ${currentPosts.length} posts in database`);

    let updatedCount = 0;

    // For each post in the database, find its matching backup by title
    for (const currentPost of currentPosts) {
      // Match by title since IDs may have changed
      const matchingBackupPost = backupPosts.find(backupPost =>
        backupPost.title.trim() === currentPost.title.trim()
      );

      if (matchingBackupPost) {
        // Fields we want to restore: notes, cooking_time, cooked_on, is_public
        const updates = {};

        if (matchingBackupPost.notes !== null && currentPost.notes !== matchingBackupPost.notes) {
          updates.notes = matchingBackupPost.notes;
        }

        if (matchingBackupPost.cookingTime !== null && currentPost.cookingTime !== matchingBackupPost.cookingTime) {
          updates.cookingTime = matchingBackupPost.cookingTime;
        }

        if (matchingBackupPost.cookedOn !== null && (!currentPost.cookedOn || new Date(currentPost.cookedOn).toISOString() !== new Date(matchingBackupPost.cookedOn).toISOString())) {
          updates.cookedOn = new Date(matchingBackupPost.cookedOn);
        }

        if (typeof matchingBackupPost.isPublic === 'boolean' && currentPost.isPublic !== matchingBackupPost.isPublic) {
          updates.isPublic = matchingBackupPost.isPublic;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          console.log(`Updating post: ${currentPost.id} - ${currentPost.title}`);
          console.log('Fields to update:', updates);

          await prisma.post.update({
            where: { id: currentPost.id },
            data: updates
          });

          updatedCount++;
        } else {
          console.log(`No fields to update for: ${currentPost.title}`);
        }
      } else {
        console.log(`Warning: No matching backup found for post: ${currentPost.title}`);
      }
    }

    console.log(`Restoration complete! Updated ${updatedCount} posts.`);
  } catch (error) {
    console.error('Error during restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
restorePostFields()
  .then(() => console.log('Script completed.'))
  .catch(error => console.error('Script failed:', error));
