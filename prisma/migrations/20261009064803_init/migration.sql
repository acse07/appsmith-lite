-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'orange',
    "createdById" UUID NOT NULL,
    "publishedVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "document" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_publishedVersionId_key" ON "Application"("publishedVersionId");

-- CreateIndex
CREATE INDEX "Application_workspaceId_updatedAt_idx" ON "Application"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_workspaceId_slug_key" ON "Application"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "Page_appId_position_idx" ON "Page"("appId", "position");

-- CreateIndex
CREATE INDEX "DataSource_workspaceId_idx" ON "DataSource"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Query_appId_name_key" ON "Query"("appId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_appId_number_key" ON "AppVersion"("appId", "number");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "AppVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_appId_fkey" FOREIGN KEY ("appId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_appId_fkey" FOREIGN KEY ("appId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_appId_fkey" FOREIGN KEY ("appId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
