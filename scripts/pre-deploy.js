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

console.log(`${colors.magenta}=== PRE-DEPLOYMENT CHECKS COMPLETED SUCCESSFULLY ===${colors.reset}`);
console.log(`\n${colors.green}You can now safely push to Git to trigger deployment!${colors.reset}\n`);
