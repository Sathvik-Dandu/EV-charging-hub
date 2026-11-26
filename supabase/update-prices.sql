-- =====================================================================
-- Charge Hub: UPDATE an existing Supabase database to station-owner prices
-- Use this if you already ran setup.sql before (your DB has a "Tariff" table).
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run.
-- It keeps all your data. Old tariff rates are copied into the new "Price" table.
-- Everything runs in one transaction: if any step fails, nothing changes.
-- =====================================================================
BEGIN;


-- 1. Peak hours and idle fee move onto the station
ALTER TABLE "Station"
ADD COLUMN     "peakStartHour" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "peakEndHour" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "idleFeePerMin" DOUBLE PRECISION NOT NULL DEFAULT 5;

UPDATE "Station" s
SET "peakStartHour" = t."peakStartHour",
    "peakEndHour"   = t."peakEndHour",
    "idleFeePerMin" = t."idleFeePerMin"
FROM "Tariff" t
WHERE s."tariffId" = t."id";

-- 2. New table: one price per station and charging type
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "connectorType" "ConnectorType" NOT NULL,
    "pricePerKwh" DOUBLE PRECISION NOT NULL,
    "peakPricePerKwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Price_stationId_connectorType_key" ON "Price"("stationId", "connectorType");

ALTER TABLE "Price" ADD CONSTRAINT "Price_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Copy the old tariff rates for every charging type each station already has
INSERT INTO "Price" ("stationId", "connectorType", "pricePerKwh", "peakPricePerKwh", "updatedAt")
SELECT DISTINCT s."id", c."connectorType", t."energyRate", t."peakRate", CURRENT_TIMESTAMP
FROM "Station" s
JOIN "Tariff" t ON t."id" = s."tariffId"
JOIN "Charger" c ON c."stationId" = s."id";

-- 4. Remove the old tariff link and table
ALTER TABLE "Station" DROP CONSTRAINT "Station_tariffId_fkey";
ALTER TABLE "Station" DROP COLUMN "tariffId";
DROP TABLE "Tariff";

UPDATE "Role" SET "description" = 'Network Administrator - approves accounts, manages users and oversees stations' WHERE "name" = 'ADMIN';
UPDATE "Role" SET "description" = 'Station Owner - adds stations, chargers and prices, runs on-site sessions at own stations' WHERE "name" = 'STATION_OWNER';

COMMIT;

-- CHECK: every station with its peak hours, idle fee and prices
SELECT s."code", s."peakStartHour", s."peakEndHour", s."idleFeePerMin", p."connectorType", p."pricePerKwh", p."peakPricePerKwh"
FROM "Station" s LEFT JOIN "Price" p ON p."stationId" = s."id"
ORDER BY s."code", p."connectorType";
