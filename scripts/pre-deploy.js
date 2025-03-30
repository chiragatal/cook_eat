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

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Verify vercel.json configuration
function checkVercelConfig() {
  console.log(`\n${colors.cyan}CHECKING:${colors.reset} Vercel configuration`);

  const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
  if (!fs.existsSync(vercelConfigPath)) {
    console.log(`${colors.yellow}WARNING: vercel.json file not found${colors.reset}`);
    return true;
  }

  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    // Check for minimal required configuration
    const hasRequiredFields =
      vercelConfig.version &&
      vercelConfig.buildCommand &&
      vercelConfig.framework === 'nextjs';

    if (!hasRequiredFields) {
      console.log(`${colors.yellow}WARNING: vercel.json missing required fields (version, buildCommand, framework)${colors.reset}`);
    }

    // Check for potentially problematic configuration
    if (vercelConfig.env) {
      console.log(`${colors.yellow}WARNING: Environment variables in vercel.json should be set via Vercel dashboard instead${colors.reset}`);
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}ERROR checking vercel.json: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main pre-deployment process
console.log(`${colors.magenta}=== STARTING PRE-DEPLOYMENT CHECKS ===${colors.reset}`);

// 1. Backup the database
if (!executeStep('node scripts/backup-database.js', 'Backing up database')) {
  console.log(`${colors.yellow}WARNING: Database backup failed, but continuing with checks${colors.reset}`);
}

// 2. Run type checking
if (!executeStep('npm run type-check', 'Type checking TypeScript code')) {
  console.log(`${colors.red}TYPE CHECKING FAILED. Fix TypeScript errors before pushing to Git.${colors.reset}`);
  process.exit(1);
}

// 3. Generate Prisma client
if (!executeStep('npx prisma generate', 'Generating Prisma client')) {
  console.log(`${colors.red}PRISMA CLIENT GENERATION FAILED. Fix issues before pushing to Git.${colors.reset}`);
  process.exit(1);
}

// 4. Check Vercel configuration
if (!checkVercelConfig()) {
  console.log(`${colors.yellow}WARNING: Vercel configuration check failed, but continuing.${colors.reset}`);
}

console.log(`${colors.magenta}=== PRE-DEPLOYMENT CHECKS COMPLETED SUCCESSFULLY ===${colors.reset}`);
console.log(`\n${colors.green}You can now safely push to Git to trigger deployment!${colors.reset}`);
console.log(`\n${colors.yellow}IMPORTANT: Make sure your environment variables are set in the Vercel dashboard:${colors.reset}`);
console.log(`  • DATABASE_URL - Your PostgreSQL connection string`);
console.log(`  • NEXTAUTH_URL - Your production URL (https://your-app.vercel.app)`);
console.log(`  • NEXTAUTH_SECRET - Your NextAuth secret key\n`);
