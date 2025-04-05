#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, writeFileSync } = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.test if available
const envPath = path.join(__dirname, '..', '.env.test');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Setup Test Database for E2E tests
 */
function setupTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL;

  if (!testDbUrl) {
    console.error('\x1b[31mERROR: TEST_DATABASE_URL not set in .env.test\x1b[0m');
    console.log('Please specify a test database URL in your .env.test file');
    console.log('Example: TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cook_eat_test');
    process.exit(1);
  }

  console.log('\x1b[34m=============================================\x1b[0m');
  console.log('\x1b[34m       Setting up Test Database\x1b[0m');
  console.log('\x1b[34m=============================================\x1b[0m');

  try {
    // Extract database name from URL
    const dbNameMatch = testDbUrl.match(/\/([^\/]+)$/);
    const dbName = dbNameMatch ? dbNameMatch[1] : null;

    if (!dbName) {
      throw new Error('Could not parse database name from TEST_DATABASE_URL');
    }

    console.log(`Setting up test database: ${dbName}`);

    // Run database setup commands
    try {
      // Try to create the database (may fail if it already exists)
      const createCommand = `createdb ${dbName}`;
      console.log(`Running: ${createCommand}`);
      execSync(createCommand, { stdio: 'inherit' });
    } catch (err) {
      console.log('Database may already exist, continuing...');
    }

    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl
      }
    });

    // Run migrations on test database
    console.log('Running migrations on test database...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl
      }
    });

    // Initialize test data
    console.log('Initializing test data...');
    execSync('npm run test:setup-db', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl
      }
    });

    console.log('\x1b[32m=============================================\x1b[0m');
    console.log('\x1b[32m   Test database setup completed successfully\x1b[0m');
    console.log('\x1b[32m=============================================\x1b[0m');

  } catch (error) {
    console.error('\x1b[31mERROR setting up test database:\x1b[0m', error.message);
    process.exit(1);
  }
}

// Run the setup
setupTestDatabase();
