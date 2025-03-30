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

console.log(`${colors.magenta}=== VERCEL DEPLOYMENT TROUBLESHOOTER ===${colors.reset}\n`);

// 1. Check vercel.json
console.log(`${colors.cyan}[1/5] Checking vercel.json config${colors.reset}`);
const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');

try {
  if (!fs.existsSync(vercelConfigPath)) {
    console.log(`${colors.red}✗ vercel.json not found!${colors.reset}`);
    console.log(`${colors.yellow}SOLUTION: Create a vercel.json file with:${colors.reset}`);
    console.log(`
{
  "version": 2,
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
`);
  } else {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    if (!vercelConfig.buildCommand || !vercelConfig.version || vercelConfig.framework !== 'nextjs') {
      console.log(`${colors.red}✗ vercel.json has incorrect configuration${colors.reset}`);
    } else if (vercelConfig.env) {
      console.log(`${colors.yellow}⚠ vercel.json contains environment variables${colors.reset}`);
      console.log(`${colors.yellow}SOLUTION: Move environment variables to Vercel dashboard${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ vercel.json looks good${colors.reset}`);
    }
  }
} catch (error) {
  console.log(`${colors.red}✗ Error reading vercel.json: ${error.message}${colors.reset}`);
}

// 2. Check package.json build script
console.log(`\n${colors.cyan}[2/5] Checking package.json build script${colors.reset}`);
const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const buildScript = packageJson.scripts?.build;

  if (!buildScript) {
    console.log(`${colors.red}✗ No build script found in package.json${colors.reset}`);
  } else if (!buildScript.includes('prisma generate') || !buildScript.includes('prisma migrate deploy')) {
    console.log(`${colors.yellow}⚠ Build script missing Prisma commands${colors.reset}`);
    console.log(`${colors.yellow}SOLUTION: Update the build script to:${colors.reset}`);
    console.log(`"build": "prisma generate && prisma migrate deploy && next build"`);
  } else {
    console.log(`${colors.green}✓ Build script looks good${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}✗ Error reading package.json: ${error.message}${colors.reset}`);
}

// 3. Check for .env files
console.log(`\n${colors.cyan}[3/5] Checking environment files${colors.reset}`);
const envFiles = [
  { path: path.join(__dirname, '..', '.env.production'), name: '.env.production' },
  { path: path.join(__dirname, '..', '.env.local'), name: '.env.local' },
  { path: path.join(__dirname, '..', '.env'), name: '.env' }
];

let foundEnvFile = false;
envFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    foundEnvFile = true;
    console.log(`${colors.green}✓ Found ${file.name}${colors.reset}`);

    // Check if it contains sensitive environment variables that should be in Vercel dashboard
    const content = fs.readFileSync(file.path, 'utf8');
    if (content.includes('DATABASE_URL=') && !content.includes('# DATABASE_URL=')) {
      console.log(`${colors.yellow}⚠ ${file.name} contains DATABASE_URL${colors.reset}`);
      console.log(`${colors.yellow}SOLUTION: Move DATABASE_URL to Vercel dashboard environment variables${colors.reset}`);
    }
  }
});

if (!foundEnvFile) {
  console.log(`${colors.yellow}⚠ No environment files found${colors.reset}`);
  console.log(`${colors.yellow}SOLUTION: Create .env.production as a placeholder and set actual values in Vercel dashboard${colors.reset}`);
}

// 4. Check Prisma schema
console.log(`\n${colors.cyan}[4/5] Checking Prisma schema${colors.reset}`);
const prismaSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

try {
  if (!fs.existsSync(prismaSchemaPath)) {
    console.log(`${colors.red}✗ Prisma schema not found!${colors.reset}`);
  } else {
    const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');

    if (!schemaContent.includes('provider = "postgresql"')) {
      console.log(`${colors.yellow}⚠ Prisma schema does not use PostgreSQL${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Prisma schema looks good${colors.reset}`);
    }
  }
} catch (error) {
  console.log(`${colors.red}✗ Error reading Prisma schema: ${error.message}${colors.reset}`);
}

// 5. Check for deployment documentation
console.log(`\n${colors.cyan}[5/5] Checking for deployment documentation${colors.reset}`);
const deploymentDocs = [
  { path: path.join(__dirname, '..', 'GIT-DEPLOYMENT.md'), name: 'GIT-DEPLOYMENT.md' },
  { path: path.join(__dirname, '..', 'DEPLOYMENT.md'), name: 'DEPLOYMENT.md' }
];

deploymentDocs.forEach(doc => {
  if (fs.existsSync(doc.path)) {
    console.log(`${colors.green}✓ Found ${doc.name}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ ${doc.name} not found${colors.reset}`);
  }
});

// Final summary
console.log(`\n${colors.magenta}=== TROUBLESHOOTING SUMMARY ===${colors.reset}`);
console.log(`
${colors.yellow}If your Vercel deployment is failing, check:${colors.reset}

1. ${colors.cyan}Vercel Dashboard${colors.reset}:
   - Environment variables are correctly set
   - Build logs for specific error messages

2. ${colors.cyan}Database${colors.reset}:
   - Database is accessible from Vercel's servers
   - Migrations are being applied correctly

3. ${colors.cyan}Git Integration${colors.reset}:
   - Ensure your repository is correctly linked to Vercel
   - Verify that automatic deployments are enabled

4. ${colors.cyan}Manual Deployment${colors.reset}:
   - Try running 'vercel' command locally to see detailed errors

For more detailed troubleshooting, refer to DEPLOYMENT.md
`);

console.log(`${colors.green}To manually trigger a deployment, run:${colors.reset}`);
console.log(`npx vercel\n`);
