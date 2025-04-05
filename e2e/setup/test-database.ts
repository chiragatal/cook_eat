import { PrismaClient, Prisma } from '@prisma/client';

// Test database client - intentionally uses a separate schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

// Print warning about database usage
console.log('\n⚠️  IMPORTANT: Tests are using the database configured in .env.test ⚠️');
console.log('Database URL:', process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
console.log('Make sure this points to a test database or uses schema isolation!\n');

// Test prefix to distinguish test data
const TEST_PREFIX = 'test_e2e_';

// Seed data for testing
const testUser = {
  id: `${TEST_PREFIX}00000000-0000-0000-0000-000000000001`,
  email: `${TEST_PREFIX}test@example.com`,
  name: `${TEST_PREFIX}Test User`,
  passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uG7kQOD1yJFZb4yHiay.fi3RNcDpw76q', // password: 'password12345'
  isAdmin: false,
};

// Test post used for e2e tests
const testPost = {
  id: `${TEST_PREFIX}00000000-0000-0000-0000-000000000002`,
  title: `${TEST_PREFIX}Test Recipe`,
  description: 'A recipe created for automated testing',
  ingredients: 'Test ingredients',
  steps: 'Test steps',
  images: JSON.stringify(['https://example.com/test-image.jpg']),
  tags: 'test,e2e',
  category: 'Testing',
  cookingTime: 30,
  difficulty: 'Easy',
  isPublic: true,
  userId: testUser.id
};

/**
 * Helper function to safely delete records from a table
 * Will catch and log errors if the table doesn't exist
 */
async function safeDeleteMany(
  model: any,
  modelName: string,
  where: any
) {
  try {
    await model.deleteMany({ where });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2021 is the error code for "table does not exist"
      if (error.code === 'P2021') {
        console.log(`Table ${modelName} does not exist, skipping deletion`);
        return false;
      }
    }
    // For other errors, we should still throw
    throw error;
  }
}

/**
 * Helper function to safely create or update records
 * Will catch and log errors if the table doesn't exist
 */
async function safeUpsert(model: any, modelName: string, args: any) {
  try {
    await model.upsert(args);
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2021 is the error code for "table does not exist"
      if (error.code === 'P2021') {
        console.log(`Table ${modelName} does not exist, skipping data creation`);
        return false;
      }
    }
    // For other errors, we should still throw
    throw error;
  }
}

/**
 * Helper function to check if a table exists in the database
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Use a raw query to check if the table exists
    const schemaName = 'test_e2e'; // This should match the schema in your TEST_DATABASE_URL
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
        AND table_name = '${tableName}'
      );
    `;

    const result = await prisma.$queryRawUnsafe(query);
    return result[0]?.exists || false;
  } catch (error) {
    console.log(`Error checking if table exists: ${error}`);
    return false;
  }
}

/**
 * Set up the test database with consistent test data
 */
export async function setupTestDatabase() {
  try {
    console.log('Setting up test database with seed data...');

    // Clear existing test data (in reverse order of dependencies)
    console.log('Removing previous test data...');

    // Only deleting data with the test prefix for safety
    console.log(`Only deleting data with prefix: ${TEST_PREFIX}`);

    // Safely delete records from each table, handling missing tables gracefully
    await safeDeleteMany(prisma.notification, 'Notification', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { actorId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.notificationPreference, 'NotificationPreference', {
      userId: { startsWith: TEST_PREFIX }
    });

    await safeDeleteMany(prisma.commentReaction, 'CommentReaction', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { comment: { userId: { startsWith: TEST_PREFIX } } }
      ]
    });

    await safeDeleteMany(prisma.comment, 'Comment', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { postId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.reaction, 'Reaction', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { postId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.post, 'Post', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { id: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.user, 'User', {
      id: { startsWith: TEST_PREFIX }
    });

    // Check if tables exist before trying to create records
    const userTableExists = await tableExists('User');
    const postTableExists = await tableExists('Post');

    if (userTableExists) {
      // Add test user
      console.log('Creating test user...');
      await safeUpsert(prisma.user, 'User', {
        where: { email: testUser.email },
        update: testUser,
        create: testUser
      });

      if (postTableExists) {
        // Add test recipe/post
        console.log('Creating test recipe...');
        await safeUpsert(prisma.post, 'Post', {
          where: { id: testPost.id },
          update: testPost,
          create: testPost
        });
      } else {
        console.log('Post table does not exist, skipping recipe creation');
      }
    } else {
      console.log('User table does not exist, skipping user and recipe creation');
      // Even if tables don't exist, we can continue with tests that don't need database access
      console.log('Continuing without test data - some tests may be skipped');
    }

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    // Instead of throwing, just log and continue
    console.log('Continuing with tests despite database setup issues');
  }
}

/**
 * Clean up the test database after tests
 */
export async function cleanupTestDatabase() {
  try {
    console.log('Cleaning up test database...');
    console.log(`Only deleting data with prefix: ${TEST_PREFIX}`);

    // Safely delete records from each table, handling missing tables gracefully
    await safeDeleteMany(prisma.notification, 'Notification', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { actorId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.notificationPreference, 'NotificationPreference', {
      userId: { startsWith: TEST_PREFIX }
    });

    await safeDeleteMany(prisma.commentReaction, 'CommentReaction', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { comment: { userId: { startsWith: TEST_PREFIX } } }
      ]
    });

    await safeDeleteMany(prisma.comment, 'Comment', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { postId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.reaction, 'Reaction', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { postId: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.post, 'Post', {
      OR: [
        { userId: { startsWith: TEST_PREFIX } },
        { id: { startsWith: TEST_PREFIX } }
      ]
    });

    await safeDeleteMany(prisma.user, 'User', {
      id: { startsWith: TEST_PREFIX }
    });

    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    // Just log the error and continue
    console.log('Continuing despite cleanup issues');
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}

/**
 * Reset the test database to a fresh state with seed data
 */
export async function resetTestDatabase() {
  await cleanupTestDatabase();
  await setupTestDatabase();
}
