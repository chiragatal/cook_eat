import { prisma } from '@/lib/prisma';
import { NotificationType } from '../types/notification';

interface CreateNotificationParams {
  type: NotificationType;
  userId: string;
  actorId: string;
  targetId: number;
  data?: Record<string, any>;
}

export async function createNotification({
  type,
  userId,
  actorId,
  targetId,
  data
}: CreateNotificationParams) {
  // Don't create notification if user is notifying themselves
  if (userId === actorId) {
    return null;
  }

  // Check if user has enabled this type of notification
  const preference = await prisma.notificationPreference.findFirst({
    where: {
      userId: userId,
      type
    }
  });

  // If preference is explicitly disabled, don't create notification
  if (preference?.enabled === false) {
    return null;
  }

  return prisma.notification.create({
    data: {
      type,
      userId: userId,
      actorId: actorId,
      targetId,
      data
    }
  });
}

export async function createReactionNotification(
  postId: number,
  reactorId: string,
  authorId: string,
  reactionType: string,
  postTitle: string
) {
  return createNotification({
    type: NotificationType.REACTION,
    userId: authorId,
    actorId: reactorId,
    targetId: postId,
    data: {
      reactionType,
      postTitle
    }
  });
}

export async function createCommentNotification(
  postId: number,
  commenterId: string,
  authorId: string,
  postTitle: string
) {
  return createNotification({
    type: NotificationType.COMMENT,
    userId: authorId,
    actorId: commenterId,
    targetId: postId,
    data: {
      postTitle
    }
  });
}

export async function createCommentReactionNotification(
  commentId: number,
  reactorId: string,
  authorId: string,
  commentContent: string
) {
  return createNotification({
    type: NotificationType.COMMENT_REACTION,
    userId: authorId,
    actorId: reactorId,
    targetId: commentId,
    data: {
      commentContent
    }
  });
}

export async function createCommentMentionNotification(
  commentId: number,
  mentionedUserId: string,
  commenterId: string,
  commentContent: string
) {
  return createNotification({
    type: NotificationType.COMMENT_MENTION,
    userId: mentionedUserId,
    actorId: commenterId,
    targetId: commentId,
    data: {
      commentContent
    }
  });
}

export async function createNewPostFromFollowingNotification(
  postId: number,
  authorId: string,
  followerIds: string[],
  postTitle: string
) {
  return Promise.all(
    followerIds.map(followerId =>
      createNotification({
        type: NotificationType.NEW_POST_FROM_FOLLOWING,
        userId: followerId,
        actorId: authorId,
        targetId: postId,
        data: {
          postTitle
        }
      })
    )
  );
}
