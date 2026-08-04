-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'FEE');

-- CreateTable
CREATE TABLE "investment_trades" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "type" "TradeType" NOT NULL,
    "tradedAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "realizedProfit" DECIMAL(15,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_trades_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "investment_trades_userId_tradedAt_idx" ON "investment_trades"("userId", "tradedAt");
CREATE INDEX "investment_trades_accountId_securityId_tradedAt_idx" ON "investment_trades"("accountId", "securityId", "tradedAt");
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investment_trades" ADD CONSTRAINT "investment_trades_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
