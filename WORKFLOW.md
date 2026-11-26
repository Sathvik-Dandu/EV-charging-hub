# How Charge Hub Works: Workflow & File Map

- **Part 1**: the big picture, the life of one request, and the role flows.
- **Part 2**: every screen → the API it calls → the server file that answers.
- **Part 3**: what every file contains.

---

# Part 1: The big picture

```
 BROWSER (client/, port 5173)                          SERVER (server/, port 4000)
 ┌──────────────────────────────┐   HTTP JSON /api/…   ┌──────────────────────────────┐
 │ Page (pages/*.tsx)            │ ───────────────────► │ AuthGuard: login + @Can perm  │
 │  ├ form checked by Zod        │                      │ ValidationPipe: DTO rules     │
 │  ├ TanStack Query / Mutation  │                      │ Controller → Service          │
 │  └ api/endpoints.ts → axios   │ ◄─────────────────── │ scope.ts: limit data by role  │
 │ Redux: logged-in user         │   JSON response       │ Prisma → PostgreSQL           │
 │                              │ ◄══ Socket.io ═════  │ EventsGateway: live events    │
 └──────────────────────────────┘                      └──────┬───────────────┬────────┘
                                                              ▼               ▼
                                                     PostgreSQL 18     Redis (Memurai)
                                                     ev_charging_hub   locks + BullMQ jobs
```

## Life of one request: "EV owner books a slot"
```
① UI         components/dialogs/BookSlotDialog.tsx: pick vehicle, date, time, duration.
             Zod (bookingSchema in schemas/forms.ts) checks every keystroke.
② API call   bookingApi.create() in api/endpoints.ts → POST /api/bookings
③ Token      api/client.ts adds "Authorization: Bearer <token>"
④ Proxy      vite.config.ts forwards /api → http://localhost:4000
⑤ Guard      server/src/common/auth.guard.ts verifies the JWT, then @Can('bookings:create')
             is checked against server/src/common/permissions.ts → 401 / 403
⑥ DTO        bookings/dto/booking.dto.ts rejects bad input → 400
⑦ Controller bookings/bookings.controller.ts → service.create()
⑧ Service    bookings/bookings.service.ts: Redis lock → vehicle is yours → charger not FAULTY →
             connector matches → slot valid → max 2 upcoming → DB transaction: no overlap →
             INSERT → BullMQ no-show job → audit log → Socket.io "booking:updated"
⑨ Response   201 {reference: "BK-…", status: "CONFIRMED"}; the page shows a snackbar and refreshes the list
```

## Sign-up, approval and sign-in
```
/register (pages/RegisterPage.tsx), tabs EV driver | Station owner | Technician
  └ POST /api/auth/register {role, organization?} → auth/auth.service.ts register()
       EV_OWNER                → approvalStatus APPROVED → tokens returned → signed in → My vehicles
       STATION_OWNER / TECHNICIAN → approvalStatus PENDING → "Request sent" screen (no tokens)

Admin → Account requests (pages/ApprovalsPage.tsx)
  └ GET /api/users/requests, PATCH /api/users/:id/approve | /reject {reason} → users/users.service.ts

/login (pages/LoginPage.tsx): email + password only
  └ POST /api/auth/login → auth.service.ts login() → assertCanSignIn():
       PENDING  → 403 "Your account is waiting for administrator approval"
       REJECTED → 403 "Your registration was rejected: <reason>"
       inactive → 403 "Account is deactivated"
  └ success → the query cache is cleared and you always land on /dashboard (your own Overview).
    The only exception is when a protected page sent you to sign in and your role may open it.
Logout (components/layout/AppLayout.tsx): clears the token and cached data, then goes to /login with no memory
of the previous page. This fixed "the next user opened on the previous user's page".
```

