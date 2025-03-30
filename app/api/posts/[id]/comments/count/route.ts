import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

// GET comment count for a post
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    if (!postId) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Count comments for the post
    const count = await prisma.comment.count({
      where: { postId }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching comment count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment count' },
      { status: 500 }
    );
  }
}
