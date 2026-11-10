-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('AWAITING_UPLOAD', 'PENDING', 'PROCESSING', 'DONE', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "originalSize" INTEGER,
    "status" "ImageStatus" NOT NULL DEFAULT 'AWAITING_UPLOAD',
    "variants" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_status_createdAt_idx" ON "images"("status", "createdAt");
