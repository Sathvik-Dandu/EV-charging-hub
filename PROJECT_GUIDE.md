# Project Guide: Why This Project, Technology, Database & Setup

This guide covers:
1. **Why I chose this project**
2. **The technology stack in plain words**
3. **Every database table and its value limits**
4. **Setting up a brand-new computer**, step by step
5. **Running the project every day**

---

## 1. Why I chose this project

I picked the **EV Charging Network & Slot Booking Platform** (Green Mobility Charge Hub) over the more common capstone themes, such as an online shop, a library system, a hospital appointment app or a to-do/task manager. These are my reasons.

### 1.1 It solves a real, current problem
- India's electric vehicle numbers are growing fast, but finding a **working, free charger** is still a daily worry for EV drivers.
- Drivers waste time at chargers that are broken, already in use, or the wrong connector type. This project tackles exactly that: **live charger status, booking a slot in advance, and connector matching**.
- It also helps businesses: parking-space owners can **host chargers and earn**, and operators can **plan network expansion** from utilization reports.

### 1.2 It has real business rules, not just forms
A shop or library app is mostly add/edit/delete screens. This project has **12 BRD business rules** that the server must enforce, which show actual problem-solving:

| Rule | Why it is interesting to build |
|---|---|
| No double booking of a charger | Needs a **database transaction + Redis lock** so two people clicking "Book" at the same moment can't both win |
| Connector must match the vehicle | Cross-checks two different tables before saving |
| Auto-cancel after 15 minutes no-show | Needs **background jobs** (BullMQ) that run on a timer, not on a button click |
| Peak-hour tariff + idle fee + GST | A real **billing calculation**, split minute by minute between peak and off-peak |
| Every status change logged with time | An **audit trail**, as in real enterprise software |
| Charger power limits per type | CCS2/CHAdeMO ≥ 50 kW, Type 2 ≥ 22 kW, Bharat DC-001 = 15 kW, Bharat AC-001 = 10 kW |

### 1.3 It has five clearly different users
Admin, EV owner, station owner, technician and manager each see **different screens and different data**. That lets me demonstrate:
- **Role-based access control** (who can press which button),
- **data scoping** (a station owner sees only their own stations),
- an **approval workflow** (the admin approves new station owners and technicians).

Most alternative themes have only "user" and "admin".

### 1.4 It covers the whole full-stack syllabus in one project
| Skill | Where it appears |
|---|---|
| Frontend (React, forms, validation, state) | Booking dialog, live sign-up validation, role-based menus |
| Backend REST API | 50+ endpoints, documented in Swagger |
| Relational database design | 13 related tables with unique keys, foreign keys and indexes |
| Real-time updates | Charger status changes reach every screen within seconds (Socket.io) |
| Background processing | No-show auto-release via a Redis queue |
| Security | Hashed passwords, JWT tokens, permissions on every request |
| Testing | Unit tests for billing, booking rules, charger specs and permissions |

### 1.5 It matches the evaluation criteria
The BRD's marks go to functional coverage, architecture, backend, database design, booking engine logic, security and reports. Every one of those areas has something concrete to show in this project.

### 1.6 It is easy to demonstrate live
A panel can watch it work end to end in about 5 minutes:
1. A driver books a slot.
2. The charging meter climbs live.
3. An invoice is generated with the peak/idle split.
4. A fault is reported, and the charger turns red on every screen.
5. A technician fixes it, and the charger turns green again.

---

## 2. The technology stack in plain words

Think of the app as a **restaurant**:
- The **frontend** is the dining room where customers sit and order.
- The **backend** is the kitchen that follows the recipes (business rules).
- The **database** is the storeroom where everything is kept.
- **Redis** is the kitchen timer and the "this table is taken" sign.

