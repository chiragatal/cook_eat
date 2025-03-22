import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/config';
import { COMMENT_REACTION_TYPES, CommentReactionType } from './types';
import { prisma } from '../../../../../lib/prisma';

// GET reactions for a comment
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = parseInt(params.id);
    if (isNaN(commentId)) {
      return NextResponse.json(
        { error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Get all reactions for the comment with user info
    const allReactions = await prisma.commentReaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            // Ensure image is available in the User model
            // image comes from next-auth, not directly from the db
          }
        }
      }
    });

    // Group reactions by type with user info
    const reactionsByType: Record<string, { count: number, users: Array<{ id: number, name: string | null, image?: string | null }> }> = {};

    allReactions.forEach(reaction => {
      if (!reactionsByType[reaction.type]) {
        reactionsByType[reaction.type] = {
          count: 0,
          users: []
        };
      }

      reactionsByType[reaction.type].count++;
      reactionsByType[reaction.type].users.push({
        id: reaction.user.id,
        name: reaction.user.name,
        // Only include image if available from next-auth session
      });
    });

    // Format reactions for response
    const reactions = Object.entries(reactionsByType).map(([type, data]) => ({
      type,
      count: data.count,
      users: data.users,
    }));

    // If user is logged in, get their reactions
    let userReactions: string[] = [];
    if (session?.user?.id) {
      userReactions = allReactions
        .filter(r => r.userId === session.user.id)
        .map(r => r.type);
    }

    return NextResponse.json({
      reactions,
      userReactions,
    });
  } catch (error) {
    console.error('Error fetching comment reactions:', error);
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

    const commentId = parseInt(params.id);
    if (isNaN(commentId)) {
      return NextResponse.json(
        { error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    const { type } = await request.json();

    // Validate reaction type
    if (!COMMENT_REACTION_TYPES.includes(type as CommentReactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Find existing reaction
    const existingReaction = await prisma.commentReaction.findFirst({
      where: {
        commentId,
        userId: session.user.id,
        type,
      },
    });

    // Toggle the reaction
    if (existingReaction) {
      await prisma.commentReaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      await prisma.commentReaction.create({
        data: {
          type,
          commentId,
          userId: session.user.id,
        },
      });
    }

    // Get updated reactions
    const allReactions = await prisma.commentReaction.findMany({
      where: { commentId },
      select: { type: true },
    });

    const reactionCounts = allReactions.reduce((acc, { type: reactionType }) => {
      acc[reactionType] = (acc[reactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get user's reactions
    const userReactionsData = await prisma.commentReaction.findMany({
      where: {
        commentId,
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
    console.error('Error toggling comment reaction:', error);
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
