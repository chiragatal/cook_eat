const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function restoreDatabase(backupFilePath) {
  const prisma = new PrismaClient();
  let userIdMapping = {};

  try {
    console.log(`Reading backup file from ${backupFilePath}`);
    const data = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    // Try to load user ID mapping if it exists
    const mappingPath = path.join(__dirname, '../backups/user-id-mapping.json');
    if (fs.existsSync(mappingPath)) {
      console.log('Loading user ID mapping from', mappingPath);
      userIdMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.log(`Loaded mapping for ${Object.keys(userIdMapping).length} users`);
    } else {
      console.warn('No user ID mapping file found. Creating default mapping...');
      // Create simple mapping based on existing users
      const users = await prisma.user.findMany();

      if (data.User && data.User.length > 0) {
        data.User.forEach((backupUser, index) => {
          const matchingUser = users.find(u => u.email === backupUser.email);
          if (matchingUser) {
            userIdMapping[backupUser.id] = matchingUser.id;
            console.log(`Mapped user ${backupUser.id} (${backupUser.email}) to ${matchingUser.id}`);
          }
        });
      }
    }

    // Restore Users if needed and update mapping
    if (data.User && data.User.length > 0) {
      console.log(`Restoring ${data.User.length} user records...`);

      for (const user of data.User) {
        // Skip if user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });

        if (existingUser) {
          console.log(`User with email ${user.email} already exists, updating mapping`);
          userIdMapping[user.id] = existingUser.id;
          continue;
        }

        try {
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
              image: user.image,
              password: user.password // Note: password should be hashed already
            }
          });

          console.log(`Created user ${newUser.id} (${newUser.email})`);
          userIdMapping[user.id] = newUser.id;
        } catch (error) {
          console.error(`Failed to create user ${user.email}:`, error);
        }
      }
    }

    // Save updated mapping
    fs.writeFileSync(mappingPath, JSON.stringify(userIdMapping, null, 2));
    console.log('Updated user ID mapping saved');

    // Restore Posts with mapped user IDs
    if (data.Post && data.Post.length > 0) {
      console.log(`Restoring ${data.Post.length} post records...`);

      for (const post of data.Post) {
        try {
          // Map old user ID to new UUID
          const mappedUserId = userIdMapping[post.userId];

          if (!mappedUserId) {
            console.error(`No mapping found for user ID ${post.userId}, skipping post ${post.id}`);
            continue;
          }

          const existingPost = await prisma.post.findFirst({
            where: {
              AND: [
                { title: post.title },
                { userId: mappedUserId }
              ]
            }
          });

          if (existingPost) {
            console.log(`Post "${post.title}" by user ${mappedUserId} already exists, skipping`);
            continue;
          }

          // Create new post with UUID as string
          const newPost = await prisma.post.create({
            data: {
              title: post.title,
              description: post.description || '',
              ingredients: post.ingredients || '',
              steps: post.steps || '',
              images: post.images || [],
              notes: post.notes || '',
              tags: post.tags || '',
              category: post.category || '',
              cookTime: post.cookTime || 0,
              prepTime: post.prepTime || 0,
              difficulty: post.difficulty || 'EASY',
              isPublic: post.isPublic !== undefined ? post.isPublic : true,
              cookedOn: post.cookedOn ? new Date(post.cookedOn) : null,
              userId: mappedUserId,
              createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
              updatedAt: post.updatedAt ? new Date(post.updatedAt) : new Date()
            }
          });

          console.log(`Restored post "${newPost.title}" with ID ${newPost.id}`);
        } catch (error) {
          console.error(`Failed to restore post ${post.id}:`, error);
        }
      }
    }

    // Restore Reactions with mapped user IDs
    if (data.Reaction && data.Reaction.length > 0) {
      console.log(`Restoring ${data.Reaction.length} reaction records...`);

      for (const reaction of data.Reaction) {
        try {
          // Map old user ID to new UUID
          const mappedUserId = userIdMapping[reaction.userId];

          if (!mappedUserId) {
            console.error(`No mapping found for user ID ${reaction.userId}, skipping reaction ${reaction.id}`);
            continue;
          }

          // Find the post by title and mapped user ID
          const post = await prisma.post.findFirst({
            where: {
              title: data.Post.find(p => p.id === reaction.postId)?.title || '',
              userId: userIdMapping[data.Post.find(p => p.id === reaction.postId)?.userId]
            }
          });

          if (!post) {
            console.error(`Post not found for reaction ${reaction.id}, skipping`);
            continue;
          }

          const existingReaction = await prisma.reaction.findFirst({
            where: {
              AND: [
                { type: reaction.type },
                { userId: mappedUserId },
                { postId: post.id }
              ]
            }
          });

          if (existingReaction) {
            console.log(`Reaction ${reaction.type} by user ${mappedUserId} on post ${post.id} already exists, skipping`);
            continue;
          }

          await prisma.reaction.create({
            data: {
              type: reaction.type,
              userId: mappedUserId,
              postId: post.id,
              createdAt: reaction.createdAt ? new Date(reaction.createdAt) : new Date()
            }
          });

          console.log(`Restored reaction ${reaction.type} on post ${post.id}`);
        } catch (error) {
          console.error(`Failed to restore reaction ${reaction.id}:`, error);
        }
      }
    }

    // Restore Comments with mapped user IDs
    if (data.Comment && data.Comment.length > 0) {
      console.log(`Restoring ${data.Comment.length} comment records...`);

      for (const comment of data.Comment) {
        try {
          // Map old user ID to new UUID
          const mappedUserId = userIdMapping[comment.userId];

          if (!mappedUserId) {
            console.error(`No mapping found for user ID ${comment.userId}, skipping comment ${comment.id}`);
            continue;
          }

          // Find the post by title and mapped user ID
          const post = await prisma.post.findFirst({
            where: {
              title: data.Post.find(p => p.id === comment.postId)?.title || '',
              userId: userIdMapping[data.Post.find(p => p.id === comment.postId)?.userId]
            }
          });

          if (!post) {
            console.error(`Post not found for comment ${comment.id}, skipping`);
            continue;
          }

          const existingComment = await prisma.comment.findFirst({
            where: {
              AND: [
                { content: comment.content },
                { userId: mappedUserId },
                { postId: post.id }
              ]
            }
          });

          if (existingComment) {
            console.log(`Similar comment by user ${mappedUserId} on post ${post.id} already exists, skipping`);
            continue;
          }

          await prisma.comment.create({
            data: {
              content: comment.content,
              userId: mappedUserId,
              postId: post.id,
              createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
              updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : new Date()
            }
          });

          console.log(`Restored comment on post ${post.id}`);
        } catch (error) {
          console.error(`Failed to restore comment ${comment.id}:`, error);
        }
      }
    }

    console.log('Database restoration completed');
  } catch (error) {
    console.error('Error restoring database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if a backup file was provided as a command-line argument
const backupFilePath = process.argv[2];
if (!backupFilePath) {
  console.error('Please provide a backup file path');
  process.exit(1);
}

// Run the restore function
restoreDatabase(backupFilePath);
