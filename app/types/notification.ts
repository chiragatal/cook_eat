export enum NotificationType {
  REACTION = 'REACTION',
  COMMENT = 'COMMENT',
  COMMENT_REACTION = 'COMMENT_REACTION',
  COMMENT_MENTION = 'COMMENT_MENTION',
  NEW_POST_FROM_FOLLOWING = 'NEW_POST_FROM_FOLLOWING'
}

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

export interface Notification {
  id: number;
  type: NotificationType;
  userId: number;
  targetId: number; // postId or commentId
  actorId: number; // user who triggered the notification
  read: boolean;
  createdAt: string;
  data?: {
    postTitle?: string;
    commentContent?: string;
    reactionType?: string;
  };
  actor?: {
    name: string;
    email: string;
  };
}

export interface NotificationSettings {
  preferences: NotificationPreference[];
  userId: number;
}
