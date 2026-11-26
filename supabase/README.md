# Supabase SQL setup

`setup.sql` creates the whole Charge Hub database by hand in Supabase: 10 enums, 13 tables, indexes, foreign keys, the 5 roles and the 5 demo accounts.

## How to run it
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
Creating tables by hand skips Prisma's migration history. Mark the 3 migrations as already applied, or a later `npm run db:setup` will try to create the tables again and fail. Run this once in a terminal, from the `server` folder:

```powershell
npx prisma migrate resolve --applied 20261123154242_init
```
```powershell
npx prisma migrate resolve --applied 20261124085814_connectors_and_enquiries
```
```powershell
npx prisma migrate resolve --applied 20261125064750_station_owners_and_support
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
