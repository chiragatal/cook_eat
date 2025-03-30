const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

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

console.log(`Restoring from: ${backupFilePath}`);

// Read the backup file
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

// Ask for confirmation
console.log('This will insert backup data into your database.');
console.log('It will only INSERT data from the backup, not delete existing data.');

console.log('Backup contains:');
let totalRecords = 0;
for (const model of Object.keys(backupData)) {
  console.log(`- ${backupData[model].length} ${model} records`);
  totalRecords += backupData[model].length;
}

// Generate a default password hash for users
async function generateDefaultPasswordHash() {
  // Using a simple default password for all users
  const defaultPassword = 'password123';
  return bcrypt.hash(defaultPassword, 10);
}

// STEP 1: Create users and build ID mapping
async function createUserIdMapping() {
  const userIdMapping = {};

  if (!backupData.User || backupData.User.length === 0) {
    console.log('No users found in backup data');
    return userIdMapping;
  }

  console.log(`Creating ${backupData.User.length} users and building ID mapping...`);

  // Generate a default password hash for all users
  const defaultPasswordHash = await generateDefaultPasswordHash();

  for (const user of backupData.User) {
    try {
      // Generate a UUID for the user
      const newUuid = uuidv4();

      // Create the user with the new UUID
      const newUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          createdAt: new Date(user.createdAt)
        },
        create: {
          id: newUuid,
          email: user.email,
          name: user.name,
          passwordHash: defaultPasswordHash,
          createdAt: new Date(user.createdAt)
        }
      });

      // Map the old integer ID to the new UUID
      userIdMapping[user.id] = newUser.id;
      console.log(`Mapped user ${user.id} (${user.name}) to ${newUser.id}`);
    } catch (error) {
      console.error(`Error creating user ${user.id} (${user.email}): `, error);
    }
  }

  // Save the mapping to a file for reference
  const mappingPath = path.join(__dirname, '../backups/user-id-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(userIdMapping, null, 2));
  console.log(`User ID mapping saved to ${mappingPath}`);

  return userIdMapping;
}

// STEP 2: Create mappings for other models
async function createModelIdMappings(userIdMapping) {
  // Initialize mapping objects for each model
  const postIdMapping = {};
  const commentIdMapping = {};

  // Process posts first (we'll need them for comments and reactions)
  if (backupData.Post && backupData.Post.length > 0) {
    console.log(`Creating ID mappings for ${backupData.Post.length} posts...`);

    for (const post of backupData.Post) {
      // Generate a UUID for the post
      const newPostId = uuidv4();
      // Store the mapping
      postIdMapping[post.id] = newPostId;
    }

    // Save the post mapping
    const postMappingPath = path.join(__dirname, '../backups/post-id-mapping.json');
    fs.writeFileSync(postMappingPath, JSON.stringify(postIdMapping, null, 2));
    console.log(`Post ID mapping saved to ${postMappingPath}`);
  }

  // Process comments next (we need them for comment reactions)
  if (backupData.Comment && backupData.Comment.length > 0) {
    console.log(`Creating ID mappings for ${backupData.Comment.length} comments...`);

    for (const comment of backupData.Comment) {
      // Generate a UUID for the comment
      const newCommentId = uuidv4();
      // Store the mapping
      commentIdMapping[comment.id] = newCommentId;
    }

    // Save the comment mapping
    const commentMappingPath = path.join(__dirname, '../backups/comment-id-mapping.json');
    fs.writeFileSync(commentMappingPath, JSON.stringify(commentIdMapping, null, 2));
    console.log(`Comment ID mapping saved to ${commentMappingPath}`);
  }

  return {
    postIdMapping,
    commentIdMapping
  };
}

