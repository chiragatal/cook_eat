import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';
import { prisma } from '../../../../lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Fetch single recipe
    const recipe = await prisma.post.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    console.log('Updating post with ID:', id);

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Invalid recipe ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

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

    // For PATCH we only update the fields that are provided
    const updatedRecipe = await prisma.post.update({
      where: { id },
      data: {
        ...body,
        cookedOn: body.cookedOn ? new Date(body.cookedOn) : undefined,
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

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}
