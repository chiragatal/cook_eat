import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.test' });
}

// We always use the preview database now
const quietMode = process.env.E2E_QUIET_MODE === 'true';

// Determine the database URL
const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';

// Print database connection details (only if not in quiet mode)
if (!quietMode) {
  console.log('\n⚠️  IMPORTANT: Tests are using the preview database ⚠️');
  const maskedUrl = databaseUrl.split('?')[0];
  console.log('Database URL:', maskedUrl + ' (preview)');
} else {
}

// Configure Prisma log levels
const logLevel = process.env.PRISMA_LOG_LEVEL || (quietMode ? 'error' : 'info');

// Test database client
const prisma = new PrismaClient({
  datasourceUrl: databaseUrl,
  log: [
    { level: 'error' as const, emit: 'stdout' as const },
    ...(logLevel !== 'error' ? [{ level: 'warn' as const, emit: 'stdout' as const }] : []),
    ...(logLevel === 'info' ? [
      { level: 'info' as const, emit: 'stdout' as const },
      { level: 'query' as const, emit: 'stdout' as const }
    ] : []),
  ],
});

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
 * Set up the test database with essential test data
 */
export async function setupTestDatabase() {
  if (!quietMode) {
    console.log('Setting up test database with seed data...');
  }

  try {
    // Check for essential tables first
    const userTableExists = await tableExists('User');
    const postTableExists = await tableExists('Post');

    if (!userTableExists) {
      if (!quietMode) {
        console.log('User table not found - have you run "npm run setup-test-db" first?');
      }
      return;
    }

    // Create test user
    if (!quietMode) {
      console.log('Creating test user data...');
    }

    await safeUpsert(prisma.user, 'User', {
      where: { email: testUser.email },
      update: testUser,
      create: testUser
    });

    if (postTableExists) {
      // Create test post if Post table exists
      if (!quietMode) {
        console.log('Creating test post data...');
      }

      await safeUpsert(prisma.post, 'Post', {
        where: { id: testPost.id },
        update: testPost,
        create: testPost
      });
    }

    if (!quietMode) {
      console.log('Test database setup complete');
    }
  } catch (error) {
    console.error('Error setting up test database:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Required for backwards compatibility
 */
export async function cleanupTestDatabase() {
  // No cleanup needed for preview database
  return;
}
