import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/config';
import { REACTION_TYPES, ReactionType } from './types';
import { prisma } from '../../../../../lib/db';

// GET reactions for a post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id);
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Get all reactions for the post
    const allReactions = await prisma.reaction.findMany({
      where: { postId },
      select: { type: true },
    });

    // Count reactions by type
    const reactionCounts = allReactions.reduce((acc, { type }) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Format reactions for response
    const reactions = Object.entries(reactionCounts).map(([type, count]) => ({
      type,
      count,
    }));

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
      reactions,
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
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const { type } = await request.json();

    // Validate reaction type
    if (!REACTION_TYPES.includes(type as ReactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Find existing reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        postId,
        userId: session.user.id,
        type,
      },
    });

    // Toggle the reaction
    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await prisma.reaction.create({
        data: {
          type,
          postId,
          userId: session.user.id,
        },
      });
    }

    // Get updated reactions
    const allReactions = await prisma.reaction.findMany({
      where: { postId },
      select: { type: true },
    });

    const reactionCounts = allReactions.reduce((acc, { type: reactionType }) => {
      acc[reactionType] = (acc[reactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get user's reactions
    const userReactionsData = await prisma.reaction.findMany({
      where: {
        postId,
        userId: session.user.id,
      },
      select: { type: true },
    });

    return NextResponse.json({
      reactions: Object.entries(reactionCounts).map(([type, count]) => ({
        type,
        count,
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