// STEP 3: Restore all models using the ID mappings
async function restoreAllModels(userIdMapping, postIdMapping, commentIdMapping) {
  // Restore posts first
  if (backupData.Post && backupData.Post.length > 0) {
    console.log(`Restoring ${backupData.Post.length} posts...`);

    for (const post of backupData.Post) {
      try {
        // Skip if userId isn't in our mapping (shouldn't happen)
        if (!userIdMapping[post.userId]) {
          console.error(`No user mapping found for post ${post.id}`);
          continue;
        }

        // Create the post with mapped IDs
        await prisma.post.create({
          data: {
            id: postIdMapping[post.id],
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
            isPublic: post.isPublic || false,
            createdAt: new Date(post.createdAt),
            updatedAt: new Date(post.updatedAt),
            cookedOn: post.cookedOn ? new Date(post.cookedOn) : null,
            userId: userIdMapping[post.userId]
          }
        });
        console.log(`Restored post ${post.id} -> ${postIdMapping[post.id]}`);
      } catch (error) {
        console.error(`Error restoring post ${post.id}:`, error);
      }
    }
  }

  // Restore comments next
  if (backupData.Comment && backupData.Comment.length > 0) {
    console.log(`Restoring ${backupData.Comment.length} comments...`);

    for (const comment of backupData.Comment) {
      try {
        // Skip if mappings aren't available
        if (!userIdMapping[comment.userId] || !postIdMapping[comment.postId]) {
          console.error(`Missing mapping for comment ${comment.id}`);
          continue;
        }

        // Create the comment with mapped IDs
        await prisma.comment.create({
          data: {
            id: commentIdMapping[comment.id],
            content: comment.content,
            postId: postIdMapping[comment.postId],
            userId: userIdMapping[comment.userId],
            createdAt: new Date(comment.createdAt),
            updatedAt: new Date(comment.updatedAt)
          }
        });
        console.log(`Restored comment ${comment.id} -> ${commentIdMapping[comment.id]}`);
      } catch (error) {
        console.error(`Error restoring comment ${comment.id}:`, error);
      }
    }
  }

  // Restore reactions
  if (backupData.Reaction && backupData.Reaction.length > 0) {
    console.log(`Restoring ${backupData.Reaction.length} reactions...`);

    for (const reaction of backupData.Reaction) {
      try {
        // Skip if mappings aren't available
        if (!userIdMapping[reaction.userId] || !postIdMapping[reaction.postId]) {
          console.error(`Missing mapping for reaction ${reaction.id}`);
          continue;
        }

        // Create the reaction with mapped IDs
        await prisma.reaction.create({
          data: {
            id: uuidv4(), // Generate new UUID for reaction
            type: reaction.type,
            postId: postIdMapping[reaction.postId],
            userId: userIdMapping[reaction.userId],
            createdAt: new Date(reaction.createdAt)
          }
        });
        console.log(`Restored reaction ${reaction.id}`);
      } catch (error) {
        console.error(`Error restoring reaction ${reaction.id}:`, error);
      }
    }
  }

  // Restore comment reactions if they exist
  if (backupData.CommentReaction && backupData.CommentReaction.length > 0) {
    console.log(`Restoring ${backupData.CommentReaction.length} comment reactions...`);

    for (const commentReaction of backupData.CommentReaction) {
      try {
        // Skip if mappings aren't available
        if (!userIdMapping[commentReaction.userId] || !commentIdMapping[commentReaction.commentId]) {
          console.error(`Missing mapping for comment reaction ${commentReaction.id}`);
          continue;
        }

        // Create the comment reaction with mapped IDs
        await prisma.commentReaction.create({
          data: {
            id: uuidv4(), // Generate new UUID for comment reaction
            type: commentReaction.type,
            commentId: commentIdMapping[commentReaction.commentId],
            userId: userIdMapping[commentReaction.userId],
            createdAt: new Date(commentReaction.createdAt)
          }
        });
        console.log(`Restored comment reaction ${commentReaction.id}`);
      } catch (error) {
        console.error(`Error restoring comment reaction ${commentReaction.id}:`, error);
      }
    }
  }

  // Restore notifications if they exist
  if (backupData.Notification && backupData.Notification.length > 0) {
    console.log(`Restoring ${backupData.Notification.length} notifications...`);

    for (const notification of backupData.Notification) {
      try {
        // Skip if user mappings aren't available
        if (!userIdMapping[notification.userId] || !userIdMapping[notification.actorId]) {
          console.error(`Missing user mapping for notification ${notification.id}`);
          continue;
        }

        // Determine the targetId based on the notification type
        // For post-related notifications, we need to map the targetId to the new post ID
        let targetId = notification.targetId;
        if (postIdMapping[notification.targetId]) {
          targetId = postIdMapping[notification.targetId];
        } else if (commentIdMapping[notification.targetId]) {
          targetId = commentIdMapping[notification.targetId];
        }

        // Create the notification with mapped IDs
        await prisma.notification.create({
          data: {
            id: uuidv4(), // Generate new UUID for notification
            type: notification.type,
            userId: userIdMapping[notification.userId],
            actorId: userIdMapping[notification.actorId],
            targetId: targetId,
            read: notification.read || false,
            data: notification.data,
            createdAt: new Date(notification.createdAt)
          }
        });
        console.log(`Restored notification ${notification.id}`);
      } catch (error) {
        console.error(`Error restoring notification ${notification.id}:`, error);
      }
    }
  }

  // Restore notification preferences if they exist
  if (backupData.NotificationPreference && backupData.NotificationPreference.length > 0) {
    console.log(`Restoring ${backupData.NotificationPreference.length} notification preferences...`);

    for (const preference of backupData.NotificationPreference) {
      try {
        // Skip if user mapping isn't available
        if (!userIdMapping[preference.userId]) {
          console.error(`Missing user mapping for notification preference ${preference.id}`);
          continue;
        }

        // Create the notification preference with mapped IDs
        await prisma.notificationPreference.create({
          data: {
            id: uuidv4(), // Generate new UUID for preference
            type: preference.type,
            enabled: preference.enabled,
            userId: userIdMapping[preference.userId]
          }
        });
        console.log(`Restored notification preference ${preference.id}`);
      } catch (error) {
        console.error(`Error restoring notification preference ${preference.id}:`, error);
      }
    }
  }
}

// Main function to orchestrate the restore process
async function processRestoration() {
  try {
    console.log('Starting restoration...');

    // Step 1: Create users and build ID mapping
    const userIdMapping = await createUserIdMapping();

    // Step 2: Create mappings for other models
    const { postIdMapping, commentIdMapping } = await createModelIdMappings(userIdMapping);

    // Step 3: Restore all models using the ID mappings
    await restoreAllModels(userIdMapping, postIdMapping, commentIdMapping);

    console.log('Restoration completed!');
  } catch (error) {
    console.error('Error during restoration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Start the restoration process
processRestoration();
