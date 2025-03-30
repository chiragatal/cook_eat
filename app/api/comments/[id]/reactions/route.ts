import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/config';
import { COMMENT_REACTION_TYPES, CommentReactionType } from './types';
import { prisma } from '../../../../../lib/prisma';
import { createCommentReactionNotification } from '@/app/utils/notifications';

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
            name: true
          }
        }
      }
    });

    // Group reactions by type with user info
    const reactionsByType: Record<string, { count: number, users: Array<{ id: string, name: string | null }> }> = {};

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
        name: reaction.user.name
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
        .filter(r => r.userId === session.user.id.toString())
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
        commentId: Number(params.id),
        userId: session.user.id.toString(),
        type
      }
    });

    let reaction;
    // Toggle the reaction
    if (existingReaction) {
      await prisma.commentReaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      reaction = await prisma.commentReaction.create({
        data: {
          type,
          commentId: Number(params.id),
          userId: session.user.id.toString(),
        },
      });

      // Create notification only when adding a reaction
      if (reaction) {
        await createCommentReactionNotification(
          reaction.commentId,
          session.user.id.toString(),
          comment.userId,
          comment.content
        );
      }
    }

    // Get updated reactions with user info
    const allReactions = await prisma.commentReaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Group reactions by type with user info
    const reactionsByType: Record<string, { count: number, users: Array<{ id: string, name: string | null }> }> = {};

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
        name: reaction.user.name
      });
    });

    // Format reactions for response
    const reactions = Object.entries(reactionsByType).map(([type, data]) => ({
      type,
      count: data.count,
      users: data.users,
    }));

    // Get user's reactions
    const userReactions = allReactions
      .filter(r => r.userId === session.user.id.toString())
      .map(r => r.type);

    return NextResponse.json({
      reactions,
      userReactions,
    });
  } catch (error) {
    console.error('Error toggling comment reaction:', error);
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
