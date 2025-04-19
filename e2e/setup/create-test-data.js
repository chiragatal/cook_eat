#!/usr/bin/env node

/**
 * Direct script to create test data for e2e tests
 * This script uses Prisma Client to directly interact with the database
 */

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.test' });

// Initialize Prisma Client
const prisma = new PrismaClient();

// Set quiet mode flag - disable most logging
const quietMode = process.env.E2E_QUIET_MODE === 'true';
const ultraQuietMode = process.env.E2E_ULTRA_QUIET_MODE === 'true';

/**
 * Helper function to safely create or update test data
 */
async function safeUpsert(model, modelName, args) {
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
 * Create standardized test data
 */
async function createTestData() {
  if (!quietMode) {
    console.log('Creating standard test data for e2e tests...');
  }

  try {
    // Define standard test user
    const standardUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test_e2e_test@example.com',
      name: 'Test User',
      passwordHash: '$2a$10$CwTycUXWue0Thq9StjUM0uG7kQOD1yJFZb4yHiay.fi3RNcDpw76q', // password: 'password12345'
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create or update standard test user
    await safeUpsert(prisma.user, 'User', {
      where: { email: standardUser.email },
      update: standardUser,
      create: standardUser
    });

    if (!quietMode) {
      console.log('Created standard test user');
    }

    // Define standard test recipe
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cook-eat-preview.vercel.app';
    const standardRecipe = {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Test Recipe',
      description: 'A standard recipe created for automated testing',
      ingredients: 'Standard test ingredients',
      steps: 'Standard test steps',
      images: JSON.stringify([`${baseUrl}/test-image.jpg`]),
      tags: 'test,e2e,standard',
      category: 'Testing',
      cookingTime: 30,
      difficulty: 'Easy',
      isPublic: true,
      userId: standardUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create or update standard test recipe
    await safeUpsert(prisma.post, 'Post', {
      where: { id: standardRecipe.id },
      update: standardRecipe,
      create: standardRecipe
    });

    if (!quietMode) {
      console.log('Created standard test recipe');
    }

    // Create some test reactions
    const reactionTypes = ['like', 'love', 'thumbsup', 'smile', 'surprise'];

    // Create a standard reaction
    await safeUpsert(prisma.reaction, 'Reaction', {
      where: {
        postId_userId_type: {
          postId: standardRecipe.id,
          userId: standardUser.id,
          type: 'like'
        }
      },
      update: {
        type: 'like',
        postId: standardRecipe.id,
        userId: standardUser.id,
        createdAt: new Date()
      },
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        type: 'like',
        postId: standardRecipe.id,
        userId: standardUser.id,
        createdAt: new Date()
      }
    });

    // Create a standard comment
    await safeUpsert(prisma.comment, 'Comment', {
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {
        content: 'This is a test comment for e2e testing',
        postId: standardRecipe.id,
        userId: standardUser.id,
        updatedAt: new Date()
      },
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        content: 'This is a test comment for e2e testing',
        postId: standardRecipe.id,
        userId: standardUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    if (!quietMode) {
      console.log('Created standard test reactions and comments');
    }

    console.log('✅ Test data creation complete!');
    return true;
  } catch (error) {
    console.error('Error creating test data:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
createTestData().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
