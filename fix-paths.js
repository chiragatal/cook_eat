#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Find all .ts and .tsx files recursively in the app directory
exec("find app -type f -name '*.ts' -o -name '*.tsx'", (error, stdout, stderr) => {
  if (error) {
    console.error(`Error finding files: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }

  const files = stdout.trim().split('\n');
  console.log(`Found ${files.length} files to process`);

  files.forEach(file => {
    // Skip if file doesn't exist (empty lines, etc.)
    if (!fs.existsSync(file) || !file) return;

    try {
      let content = fs.readFileSync(file, 'utf8');
      let originalContent = content;
      let updated = false;

      // Calculate relative path from the file to project root
      const fileDir = path.dirname(file);
      const relativeToRoot = path.relative(fileDir, '.');

      // Replace @/lib/prisma imports
      if (content.includes('@/lib/prisma')) {
        const prismaPath = path.join(relativeToRoot, 'lib/prisma').replace(/\\/g, '/');
        content = content.replace(/@\/lib\/prisma/g, prismaPath);
        updated = true;
        console.log(`- Fixed prisma import in ${file}`);
      }

      // Replace @/app/ imports
      if (content.includes('@/app/')) {
        // For paths in app directory, we need to go up to the parent of app, then back into app
        const appPath = path.join(relativeToRoot, 'app').replace(/\\/g, '/');
        content = content.replace(/@\/app\//g, `${appPath}/`);
        updated = true;
        console.log(`- Fixed app imports in ${file}`);
      }

      // Only write to file if content was changed
      if (updated) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✓ Updated ${file}`);
      }
    } catch (readError) {
      console.error(`Error processing ${file}: ${readError.message}`);
    }
  });

  console.log('Path fixing completed!');
});
