#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, writeFileSync } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load environment variables from .env.test if available
const envPath = path.join(__dirname, '..', '.env.test');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Setup Test Database for E2E tests
 */
async function setupTestDb() {
  console.log('\n🔧 Setting up test database...\n');

  if (!process.env.TEST_DATABASE_URL) {
    console.error('❌ TEST_DATABASE_URL is not set. Please check your .env.test file.');
    return false;
  }

  let prisma;
  try {
    // Connect to the database
    prisma = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL
    });

    await prisma.$connect();
    console.log('✅ Connected to database');

    // Create test_e2e schema if it doesn't exist
    try {
      await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test_e2e;`;
      console.log('✅ Created or confirmed test_e2e schema');
    } catch (error) {
      console.error('❌ Error creating schema:', error.message);
      return false;
    }

    // Use proper connection string with schema for Prisma push
    const dbUrlWithSchema = process.env.TEST_DATABASE_URL.replace(/\?/, '?schema=test_e2e&');
    console.log(`Using database URL with schema: ${dbUrlWithSchema.split('?')[0]}?schema=test_e2e&...`);

    // Disconnect current client before modifying DATABASE_URL
    await prisma.$disconnect();

    // Set environment variable for prisma db push
    process.env.DATABASE_URL = dbUrlWithSchema;

    // Push the schema to the test_e2e schema using Prisma CLI
    console.log('\nPushing schema to test_e2e...');
    console.log('This may take a moment...\n');

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      // Generate Prisma client
      await execPromise('npx prisma generate');
      console.log('✅ Generated Prisma client');

      // Push schema to database
      const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss --skip-generate');

      if (stderr) {
        console.error('⚠️ Schema push produced warnings:', stderr);
      }

      if (stdout.includes('successfully')) {
        console.log('✅ Schema pushed to test_e2e successfully');
      } else {
        console.log('⚠️ Schema push output:', stdout);
      }

      // Reconnect to check if tables were created
      prisma = new PrismaClient({
        datasourceUrl: dbUrlWithSchema
      });

      await prisma.$connect();

      // Check if the essential tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'test_e2e'
        ORDER BY table_name;
      `;

      if (tables.length === 0) {
        console.error('❌ No tables were created in the test_e2e schema.');
        return false;
      }

      console.log(`\n✅ Created ${tables.length} tables in test_e2e schema:`);

      // Log table names
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });

      console.log('\n✅ Test database setup complete!');
      console.log('\nYou can now run tests with:');
      console.log('  npm run test:e2e:quiet');
      console.log('  npm run test:e2e:min');

      return true;
    } catch (error) {
      console.error('❌ Error pushing schema:', error.message);
      if (error.stderr) {
        console.error('Error details:', error.stderr);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(console.error);
    }
  }
}

// Run if script is executed directly
if (require.main === module) {
  setupTestDb()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error in setup:', error);
      process.exit(1);
    });
} else {
  module.exports = setupTestDb;
}
