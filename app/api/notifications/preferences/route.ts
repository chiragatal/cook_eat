import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';
import { prisma } from '../../../../lib/prisma';
import { NotificationType } from '../../../types/notification';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET /api/notifications/preferences - Session:', session?.user ? 'User authenticated' : 'Not authenticated');

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id.toString();
    console.log(`Fetching preferences for user ${userId}`);

    try {
      const preferences = await prisma.notificationPreference.findMany({
        where: {
          userId,
        },
      });

      console.log(`Found ${preferences.length} preferences:`, preferences);
      return NextResponse.json(preferences);
    } catch (dbError) {
      console.error('Database error fetching preferences:', dbError);
      return NextResponse.json(
        { error: 'Database error fetching preferences' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('PUT /api/notifications/preferences - Session:', session?.user ? 'User authenticated' : 'Not authenticated');

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { type, enabled } = body;

    if (type === undefined || enabled === undefined) {
      console.error('Missing required fields:', { type, enabled });
      return NextResponse.json(
        { error: 'Type and enabled status are required' },
        { status: 400 }
      );
    }

    const userId = session.user.id.toString();
    console.log(`Updating preference: User ${userId}, Type ${type}, Enabled ${enabled}`);

    try {
      const preference = await prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
        update: {
          enabled,
        },
        create: {
          userId,
          type,
          enabled,
        },
      });

      console.log('Preference updated successfully:', preference);
      return NextResponse.json(preference);
    } catch (dbError) {
      console.error('Database error updating preference:', dbError);
      return NextResponse.json(
        { error: 'Database error updating preference' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    );
  }
}
