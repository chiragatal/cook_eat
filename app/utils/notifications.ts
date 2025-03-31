import { prisma } from '../../lib/prisma';
import { NotificationType } from '../types/notification';

interface CreateNotificationParams {
  type: NotificationType;
  userId: string;
  actorId: string;
  targetId: string;
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
  postId: string,
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
  postId: string,
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
  commentId: string,
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
  commentId: string,
  postId: string,
  commenterId: string,
  mentionedUserId: string,
  commentContent: string
) {
  return createNotification({
    type: NotificationType.COMMENT_MENTION,
    userId: mentionedUserId,
    actorId: commenterId,
    targetId: commentId,
    data: {
      postId,
      commentContent
    }
  });
}

export async function createNewPostFromFollowingNotification(
  postId: string,
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