| Layer | Technology | What it does here | Simple analogy |
|---|---|---|---|
| Runtime | **Node.js 22** | Runs JavaScript/TypeScript code outside the browser (for the server and the tools) | The electricity that powers the kitchen |
| Package manager | **npm** | Downloads libraries (`npm install`) and runs scripts (`npm run …`) | The supplier that delivers ingredients |
| Language | **TypeScript** | JavaScript with types, so mistakes show up before running | A recipe that says "2 eggs", not "some eggs" |
| Frontend framework | **React 19** | Builds the screens out of reusable pieces (components) | Lego blocks for web pages |
| Frontend build tool | **Vite** | Starts the website on port 5173 and reloads it instantly when code changes | A fast oven |
| UI library | **Material UI (MUI)** + DataGrid | Ready-made buttons, inputs, dialogs and tables | Pre-made furniture |
| Server data | **TanStack Query** | Fetches data from the API, caches it, refreshes it | A waiter who remembers your last order |
| App state | **Redux Toolkit** | Remembers who is logged in, sidebar state, live events | The notepad at the front desk |
| Forms | **React Hook Form + Zod** | Handles form inputs; Zod checks the rules while you type | A form checker beside the customer |
| Routing | **React Router** | Decides which page shows for each URL (`/login`, `/stations`…) | Signboards between rooms |
| Backend framework | **NestJS** | The API server on port 4000: controllers receive requests, services apply the rules | The kitchen with stations and chefs |
| Validation (server) | **class-validator** (DTOs) | Rejects bad data even if someone skips the website | The head chef double-checking every order |
| Database | **PostgreSQL 18** | Stores all data in tables | The storeroom with labelled shelves |
| Database tool | **Prisma** | Writes the SQL for us; the `schema.prisma` file defines the tables; migrations create them | A storeroom manager who speaks SQL |
| Cache/queue | **Redis (Memurai on Windows)** + **BullMQ** | Locks a charger during booking; runs the "15-minute no-show" timer | The kitchen timer |
| Real-time | **Socket.io** | Pushes "charger is now Faulty" to every open screen instantly | A bell that rings in every room |
| Security | **JWT tokens + bcrypt** | bcrypt scrambles passwords; a JWT is the "wristband" proving who you are on each request | A wristband at an event |
| API docs | **Swagger** | A web page listing every API endpoint, at http://localhost:4000/api/docs | The menu card |
| Tests | **Vitest** + React Testing Library | Automatically checks billing, rules and forms (`npm test`) | A taste test before serving |

### How one click travels
```
You click "Confirm booking" (React page)
   → Zod checks the form
   → axios sends POST /api/bookings with your JWT
   → NestJS checks your token and permission
   → BookingsService applies the rules (connector match, no overlap, max 2 bookings…)
   → Prisma saves the row in PostgreSQL
   → BullMQ schedules the 15-minute no-show timer in Redis
   → Socket.io tells every open screen
   → The page shows "Slot booked!"
```

---

## 3. Database tables and value limits

**How Prisma types map to PostgreSQL:**

| Prisma type | PostgreSQL type | Built-in limit |
|---|---|---|
| `Int` | `integer` | −2,147,483,648 to 2,147,483,647 |
| `Float` | `double precision` | about 15 significant digits |
| `String` | `text` | no fixed length (up to 1 GB). **Real limits come from app validation** (shown below) |
| `Boolean` | `boolean` | true / false |
| `DateTime` | `timestamp(3)` | date + time to the millisecond |
| enum | PostgreSQL enum type | only the listed values are allowed |
| `?` after a type | nullable | may be empty (NULL) |

**Key words used below:**
- **PK**: primary key, auto-numbered `id`.
- **FK**: foreign key, a link to another table.
- **unique**: no two rows may share the value.

Validation limits are enforced by the server DTOs (`server/src/*/dto`, `server/src/common/validation.ts`) and repeated in the browser (`client/src/schemas/forms.ts`).

### 3.1 Role
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| name | text, **unique** | one of ADMIN, EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER |
| description | text | set by the seed |

### 3.2 User
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| fullName | text | 3–60 characters, letters, space, `.` `'` `-`; must start with a letter |
| email | text, **unique** | valid email; stored trimmed and lower-case |
| phone | text, optional | exactly 10 digits, starting with 6, 7, 8 or 9 |
| passwordHash | text | bcrypt hash. The real password needs 8+ characters with an uppercase letter, a lowercase letter, a number and a special character |
| refreshTokenHash | text, optional | hashed login refresh token; cleared on logout or deactivation |
| isActive | boolean | default true; false = cannot sign in |
| approvalStatus | enum | APPROVED (default), PENDING, REJECTED. Station owners and technicians start as PENDING |
| rejectionReason | text, optional | 5–300 characters, set by the admin when rejecting |
| organization | text, optional | max 100 characters; **required** for station owners (business name) |
| roleId | Int FK → Role | required |
| createdAt / updatedAt | timestamp | automatic |