## Role flows (who does what)
```
ADMIN          Account requests (approve station owners and technicians) → Users (roles, deactivate)
                 → Stations (see all, switch off any station or charger)
STATION_OWNER  sign up → approved → My stations → Add station (peak hours, idle fee)
                 → Add charger (kW rule per type; first charger of a type asks its price per kWh) → Prices
                 → Bookings / Sessions / Invoices at own stations → start/stop on-site sessions
                 → report faults on own chargers → Help & support
EV_OWNER       sign up → My vehicles → Stations / home "Find a charger" → Book → Start → Stop → Invoice → Pay
                 → report faults → Help & support
MANAGER        Maintenance: assign technician to each new fault → Enquiries: reply / resolve
                 → Reports: utilization, revenue, faults & downtime, bookings → read-only bookings/sessions/invoices
TECHNICIAN     sign up → approved → My work queue: Start work → Resolve (charger back to Available)
```

## Data scope: who sees which rows (`server/src/common/scope.ts`)
| Data | EV Owner | Station Owner | Technician | Manager | Admin |
|---|---|---|---|---|---|
| Stations (manage view) | none | own stations | none | none | all |
| Bookings, sessions, invoices | own | at own stations | none | all | none |
| Maintenance tickets | reported by me | on own chargers | assigned to me | all | none |
| Enquiries | mine | mine | mine | all | none |

`ownsStation()` in the same file stops a station owner from changing another owner's station, charger, booking or session (403).

## Live updates, background jobs, billing
- **Live status:** `chargers/charger-status.service.ts` updates the charger, writes `ChargerStatusLog` and emits `charger:status`. `hooks/useRealtime.ts` in the browser refreshes the lists.
- **No-show:** `bookings.service.ts` schedules BullMQ jobs and `bookings.processor.ts` releases unstarted bookings after 15 minutes.
- **Prices:** set by the station owner. `Station` holds peak hours and the idle fee; table `Price` holds one price per kWh + peak price per kWh for each charging type at the station.
- **Billing:** `sessions.service.ts stop()` picks the station's price for the charger's type, then `sessions/billing.ts calculateBill()` splits peak and normal hours minute by minute, adds the idle fee after 10 free minutes, then 18% GST.

---

# Part 2: Every screen → API → server file

