-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a temporary backup of the schema and restore it later if needed
DROP TABLE IF EXISTS "_schema_backup";
CREATE TABLE "_schema_backup" AS SELECT current_database() AS db_name;

-- Try the migration with proper error handling
DO $$
BEGIN
    -- Create new tables with UUID for User ID
    DROP TABLE IF EXISTS "UserNew";
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
    DROP TABLE IF EXISTS "PostNew";
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
    DROP TABLE IF EXISTS "ReactionNew";
    CREATE TABLE "ReactionNew" (
      "id" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "postId" INTEGER NOT NULL,
      "userId" UUID NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ReactionNew_pkey" PRIMARY KEY ("id")
    );

    -- Create new Comment table with UUID for userId
    DROP TABLE IF EXISTS "CommentNew";
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
    DROP TABLE IF EXISTS "CommentReactionNew";
    CREATE TABLE "CommentReactionNew" (
      "id" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "commentId" INTEGER NOT NULL,
      "userId" UUID NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CommentReactionNew_pkey" PRIMARY KEY ("id")
    );

    -- Create new Notification table with UUID for userId and actorId
    DROP TABLE IF EXISTS "NotificationNew";
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
    DROP TABLE IF EXISTS "NotificationPreferenceNew";
    CREATE TABLE "NotificationPreferenceNew" (
      "id" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "userId" UUID NOT NULL,
      CONSTRAINT "NotificationPreferenceNew_pkey" PRIMARY KEY ("id")
    );

    -- Create a temporary table to store id mappings
    DROP TABLE IF EXISTS user_id_mapping;
    CREATE TEMPORARY TABLE user_id_mapping (
      id_int INTEGER,
      id_uuid UUID
    );

    -- Insert existing users into the new table with new UUIDs
    FOR user_mapping IN SELECT * FROM "User" LOOP
      INSERT INTO user_id_mapping (id_int, id_uuid)
      VALUES (user_mapping.id, uuid_generate_v4());

      -- Insert into the new User table
      INSERT INTO "UserNew" (
        "id", "email", "name", "passwordHash", "isAdmin", "createdAt", "updatedAt"
      ) VALUES (
        (SELECT id_uuid FROM user_id_mapping WHERE id_int = user_mapping.id),
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

    -- Backup old tables by renaming them
    ALTER TABLE IF EXISTS "User" RENAME TO "User_old";
    ALTER TABLE IF EXISTS "Post" RENAME TO "Post_old";
    ALTER TABLE IF EXISTS "Reaction" RENAME TO "Reaction_old";
    ALTER TABLE IF EXISTS "Comment" RENAME TO "Comment_old";
    ALTER TABLE IF EXISTS "CommentReaction" RENAME TO "CommentReaction_old";
    ALTER TABLE IF EXISTS "Notification" RENAME TO "Notification_old";
    ALTER TABLE IF EXISTS "NotificationPreference" RENAME TO "NotificationPreference_old";

    -- Rename new tables to original names
    ALTER TABLE "UserNew" RENAME TO "User";
    ALTER TABLE "PostNew" RENAME TO "Post";
    ALTER TABLE "ReactionNew" RENAME TO "Reaction";
    ALTER TABLE "CommentNew" RENAME TO "Comment";
    ALTER TABLE "CommentReactionNew" RENAME TO "CommentReaction";
    ALTER TABLE "NotificationNew" RENAME TO "Notification";
    ALTER TABLE "NotificationPreferenceNew" RENAME TO "NotificationPreference";

    -- Create indexes with IF NOT EXISTS
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId")';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_postId_userId_type_key" ON "Reaction"("postId", "userId", "type")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Reaction_postId_idx" ON "Reaction"("postId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Reaction_userId_idx" ON "Reaction"("userId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Comment_postId_idx" ON "Comment"("postId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId")';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "CommentReaction_commentId_userId_type_key" ON "CommentReaction"("commentId", "userId", "type")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "CommentReaction_commentId_idx" ON "CommentReaction"("commentId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "CommentReaction_userId_idx" ON "CommentReaction"("userId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Notification_actorId_idx" ON "Notification"("actorId")';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId")';

    -- Add foreign key constraints
    ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

EXCEPTION WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Error during migration: %', SQLERRM;

    -- Attempt to restore the original schema
    -- This is a simple restore mechanism; a real production system would need more robust handling
    IF EXISTS (SELECT 1 FROM "_schema_backup") THEN
        RAISE NOTICE 'Attempting to restore original schema...';

        -- Remove new tables if they exist
        DROP TABLE IF EXISTS "UserNew";
        DROP TABLE IF EXISTS "PostNew";
        DROP TABLE IF EXISTS "ReactionNew";
        DROP TABLE IF EXISTS "CommentNew";
        DROP TABLE IF EXISTS "CommentReactionNew";
        DROP TABLE IF EXISTS "NotificationNew";
        DROP TABLE IF EXISTS "NotificationPreferenceNew";

        -- Restore original tables if they were renamed
        ALTER TABLE IF EXISTS "User_old" RENAME TO "User";
        ALTER TABLE IF EXISTS "Post_old" RENAME TO "Post";
        ALTER TABLE IF EXISTS "Reaction_old" RENAME TO "Reaction";
        ALTER TABLE IF EXISTS "Comment_old" RENAME TO "Comment";
        ALTER TABLE IF EXISTS "CommentReaction_old" RENAME TO "CommentReaction";
        ALTER TABLE IF EXISTS "Notification_old" RENAME TO "Notification";
        ALTER TABLE IF EXISTS "NotificationPreference_old" RENAME TO "NotificationPreference";

        RAISE NOTICE 'Schema restore attempted. Please verify your database state.';
    END IF;

    -- Rethrow the error
    RAISE;
END $$;
