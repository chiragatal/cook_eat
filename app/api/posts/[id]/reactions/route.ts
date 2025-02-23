import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/config';
import { prisma } from '../../../../../lib/prisma';

// Valid reaction types
export const REACTION_TYPES = [
  'LOVE',        // ❤️ General love/like
  'YUM',         // 😋 Delicious
  'WANT_TO_TRY', // 🔖 Want to try
  'MADE_IT',     // 👩‍🍳 Made this recipe
  'FAVORITE'     // ⭐ Add to favorites
] as const;

type ReactionType = typeof REACTION_TYPES[number];

// GET reactions for a post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id);
    const session = await getServerSession(authOptions);

    // Get all reactions for the post
    const reactions = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: true,
    });

    // If user is logged in, get their reactions
    let userReactions: string[] = [];
    if (session?.user?.id) {
      const userReactionsData = await prisma.reaction.findMany({
        where: {
          postId,
          userId: session.user.id,
        },
        select: { type: true },
      });
      userReactions = userReactionsData.map(r => r.type);
    }

    return NextResponse.json({
      reactions: reactions.map(r => ({
        type: r.type,
        count: r._count,
      })),
      userReactions,
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// POST to toggle a reaction
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const postId = parseInt(params.id);
    const { type } = await request.json();

    // Validate reaction type
    if (!REACTION_TYPES.includes(type as ReactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Check if reaction exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId: session.user.id,
        type,
      },
    });

    if (existingReaction) {
      // Remove reaction if it exists
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      // Add reaction if it doesn't exist
      await prisma.reaction.create({
        data: {
          type,
          postId,
          userId: session.user.id,
        },
      });
    }

    // Return updated reactions
    const reactions = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: true,
    });

    const userReactionsData = await prisma.reaction.findMany({
      where: {
        postId,
        userId: session.user.id,
      },
      select: { type: true },
    });

    return NextResponse.json({
      reactions: reactions.map(r => ({
        type: r.type,
        count: r._count,
      })),
      userReactions: userReactionsData.map(r => r.type),
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
