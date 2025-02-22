import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Fetch single recipe
      const recipe = await prisma.post.findUnique({
        where: { id: parseInt(id) }
      });

      if (!recipe) {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(recipe);
    }

    // Fetch all recipes
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc'
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
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
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
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');
    const body = await request.json();
    const { title, description, ingredients, steps, notes, images, tags, category, cookingTime, difficulty, isPublic, cookedOn } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description || undefined,
        ingredients: ingredients || undefined,
        steps: steps || undefined,
        notes: notes || null,
        images: images || undefined,
        tags: tags || undefined,
        category: category || null,
        cookingTime: cookingTime ? parseInt(cookingTime) : null,
        difficulty: difficulty || null,
        isPublic: isPublic ?? undefined,
        cookedOn: cookedOn || null,
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
