import { PrismaClient } from '@prisma/client';

// Test database client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
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
 * Set up the test database with consistent test data
 */
export async function setupTestDatabase() {
  try {
    console.log('Setting up test database with seed data...');

    // Clear existing test data (in reverse order of dependencies)
    console.log('Removing previous test data...');
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { actorId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.notificationPreference.deleteMany({
      where: { userId: { startsWith: TEST_PREFIX } }
    });

    await prisma.commentReaction.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { comment: { userId: { startsWith: TEST_PREFIX } } }
        ]
      }
    });

    await prisma.comment.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { postId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.reaction.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { postId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.post.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { id: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } }
    });

    // Add test user
    console.log('Creating test user...');
    await prisma.user.upsert({
      where: { email: testUser.email },
      update: testUser,
      create: testUser
    });

    // Add test recipe/post
    console.log('Creating test recipe...');
    await prisma.post.upsert({
      where: { id: testPost.id },
      update: testPost,
      create: testPost
    });

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean up the test database after tests
 */
export async function cleanupTestDatabase() {
  try {
    console.log('Cleaning up test database...');

    // Only clear test data we created (in reverse order of dependencies)
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { actorId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.notificationPreference.deleteMany({
      where: { userId: { startsWith: TEST_PREFIX } }
    });

    await prisma.commentReaction.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { comment: { userId: { startsWith: TEST_PREFIX } } }
        ]
      }
    });

    await prisma.comment.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { postId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.reaction.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { postId: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.post.deleteMany({
      where: {
        OR: [
          { userId: { startsWith: TEST_PREFIX } },
          { id: { startsWith: TEST_PREFIX } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: { id: { startsWith: TEST_PREFIX } }
    });

    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
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