### 3.3 Vehicle
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| registrationNo | text, **unique** | format `KA01AB1234` (2 letters, 2 digits, 1–2 letters, 4 digits) |
| make | text | min 2 characters |
| model | text | min 1 character |
| connectorType | enum | CCS2, CHADEMO, TYPE2, BHARAT_DC001, BHARAT_AC001 |
| batteryKwh | double | 5 to 200 |
| ownerId | Int FK → User | the EV owner |
| createdAt / updatedAt | timestamp | automatic |

### 3.4 Tariff
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| name | text, **unique** | min 3 characters |
| energyRate | double | ₹ per kWh off-peak, minimum 1 |
| peakRate | double | ₹ per kWh in peak hours, minimum 1 |
| peakStartHour | integer | 0–23 |
| peakEndHour | integer | 1–24, must be greater than peakStartHour |
| idleFeePerMin | double | ₹ per minute after the 10 free minutes, minimum 0 |
| isActive | boolean | default true |
| createdAt / updatedAt | timestamp | automatic |

### 3.5 Station
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| code | text, **unique** | format `BLR-005` (3 capital letters, dash, 3 digits) |
| name | text | min 3 characters |
| address | text | min 5 characters |
| city | text | min 2 characters (indexed for search) |
| latitude | double | −90 to 90 |
| longitude | double | −180 to 180 |
| opensAt / closesAt | text | `HH:mm` (00:00–23:59); defaults 00:00 and 23:59 |
| isActive | boolean | default true |
| tariffId | Int FK → Tariff | must be an active tariff |
| ownerId | Int FK → User, optional | the station owner; empty if the admin created it |
| createdAt / updatedAt | timestamp | automatic |

### 3.6 Charger
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| code | text, **unique** | format `BLR-005-C1` |
| connectorType | enum | CCS2, CHADEMO, TYPE2, BHARAT_DC001, BHARAT_AC001 |
| powerKw | double | depends on type: **CCS2 50–350, CHAdeMO 50–150, Type 2 22–43, Bharat DC-001 exactly 15, Bharat AC-001 exactly 10** |
| status | enum | AVAILABLE (default), RESERVED, CHARGING, FAULTY |
| isActive | boolean | default true |
| stationId | Int FK → Station | required |
| createdAt / updatedAt | timestamp | automatic |

### 3.7 ChargerStatusLog (BRD rule 11)
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| chargerId | Int FK → Charger | required |
| fromStatus | enum, optional | previous status (empty for the first entry) |
| toStatus | enum | new status |
| reason | text | e.g. "Fault reported: Screen flickering" |
| changedAt | timestamp | automatic |

### 3.8 Booking
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| reference | text, **unique** | generated, e.g. `BK-261125-AB12` |
| userId | Int FK → User | the EV owner who booked |
| vehicleId | Int FK → Vehicle | must belong to the user; connector must match the charger |
| chargerId | Int FK → Charger | must not be FAULTY |
| startTime / endTime | timestamp | duration 30, 60, 90 or 120 min; not in the past; max 7 days ahead; inside station hours; no overlap on the same charger or vehicle |
| status | enum | CONFIRMED (default), IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| cancelReason | text, optional | max 200 characters |
| createdAt / updatedAt | timestamp | automatic |

Each EV owner can have **at most 2** CONFIRMED future bookings.

### 3.9 ChargingSession
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| bookingId | Int FK → Booking, optional, **unique** | empty for walk-in sessions |
| chargerId | Int FK → Charger | required |
| vehicleId | Int FK → Vehicle | a vehicle can have only one ACTIVE session |
| startedAt / endedAt | timestamp | endedAt is filled when stopped |
| energyKwh | double | default 0; capped at 80% of battery capacity |
| durationMin | integer | charging minutes |
| idleMinutes | integer | 0–600; minutes plugged in after charging finished |
| status | enum | ACTIVE (default), COMPLETED |
| createdAt / updatedAt | timestamp | automatic |

### 3.10 Invoice (BRD rule 10)
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| invoiceNo | text, **unique** | generated, e.g. `INV-261125-K2P4` |
| sessionId | Int FK → ChargingSession, **unique** | exactly one invoice per session |
| offPeakKwh / peakKwh | double | energy split by tariff hours |
| energyCost / peakCost | double | ₹, rounded to 2 decimals |
| idleFee | double | (idle minutes − 10) × idle rate, never below 0 |
| taxAmount | double | 18% GST |
| totalAmount | double | ₹ total |
| paymentStatus | enum | PENDING (default), PAID |
| paymentRef | text, optional | mock payment reference, e.g. `PAY-UPI-…` |
| paidAt | timestamp, optional | when paid |
| createdAt / updatedAt | timestamp | automatic |

