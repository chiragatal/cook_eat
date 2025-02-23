import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

export async function getReactions(postId: number) {
  try {
    const allReactions = await prisma.reaction.findMany({
      where: { postId },
      select: { type: true },
    });
    return allReactions;
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }
}

export async function getUserReactions(postId: number, userId: number) {
  try {
    const userReactions = await prisma.reaction.findMany({
      where: {
        postId,
        userId,
      },
      select: { type: true },
    });
    return userReactions;
  } catch (error) {
    console.error('Error fetching user reactions:', error);
    return [];
  }
}

export async function toggleReaction(postId: number, userId: number, type: string) {
  try {
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId,
        type,
      },
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await prisma.reaction.create({
        data: {
          type,
          postId,
          userId,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return false;
  }
}

export default prisma;
