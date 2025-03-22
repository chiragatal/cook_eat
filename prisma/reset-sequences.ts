const { PrismaClient } = require('@prisma/client');

async function resetSequences() {
  const prisma = new PrismaClient();
  try {
    // Connect to the database
    await prisma.$connect();

    // Find the highest ID in the Post table
    const maxPostResult = await prisma.$queryRaw`SELECT MAX(id) FROM "Post"`;
    const maxPostId = maxPostResult[0]?.max || 0;

    // Reset the sequence to be higher than the highest ID
    await prisma.$executeRaw`SELECT setval('"Post_id_seq"', ${maxPostId + 1}, true)`;

    console.log(`Post sequence reset to ${maxPostId + 1}`);

    // Do the same for other tables if needed
    // User
    const maxUserResult = await prisma.$queryRaw`SELECT MAX(id) FROM "User"`;
    const maxUserId = maxUserResult[0]?.max || 0;
    await prisma.$executeRaw`SELECT setval('"User_id_seq"', ${maxUserId + 1}, true)`;
    console.log(`User sequence reset to ${maxUserId + 1}`);

    // Comment
    const maxCommentResult = await prisma.$queryRaw`SELECT MAX(id) FROM "Comment"`;
    const maxCommentId = maxCommentResult[0]?.max || 0;
    await prisma.$executeRaw`SELECT setval('"Comment_id_seq"', ${maxCommentId + 1}, true)`;
    console.log(`Comment sequence reset to ${maxCommentId + 1}`);

    // Reaction
    const maxReactionResult = await prisma.$queryRaw`SELECT MAX(id) FROM "Reaction"`;
    const maxReactionId = maxReactionResult[0]?.max || 0;
    await prisma.$executeRaw`SELECT setval('"Reaction_id_seq"', ${maxReactionId + 1}, true)`;
    console.log(`Reaction sequence reset to ${maxReactionId + 1}`);

    // CommentReaction
    const maxCommentReactionResult = await prisma.$queryRaw`SELECT MAX(id) FROM "CommentReaction"`;
    const maxCommentReactionId = maxCommentReactionResult[0]?.max || 0;
    await prisma.$executeRaw`SELECT setval('"CommentReaction_id_seq"', ${maxCommentReactionId + 1}, true)`;
    console.log(`CommentReaction sequence reset to ${maxCommentReactionId + 1}`);

  } catch (error) {
    console.error('Error resetting sequences:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSequences()
  .then(() => console.log('Successfully reset sequences'))
  .catch((error) => console.error('Failed to reset sequences:', error));
