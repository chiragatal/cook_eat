import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/config';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    const publicOnly = url.searchParams.get('publicOnly') === 'true';

    if (id) {
      // Fetch single recipe
      const recipe = await prisma.post.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!recipe) {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }

      // Check if user has access to this recipe
      if (!recipe.isPublic && (!session || recipe.userId !== parseInt(session.user.id))) {
        return NextResponse.json(
          { error: 'Not authorized to view this recipe' },
          { status: 403 }
        );
      }

      return NextResponse.json(recipe);
    }

    // Build the query
    const where: any = {};

    if (userId) {
      // User-specific recipes (for My Recipes page)
      where.userId = parseInt(userId);
    } else if (publicOnly || !session) {
      // Public recipes only (for All Recipes page or non-authenticated users)
      where.isPublic = true;
    }

    // Fetch recipes
    const posts = await prisma.post.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Creating post with data:', body);

    const {
      title,
      description,
      ingredients = '[]',
      steps = '[]',
      notes = null,
      images = '[]',
      tags = '[]',
      category = null,
      cookingTime = null,
      difficulty = null,
      isPublic = false,
      cookedOn = null,
    } = body;

    const post = await prisma.post.create({
      data: {
        title,
        description,
        ingredients,
        steps,
        notes,
        images,
        tags,
        category,
        cookingTime,
        difficulty,
        isPublic,
        cookedOn: cookedOn ? new Date(cookedOn) : null,
        userId: parseInt(session.user.id),
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Detailed error creating post:', error);
    return NextResponse.json(
      { error: 'Error creating post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the recipe or is admin
    const recipe = await prisma.post.findUnique({
      where: { id }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (recipe.userId !== parseInt(session.user.id) && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to delete this recipe' },
        { status: 403 }
      );
    }

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the recipe or is admin
    const recipe = await prisma.post.findUnique({
      where: { id }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    if (recipe.userId !== parseInt(session.user.id) && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to update this recipe' },
        { status: 403 }
      );
    }

    // Extract only the updatable fields
    const {
      title,
      description,
      ingredients,
      steps,
      notes,
      images,
      tags,
      category,
      cookingTime,
      difficulty,
      isPublic,
      cookedOn
    } = body;

    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        description,
        ingredients,
        steps,
        notes,
        images,
        tags,
        category,
        cookingTime,
        difficulty,
        isPublic,
        cookedOn: cookedOn ? new Date(cookedOn) : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}
