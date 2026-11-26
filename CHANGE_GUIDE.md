# Panel Change Guide: Where to Edit What

Each likely request with its **file : line** and the edit. To find *which file handles a screen*, see [WORKFLOW.md](WORKFLOW.md) Parts 2–3.

> **Golden rules**
> 1. Permissions and validations exist on **both sides**. The **server** copy is real security; the **client** copy hides buttons and shows errors while typing. Change both.
> 2. After editing `schema.prisma`, run `npm --prefix server run db:migrate`, then restart the API.
> 3. The client reloads by itself; the API restarts by itself with `npm run api`.

---

## A. Roles, responsibilities and user options

### A1. Change a person's role (no code)
Admin → **Users** → that user's **Role** dropdown (saves immediately; the user signs in again). Use the **Active** switch to block or unblock.
API: `PATCH /api/users/:id/role` → `server/src/users/users.service.ts:91`.

### A2. Approve / reject new station owners and technicians (no code)
Admin → **Account requests** → Approve / Reject (a reason is required and is shown to the user at sign-in).
API: `server/src/users/users.service.ts:32` (list), `:40` (approve), `:50` (reject).

### A3. "Let role X do action Y": edit the permission map
Edit the **same line in both files**. The client line is always the server line + 4.

| Permission | Server `server/src/common/permissions.ts` | Client `client/src/config/permissions.ts` | Who has it |
|---|---|---|---|
| `overview:view` | 6 | 10 | everyone |
| `accounts:approve` (Account requests) | 7 | 11 | ADMIN |
| `users:manage` | 8 | 12 | ADMIN |
| `tariffs:manage` | 9 | 13 | ADMIN |
| `stations:view` | 10 | 14 | ADMIN, EV_OWNER, STATION_OWNER, MANAGER |
| `stations:create` (Add station) | 11 | 15 | ADMIN, STATION_OWNER |
| `stations:edit` | 12 | 16 | ADMIN, STATION_OWNER |
| `chargers:manage` (Add/switch charger) | 13 | 17 | ADMIN, STATION_OWNER |
| `vehicles:manage` | 14 | 18 | EV_OWNER |
| `bookings:view` | 15 | 19 | EV_OWNER, STATION_OWNER, MANAGER |
| `bookings:create` | 16 | 20 | EV_OWNER |
| `bookings:reschedule` | 17 | 21 | EV_OWNER |
| `bookings:cancel` | 18 | 22 | EV_OWNER, STATION_OWNER |
| `sessions:view` | 19 | 23 | EV_OWNER, STATION_OWNER, MANAGER |
| `sessions:control` (Start/Stop) | 20 | 24 | EV_OWNER, STATION_OWNER |
| `sessions:walkin` | 21 | 25 | EV_OWNER |
| `invoices:view` | 22 | 26 | EV_OWNER, STATION_OWNER, MANAGER |
| `invoices:pay` | 23 | 27 | EV_OWNER |
| `tickets:view` (Maintenance page) | 24 | 28 | EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER |
| `tickets:create` (Report fault) | 25 | 29 | EV_OWNER, STATION_OWNER |
| `tickets:assign` (Assign technician) | 26 | 30 | **MANAGER only** |
| `tickets:work` (Start work / Resolve) | 27 | 31 | TECHNICIAN |
| `technicians:view` | 28 | 32 | MANAGER |
| `enquiries:view` | 29 | 33 | EV_OWNER, STATION_OWNER, TECHNICIAN, MANAGER |
| `enquiries:create` (New request) | 30 | 34 | EV_OWNER, STATION_OWNER, TECHNICIAN |
| `enquiries:manage` (Reply) | 31 | 35 | **MANAGER only** |
| `reports:view` | 32 | 36 | MANAGER |

**Example: "Let the admin also assign maintenance."** In `permissions.ts` server line 26 and client line 30, set `[MANAGER, ADMIN]` (also add `ADMIN` to `technicians:view` and `tickets:view`).

Wiring: `@Can('…')` on controllers (e.g. `server/src/stations/stations.controller.ts:33`) is checked at `server/src/common/auth.guard.ts:34`.

