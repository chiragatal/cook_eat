import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { getDatabaseUrl, getBaseUrl } from '../utils/urls';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.test' });
}

// Configure logging based on environment
const quietMode = process.env.E2E_QUIET_MODE === 'true';
const ultraQuietMode = process.env.E2E_ULTRA_QUIET_MODE === 'true';

// Test database client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: ultraQuietMode ? [] : ['error', 'warn'],
});

// Print database connection details (only if not in quiet mode)
if (!quietMode) {
  console.log('\n⚠️  IMPORTANT: Tests are using the preview database ⚠️');
  const maskedUrl = getDatabaseUrl().split('?')[0];
  console.log('Database URL:', maskedUrl + ' (preview)');
}

/**
 * Helper function to safely check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Check if the table exists
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      );
    `;

    const result = await prisma.$queryRawUnsafe(query) as Array<{exists: boolean}>;
    return result[0]?.exists || false;
  } catch (error) {
    if (!quietMode) {
      console.log(`Error checking if table exists: ${String(error)}`);
    }
    return false;
  }
}

/**
 * Helper function to safely create or update test data
 */
async function safeUpsert(model: any, modelName: string, args: any) {
  try {
    await model.upsert(args);
    return true;
  } catch (error) {
    // Don't log in quiet mode
    if (!quietMode) {
      console.log(`Could not create ${modelName} test data: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}

/**
 * Create test data with a unique prefix based on test tag
 */
function createTestData(testTag: string) {
  // Create a safe prefix from the test tag
  const safePrefix = testTag.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const TEST_PREFIX = `test_e2e_${safePrefix}_`;

  // Create user first
  const user = {
    id: `${TEST_PREFIX}00000000-0000-0000-0000-000000000001`,
    email: `${TEST_PREFIX}test@example.com`,
    name: `${TEST_PREFIX}Test User`,
    passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uG7kQOD1yJFZb4yHiay.fi3RNcDpw76q', // password: 'password12345'
    isAdmin: false,
  };

  // Then create post with user ID
  const post = {
    id: `${TEST_PREFIX}00000000-0000-0000-0000-000000000002`,
    title: `${TEST_PREFIX}Test Recipe`,
    description: 'A recipe created for automated testing',
    ingredients: 'Test ingredients',
    steps: 'Test steps',
    images: JSON.stringify([`${getBaseUrl()}/test-image.jpg`]),
    tags: 'test,e2e',
    category: 'Testing',
    cookingTime: 30,
    difficulty: 'Easy',
    isPublic: true,
    userId: user.id
  };

  return { user, post };
}

// Store current test data
let currentTestData: ReturnType<typeof createTestData> | null = null;

/**
 * Set up the test database with essential test data
 */
export async function setupTestDatabase(testTag: string) {
  // Create new test data for this test
  currentTestData = createTestData(testTag);

  if (!quietMode) {
    console.log(`Setting up test database with seed data for test: ${testTag}...`);
  }

  try {
    // Check for essential tables first
    const userTableExists = await tableExists('User');
    const postTableExists = await tableExists('Post');

    if (!userTableExists) {
      if (!quietMode) {
        console.log('User table not found - have you run "npm run setup-test-db" first?');
      }

      // Continue anyway - the preview database might have tables with different casing
      if (!quietMode) {
        console.log('Attempting to create test data anyway...');
      }
    }

    // Add a standard test user that's always available with the same credentials
    const standardTestUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test_e2e_test@example.com',
      name: 'Test User',
      passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uG7kQOD1yJFZb4yHiay.fi3RNcDpw76q', // password: 'password12345'
      isAdmin: false,
    };

    // Create test user for this test
    if (!quietMode) {
      console.log(`Creating test user data for test: ${testTag}...`);
    }

    try {
      // First try to create/update the standard test user
      await safeUpsert(prisma.user, 'User', {
        where: { email: 'test_e2e_test@example.com' },
        update: standardTestUser,
        create: standardTestUser
      });

      // Then create/update the test-specific user
      await safeUpsert(prisma.user, 'User', {
        where: { email: currentTestData.user.email },
        update: currentTestData.user,
        create: currentTestData.user
      });
    } catch (error) {
      console.log(`Failed to create standard test user: ${error instanceof Error ? error.message : String(error)}`);
      console.log('Will continue with test-specific user only');
    }

    // Create test posts
    if (postTableExists) {
      // Create test post for this test
      if (!quietMode) {
        console.log(`Creating test post data for test: ${testTag}...`);
      }

      try {
        // Create a standard test post
        const standardTestPost = {
          id: '00000000-0000-0000-0000-000000000002',
          title: 'Test Recipe',
          description: 'A standard recipe created for automated testing',
          ingredients: 'Standard test ingredients',
          steps: 'Standard test steps',
          images: JSON.stringify([`${getBaseUrl()}/test-image.jpg`]),
          tags: 'test,e2e,standard',
          category: 'Testing',
          cookingTime: 30,
          difficulty: 'Easy',
          isPublic: true,
          userId: standardTestUser.id
        };

        // First create the standard test post
        await safeUpsert(prisma.post, 'Post', {
          where: { id: standardTestPost.id },
          update: standardTestPost,
          create: standardTestPost
        });

        // Then create the test-specific post
        await safeUpsert(prisma.post, 'Post', {
          where: { id: currentTestData.post.id },
          update: currentTestData.post,
          create: { ...currentTestData.post, userId: currentTestData.user.id }
        });
      } catch (error) {
        console.log(`Failed to create test posts: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!quietMode) {
      console.log(`Test database setup complete for test: ${testTag}`);
    }
  } catch (error) {
    console.error(`Error setting up test database for test ${testTag}:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Required for backwards compatibility
 */
export async function cleanupTestDatabase() {
  // No cleanup needed for preview database
  return;
}

/**
 * Get the test user ID for the current test
 */
export function getTestUserId() {
  if (!currentTestData) {
    throw new Error('Test data not initialized. Call setupTestDatabase with a test tag first.');
  }
  return currentTestData.user.id;
}

/**
 * Get the test post ID for the current test
 */
export function getTestPostId() {
  if (!currentTestData) {
    throw new Error('Test data not initialized. Call setupTestDatabase with a test tag first.');
  }
  return currentTestData.post.id;
}
