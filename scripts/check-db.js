const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Count records in each model
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    const commentCount = await prisma.comment.count();
    const reactionCount = await prisma.reaction.count();

    console.log('Database record counts:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Posts: ${postCount}`);
    console.log(`- Comments: ${commentCount}`);
    console.log(`- Reactions: ${reactionCount}`);

    // Get sample data
    console.log('\nSample user:');
    const user = await prisma.user.findFirst({
      include: {
        posts: {
          take: 1
        }
      }
    });

    if (user) {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Created At: ${user.createdAt}`);

      if (user.posts.length > 0) {
        console.log('\nSample post:');
        const post = user.posts[0];
        console.log(`ID: ${post.id}`);
        console.log(`Title: ${post.title}`);
        console.log(`User ID: ${post.userId}`);
      }
    }

    // Get a sample post with related data
    console.log('\nSample post with relations:');
    const fullPost = await prisma.post.findFirst({
      include: {
        user: true,
        comments: {
          take: 2,
          include: {
            user: true
          }
        },
        reactions: {
          take: 2,
          include: {
            user: true
          }
        }
      }
    });

    if (fullPost) {
      console.log(`Post ID: ${fullPost.id}`);
      console.log(`Title: ${fullPost.title}`);
      console.log(`Author: ${fullPost.user.name} (${fullPost.user.email})`);

      if (fullPost.comments.length > 0) {
        console.log('\nSample comments:');
        fullPost.comments.forEach((comment, i) => {
          console.log(`${i + 1}. ${comment.content} - by ${comment.user.name}`);
        });
      }

      if (fullPost.reactions.length > 0) {
        console.log('\nSample reactions:');
        fullPost.reactions.forEach((reaction, i) => {
          console.log(`${i + 1}. ${reaction.type} - by ${reaction.user.name}`);
        });
      }
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
