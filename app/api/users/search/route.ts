import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url, process.env.NEXTAUTH_URL).searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json([]);
    }

    // Check if the query is a numeric ID
    const isIdSearch = !isNaN(parseInt(query));

    if (isIdSearch) {
      // For ID searches, try to find the exact user first
      const user = await prisma.user.findUnique({
        where: { id: parseInt(query) },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (user) {
        return NextResponse.json([user]);
      }
    }

    // If no exact ID match or if it's a text search, perform a broader search
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10, // Limit results
    });

    // For text searches, perform case-insensitive filtering
    const filteredUsers = users.filter(user => {
      const searchTerm = query.toLowerCase();
      return (
        (user.name?.toLowerCase().includes(searchTerm) || false) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    });

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
