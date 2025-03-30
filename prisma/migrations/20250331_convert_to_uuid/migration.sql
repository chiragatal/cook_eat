-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create new tables with UUID for User ID
CREATE TABLE "UserNew" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNew_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX "UserNew_email_key" ON "UserNew"("email");

-- Create new Post table with UUID for userId
CREATE TABLE "PostNew" (
  "id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ingredients" TEXT NOT NULL,
  "steps" TEXT NOT NULL,
  "notes" TEXT,
  "images" TEXT NOT NULL,
  "tags" TEXT,
  "category" TEXT,
  "cookingTime" INTEGER,
  "difficulty" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "cookedOn" TIMESTAMP(3),
  "userId" UUID NOT NULL,

  CONSTRAINT "PostNew_pkey" PRIMARY KEY ("id")
);

-- Create new Reaction table with UUID for userId
CREATE TABLE "ReactionNew" (
  "id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "postId" INTEGER NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReactionNew_pkey" PRIMARY KEY ("id")
);

-- Create new Comment table with UUID for userId
CREATE TABLE "CommentNew" (
  "id" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "postId" INTEGER NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommentNew_pkey" PRIMARY KEY ("id")
);

-- Create new CommentReaction table with UUID for userId
CREATE TABLE "CommentReactionNew" (
  "id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "commentId" INTEGER NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommentReactionNew_pkey" PRIMARY KEY ("id")
);

-- Create new Notification table with UUID for userId and actorId
CREATE TABLE "NotificationNew" (
  "id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "targetId" INTEGER NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationNew_pkey" PRIMARY KEY ("id")
);

-- Create new NotificationPreference table with UUID for userId
CREATE TABLE "NotificationPreferenceNew" (
  "id" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "userId" UUID NOT NULL,

  CONSTRAINT "NotificationPreferenceNew_pkey" PRIMARY KEY ("id")
);

-- Insert a conversion function
DO $$
DECLARE
  user_mapping RECORD;
  user_id_int INTEGER;
  user_id_uuid UUID;
BEGIN
  -- Create a temporary table to store id mappings
  CREATE TEMPORARY TABLE user_id_mapping (
    id_int INTEGER,
    id_uuid UUID
  );

  -- Insert existing users into the new table with new UUIDs
  FOR user_mapping IN SELECT * FROM "User" LOOP
    user_id_int := user_mapping.id;
    user_id_uuid := uuid_generate_v4();

    -- Store the mapping
    INSERT INTO user_id_mapping (id_int, id_uuid) VALUES (user_id_int, user_id_uuid);

    -- Insert into the new User table
    INSERT INTO "UserNew" (
      "id", "email", "name", "passwordHash", "isAdmin", "createdAt", "updatedAt"
    ) VALUES (
      user_id_uuid,
      user_mapping.email,
      user_mapping.name,
      user_mapping.passwordHash,
      user_mapping.isAdmin,
      user_mapping.createdAt,
      user_mapping.updatedAt
    );
  END LOOP;

  -- Migrate Posts
  INSERT INTO "PostNew" (
    "id", "title", "description", "ingredients", "steps", "notes", "images",
    "tags", "category", "cookingTime", "difficulty", "createdAt", "updatedAt",
    "isPublic", "cookedOn", "userId"
  )
  SELECT
    p."id", p."title", p."description", p."ingredients", p."steps", p."notes", p."images",
    p."tags", p."category", p."cookingTime", p."difficulty", p."createdAt", p."updatedAt",
    p."isPublic", p."cookedOn", m."id_uuid"
  FROM "Post" p
  JOIN user_id_mapping m ON p."userId" = m."id_int";

  -- Migrate Reactions
  INSERT INTO "ReactionNew" (
    "id", "type", "postId", "userId", "createdAt"
  )
  SELECT
    r."id", r."type", r."postId", m."id_uuid", r."createdAt"
  FROM "Reaction" r
  JOIN user_id_mapping m ON r."userId" = m."id_int";

  -- Migrate Comments
  INSERT INTO "CommentNew" (
    "id", "content", "postId", "userId", "createdAt", "updatedAt"
  )
  SELECT
    c."id", c."content", c."postId", m."id_uuid", c."createdAt", c."updatedAt"
  FROM "Comment" c
  JOIN user_id_mapping m ON c."userId" = m."id_int";

  -- Migrate CommentReactions
  INSERT INTO "CommentReactionNew" (
    "id", "type", "commentId", "userId", "createdAt"
  )
  SELECT
    cr."id", cr."type", cr."commentId", m."id_uuid", cr."createdAt"
  FROM "CommentReaction" cr
  JOIN user_id_mapping m ON cr."userId" = m."id_int";

  -- Migrate Notifications (both userId and actorId)
  INSERT INTO "NotificationNew" (
    "id", "type", "userId", "actorId", "targetId", "read", "data", "createdAt"
  )
  SELECT
    n."id", n."type", um."id_uuid", am."id_uuid", n."targetId", n."read", n."data", n."createdAt"
  FROM "Notification" n
  JOIN user_id_mapping um ON n."userId" = um."id_int"
  JOIN user_id_mapping am ON n."actorId" = am."id_int";

  -- Migrate NotificationPreferences
  INSERT INTO "NotificationPreferenceNew" (
    "id", "type", "enabled", "userId"
  )
  SELECT
    np."id", np."type", np."enabled", m."id_uuid"
  FROM "NotificationPreference" np
  JOIN user_id_mapping m ON np."userId" = m."id_int";

END $$;

-- Drop old tables and rename new ones
-- Note: We're not dropping old tables here for safety,
-- but you might want to do it after confirming everything works

-- Step 1: Backup the old tables by renaming them
ALTER TABLE "User" RENAME TO "User_old";
ALTER TABLE "Post" RENAME TO "Post_old";
ALTER TABLE "Reaction" RENAME TO "Reaction_old";
ALTER TABLE "Comment" RENAME TO "Comment_old";
ALTER TABLE "CommentReaction" RENAME TO "CommentReaction_old";
ALTER TABLE "Notification" RENAME TO "Notification_old";
ALTER TABLE "NotificationPreference" RENAME TO "NotificationPreference_old";

-- Step 2: Rename the new tables to the original names
ALTER TABLE "UserNew" RENAME TO "User";
ALTER TABLE "PostNew" RENAME TO "Post";
ALTER TABLE "ReactionNew" RENAME TO "Reaction";
ALTER TABLE "CommentNew" RENAME TO "Comment";
ALTER TABLE "CommentReactionNew" RENAME TO "CommentReaction";
ALTER TABLE "NotificationNew" RENAME TO "Notification";
ALTER TABLE "NotificationPreferenceNew" RENAME TO "NotificationPreference";

-- Step 3: Add all constraints and indexes

-- Post index on userId
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- Reaction indexes and constraints
CREATE UNIQUE INDEX "Reaction_postId_userId_type_key" ON "Reaction"("postId", "userId", "type");
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment indexes and constraints
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CommentReaction indexes and constraints
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_type_key" ON "CommentReaction"("commentId", "userId", "type");
CREATE INDEX "CommentReaction_commentId_idx" ON "CommentReaction"("commentId");
CREATE INDEX "CommentReaction_userId_idx" ON "CommentReaction"("userId");
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification indexes and constraints
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotificationPreference indexes and constraints
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key from Post to User
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
