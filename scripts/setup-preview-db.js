#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better readability
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

// Database connection string
const dbUrl = process.env.DATABASE_URL || "postgres://neondb_owner:npg_kq7msfjdbL1i@ep-aged-bird-a1wn6ara-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

console.log(`\n${colors.magenta}=== SETTING UP PREVIEW DATABASE ===${colors.reset}\n`);
console.log(`${colors.cyan}This script will reset and set up your preview database${colors.reset}`);
console.log(`${colors.cyan}Database URL: ${dbUrl}${colors.reset}\n`);

// Function to execute commands
function runCommand(command, description) {
  console.log(`${colors.yellow}${description}...${colors.reset}`);
  try {
    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: dbUrl
      }
    });
    console.log(`${colors.green}✓ ${description} completed successfully${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ ${description} failed: ${error.message}${colors.reset}\n`);
    return false;
  }
}

// Main process
async function setupPreviewDb() {
  try {
    // Step 1: Generate Prisma client
    if (!runCommand('npx prisma generate', 'Generating Prisma client')) {
      throw new Error('Failed to generate Prisma client');
    }

    // Step 2: Create a temporary SQL file to drop all tables
    const schemaName = 'public';
    const dropTablesScript = path.join(__dirname, 'drop_tables_temp.sql');

    fs.writeFileSync(dropTablesScript, `
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers
    EXECUTE 'SET session_replication_role = replica';

    -- Drop all tables in the specified schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${schemaName}') LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
    END LOOP;

    -- Re-enable triggers
    EXECUTE 'SET session_replication_role = DEFAULT';
END $$;

-- Also drop the _prisma_migrations table specifically
DROP TABLE IF EXISTS _prisma_migrations;
`);

    // Step 3: Run the SQL script to drop all tables
    const connectionString = dbUrl.replace(/^postgres:\/\//, '');
    // Extract the database name from the connection string
    const dbName = connectionString.split('/').pop().split('?')[0];

    if (!runCommand(`cat ${dropTablesScript} | npx prisma db execute --stdin`, 'Dropping existing tables')) {
      throw new Error('Failed to drop existing tables');
    }

    // Clean up the temporary file
    fs.unlinkSync(dropTablesScript);

    // Step 4: Apply the schema directly without migrations
    if (!runCommand('npx prisma db push --force-reset', 'Applying database schema')) {
      throw new Error('Failed to apply database schema');
    }

    // Step 5: Create basic seed data (optional)
    console.log(`${colors.yellow}Would you like to seed the database with test data? (Y/N)${colors.reset}`);
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        seedDatabase();
      } else {
        console.log(`${colors.cyan}Skipping database seeding${colors.reset}`);
        console.log(`\n${colors.magenta}=== PREVIEW DATABASE SETUP COMPLETED ===${colors.reset}\n`);
      }
    });

  } catch (error) {
    console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Function to seed the database with test data
function seedDatabase() {
  console.log(`${colors.yellow}Creating seed data...${colors.reset}`);

  // Create a temporary seed script
  const seedScript = path.join(__dirname, 'temp_seed.js');

  fs.writeFileSync(seedScript, `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "${dbUrl}" } }
});

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      passwordHash: "$2a$10$j8JxY3z9rKRL47LLOzQ1B.w0qQCUQQMA87g6HcN5XnJJFqe5w5AcG", // password: "password123"
      isAdmin: true,
      posts: {
        create: [
          {
            title: "Test Recipe",
            description: "A test recipe for development",
            ingredients: "Ingredient 1\\nIngredient 2\\nIngredient 3",
            steps: "Step 1: Do this\\nStep 2: Do that\\nStep 3: Finish",
            notes: "This is a test recipe",
            images: "https://via.placeholder.com/150",
            tags: "test,development",
            category: "Test",
            cookingTime: 30,
            difficulty: "Easy",
            isPublic: true
          }
        ]
      }
    }
  });

  console.log("Database seeded with test data!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`);

  // Run the seed script
  if (runCommand(`node ${seedScript}`, 'Seeding database')) {
    console.log(`${colors.green}✓ Database seeded successfully${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Database seeding failed${colors.reset}`);
  }

  // Clean up the temporary file
  fs.unlinkSync(seedScript);

  console.log(`\n${colors.magenta}=== PREVIEW DATABASE SETUP COMPLETED ===${colors.reset}\n`);
}

// Start the setup process
setupPreviewDb();
