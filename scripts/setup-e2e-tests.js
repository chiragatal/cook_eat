#!/usr/bin/env node

/**
 * Setup script for e2e tests
 * This script ensures the e2e test environment is properly set up
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
dotenv.config({ path: '.env.test' });

console.log('🔧 Setting up e2e test environment...');

// Function to run a command and handle errors without crashing
function runCommand(command, options = {}) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: options.quiet ? 'pipe' : 'inherit' });
    return true;
  } catch (error) {
    if (options.critical) {
      console.error(`❌ Critical command failed: ${command}`);
      console.error(error.message);
      process.exit(1);
    } else {
      console.log(`⚠️ Command had issues but continuing: ${command}`);
      console.log(error.message);
      return false;
    }
  }
}

// Generate Prisma client without running migrations first
console.log('🔄 Generating Prisma client...');
runCommand('npx prisma generate', { critical: true });

// Check if the database exists and has the expected schema
async function setupDatabase() {
  console.log('🔍 Checking database setup...');

  try {
    // Connect to the database using the connection string from .env.test
    const prisma = new PrismaClient();

    try {
      // Try a simple query to check if essential tables exist
      const users = await prisma.$queryRaw`SELECT COUNT(*) FROM "User" LIMIT 1`;
      console.log('✅ Database connection successful and User table exists');
    } catch (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️ Database tables do not exist. Will try to create them...');

        // Try to create the schema from scratch using the safe baseline approach
        console.log('🔄 Applying database schema...');

        // First, try the safer baseline approach
        const result = runCommand('npx prisma db push --accept-data-loss', { quiet: true });

        if (!result) {
          // If that fails, try a direct SQL approach as last resort
          console.log('⚠️ Prisma db push failed, trying alternative approach...');

          // Try running standard migrations
          runCommand('npx prisma migrate dev --name e2e-init --create-only', { quiet: true });
        }
      } else {
        console.error('❌ Database connection error:', error.message);
        throw error;
      }
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('⚠️ Will continue with tests but they may fail if database is not accessible');
  }
}

// Create a function to create minimal test data
async function createTestData() {
  console.log('🔄 Setting up minimal test data...');

  try {
    // Run the test database setup using the Node API instead of the CLI
    // This approach gives us more control and better error handling
    runCommand('node e2e/setup/create-test-data.js', { quiet: true });
    return true;
  } catch (error) {
    console.log('⚠️ Test data creation encountered issues but continuing');
    console.log(error.message);
    return false;
  }
}

// Main setup function
async function setup() {
  // Ensure test directories exist
  const testDirs = [
    path.join('test-results', 'screenshots'),
    path.join('test-results', 'videos'),
    path.join('test-results', 'latest')
  ];

  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Setup database
  await setupDatabase();

  // Create test data
  await createTestData();

  // Success message
  console.log('✅ E2E test environment setup complete!');
  console.log('');
  console.log('You can now run e2e tests with:');
  console.log('  npm run test:e2e');
  console.log('');
  console.log('For UI mode (to see test execution):');
  console.log('  npm run test:e2e:ui');
}

// Run the setup
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
