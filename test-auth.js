// Test authentication script to check user credentials
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    // Test both users
    const users = [
      'test_e2e_test@example.com',  // standard test user
      'test_e2e_new@example.com'    // new test user
    ];

    const password = 'password12345';

    for (const email of users) {
      console.log(`\n============================================`);
      console.log(`Testing authentication for email: ${email}`);
      console.log(`============================================`);

      // Retrieve the user from the database
      const user = await prisma.user.findUnique({
        where: { email }
      });

      console.log('User found in database:', user ? 'Yes' : 'No');

      if (!user) {
        console.log('User not found in database');
        continue;
      }

      console.log('User details:');
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Name: ${user.name}`);
      console.log(`- Password hash: ${user.passwordHash}`);

      // Test the password
      console.log('\nPassword verification:');
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log(`Password '${password}' valid: ${isPasswordValid ? 'Yes' : 'No'}`);
    }
  } catch (error) {
    console.error('Error during authentication test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
