import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a unique ID that fits within PostgreSQL's INT4 range (max: 2147483647)
function generateUniqueId() {
  // Find a number between 100,000,000 and 2,000,000,000
  // This is high enough to avoid conflicts with existing IDs
  // but low enough to fit in a 32-bit integer
  return getRandomInt(100000000, 2000000000);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Get highest existing user ID to avoid conflicts
    const highestUser = await prisma.user.findFirst({
      orderBy: { id: 'desc' }
    });

    // Generate a unique ID, ensuring it's larger than any existing ID
    let uniqueId = generateUniqueId();
    if (highestUser && typeof highestUser.id === 'number' && uniqueId <= highestUser.id) {
      uniqueId = highestUser.id + getRandomInt(1000, 10000);
    }

    console.log(`Creating user with generated ID: ${uniqueId}`);

    // Create user with an explicit ID
    const user = await prisma.user.create({
      data: {
        id: uniqueId,
        email,
        passwordHash,
        name: name || null,
        isAdmin: false,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
