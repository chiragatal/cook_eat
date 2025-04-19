// Script to create a test user with a known password
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Define test user details
    const email = 'test_e2e_new@example.com';
    const password = 'password12345';

    console.log(`Creating test user with email: ${email}`);

    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`Password hash: ${passwordHash}`);

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: 'New Test User',
        passwordHash,
        isAdmin: false
      },
      create: {
        id: 'newtest-0000-0000-0000-000000000001',
        email,
        name: 'New Test User',
        passwordHash,
        isAdmin: false
      }
    });

    console.log('User created/updated successfully:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);

    // Verify the password works
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log(`\nPassword verification: ${isPasswordValid ? 'Success' : 'Failed'}`);

    // Also try to update the standard test user with a new hash
    console.log('\nUpdating standard test user...');
    const standardUser = await prisma.user.update({
      where: { email: 'test_e2e_test@example.com' },
      data: {
        passwordHash
      }
    });

    console.log('Standard test user updated:');
    console.log(`- ID: ${standardUser.id}`);
    console.log(`- Email: ${standardUser.email}`);

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
