/*
  Warnings:

  - A unique constraint covering the columns `[linkingRef]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `linkingRef` to the `Entry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "linkingRef" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Entry_linkingRef_key" ON "Entry"("linkingRef");

-- CreateIndex
CREATE INDEX "Entry_type_idx" ON "Entry"("type");
