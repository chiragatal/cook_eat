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
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const myRecipes = url.searchParams.get('myRecipes') === 'true';

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
      if (!recipe.isPublic && (!session || recipe.userId !== session.user.id)) {
        return NextResponse.json(
          { error: 'Not authorized to view this recipe' },
          { status: 403 }
        );
      }

      return NextResponse.json(recipe);
    }

    // Build the query
    const where = {} as any;

    if (userId) {
      // User-specific recipes (for My Recipes page)
      where.userId = parseInt(userId);
    } else if (myRecipes && session) {
      // My recipes for current user
      where.userId = session.user.id;
    } else if (publicOnly || !session) {
      // Public recipes only (for All Recipes page or non-authenticated users)
      where.isPublic = true;
    }

    // Add date range filtering if provided
    if (startDate && endDate) {
      where.cookedOn = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Only include recipes with cookedOn date if querying for calendar
    if (startDate && endDate) {
      where.cookedOn = {
        ...where.cookedOn,
        not: null,
      };
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

    // Extract and clean data
    const {
      id,  // Check if ID is being passed in
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

    // Log if an ID was received
    if (id) {
      console.log('Warning: ID was passed in the request. This will be ignored:', id);
    }

    // Create post without specifying ID (let Prisma auto-generate it)
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
        userId: session.user.id
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

    console.log('Successfully created post with ID:', post.id);
    return NextResponse.json(post);
  } catch (error) {
    console.error('Detailed error creating post:', error);

    // More specific error handling
    if (error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002' &&
        'meta' in error &&
        error.meta &&
        'target' in error.meta &&
        Array.isArray(error.meta.target) &&
        error.meta.target.includes('id')) {
      return NextResponse.json(
        { error: 'There was a conflict with an existing ID. Please try again.' },
        { status: 409 }
      );
    }

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

    if (recipe.userId !== session.user.id && !session.user.isAdmin) {
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

    console.log('Updating post with ID:', id);

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

    if (recipe.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to edit this recipe' },
        { status: 403 }
      );
    }

    // Extract fields to update but preserve the original ID
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
      cookedOn,
    } = body;

    const updatedRecipe = await prisma.post.update({
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
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('Successfully updated post with ID:', updatedRecipe.id);
    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}
