const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function restoreDatabase(backupFilePath) {
  const prisma = new PrismaClient();
  let idMappings = { User: {} };
  // Track restoration counts
  const restorationSummary = {};

  try {
    console.log(`Reading backup file from ${backupFilePath}`);
    const data = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    // Get all tables from the backup
    const tables = Object.keys(data).filter(key => Array.isArray(data[key]));
    console.log(`Found ${tables.length} tables in backup: ${tables.join(', ')}`);

    // Initialize summary
    tables.forEach(table => {
      restorationSummary[table] = {
        total: data[table].length,
        restored: 0,
        skipped: 0,
        failed: 0
      };
    });

    // Try to load user ID mapping if it exists
    const mappingPath = path.join(__dirname, '../backups/user-id-mapping.json');
    if (fs.existsSync(mappingPath)) {
      console.log('Loading user ID mapping from', mappingPath);
      idMappings.User = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      console.log(`Loaded mapping for ${Object.keys(idMappings.User).length} users`);
    } else {
      console.warn('No user ID mapping file found. Creating new mapping...');
      // Create simple mapping based on existing users
      const users = await prisma.user.findMany();

      if (data.User && data.User.length > 0) {
        data.User.forEach((backupUser) => {
          const matchingUser = users.find(u => u.email === backupUser.email);
          if (matchingUser) {
            idMappings.User[backupUser.id] = matchingUser.id;
            console.log(`Mapped user ${backupUser.id} (${backupUser.email}) to ${matchingUser.id}`);
          }
        });
      }
    }

    // First, restore Users table as it's a dependency for other tables
    await restoreTable('User', data, idMappings, prisma, restorationSummary);

    // Save updated user mapping
    fs.writeFileSync(mappingPath, JSON.stringify(idMappings.User, null, 2));
    console.log('Updated user ID mapping saved');

    // Then restore other tables in dependency order
    const tableDependencyOrder = [
      'Post',
      'Comment',
      'Reaction',
      'CommentReaction',
      'Notification',
      'NotificationPreference'
    ];

    // Add any tables from backup that aren't in our predefined order
    tables.forEach(table => {
      if (table !== 'User' && !tableDependencyOrder.includes(table)) {
        tableDependencyOrder.push(table);
      }
    });

    // Restore tables in dependency order
    for (const table of tableDependencyOrder) {
      if (data[table] && data[table].length > 0) {
        await restoreTable(table, data, idMappings, prisma, restorationSummary);
      }
    }

    // Print summary report
    console.log('\n===== RESTORATION SUMMARY =====');
    Object.keys(restorationSummary).forEach(table => {
      const stats = restorationSummary[table];
      console.log(`${table}: ${stats.restored} restored, ${stats.skipped} skipped, ${stats.failed} failed (out of ${stats.total} total)`);
    });
    console.log('===============================\n');

    console.log('Database restoration completed');
  } catch (error) {
    console.error('Error restoring database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Dynamically restore records for a specific table
 */
async function restoreTable(tableName, data, idMappings, prisma, restorationSummary) {
  if (!data[tableName] || data[tableName].length === 0) {
    console.log(`No ${tableName} records found in backup`);
    restorationSummary[tableName].skipped += data[tableName].length;
    return;
  }

  console.log(`Restoring ${data[tableName].length} ${tableName} records...`);
  idMappings[tableName] = idMappings[tableName] || {};

  // Get a sample record to examine its fields
  const sampleRecord = data[tableName][0];
  const recordFields = Object.keys(sampleRecord);

  // Initialize Prisma model and mapping functions
  const prismaModel = getModelByTableName(prisma, tableName);
  if (!prismaModel) {
    console.error(`Could not find Prisma model for table ${tableName}`);
    restorationSummary[tableName].failed += data[tableName].length;
    return;
  }

  for (const record of data[tableName]) {
    try {
      // Handle each table differently based on its structure
      switch (tableName) {
        case 'User':
          await handleUserRecord(record, prismaModel, idMappings, restorationSummary);
          break;
        case 'Post':
          await handlePostRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        case 'Comment':
          await handleCommentRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        case 'Reaction':
          await handleReactionRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        case 'CommentReaction':
          await handleCommentReactionRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        case 'Notification':
          await handleNotificationRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        case 'NotificationPreference':
          await handleNotificationPreferenceRecord(record, prismaModel, idMappings, data, restorationSummary);
          break;
        default:
          // For unknown tables, try a generic approach
          await handleGenericRecord(tableName, record, prismaModel, idMappings, data, restorationSummary);
          break;
      }
    } catch (error) {
      console.error(`Failed to restore ${tableName} record ${record.id}:`, error.message);
      restorationSummary[tableName].failed++;
    }
  }
}

/**
 * Get Prisma model by table name
 */
function getModelByTableName(prisma, tableName) {
  // Convert to camelCase if needed
  const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
  return prisma[modelName] || null;
}

/**
 * Handle User record restoration
 */
async function handleUserRecord(user, prismaModel, idMappings, restorationSummary) {
  // Skip if user with this email already exists
  const existingUser = await prismaModel.findUnique({
    where: { email: user.email }
  });

  if (existingUser) {
    console.log(`User with email ${user.email} already exists, updating mapping`);
    idMappings.User[user.id] = existingUser.id;
    restorationSummary.User.skipped++;
    return;
  }

  try {
    // Prepare data with only fields that exist in the schema
    const userData = {
      email: user.email,
      name: user.name || "",
      passwordHash: user.passwordHash || '$2a$10$CwTycUXWue0Thq9StjUM0uG7kQOD1yJFZb4yHiay.fi3RNcDpw76q', // Default hash
      isAdmin: typeof user.isAdmin === 'boolean' ? user.isAdmin : false
    };

    // Add timestamps if they exist
    if (user.createdAt) userData.createdAt = new Date(user.createdAt);
    if (user.updatedAt) userData.updatedAt = new Date(user.updatedAt);

    const newUser = await prismaModel.create({ data: userData });
    console.log(`Created user ${newUser.id} (${newUser.email})`);
    idMappings.User[user.id] = newUser.id;
    restorationSummary.User.restored++;
  } catch (error) {
    console.error(`Failed to create user ${user.email}:`, error.message);
    restorationSummary.User.failed++;
    throw error;
  }
}

/**
 * Handle Post record restoration
 */
async function handlePostRecord(post, prismaModel, idMappings, data, restorationSummary) {
  // Map old user ID to new UUID
  const mappedUserId = idMappings.User[post.userId];

  if (!mappedUserId) {
    console.error(`No mapping found for user ID ${post.userId}, skipping post ${post.id}`);
    restorationSummary.Post.skipped++;
    return;
  }

  const existingPost = await prismaModel.findFirst({
    where: {
      AND: [
        { title: post.title },
        { userId: mappedUserId }
      ]
    }
  });

  if (existingPost) {
    console.log(`Post "${post.title}" by user ${mappedUserId} already exists, updating mapping`);
    idMappings.Post = idMappings.Post || {};
    idMappings.Post[post.id] = existingPost.id;
    restorationSummary.Post.skipped++;
    return;
  }

  try {
    // Prepare data with flexible field handling
    const postData = {
      title: post.title,
      userId: mappedUserId
    };

    // Add optional fields if they exist in the backup
    const optionalFields = [
      'description', 'ingredients', 'steps', 'notes', 'tags', 'category',
      'isPublic', 'difficulty', 'cookingTime'
    ];

    optionalFields.forEach(field => {
      if (field in post) {
        postData[field] = post[field] || '';
      }
    });

    // Handle special fields with default values or type conversions
    postData.images = typeof post.images === 'string' ? post.images : JSON.stringify(post.images || []);
    postData.isPublic = post.isPublic !== undefined ? post.isPublic : true;

    // Handle numeric fields
    if ('cookingTime' in post) postData.cookingTime = Number(post.cookingTime) || 0;

    // Handle date fields
    if (post.cookedOn) postData.cookedOn = new Date(post.cookedOn);
    if (post.createdAt) postData.createdAt = new Date(post.createdAt);
    if (post.updatedAt) postData.updatedAt = new Date(post.updatedAt);

    const newPost = await prismaModel.create({ data: postData });
    console.log(`Restored post "${newPost.title}" with ID ${newPost.id}`);

    // Update mapping
    idMappings.Post = idMappings.Post || {};
    idMappings.Post[post.id] = newPost.id;
    restorationSummary.Post.restored++;
  } catch (error) {
    console.error(`Failed to restore post ${post.id}:`, error.message);
    restorationSummary.Post.failed++;
    throw error;
  }
}

/**
 * Handle Comment record restoration
 */
async function handleCommentRecord(comment, prismaModel, idMappings, data, restorationSummary) {
  // Map old user ID to new UUID
  const mappedUserId = idMappings.User[comment.userId];
  if (!mappedUserId) {
    console.error(`No mapping found for user ID ${comment.userId}, skipping comment ${comment.id}`);
    restorationSummary.Comment.skipped++;
    return;
  }

  // Map old post ID to new UUID
  const mappedPostId = idMappings.Post[comment.postId];
  if (!mappedPostId) {
    console.error(`No mapping found for post ID ${comment.postId}, skipping comment ${comment.id}`);
    restorationSummary.Comment.skipped++;
    return;
  }

  const existingComment = await prismaModel.findFirst({
    where: {
      AND: [
        { content: comment.content },
        { userId: mappedUserId },
        { postId: mappedPostId }
      ]
    }
  });

  if (existingComment) {
    console.log(`Similar comment by user ${mappedUserId} on post ${mappedPostId} already exists, updating mapping`);
    idMappings.Comment = idMappings.Comment || {};
    idMappings.Comment[comment.id] = existingComment.id;
    restorationSummary.Comment.skipped++;
    return;
  }

  try {
    const commentData = {
      content: comment.content,
      userId: mappedUserId,
      postId: mappedPostId
    };

    // Add date fields if they exist
    if (comment.createdAt) commentData.createdAt = new Date(comment.createdAt);
    if (comment.updatedAt) commentData.updatedAt = new Date(comment.updatedAt);

    const newComment = await prismaModel.create({ data: commentData });
    console.log(`Restored comment with ID ${newComment.id} on post ${mappedPostId}`);

    // Update mapping
    idMappings.Comment = idMappings.Comment || {};
    idMappings.Comment[comment.id] = newComment.id;
    restorationSummary.Comment.restored++;
  } catch (error) {
    console.error(`Failed to restore comment ${comment.id}:`, error.message);
    restorationSummary.Comment.failed++;
    throw error;
  }
}

/**
 * Handle Reaction record restoration
 */
async function handleReactionRecord(reaction, prismaModel, idMappings, data, restorationSummary) {
  // Map old user ID to new UUID
  const mappedUserId = idMappings.User[reaction.userId];
  if (!mappedUserId) {
    console.error(`No mapping found for user ID ${reaction.userId}, skipping reaction ${reaction.id}`);
    restorationSummary.Reaction.skipped++;
    return;
  }

  // Map old post ID to new UUID
  const mappedPostId = idMappings.Post[reaction.postId];
  if (!mappedPostId) {
    console.error(`No mapping found for post ID ${reaction.postId}, skipping reaction ${reaction.id}`);
    restorationSummary.Reaction.skipped++;
    return;
  }

  const existingReaction = await prismaModel.findFirst({
    where: {
      AND: [
        { type: reaction.type },
        { userId: mappedUserId },
        { postId: mappedPostId }
      ]
    }
  });

  if (existingReaction) {
    console.log(`Reaction ${reaction.type} by user ${mappedUserId} on post ${mappedPostId} already exists, skipping`);
    restorationSummary.Reaction.skipped++;
    return;
  }

  try {
    const reactionData = {
      type: reaction.type,
      userId: mappedUserId,
      postId: mappedPostId
    };

    // Add date field if it exists
    if (reaction.createdAt) reactionData.createdAt = new Date(reaction.createdAt);

    const newReaction = await prismaModel.create({ data: reactionData });
    console.log(`Restored reaction ${reaction.type} on post ${mappedPostId}`);
    restorationSummary.Reaction.restored++;
  } catch (error) {
    console.error(`Failed to restore reaction ${reaction.id}:`, error.message);
    restorationSummary.Reaction.failed++;
    throw error;
  }
}

/**
 * Handle CommentReaction record restoration
 */
async function handleCommentReactionRecord(commentReaction, prismaModel, idMappings, data, restorationSummary) {
  // Map IDs
  const mappedUserId = idMappings.User[commentReaction.userId];
  const mappedCommentId = idMappings.Comment[commentReaction.commentId];

  if (!mappedUserId || !mappedCommentId) {
    console.error(`Missing mapping for commentReaction ${commentReaction.id}, skipping`);
    restorationSummary.CommentReaction.skipped++;
    return;
  }

  const existingReaction = await prismaModel.findFirst({
    where: {
      AND: [
        { type: commentReaction.type },
        { userId: mappedUserId },
        { commentId: mappedCommentId }
      ]
    }
  });

  if (existingReaction) {
    console.log(`Comment reaction already exists, skipping`);
    restorationSummary.CommentReaction.skipped++;
    return;
  }

  try {
    const reactionData = {
      type: commentReaction.type,
      userId: mappedUserId,
      commentId: mappedCommentId
    };

    if (commentReaction.createdAt) reactionData.createdAt = new Date(commentReaction.createdAt);

    await prismaModel.create({ data: reactionData });
    console.log(`Restored comment reaction on comment ${mappedCommentId}`);
    restorationSummary.CommentReaction.restored++;
  } catch (error) {
    console.error(`Failed to restore comment reaction: ${error.message}`);
    restorationSummary.CommentReaction.failed++;
    throw error;
  }
}

/**
 * Handle Notification record restoration
 */
async function handleNotificationRecord(notification, prismaModel, idMappings, data, restorationSummary) {
  // Map user ID (recipient)
  const mappedUserId = idMappings.User[notification.userId];
  if (!mappedUserId) {
    console.error(`No mapping found for user ID ${notification.userId}, skipping notification ${notification.id}`);
    restorationSummary.Notification.skipped++;
    return;
  }

  // Map actor ID (sender)
  const actorId = notification.actorId || notification.userId; // Default to userId if actorId not provided
  const mappedActorId = idMappings.User[actorId];
  if (!mappedActorId) {
    console.error(`No mapping found for actor ID ${actorId}, skipping notification ${notification.id}`);
    restorationSummary.Notification.skipped++;
    return;
  }

  // Create notification data with required fields based on the schema
  let notificationData = {
    userId: mappedUserId,
    actorId: mappedActorId,  // Required relation
    type: notification.type,
    targetId: notification.targetId || notification.postId || notification.commentId || 'default-target-id',
    read: notification.read || notification.isRead || false,
    data: notification.data || {}
  };

  // Map target IDs if they exist
  if (notification.postId && idMappings.Post && idMappings.Post[notification.postId]) {
    notificationData.targetId = idMappings.Post[notification.postId];
  } else if (notification.commentId && idMappings.Comment && idMappings.Comment[notification.commentId]) {
    notificationData.targetId = idMappings.Comment[notification.commentId];
  }

  // Add date fields
  if (notification.createdAt) notificationData.createdAt = new Date(notification.createdAt);

  try {
    await prismaModel.create({ data: notificationData });
    console.log(`Restored notification for user ${mappedUserId}`);
    restorationSummary.Notification.restored++;
  } catch (error) {
    console.error(`Failed to restore notification: ${error.message}`);
    restorationSummary.Notification.failed++;
    throw error;
  }
}

/**
 * Handle NotificationPreference record restoration
 */
async function handleNotificationPreferenceRecord(preference, prismaModel, idMappings, data, restorationSummary) {
  // Map user ID
  const mappedUserId = idMappings.User[preference.userId];
  if (!mappedUserId) {
    console.error(`No mapping found for user ID ${preference.userId}, skipping preference ${preference.id}`);
    restorationSummary.NotificationPreference.skipped++;
    return;
  }

  // Check if preference already exists
  const existingPreference = await prismaModel.findFirst({
    where: {
      userId: mappedUserId,
      type: preference.type || 'ALL'
    }
  });

  // Prepare data based on the schema
  const preferenceData = {
    userId: mappedUserId,
    type: preference.type || 'ALL',
    enabled: preference.enabled !== undefined ? preference.enabled : true
  };

  if (existingPreference) {
    console.log(`Notification preference for user ${mappedUserId} already exists, updating`);
    await prismaModel.update({
      where: { id: existingPreference.id },
      data: { enabled: preferenceData.enabled }
    });
    restorationSummary.NotificationPreference.skipped++;
    return;
  }

  try {
    await prismaModel.create({ data: preferenceData });
    console.log(`Restored notification preferences for user ${mappedUserId}`);
    restorationSummary.NotificationPreference.restored++;
  } catch (error) {
    console.error(`Failed to restore notification preference: ${error.message}`);
    restorationSummary.NotificationPreference.failed++;
    throw error;
  }
}

/**
 * Handle generic record restoration for unknown tables
 */
async function handleGenericRecord(tableName, record, prismaModel, idMappings, data, restorationSummary) {
  console.log(`Trying generic approach for ${tableName} record ${record.id}`);

  // Create a record data object
  const recordData = {};

  // Process all fields
  for (const [key, value] of Object.entries(record)) {
    // Skip ID field as Prisma will generate a new one
    if (key === 'id') continue;

    // Check if field contains a reference to another table
    if (key.endsWith('Id')) {
      const referencedTable = key.slice(0, -2); // Remove 'Id' suffix

      // If we have a mapping for this ID, use it
      if (idMappings[referencedTable] && idMappings[referencedTable][value]) {
        recordData[key] = idMappings[referencedTable][value];
      } else if (referencedTable === 'user' && idMappings.User && idMappings.User[value]) {
        // Special case for 'userId' -> User table
        recordData[key] = idMappings.User[value];
      } else {
        // If no mapping found, skip this record
        console.error(`No mapping found for ${key}=${value} in table ${tableName}, skipping record`);
        restorationSummary[tableName].skipped++;
        return;
      }
    } else if (key.endsWith('At') && value) {
      // Handle date fields
      recordData[key] = new Date(value);
    } else {
      // Copy value as is
      recordData[key] = value;
    }
  }

  try {
    const newRecord = await prismaModel.create({ data: recordData });
    console.log(`Restored ${tableName} record with new ID ${newRecord.id}`);

    // Update mapping
    idMappings[tableName] = idMappings[tableName] || {};
    idMappings[tableName][record.id] = newRecord.id;
    restorationSummary[tableName].restored++;
  } catch (error) {
    console.error(`Failed to restore ${tableName} record: ${error.message}`);
    restorationSummary[tableName].failed++;
    throw error;
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
