/*
  Warnings:

  - Added the required column `userId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create a default user for existing posts
INSERT INTO "User" ("email", "passwordHash", "isAdmin", "updatedAt")
VALUES ('admin@example.com', 'placeholder', true, CURRENT_TIMESTAMP);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create new Post table with user relationship
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "cookedOn" DATETIME,
    "userId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy existing data
INSERT INTO "new_Post" (
    "id", "title", "description", "ingredients", "steps", "notes",
    "images", "tags", "category", "cookingTime", "difficulty",
    "createdAt", "updatedAt", "isPublic", "cookedOn"
) SELECT
    "id", "title", "description", "ingredients", "steps", "notes",
    "images", "tags", "category", "cookingTime", "difficulty",
    "createdAt", "updatedAt", "isPublic", "cookedOn"
FROM "Post";

-- Drop old table and rename new table
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
