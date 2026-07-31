-- Add account cash balances for generated asset snapshots.
ALTER TABLE "financial_accounts"
ADD COLUMN "cashBalance" DECIMAL(15, 2),
ADD COLUMN "cashCurrency" TEXT,
ADD COLUMN "includeInProfit" BOOLEAN NOT NULL DEFAULT true;

-- Track whether an asset snapshot was entered manually or generated.
CREATE TYPE "AssetSource" AS ENUM ('MANUAL', 'AUTO_HOLDINGS', 'AUTO_MIXED');

ALTER TABLE "assets"
ADD COLUMN "source" "AssetSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "breakdown" JSONB;
