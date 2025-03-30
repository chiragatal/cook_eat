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

function executeStep(command, description) {
  console.log(`\n${colors.cyan}EXECUTING:${colors.reset} ${description}`);
  console.log(`${colors.yellow}${command}${colors.reset}\n`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✓ SUCCESS${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ FAILED${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

console.log(`${colors.magenta}=== PRISMA MIGRATION FIXER ===${colors.reset}\n`);
console.log(`${colors.yellow}This script will fix common Prisma migration issues for deployment${colors.reset}`);
console.log(`${colors.yellow}It's especially helpful for the "P3005: The database schema is not empty" error${colors.reset}\n`);

// 1. Ensure the migrations directory exists
console.log(`${colors.cyan}Step 1: Ensuring migrations directory exists${colors.reset}`);
const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log(`${colors.green}✓ Created migrations directory${colors.reset}`);
} else {
  console.log(`${colors.green}✓ Migrations directory already exists${colors.reset}`);
}

// 2. Create baseline migration
console.log(`\n${colors.cyan}Step 2: Creating or updating baseline migration${colors.reset}`);
const baselineName = `0_baseline`;
const baselineDir = path.join(migrationsDir, baselineName);

if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });

  // Generate SQL from current schema
  console.log(`${colors.blue}Generating SQL from current schema...${colors.reset}`);
  let schemaSql;
  try {
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

// 3. Mark all migrations as applied
console.log(`\n${colors.cyan}Step 3: Finding all migrations${colors.reset}`);
const migrations = fs
  .readdirSync(migrationsDir)
  .filter(dir => {
    const stats = fs.statSync(path.join(migrationsDir, dir));
    return stats.isDirectory() && dir !== 'node_modules';
  });

console.log(`${colors.green}Found ${migrations.length} migrations:${colors.reset}`);
migrations.forEach((migration, index) => {
  console.log(`  ${index + 1}. ${migration}`);
});

console.log(`\n${colors.cyan}Step 4: Marking all migrations as applied${colors.reset}`);
let allSuccess = true;
for (const migration of migrations) {
  try {
    console.log(`${colors.blue}Marking migration ${migration} as applied...${colors.reset}`);
    execSync(`npx prisma migrate resolve --applied ${migration}`, { stdio: 'inherit' });
    console.log(`${colors.green}✓ Successfully marked ${migration} as applied${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Failed to mark migration ${migration} as applied:${colors.reset}`, error.message);
    allSuccess = false;
  }
}

// 4. Verify migrations
if (allSuccess) {
  console.log(`\n${colors.cyan}Step 5: Verifying migration status${colors.reset}`);
  try {
    const status = execSync('npx prisma migrate status', { encoding: 'utf-8' });
    if (status.includes('Database schema is up to date')) {
      console.log(`${colors.green}✓ All migrations are correctly applied${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Some migrations may still need attention:${colors.reset}`);
      console.log(status);
    }
  } catch (error) {
    console.error(`${colors.red}Failed to verify migration status:${colors.reset}`, error.message);
  }
}

// 5. Generate client
console.log(`\n${colors.cyan}Step 6: Generating Prisma client${colors.reset}`);
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Successfully generated Prisma client${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Failed to generate Prisma client:${colors.reset}`, error.message);
}

console.log(`\n${colors.magenta}=== MIGRATION FIX PROCESS COMPLETE ===${colors.reset}`);
if (allSuccess) {
  console.log(`\n${colors.green}All migrations have been successfully processed.${colors.reset}`);
  console.log(`${colors.green}Your database should now be ready for deployment.${colors.reset}`);
} else {
  console.log(`\n${colors.yellow}Some migrations could not be processed. Check the errors above.${colors.reset}`);
  console.log(`${colors.yellow}You may need to make manual adjustments.${colors.reset}`);
}

console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
console.log(`1. Commit changes: ${colors.blue}git add . && git commit -m "Fix Prisma migrations"${colors.reset}`);
console.log(`2. Push to deploy: ${colors.blue}git push${colors.reset}`);
console.log('');
