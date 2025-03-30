import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/config';
import { REACTION_TYPES, ReactionType } from './types';
import { prisma } from '../../../../../lib/db';
import { createReactionNotification } from '@/app/utils/notifications';

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

    // Get all reactions for the post with user info
    const allReactions = await prisma.reaction.findMany({
      where: { postId },
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
        .filter(r => r.userId === session.user.id)
        .map(r => r.type);
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
        postId: Number(params.id),
        userId: session.user.id.toString(),
        type,
      },
    });

    let reaction;
    // Toggle the reaction
    if (existingReaction) {
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      reaction = await prisma.reaction.create({
        data: {
          type,
          postId: Number(params.id),
          userId: session.user.id.toString(),
        },
      });

      // Create notification only when adding a reaction
      if (reaction) {
        const post = await prisma.post.findUnique({
          where: { id: reaction.postId },
          select: {
            userId: true,
            title: true
          }
        });

        if (post) {
          await createReactionNotification(
            reaction.postId,
            session.user.id.toString(),
            post.userId,
            type,
            post.title
          );
        }
      }
    }

    // Get updated reactions with user info
    const allReactions = await prisma.reaction.findMany({
      where: { postId },
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
    console.error('Error toggling reaction:', error);
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    );
  }
}
