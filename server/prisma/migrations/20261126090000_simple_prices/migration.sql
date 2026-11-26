-- Simple prices: each station owner sets one price per kWh for each charging type.
-- No peak hours, no peak price, no idle fee. Bill = kWh x price + 18% GST.
-- Existing data is kept: old tariff rates become the new prices.

-- 1. New table: one price per station and charging type
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "connectorType" "ConnectorType" NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Price_stationId_connectorType_key" ON "Price"("stationId", "connectorType");

ALTER TABLE "Price" ADD CONSTRAINT "Price_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Copy each station's old tariff rate for every charging type it already has
INSERT INTO "Price" ("stationId", "connectorType", "pricePerKwh", "updatedAt")
SELECT DISTINCT s."id", c."connectorType", t."energyRate", CURRENT_TIMESTAMP
FROM "Station" s
JOIN "Tariff" t ON t."id" = s."tariffId"
JOIN "Charger" c ON c."stationId" = s."id";

-- 3. Remove the tariff link and table
ALTER TABLE "Station" DROP CONSTRAINT "Station_tariffId_fkey";
ALTER TABLE "Station" DROP COLUMN "tariffId";
DROP TABLE "Tariff";

-- 4. Invoices: keep the price used and one energy cost (old peak and idle amounts are folded in)
ALTER TABLE "Invoice" ADD COLUMN "pricePerKwh" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "Invoice"
SET "pricePerKwh" = CASE WHEN "offPeakKwh" + "peakKwh" > 0
                         THEN ROUND((("energyCost" + "peakCost") / ("offPeakKwh" + "peakKwh"))::numeric, 2)
                         ELSE 0 END,
    "energyCost"  = "energyCost" + "peakCost" + "idleFee";
ALTER TABLE "Invoice" ALTER COLUMN "pricePerKwh" DROP DEFAULT;
ALTER TABLE "Invoice" DROP COLUMN "offPeakKwh",
DROP COLUMN "peakKwh",
DROP COLUMN "peakCost",
DROP COLUMN "idleFee";

-- 5. Sessions no longer record idle minutes
ALTER TABLE "ChargingSession" DROP COLUMN "idleMinutes";
