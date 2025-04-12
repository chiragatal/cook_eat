#!/usr/bin/env node

/**
 * Setup script for e2e tests
 * This script ensures the e2e test environment is properly set up
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.test' });

console.log('🔧 Setting up e2e test environment...');

// Check if .env.test file exists
if (!fs.existsSync('.env.test')) {
  console.log('⚠️  Creating .env.test file with default settings');
  const envContent = `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cook_eat_test"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-do-not-use-in-production"
`;
  fs.writeFileSync('.env.test', envContent);
}

// Ensure prisma migrations are up to date
try {
  console.log('🔄 Running prisma migrations...');
  execSync('npx prisma migrate dev --name e2e-setup --skip-generate', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Migration failed, but this might be OK if schema is already up to date');
}

// Generate Prisma client
try {
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Ensure test database is ready
try {
  console.log('🔄 Setting up test database...');
  execSync('npm run setup-test-db', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to set up test database:', error.message);
  process.exit(1);
}

// Ensure e2e test directories exist
const testDirs = [
  path.join('test-results', 'screenshots'),
  path.join('test-results', 'videos')
];

for (const dir of testDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Success message
console.log('✅ E2E test environment setup complete!');
console.log('');
console.log('You can now run e2e tests with:');
console.log('  npm run test:e2e');
console.log('');
console.log('For UI mode (to see test execution):');
console.log('  npm run test:e2e -- --ui');
