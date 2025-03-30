const { PrismaClient } = require('@prisma/client');

async function updateAllPostsToPublic() {
  const prisma = new PrismaClient();

  try {
    console.log('Updating all posts to be public...');

    const result = await prisma.post.updateMany({
      where: { isPublic: false },
      data: { isPublic: true }
    });

    console.log(`Successfully updated ${result.count} posts to public.`);

    // Let's get all posts to verify
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        title: true,
        userId: true,
        isPublic: true
      }
    });

    console.log(`Total posts in database: ${posts.length}`);
    console.log(`Public posts: ${posts.filter(p => p.isPublic).length}`);
    console.log(`Private posts: ${posts.filter(p => !p.isPublic).length}`);

  } catch (error) {
    console.error('Error updating posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateAllPostsToPublic();