## Public
| Screen (client file) | API | Server |
|---|---|---|
| Home `pages/public/HomePage.tsx` (sections #find #host #platform #resources) | `GET /api/stations` (includes each station's prices) | `stations.service.ts search()` |
| Find a charger section `components/public/FindChargers.tsx` | `GET /api/stations?city=&connector=&available=`, `GET /api/stations/cities` | `stations.service.ts search() / cities()` |
| Sign in `pages/LoginPage.tsx` | `POST /api/auth/login` | `auth.service.ts login()` |
| Sign up `pages/RegisterPage.tsx` | `POST /api/auth/register` | `auth.service.ts register()` |

## App
| Screen | Action | API | Server method |
|---|---|---|---|
| Overview `pages/DashboardPage.tsx` | counts | `GET /api/overview` | `overview.service.ts summary()` |
| Account requests `pages/ApprovalsPage.tsx` | list / approve / reject | `GET /api/users/requests`, `PATCH /api/users/:id/approve`, `PATCH /api/users/:id/reject` | `users.service.ts requests() / approve() / reject()` |
| Stations `pages/StationsPage.tsx` | list | `GET /api/stations?manage=true` (admin/owner) | `stations.service.ts search()` |
| | Add station (`components/dialogs/StationDialogs.tsx`) | `POST /api/stations` | `stations.service.ts create()` (owner → `ownerId` = you) |
| | Add charger (same file; price fields for a new charging type) | `POST /api/chargers` | `chargers.service.ts create()` + `charger.rules.ts` (kW, price rules) |
| | Prices (same file, `PricesDialog`) | `PUT /api/stations/:id/prices` | `stations.service.ts setPrices()` |
| | Switch charger on/off | `PATCH /api/chargers/:id/active` | `chargers.service.ts setActive()` |
| | Book (`components/dialogs/BookSlotDialog.tsx`) | `GET /api/chargers/:id/slots`, `POST /api/bookings` | `chargers.service.ts slots()`, `bookings.service.ts create()` |
| | Report fault (`components/dialogs/ReportFaultDialog.tsx`) | `POST /api/maintenance` | `maintenance.service.ts create()` |
| My vehicles `pages/VehiclesPage.tsx` | list/add/delete | `GET/POST /api/vehicles`, `DELETE /api/vehicles/:id` | `vehicles.service.ts` |
| Bookings `pages/BookingsPage.tsx` | list / start / reschedule / cancel | `GET /api/bookings`, `POST /api/sessions/start`, `PATCH /api/bookings/:id/reschedule`, `PATCH /api/bookings/:id/cancel` | `bookings.service.ts`, `sessions.service.ts startFromBooking()` |
| Sessions `pages/SessionsPage.tsx` | live list / stop / walk-in | `GET /api/sessions`, `POST /api/sessions/:id/stop`, `POST /api/sessions/start` | `sessions.service.ts findAll() / stop() / startWalkIn()` + `billing.ts` |
| Invoices `pages/InvoicesPage.tsx` | list / pay | `GET /api/invoices`, `POST /api/invoices/:id/pay` | `invoices.service.ts` + `payment.service.ts` (mock) |
| Maintenance `pages/MaintenancePage.tsx` | list / assign / start / resolve | `GET /api/maintenance`, `GET /api/users/technicians`, `PATCH /api/maintenance/:id/assign`, `PATCH /api/maintenance/:id/status` | `maintenance.service.ts findAll() / assign() / updateStatus()` |
| Reports `pages/ReportsPage.tsx` | 5 reports | `GET /api/reports/utilization`, `/utilization-by-hour`, `/revenue`, `/faults`, `/bookings` | `reports/reports.service.ts` |
| Help & support / Enquiries `pages/EnquiriesPage.tsx` | ask / list / reply | `POST /api/enquiries`, `GET /api/enquiries`, `PATCH /api/enquiries/:id` | `enquiries.service.ts create() / findAll() / reply()` |
| Users `pages/UsersPage.tsx` | list / add / role / active | `GET/POST /api/users`, `PATCH /api/users/:id/role`, `PATCH /api/users/:id/status` | `users.service.ts` |

Try any endpoint at http://localhost:4000/api/docs (click **Authorize** and paste an access token).

## Where each BRD rule lives
| Rule | File |
|---|---|
| 1 Unique IDs | `schema.prisma @unique`, `stations.service.ts create()`, `chargers.service.ts create()` |
| 2 No double booking | `bookings.service.ts assertNoOverlap()` + `redis.service.ts withLock()` |
| 3 Connector match / 4 No faulty booking | `bookings.service.ts checkBookingRules()` |
| 5 No-show release | `bookings.service.ts releaseNoShows()` + `bookings.processor.ts` |
| 6 Max 2 upcoming | `bookings.service.ts create()` |
| 7 Booking or walk-in | `sessions.service.ts startFromBooking() / startWalkIn()` |
| 8 Peak-hour price / 9 Idle fee | `sessions/billing.ts calculateBill()` |
| 10 Invoice per session | `sessions.service.ts stop()` |
| 11 Status timestamps | `chargers/charger-status.service.ts` → `ChargerStatusLog` |
| 12 Admin-only master data | `common/permissions.ts` (`users:manage`, `accounts:approve`); prices are station-owner only (`prices:manage`) |
| Charger kW per type | `chargers/charger.rules.ts` + `CONNECTOR_SPECS` in `common/business-rules.ts` |

---

# Part 3: What every file contains

## Server `server/`
| File | Contains |
|---|---|
| `.env` / `.env.example` | Port, DB URL, Redis, **JWT secrets**, simulation speed. The API refuses to start if a required line is missing |
| `prisma/schema.prisma` | All tables: User (+ `approvalStatus`, `organization`), Role, Vehicle, Station (+ `ownerId`, peak hours, idle fee), Charger, Price (per station + charging type), Booking, ChargingSession, Invoice, MaintenanceTicket, Enquiry, ChargerStatusLog, AuditLog |
| `prisma/migrations/` | SQL applied in order |
| `prisma/seed.ts` | Wipes everything, creates 5 roles + 5 demo accounts |
| `src/main.ts` | Checks `.env`, starts NestJS, `/api` prefix, validation, Swagger |
| `src/app.module.ts` | Registers all modules + the global AuthGuard |
| `src/common/business-rules.ts` | Rule numbers, `CONNECTOR_SPECS`, role names, `SELF_SIGNUP_ROLES`, `ROLES_NEEDING_APPROVAL` |
| `src/common/permissions.ts` | **Permission map**: which roles can do each action |
| `src/common/scope.ts` | **Data scope**: which rows each role may see; `ownsStation()` |
| `src/common/auth.decorators.ts` | `@Public()`, `@Can()`, `@CurrentUser()` |
| `src/common/auth.guard.ts` | JWT check + permission check on every request |
| `src/common/validation.ts` | Password, phone and name rules |
| `src/common/codes.ts`, `prisma-exception.filter.ts`, `common.module.ts` | Reference codes, clean DB error messages, shared services |
| `src/auth/` | register (with role + approval), login, refresh, logout |
| `src/users/` | users, staff creation, role change, activate, **account requests approve/reject**, technician list |
| `src/stations/` | public search, admin/owner management view, create/update with ownership check |
| `src/chargers/` | list (scoped), create with kW rule and ownership, activate, slots, history, `charger-status.service.ts` |
| `src/vehicles/` | EV owner vehicles |
| `src/bookings/` | booking engine, rules, BullMQ processor |
| `src/sessions/` | start (booking/walk-in), stop + invoice, `billing.ts` |
| `src/invoices/` | list (scoped), pay via the mock gateway |
| `src/maintenance/` | report fault (charger → Faulty, bookings cancelled), manager assigns, technician resolves |
| `src/enquiries/` | help requests: users create, manager replies |
| `src/reports/` | manager reports: utilization, utilization by hour, revenue, faults, bookings |
| `src/overview/` | role-scoped counts for the Overview page |
| `src/redis/`, `src/realtime/`, `src/audit/`, `src/prisma/` | Redis lock, Socket.io, audit log, DB connection |
| `test/*.spec.ts` | billing, booking rules, charger specs, permissions |

## Client `client/src/`
| File | Contains |
|---|---|
| `App.tsx` | All routes (public `/`, `/login`, `/register`, protected app pages) |
| `main.tsx`, `theme/palette.ts`, `theme/theme.ts` | Start-up, your 5 colours, MUI theme |
| `config/permissions.ts` | Client copy of the permission map (hides menus and buttons) |
| `config/navigation.ts` | Sidebar items, role-specific labels ("My stations"…), role names, `canOpen()` |
| `config/connectors.ts`, `config/site.ts` | Charger labels/limits; website name, nav sections, support channels, limitations |
| `api/client.ts`, `api/endpoints.ts`, `api/types.ts` | Axios + token refresh; every API call; data types |
| `app/store.ts`, `features/authSlice.ts`, `features/uiSlice.ts` | Redux: logged-in user, sidebar, live events |
| `hooks/useRealtime.ts` | Socket.io → refresh data |
| `schemas/forms.ts` | All form validation, incl. sign-up role/business name, enquiry, charger kW rule |
| `components/layout/*` | Logo, app shell (sidebar filtered by permission, logout clears data), route guard |
| `components/public/PublicLayout.tsx` | Website header (section links, Sign in, Sign up), mobile menu, footer |
| `components/public/FindChargers.tsx` | Find-a-charger search and results on the home page |
| `components/public/Blocks.tsx`, `FloatingTiles.tsx` | Website sections and hero cards |
| `components/common/*` | PasswordField (eye), PhoneField, StatusChip, StatCard, PageHeader, Notifier |
| `components/dialogs/*` | Book slot, Add station, Add charger (with price), Prices, Report fault |
| `pages/public/HomePage.tsx`, `pages/public/content.ts` | The one-page website; FAQ and role text |
| `pages/LoginPage.tsx`, `RegisterPage.tsx`, `AuthShell.tsx` | Sign in, role-tab sign-up, shared frame |
| `pages/DashboardPage.tsx`, `pages/dashboard/*` | Overview per role, live charger tiles, live feed |
| `pages/ApprovalsPage.tsx` | Admin account requests |
| `pages/StationsPage.tsx`, `VehiclesPage.tsx`, `BookingsPage.tsx`, `SessionsPage.tsx`, `InvoicesPage.tsx`, `MaintenancePage.tsx`, `ReportsPage.tsx`, `EnquiriesPage.tsx`, `UsersPage.tsx` | One page each (see Part 2) |