### 3.11 MaintenanceTicket
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| ticketNo | text, **unique** | generated, e.g. `TKT-261125-7SXO` |
| chargerId | Int FK → Charger | the faulty charger |
| title | text | 5–100 characters |
| description | text | min 10 characters |
| priority | enum | LOW, MEDIUM (default), HIGH |
| status | enum | OPEN (default) → IN_PROGRESS → RESOLVED (no skipping) |
| reportedById | Int FK → User | EV owner or station owner |
| assignedToId | Int FK → User, optional | technician, set by the manager |
| resolution | text, optional | min 5 characters, required to resolve |
| resolvedAt | timestamp, optional | when resolved |
| createdAt / updatedAt | timestamp | automatic |

### 3.12 Enquiry (Help & support)
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| userId | Int FK → User | who asked |
| category | enum | BOOKING, BILLING, CHARGER, ACCOUNT, OTHER |
| subject | text | 5–120 characters |
| message | text | 20–1000 characters |
| status | enum | NEW (default), IN_PROGRESS, RESOLVED |
| reply | text, optional | 5–1000 characters; written by the manager (needed before RESOLVED) |
| repliedAt | timestamp, optional | when replied |
| createdAt / updatedAt | timestamp | automatic |

### 3.13 AuditLog
| Column | Type | Rules / limits |
|---|---|---|
| id | Int PK | auto |
| userId | integer, optional | who did it (empty for system jobs) |
| action | text | e.g. CREATE, LOGIN, APPROVE, CANCEL, NO_SHOW |
| entity / entityId | text | which table and row |
| details | text, optional | extra JSON |
| createdAt | timestamp | automatic |

### 3.14 How the tables connect
```
Role 1──* User 1──* Vehicle 1──* Booking *──1 Charger *──1 Station *──1 Tariff
          │  │                      │ 0..1        │            │
          │  │                      ▼             │            └── ownerId → User (station owner)
          │  │              ChargingSession 1──1 Invoice
          │  │                                    │
          │  └──* Enquiry                         ├──* ChargerStatusLog
          └──* MaintenanceTicket (reportedBy / assignedTo) *──1 Charger
AuditLog: who did what, and when
```
`1──*` means "one to many": one user has many vehicles.

---

## 4. Setting up a brand-new computer (Windows)

Do this once per computer. Commands go in **PowerShell**: Start menu → type `PowerShell` → open it.

### Step 1: Install the tools
| Tool | Get it | Check it worked |
|---|---|---|
| **Node.js 22 LTS** (includes npm) | https://nodejs.org → "LTS" installer | `node -v` shows v22… and `npm -v` shows a number |
| **PostgreSQL 18** (includes pgAdmin) | https://www.postgresql.org/download/windows/ → installer. **Remember the password you set for user `postgres`**; keep port 5432 | Start menu shows "pgAdmin 4" |
| **Memurai** (Redis for Windows) | https://www.memurai.com → Developer edition installer | `& "C:\Program Files\Memurai\memurai-cli.exe" ping` prints `PONG` |
| **Git** (optional, for version control) | https://git-scm.com | `git --version` |
| **VS Code** (editor) | https://code.visualstudio.com | none |

You can install the same tools with winget instead:
```powershell
winget install OpenJS.NodeJS.LTS
```
```powershell
winget install PostgreSQL.PostgreSQL.18
```
```powershell
winget install Memurai.MemuraiDeveloper
```
Close and reopen PowerShell after installing, so the new commands are found.

### Step 2: Check the services are running
```powershell
Get-Service postgresql-x64-18, Memurai
```
Both should say **Running**. If one is stopped, open PowerShell **as Administrator** and run `Start-Service postgresql-x64-18` or `Start-Service Memurai`.

