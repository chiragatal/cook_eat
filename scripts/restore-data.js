// Restore data from backup
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreData() {
  try {
    // Get the latest backup file
    const backupDir = path.join(__dirname, '../backups');
    const files = fs.readdirSync(backupDir).filter(file => file.startsWith('db-backup-') && file.endsWith('.json'));

    if (files.length === 0) {
      console.error('No backup files found');
      return;
    }

    // Sort files by creation date (newest first)
    files.sort((a, b) => {
      return fs.statSync(path.join(backupDir, b)).mtime.getTime() -
             fs.statSync(path.join(backupDir, a)).mtime.getTime();
    });

    const latestBackup = files[0];
    console.log(`Using latest backup: ${latestBackup}`);

    // Read the backup file
    const backupData = JSON.parse(fs.readFileSync(path.join(backupDir, latestBackup), 'utf8'));

    // Restore users first
    const users = backupData.User || [];
    console.log(`Restoring ${users.length} users...`);
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          isAdmin: user.isAdmin,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          isAdmin: user.isAdmin,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }

    // Restore posts
    const posts = backupData.Post || [];
    console.log(`Restoring ${posts.length} posts...`);
    for (const post of posts) {
      await prisma.post.upsert({
        where: { id: post.id },
        update: {
          title: post.title,
          description: post.description,
          ingredients: post.ingredients,
          steps: post.steps,
          notes: post.notes,
          images: post.images,
          tags: post.tags,
          category: post.category,
          cookingTime: post.cookingTime,
          difficulty: post.difficulty,
          isPublic: post.isPublic,
          userId: post.userId,
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
          cookedOn: post.cookedOn ? new Date(post.cookedOn) : null
        },
        create: {
          id: post.id,
          title: post.title,
          description: post.description,
          ingredients: post.ingredients,
          steps: post.steps,
          notes: post.notes,
          images: post.images,
          tags: post.tags,
          category: post.category,
          cookingTime: post.cookingTime,
          difficulty: post.difficulty,
          isPublic: post.isPublic,
          userId: post.userId,
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
          cookedOn: post.cookedOn ? new Date(post.cookedOn) : null
        }
      });
    }

    // Restore reactions
    const reactions = backupData.Reaction || [];
    console.log(`Restoring ${reactions.length} reactions...`);
    for (const reaction of reactions) {
      try {
        // Delete any existing reaction with same unique constraint
        await prisma.reaction.deleteMany({
          where: {
            postId: reaction.postId,
            userId: reaction.userId,
            type: reaction.type
          }
        });

        // Create the reaction
        await prisma.reaction.create({
          data: {
            id: reaction.id,
            type: reaction.type,
            postId: reaction.postId,
            userId: reaction.userId,
            createdAt: new Date(reaction.createdAt)
          }
        });
      } catch (err) {
        console.error(`Error restoring reaction ${reaction.id}:`, err.message);
      }
    }

    // Restore comments
    const comments = backupData.Comment || [];
    console.log(`Restoring ${comments.length} comments...`);
    for (const comment of comments) {
      await prisma.comment.upsert({
        where: { id: comment.id },
        update: {
          content: comment.content,
          postId: comment.postId,
          userId: comment.userId,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt)
        },
        create: {
          id: comment.id,
          content: comment.content,
          postId: comment.postId,
          userId: comment.userId,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt)
        }
      });
    }

    console.log('Data restored successfully!');
  } catch (error) {
    console.error('Error restoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData();
