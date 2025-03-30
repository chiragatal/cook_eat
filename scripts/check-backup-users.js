const fs = require('fs');
const path = require('path');

// Get the backup file path from command line args or use the most recent backup
let backupFilePath = process.argv[2];

if (!backupFilePath) {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    console.error('Backup directory does not exist!');
    process.exit(1);
  }

  // Get all backup files and sort by modification time (descending)
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('db-backup-') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      mtime: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (backupFiles.length === 0) {
    console.error('No backup files found!');
    process.exit(1);
  }

  // Use the most recent backup
  backupFilePath = backupFiles[0].path;
  console.log(`Using most recent backup: ${backupFiles[0].name}`);
}

console.log(`Checking users in: ${backupFilePath}`);

// Read the backup file
const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

// Print user information
if (backupData.User && backupData.User.length > 0) {
  console.log(`Found ${backupData.User.length} users in backup:`);
  backupData.User.forEach((user, index) => {
    console.log(`\nUser ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created At: ${user.createdAt}`);
  });
} else {
  console.log('No users found in the backup file.');
}
