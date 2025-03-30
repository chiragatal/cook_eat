import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function getReactions(postId: string) {
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

export async function getUserReactions(postId: string, userId: string) {
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

export async function toggleReaction(postId: string, userId: string, type: string) {
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

export { prisma };
