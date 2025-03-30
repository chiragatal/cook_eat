import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
