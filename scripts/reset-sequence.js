const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetSequence() {
  try {
    // Get the maximum ID currently in the Post table
    const result = await prisma.$queryRaw`
      SELECT MAX(id) as max_id FROM "Post"
    `;

    const maxId = result[0]?.max_id || 0;
    console.log(`Found maximum Post ID: ${maxId}`);

    // Reset the sequence to start from max_id + 1
    await prisma.$executeRawUnsafe(
      `ALTER SEQUENCE "Post_id_seq" RESTART WITH ${maxId + 1}`
    );

    console.log(`Successfully reset Post ID sequence to start from ${maxId + 1}`);
  } catch (error) {
    console.error('Error resetting sequence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSequence();
