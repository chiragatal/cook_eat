import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/config';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const bookmark = searchParams.get('bookmark') === 'true';
    const madeIt = searchParams.get('madeIt') === 'true';
    const wantToTry = searchParams.get('wantToTry') === 'true';
    const publicOnly = searchParams.get('publicOnly') === 'true';

    const session = await getServerSession(authOptions);

    // Build filter
    const where: any = {};

    // Search filter
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { ingredients: { contains: searchTerm, mode: 'insensitive' } },
        { steps: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Date filter for calendar view
    if (startDate && endDate) {
      where.cookedOn = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Visibility filter - Only return public posts or the user's own posts
    if (session?.user?.id) {
      // Store the existing OR conditions if any
      const existingOR = where.OR || [];

      // Add visibility conditions
      where.OR = [
        ...existingOR,
        { isPublic: true },
        { userId: session.user.id.toString() }
      ];
    } else if (publicOnly) {
      where.isPublic = true;
    } else {
      // Default to showing only public recipes for non-logged in users
      where.isPublic = true;
    }

    // Reaction filters
    if (bookmark || madeIt || wantToTry) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required for reaction filters' },
          { status: 401 }
        );
      }

      const reactionType = bookmark
        ? 'FAVORITE'
        : madeIt
          ? 'MADE_IT'
          : 'WANT_TO_TRY';

      where.reactions = {
        some: {
          userId: session.user.id.toString(),
          type: reactionType
        }
      };
    }

    // Only include recipes with cookedOn date if querying for calendar
    if (startDate && endDate) {
      where.cookedOn = {
        ...where.cookedOn,
        not: null,
      };
    }

    // For debugging
    console.log('API query params:', JSON.stringify(searchParams, null, 2));
    console.log('Final query where clause:', JSON.stringify(where, null, 2));
    console.log('Session user:', session?.user?.id);

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

    console.log(`Found ${posts.length} posts`);
    if (posts.length === 0) {
      console.log('No posts found. Fetching all posts for debugging...');
      const allPosts = await prisma.post.findMany({
        select: {
          id: true,
          title: true,
          userId: true,
          isPublic: true
        }
      });
      console.log('All posts in database:', JSON.stringify(allPosts, null, 2));
    }

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
      isPublic = true,
      cookedOn = null,
    } = body;

    // Remove any ID that might be in the request body to avoid conflicts
    if (body.id) {
      console.log('Warning: ID was passed in the request. This will be ignored:', body.id);
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
        userId: session.user.id.toString()
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
        typeof error.meta === 'object' &&
        error.meta !== null &&
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
    const id = url.searchParams.get('id');

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

    if (recipe.userId !== session.user.id.toString() && !session.user.isAdmin) {
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
    const id = url.searchParams.get('id');
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

    if (recipe.userId !== session.user.id.toString() && !session.user.isAdmin) {
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
