-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('debit', 'credit');

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "cardPanToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "type" "EntryType" NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "counterpartyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_cardPanToken_key" ON "Account"("cardPanToken");

-- CreateIndex
CREATE INDEX "Account_cardPanToken_deletedAt_idx" ON "Account"("cardPanToken", "deletedAt");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateSystemSettlementAccountAndTestToken
-- This migration creates the required SYSTEM_SETTLEMENT account for the ledger service

INSERT INTO "Account" ("cardPanToken", "createdAt", "updatedAt") 
VALUES ('SYSTEM_SETTLEMENT', NOW(), NOW()), ('TEST_TOKEN', NOW(), NOW())
ON CONFLICT ("cardPanToken") DO NOTHING;