> **Using Supabase (the current setup):** the database is hosted on Supabase, so you can **skip installing PostgreSQL and skip Step 3**. In `server/.env`:
> - Set `DATABASE_URL` to the Supabase **Session pooler** URI (Dashboard → *Connect* → Session pooler), with your database password URL-encoded (`#` → `%23`).
> - Set `DATABASE_SSL=true`.
>
> Then continue with Step 6. You can view the data in the Supabase dashboard → **Table Editor**, or with `npm --prefix server run db:studio`. Redis (Memurai) is still needed locally.

### Step 3: Create the database (local PostgreSQL only)
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE ev_charging_hub;"
```
Type your postgres password when asked. It should print `CREATE DATABASE`. You can also do it in pgAdmin: right-click Databases → Create → Database → name `ev_charging_hub`.

### Step 4: Open the project folder
```powershell
cd "C:\Users\<you>\Downloads\EV_Charging_Network_React"
```

### Step 5: Create the settings file
```powershell
Copy-Item server\.env.example server\.env
```
```powershell
notepad server\.env
```
In Notepad:
- In `DATABASE_URL`, replace `YOUR_PASSWORD` with your postgres password.
- Replace both `JWT_..._SECRET` values with any long random text, for example the output of: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Save and close.

| Setting | Meaning |
|---|---|
| `PORT` | API port (4000) |
| `DATABASE_URL` | Where PostgreSQL is and how to log in |
| `REDIS_HOST`, `REDIS_PORT` | Where Memurai is (localhost:6379) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secret keys that sign the login tokens. Never share them |
| `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` | How long a login lasts (15m / 7d) |
| `SIMULATION_SPEED` | Demo charging speed (10 = 1 real minute equals 10 charging minutes) |

### Step 6: Install the libraries (takes a few minutes)
```powershell
npm run install:all
```
This downloads everything in `server/package.json` and `client/package.json` into `node_modules` folders.

### Step 7: Create the tables and the demo accounts
```powershell
npm run db:setup
```
This creates all 13 tables from the migrations, then adds the 5 roles and 5 demo accounts.

Setup is complete.

---

## 5. Running the project (every time)

Open **two** PowerShell windows in the project folder.

**Window 1: the API (backend)**
```powershell
npm run api
```
Wait for: `API ready on http://localhost:4000/api`

**Window 2: the website (frontend)**
```powershell
npm run web
```
Wait for: `Local: http://localhost:5173/`

**Open in the browser:**
| What | URL |
|---|---|
| Website / app | http://localhost:5173 |
| API documentation (Swagger) | http://localhost:4000/api/docs |

**Sign in** with any demo account (password `Password@123`):

| Role | Email |
|---|---|
| Administrator | admin@evhub.com |
| EV owner | owner@evhub.com |
| Station owner | stationowner@evhub.com |
| Technician | tech@evhub.com |
| Manager | manager@evhub.com |

**To stop:** press `Ctrl + C` in each window.

### Everyday command cheat-sheet
| I want to… | Command |
|---|---|
| Start the API | `npm run api` |
| Start the website | `npm run web` |
| Wipe all data back to the 5 demo accounts | `npm --prefix server run db:seed` |
| See the data like a spreadsheet | `npm --prefix server run db:studio` (opens http://localhost:5555) |
| Run the automated tests | `npm test` |
| Apply a change I made in `schema.prisma` | `npm --prefix server run db:migrate` |
| Check PostgreSQL and Redis are running | `Get-Service postgresql-x64-18, Memurai` |
| Check Redis answers | `& "C:\Program Files\Memurai\memurai-cli.exe" ping` |

### If something goes wrong
| Message | Fix |
|---|---|
| `Missing settings in server/.env: …` | Add the named lines (copy from `server/.env.example`) |
| `password authentication failed for user "postgres"` | The password in `DATABASE_URL` is wrong |
| `database "ev_charging_hub" does not exist` | Do Step 3 |
| `ECONNREFUSED 127.0.0.1:6379` | Memurai isn't running: `Start-Service Memurai` (admin) |
| `Port 4000/5173 is already in use` | The app is already running in another window; close it |
| Website shows **Offline** or "Cannot reach the server" | Start the API (`npm run api`) |
| `'npm' is not recognized` | Node.js isn't installed or PowerShell wasn't reopened after installing |

See also: [README.md](README.md) (overview, viewing the database), [WORKFLOW.md](WORKFLOW.md) (which file does what), [CHANGE_GUIDE.md](CHANGE_GUIDE.md) (edits for the panel), [TESTING.md](TESTING.md) (test every feature).
