import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';
import { prisma } from '../../../../lib/db';
import { NotificationType } from '@/app/types/notification';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: session.user.id.toString(),
      },
    });

    return NextResponse.json(preferences);
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

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { type, enabled } = await request.json();

    if (type === undefined || enabled === undefined) {
      return NextResponse.json(
        { error: 'Type and enabled status are required' },
        { status: 400 }
      );
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: session.user.id.toString(),
          type,
        },
      },
      update: {
        enabled,
      },
      create: {
        userId: session.user.id.toString(),
        type,
        enabled,
      },
    });

    return NextResponse.json(preference);
  } catch (error) {
    console.error('Error updating notification preference:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    );
  }
}
