CREATE TABLE "market_indicator_snapshots" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "value" DECIMAL(18, 6) NOT NULL,
  "changePct" DECIMAL(10, 4),
  "currency" TEXT,
  "source" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "market_indicator_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_briefings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "marketTemperature" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "keyChanges" JSONB NOT NULL,
  "affectedBuckets" JSONB NOT NULL,
  "reviewQuestions" JSONB NOT NULL,
  "uncertainties" JSONB NOT NULL,
  "signals" JSONB NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "model" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "market_briefings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_indicator_snapshots_userId_observedAt_idx" ON "market_indicator_snapshots"("userId", "observedAt");
CREATE INDEX "market_indicator_snapshots_userId_symbol_observedAt_idx" ON "market_indicator_snapshots"("userId", "symbol", "observedAt");
CREATE INDEX "market_briefings_userId_observedAt_idx" ON "market_briefings"("userId", "observedAt");

ALTER TABLE "market_indicator_snapshots"
ADD CONSTRAINT "market_indicator_snapshots_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_briefings"
ADD CONSTRAINT "market_briefings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
