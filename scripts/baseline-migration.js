#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

console.log(`${colors.magenta}=== PRISMA DATABASE BASELINE MIGRATION ===${colors.reset}\n`);
console.log(`${colors.yellow}This script will create a baseline migration for your existing database.${colors.reset}`);
console.log(`${colors.yellow}It's designed to fix the "P3005: The database schema is not empty" error.${colors.reset}\n`);

// Create a new baseline migration
try {
  console.log(`${colors.cyan}Step 1: Creating migrations directory if it doesn't exist...${colors.reset}`);
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log(`${colors.green}✓ Created migrations directory${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Migrations directory already exists${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Step 2: Creating a baseline migration from current schema...${colors.reset}`);
  const baselineName = `0_baseline`;
  const baselineDir = path.join(migrationsDir, baselineName);

  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });

    // Get current schema SQL
    console.log(`${colors.blue}Generating SQL from current schema...${colors.reset}`);
    let schemaSql;
    try {
      // Use Prisma to generate SQL
      schemaSql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script').toString();
    } catch (error) {
      console.error(`${colors.red}Failed to generate schema SQL:${colors.reset}`, error.message);
      process.exit(1);
    }

    // Create migration.sql file
    const migrationSqlPath = path.join(baselineDir, 'migration.sql');
    fs.writeFileSync(migrationSqlPath, schemaSql);
    console.log(`${colors.green}✓ Created migration.sql${colors.reset}`);

    // Create migration.meta.json file
    const metaJson = {
      "checksum": "0000000000000000000000000000000000000000000000000000000000000000",
      "clientHash": "00000000000000000000000000000000000000000000000000000000",
      "createdAt": new Date().toISOString()
    };
    const metaJsonPath = path.join(baselineDir, 'migration.meta.json');
    fs.writeFileSync(metaJsonPath, JSON.stringify(metaJson, null, 2));
    console.log(`${colors.green}✓ Created migration.meta.json${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Baseline migration already exists${colors.reset}`);
  }

  console.log(`\n${colors.cyan}Step 3: Marking the migration as applied...${colors.reset}`);
  try {
    execSync('npx prisma migrate resolve --applied 0_baseline', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Marked baseline migration as applied${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to mark migration as applied:${colors.reset}`, error.message);
    process.exit(1);
  }

  console.log(`\n${colors.magenta}=== BASELINE MIGRATION COMPLETE ===${colors.reset}`);
  console.log(`\n${colors.green}Your database is now baselined and future migrations should work properly.${colors.reset}`);
  console.log(`${colors.yellow}You can now redeploy your application.${colors.reset}\n`);
} catch (error) {
  console.error(`${colors.red}Error during baseline migration:${colors.reset}`, error.message);
  process.exit(1);
}
