# ⚡ Charge Hub: EV Charging Network & Slot Booking Platform

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS_12-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white)

A full-stack platform that connects **EV drivers** with **charging stations**:
- live charger availability,
- conflict-free slot booking,
- simple per-kWh billing: each station owner sets one price per kWh for each charging type,
- fault tracking until a charger is repaired,
- operational reports.

It is built from the *Green Mobility Charge Hub* Business Requirement Document (BRD), covering all functional modules and all 12 core business rules.

---

## ✨ Highlights

- **One-page public website.** Anyone can search stations by city, connector and availability, read charger specs and pricing, and sign up.
- **Five roles with separate responsibilities**, each with its own sign-in and its own screens and data (see the table below).
- **Booking engine.**
  - Rejects connector mismatches and faulty chargers.
  - Prevents double bookings with a database transaction and a Redis lock.
  - Allows at most 2 upcoming bookings per driver.
  - Auto-releases no-shows after 15 minutes (BullMQ job).
- **Prices set by station owners.** One price per kWh for each charging type at each station.
- **Billing.** Energy delivered × price per kWh, plus 18% GST. An invoice is generated for every session.
- **Live updates.** Charger status changes reach every open screen in seconds (Socket.io).
- **Charger specs enforced:**
  - CCS2 / CHAdeMO ≥ 50 kW,
  - Type 2 AC ≥ 22 kW,
  - Bharat DC-001 = 15 kW,
  - Bharat AC-001 = 10 kW (3 × 3.3 kW guns).
- **Security.** bcrypt passwords, JWT access and refresh tokens, a permission check on every API call, and live form validation on both client and server.
- **API docs** with Swagger at `/api/docs`.

## 👥 Roles & responsibilities

| Role | Sign-up | What they do |
|---|---|---|
| **Administrator** | seeded | Approves or rejects new station owner and technician accounts, manages users and roles, oversees all stations (can switch stations and chargers off) |
| **EV Owner** | self sign-up (instant) | Adds vehicles, books slots, starts/stops charging, pays invoices, reports faults, asks for help |
| **Station Owner** | self sign-up → **admin approval** | Adds **own** stations and chargers, **sets the prices** (one price per kWh for each charging type), sees bookings, sessions and invoices at own stations, runs on-site sessions |
| **Technician** | self sign-up → **admin approval** | Works on tickets assigned to them: Start work → Resolve (charger back online) |
| **Operations Manager** | seeded | **Only** role that assigns maintenance and answers enquiries; network reports (utilization, revenue, faults & downtime, bookings) |

## 🏗️ Architecture

```
 React 19 + Vite (port 5173)                 NestJS 12 API (port 4000)
 ┌────────────────────────────┐  REST /api   ┌────────────────────────────────┐
 │ MUI pages · Zod forms       │ ───────────► │ AuthGuard (JWT + permissions)  │
 │ TanStack Query · Redux      │ ◄─────────── │ Controllers → Services → Prisma │
 │ Socket.io client            │ ◄═ events ══ │ Socket.io gateway · BullMQ jobs │
 └────────────────────────────┘              └──────────┬───────────┬─────────┘
                                                        ▼           ▼
                                           PostgreSQL (Supabase)   Redis
```

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Material UI 9 + DataGrid, Redux Toolkit, TanStack Query, React Hook Form + Zod 4, React Router 8, Socket.io client |
| Backend | Node.js 22, NestJS 12, Prisma 7 (driver adapter `pg`), class-validator, JWT, bcrypt, BullMQ, Socket.io, Swagger |
| Database | PostgreSQL, hosted on **Supabase** (local PostgreSQL also works) |
| Queue/locks | Redis (Memurai on Windows) |
| Tests | Vitest, React Testing Library |

---

## 🚀 Quick start

