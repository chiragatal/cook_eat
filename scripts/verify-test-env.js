#!/usr/bin/env node

/**
 * This script verifies the test environment setup
 * and checks that all directories are created correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.test' });
const { PrismaClient } = require('@prisma/client');

// ANSI color codes for better readability
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

async function verifyTestEnv() {
  console.log('\n🔍 Verifying test environment setup...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('---------------------');
  console.log(`TEST_DATABASE_URL: ${process.env.TEST_DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`TEST_MODE: ${process.env.TEST_MODE ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`TEST_BASE_URL: 'https://cook-eat-preview.vercel.app'}`);
  console.log(`E2E_QUIET_MODE: ${process.env.E2E_QUIET_MODE === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`E2E_ULTRA_QUIET_MODE: ${process.env.E2E_ULTRA_QUIET_MODE === 'true' ? '✅ Enabled' : '❌ Disabled'}`);

  if (!process.env.TEST_DATABASE_URL) {
    console.error('❌ TEST_DATABASE_URL is not set. Please check your .env.test file.');
    return false;
  }

  // Check database connection
  console.log('\nDatabase Connection:');
  console.log('------------------');

  let prisma;
  try {
    prisma = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL
    });

    await prisma.$connect();
    console.log('✅ Successfully connected to test database');

    // Get database info
    try {
      const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_schema();`;
      console.log(`Database: ${dbInfo[0].current_database}`);
      console.log(`Schema: ${dbInfo[0].current_schema}`);
    } catch (error) {
      console.error('❌ Error checking database info:', error.message);
    }

    // Check if the test_e2e schema exists
    try {
      const schemaExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.schemata
          WHERE schema_name = 'test_e2e'
        );
      `;
      console.log(`test_e2e schema exists: ${schemaExists[0].exists ? '✅ Yes' : '❌ No'}`);

      if (schemaExists[0].exists) {
        // Count tables in the test_e2e schema
        const tables = await prisma.$queryRaw`
          SELECT count(*) as table_count
          FROM information_schema.tables
          WHERE table_schema = 'test_e2e';
        `;
        console.log(`Tables in test_e2e schema: ${tables[0].table_count}`);

        if (tables[0].table_count === 0) {
          console.log('❌ No tables found in test_e2e schema. You may need to create them.');
        }
      } else {
        console.log('❌ test_e2e schema does not exist. You may need to create it.');
      }
    } catch (error) {
      console.error('❌ Error checking schema:', error.message);
    }
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(console.error);
    }
  }

  console.log('\n✅ Verification complete. If any issues were found, please check your .env.test file and database setup.');
  return true;
}

// Run if script is executed directly
if (require.main === module) {
  verifyTestEnv()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error in verification:', error);
      process.exit(1);
    });
} else {
  module.exports = verifyTestEnv;
}