### A4. What data each role sees
`server/src/common/scope.ts`: `stations` line 7, `chargers` 9, `bookings` 11, `sessions` 17, `invoices` 23, `tickets` 29, `enquiries` 36, and `ownsStation()` at line 39 (blocks other owners' stations).
Example: "Let the manager see only open tickets" → `tickets` (line 29) add `if (user.role === ROLES.MANAGER) return { status: { not: 'RESOLVED' } };`

### A5. Sign-up roles and approval
| Change | File : line |
|---|---|
| Which roles can sign up | `server/src/common/business-rules.ts:30` (`SELF_SIGNUP_ROLES`) + tabs in `client/src/pages/RegisterPage.tsx:18-22` + `client/src/schemas/forms.ts:53` |
| Which roles need admin approval | `server/src/common/business-rules.ts:32` (`ROLES_NEEDING_APPROVAL`). Remove `TECHNICIAN` and technicians can sign in immediately |
| Business name required for station owners | server `server/src/auth/auth.service.ts:23`, client `client/src/schemas/forms.ts:57` |
| "Request sent" message | `server/src/auth/auth.service.ts:42` |

### A6. Menu and Overview per role
| Change | File : line |
|---|---|
| Menu items, icons, role-specific labels ("My stations", "My work queue") | `client/src/config/navigation.ts:26-38` |
| Role display names | `client/src/config/navigation.ts:42` |
| Overview quick actions | `client/src/pages/DashboardPage.tsx:21` |
| Overview number cards | `client/src/pages/DashboardPage.tsx:45` |

---

## B. Business rules

| Panel asks… | Server | Client |
|---|---|---|
| 3 upcoming bookings | `server/src/common/business-rules.ts:2` | `client/src/pages/DashboardPage.tsx` (`/ 2`), `client/src/pages/public/content.ts:2` |
| No-show after 20 min | `business-rules.ts:3` | `content.ts:3` |
| Idle fee after 5 min | `business-rules.ts:4` | `client/src/pages/SessionsPage.tsx:22`, `content.ts:4` |
| 45-minute slot | `business-rules.ts:5` | `client/src/schemas/forms.ts:5` |
| Book 14 days ahead | `business-rules.ts:6` | `client/src/components/dialogs/BookSlotDialog.tsx:16` |
| GST 12% | `business-rules.ts:8` | `BookSlotDialog.tsx:69` (`1.18` → `1.12`) |
| Start 15 min early | `server/src/sessions/sessions.service.ts:16` | `client/src/pages/BookingsPage.tsx:22` |
| Walk-in blocked within 2 h | `sessions.service.ts:146` | none |
| Allow cancel after slot start | `server/src/bookings/bookings.service.ts:113-115` (delete) | none |
| Idle fee formula / 100% charge | `server/src/sessions/billing.ts:37` / `:56` | none |
| Demo charging speed | `server/.env` `SIMULATION_SPEED` | none |
| No-show sweep interval | `server/src/bookings/bookings.processor.ts:18` | none |
| Ticket status order | `server/src/maintenance/maintenance.service.ts:14` | none |

---

## C. Charger types
| Panel asks… | Server | Client |
|---|---|---|
| Change kW limit | `server/src/common/business-rules.ts:13-17` | `client/src/config/connectors.ts:4-8` |
| Add a type (e.g. GBT) | `server/prisma/schema.prisma:11` enum → migrate; add to `CONNECTOR_SPECS` (`business-rules.ts`) | `client/src/api/types.ts:3`, `client/src/config/connectors.ts`, `client/src/schemas/forms.ts:4` |

---

## D. Validation
| Panel asks… | Client (live) | Server |
|---|---|---|
| Password rules | `client/src/schemas/forms.ts:10` | `server/src/common/validation.ts:1-2` |
| Mobile rule | `client/src/schemas/forms.ts:26-31` | `server/src/common/validation.ts:4-5` |
| Make mobile mandatory | `forms.ts:29-30` remove `v === '' \|\| ` and `.optional()`; label `client/src/pages/RegisterPage.tsx:106` | `server/src/auth/dto/auth.dto.ts:21` delete `@IsOptional()`, line 23 `phone?:` → `phone:` |
| Name rule | `client/src/schemas/forms.ts:20` | `server/src/common/validation.ts:7-8` |
| Vehicle registration | `client/src/schemas/forms.ts:70` | `server/src/vehicles/dto/vehicle.dto.ts:7` |
| Battery 5–200 kWh | `client/src/schemas/forms.ts:74` | `server/src/vehicles/dto/vehicle.dto.ts:26-27` |
| Errors only after leaving a field | `mode: 'onChange'` → `'onBlur'` in that page's `useForm` | none |

---

## E. Add a new field end-to-end (example: vehicle `color`)
1. `server/prisma/schema.prisma:112`: add `color String?` after `batteryKwh`, then migrate.
2. `server/src/vehicles/dto/vehicle.dto.ts` after line 28: `@IsOptional() @IsString() color?: string;` (import `IsOptional`).
3. `client/src/api/types.ts:70`: add `color?: string;`
4. `client/src/schemas/forms.ts:74`: add `color: z.string().optional(),`
5. `client/src/pages/VehiclesPage.tsx:101`: add `color: ''` to `defaultValues`.
6. `client/src/pages/VehiclesPage.tsx:132`: add `<TextField label="Color" {...register('color')} />`
7. `client/src/pages/VehiclesPage.tsx:61`: show `{v.color}`.

---

## F. Look and website text
| Panel asks… | File : line |
|---|---|
| Brand colours | `client/src/theme/palette.ts:2-6` |
| Status colours | `client/src/theme/palette.ts:15-18` |
| Font | `client/src/main.tsx:6` + `client/src/theme/theme.ts:18` |
| Button shape / corner radius | `client/src/theme/theme.ts:33` / `:16` |
| Sidebar width | `client/src/components/layout/AppLayout.tsx:17` |
| Company name, support phone/email | `client/src/config/site.ts:2-5` |
| Navbar sections | `client/src/config/site.ts:9` (`PUBLIC_NAV`); each section's `id` in `client/src/pages/public/HomePage.tsx` (`find` 87, `host` 116, `platform` 157, `resources` 193) |
| Support hours / limitations | `client/src/config/site.ts:16` / `:22` |
| Headline | `client/src/pages/public/HomePage.tsx:49-51` |
| Host section button target | `client/src/pages/public/HomePage.tsx:128` |
| FAQ / role text | `client/src/pages/public/content.ts:10` / `:41` |

---

## G. Accounts, config and database
| Panel asks… | File : line |
|---|---|
| Demo accounts / password | `server/prisma/seed.ts:18` / `:8` |
| Role descriptions in DB | `server/prisma/seed.ts:10` |
| Default role in Admin → Add user | `client/src/pages/UsersPage.tsx:104` |
| Required `.env` settings | `server/src/main.ts:8` |
| API prefix / Swagger path | `server/src/main.ts:19` / `:30` |
| Reset database | `npm --prefix server run db:seed` |
| View database | `npm --prefix server run db:studio` (README section 6) |