### 1. Prerequisites
- [Node.js 22 LTS](https://nodejs.org)
- A PostgreSQL database: a [Supabase](https://supabase.com) project (recommended) **or** local PostgreSQL 16+
- Redis: [Memurai](https://www.memurai.com) on Windows, or `docker run -p 6379:6379 redis`

### 2. Clone and install
```bash
git clone https://github.com/Sathvik-Dandu/EV-charging-hub.git
cd EV-charging-hub
npm run install:all
```

### 3. Configure `server/.env`
```bash
cp server/.env.example server/.env
```
Then fill it in:

| Variable | Example / meaning |
|---|---|
| `DATABASE_URL` | **Supabase:** Dashboard → *Connect* → **Session pooler** URI, e.g. `postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres`. Characters such as `#` `@` `/` in the password must be URL-encoded (`#` → `%23`). **Local:** `postgresql://postgres:<password>@localhost:5432/ev_charging_hub` |
| `DATABASE_SSL` | `true` for Supabase, `false` for local |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | `15m` / `7d` |
| `SIMULATION_SPEED` | `10` (demo charging runs 10× faster) |

The API refuses to start and names any missing setting.

### 4. Create the tables and demo accounts
```bash
npm run db:setup
```

### 5. Run (two terminals)
```bash
npm run api   # → http://localhost:4000/api   (Swagger: /api/docs)
npm run web   # → http://localhost:5173
```

### Demo accounts
Every demo password is `Password@123`.

| Role | Email |
|---|---|
| Administrator | admin@evhub.com |
| EV Owner | owner@evhub.com |
| Station Owner | stationowner@evhub.com |
| Technician | tech@evhub.com |
| Operations Manager | manager@evhub.com |

The database starts **clean**: no stations. Typical first steps:
1. As station owner, add a station, then add chargers. The first charger of each type asks for its price per kWh.
2. As EV owner, add a vehicle and book.

---

## 🧰 Scripts

| Command | What it does |
|---|---|
| `npm run install:all` | Installs server and client dependencies |
| `npm run db:setup` | Applies migrations and seeds the 5 demo accounts |
| `npm run api` / `npm run web` | Starts the API / website in watch mode |
| `npm test` | Runs server (16) and client (5) tests |
| `npm --prefix server run db:seed` | Resets the database to the 5 demo accounts |
| `npm --prefix server run db:studio` | Opens Prisma Studio to browse tables |
| `npm --prefix server run db:migrate` | Creates a new migration after editing `schema.prisma` |

You can also browse data in the **Supabase dashboard → Table Editor**.

## 📁 Project structure

```
EV-charging-hub/
├── server/                 NestJS API
│   ├── prisma/             schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── common/         permissions.ts, scope.ts, business-rules.ts, auth guard, validation
│   │   ├── auth/ users/ vehicles/ stations/ chargers/
│   │   ├── bookings/ sessions/ invoices/ maintenance/ enquiries/ reports/ overview/
│   │   └── prisma/ redis/ realtime/ audit/
│   └── test/               unit tests
└── client/                 React app
    └── src/
        ├── pages/          public home page + one page per app screen
        ├── components/     layout, dialogs, public sections, common widgets
        ├── config/         permissions, navigation, connectors, site text
        ├── api/            axios client + every endpoint
        └── schemas/        Zod form validation
```

## 📚 Documentation

| File | Contents |
|---|---|
| [PROJECT_GUIDE.md](PROJECT_GUIDE.md) | Why this project, the tech stack in simple words, every DB table with limits, setup from zero |
| [WORKFLOW.md](WORKFLOW.md) | Request flow, screen → API → file map, what every file contains |
| [CHANGE_GUIDE.md](CHANGE_GUIDE.md) | Exact file and line for common changes (roles, permissions, rules, validation, theme) |
| [TESTING.md](TESTING.md) | Step-by-step manual test plan for every feature |
| [supabase/setup.sql](supabase/setup.sql) | SQL to create all tables and demo accounts in the Supabase SQL Editor ([how to](supabase/README.md)) |
| [supabase/update-prices.sql](supabase/update-prices.sql) | SQL to update a database created before the Prices change (keeps data) |

## ✅ BRD business rules

1. Unique station and charger IDs.
2. No overlapping bookings per charger.
3. Connector compatibility.
4. Faulty chargers can't be booked.
5. Auto-cancel after a 15-minute no-show.
6. Max 2 upcoming bookings.
7. A session needs a booking or a free walk-in charger.
8. One price per kWh per charging type, set by the station owner.
9. Bill = energy × price + 18% GST.
10. An invoice for every session.
11. Every charger status change is timestamped.
12. Only admins manage users; only station owners set prices.

## ⚠️ Known limitations

- Payments use a **mock gateway**; no real money moves.
- Charging energy is **simulated** from charger power and time, not read from a meter.
