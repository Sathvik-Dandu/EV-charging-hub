# Supabase SQL setup

Two SQL files, both run in **Supabase Dashboard → SQL Editor**:

| File | Use it when |
|---|---|
| `setup.sql` | New or empty database. Creates 10 enums, 13 tables, indexes, foreign keys, the 5 roles and the 5 demo accounts |
| `update-prices.sql` | Your database was created **before** the Prices change (it still has a `Tariff` table). Keeps all data |

## Update an existing database to simple prices (`update-prices.sql`)
What it does, in one transaction (if any step fails, nothing changes):
1. Creates the `Price` table: one row per station and charging type, with one `pricePerKwh`.
2. Copies each station's old tariff rate into `Price` for every charging type it already has.
3. Drops `Station.tariffId` and the `Tariff` table.
4. Simplifies `Invoice`: keeps the price used and one energy cost (old peak and idle amounts are added into it, so old totals don't change), and drops `ChargingSession.idleMinutes`.
5. Updates the two role descriptions and shows every station with its prices.

Then tell Prisma this migration is applied. Run once, from the `server` folder:
```powershell
npx prisma migrate resolve --applied 20261126090000_simple_prices
```

## New database (`setup.sql`)
1. Supabase Dashboard → your project → **SQL Editor** → **New query**.
2. Paste the contents of `setup.sql` and click **Run**.
3. The last result shows the 5 demo accounts (password `Password@123` for all).

| Part | What it does | When to run |
|---|---|---|
| PART 1 | Drops all Charge Hub tables and types | Only for a fresh start. It **deletes all data** |
| PART 2 | Creates enums, tables, indexes, foreign keys | Always |
| PART 3 | Inserts the roles and 5 demo accounts | Always (once) |
| PART 4 | Shows the accounts to confirm | Optional |

If you don't want to wipe existing data, delete PART 1 from the query before clicking Run.

## After running the SQL: tell Prisma the tables exist
Creating tables by hand skips Prisma's migration history. Mark the 4 migrations as already applied, or a later `npm run db:setup` will try to create the tables again and fail. Run this once in a terminal, from the `server` folder:

```powershell
npx prisma migrate resolve --applied 20261123154242_init
```
```powershell
npx prisma migrate resolve --applied 20261124085814_connectors_and_enquiries
```
```powershell
npx prisma migrate resolve --applied 20261125064750_station_owners_and_support
```
```powershell
npx prisma migrate resolve --applied 20261126090000_simple_prices
```

After this, use the normal commands. Don't run `npm run db:setup` again on this database.
- Reset to the demo accounts: `npm --prefix server run db:seed`
- Future schema changes: `npm --prefix server run db:migrate`

## If you change `schema.prisma`
Regenerate this file's PART 2 offline (it doesn't connect to any database):
```powershell
cd server
```
```powershell
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```
