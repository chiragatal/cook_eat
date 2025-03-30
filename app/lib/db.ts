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

export async function getUserReactionsForPost(userId: string, postId: string) {
  try {
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Format reactions for response
    return reactions
      .filter((r) => r.userId === userId)
      .map((r) => r.type);
  } catch (error) {
    console.error('Error fetching user reactions:', error);
    return [];
  }
}

export async function reactToPost(userId: string, postId: string, type: string) {
  try {
    // Find existing reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId,
        type,
      },
    });

    // Toggle the reaction
    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
      return false; // Reaction removed
    } else {
      await prisma.reaction.create({
        data: {
          type,
          postId,
          userId,
        },
      });
      return true; // Reaction added
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return false;
  }
}

export default prisma;
