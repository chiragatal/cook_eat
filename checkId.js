const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const highestUser = await prisma.user.findFirst({
      orderBy: { id: 'desc' }
    });
    console.log('Highest user ID:', highestUser?.id);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
