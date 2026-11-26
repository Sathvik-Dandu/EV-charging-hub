# Testing Guide: Every Feature, Step by Step

Follow the sections **in order**; each one creates the data the next needs. **Action** is what you do; **Expected** is what you should see.
- "🗄 DB" means check the table in Prisma Studio: run `npm --prefix server run db:studio` and open http://localhost:5555.
- Sign in with **email + password** on `/login` (there are no shortcut buttons). Every demo password is `Password@123`.

---

## 0. Start clean
| # | Action | Expected |
|---|---|---|
| 0.1 | `npm --prefix server run db:seed` | Table of 5 accounts: admin, owner, stationowner, tech, manager |
| 0.2 | `npm run api` and `npm run web` (two terminals) | API prints "API ready…" |
| 0.3 | Open http://localhost:5173 | Home page |
| 0.4 | 🗄 DB **User**, **Station**, **Price** | 5 users; Station and Price empty |

## 1. One-page website (signed out)
| # | Action | Expected |
|---|---|---|
| 1.1 | Look at the header | Charge Hub · Find a charger · Host a charger · Platform · Resources … **Sign in** · **Sign up**. No "Talk to an expert", no "Manage a fleet" |
| 1.2 | Click each header link | The page **scrolls** to that section on the same page (the URL shows `/#find`, `/#host`…) |
| 1.3 | Find a charger section | "No stations match yet"; network numbers all 0 |
| 1.4 | Resources section | Spec table (CCS2/CHAdeMO 50 kW min, Type 2 22 kW min, Bharat DC-001 15 kW, Bharat AC-001 10 kW / 3 guns), worked bill ₹424.80 (20 kWh × ₹18 + GST), booking policy, FAQ, support hours, limitations |
| 1.5 | Phone width (DevTools) | ☰ menu; no sideways scroll |

## 2. Administrator setup (sign in as admin@evhub.com)
| # | Action | Expected |
|---|---|---|
| 2.1 | Sign in | Menu: Overview, Account requests, Stations, Users (no Tariffs/Prices page). Lands on **Overview** |
| 2.2 | Stations | **No "Add station" button**: only station owners add stations and set prices |
| 2.3 | Swagger `PUT /api/stations/1/prices` with the admin token | 403: the admin can't set prices |
| 2.4 | Open http://localhost:4000/api/docs → try `GET /api/enquiries` with the admin token | 403: the admin doesn't handle enquiries |

## 3. Separate sign-up for each role (sign out)
| # | Action | Expected |
|---|---|---|
| 3.1 | Home → **Host a charger** → **Sign up as a station owner** | Sign-up opens on the **Station owner** tab with a **Business name** field |
| 3.2 | Leave Business name empty, fill the rest | "Business name is required for station owners" |
| 3.3 | Sign up `Neha Kapoor`, `Kapoor EV Parks`, `neha@example.com`, `Strong@123` ×2 | "Request sent… You can sign in once it is approved" |
| 3.4 | Sign in as neha@example.com | "Your account is waiting for administrator approval" |
| 3.5 | Sign up → **Technician** tab → `Ravi Teja`, `ravi@example.com`, `Strong@123` | "Request sent" |
| 3.6 | Sign up → **EV driver** tab → `Asha Verma`, `asha@example.com`, `Strong@123` | Signed in immediately → My vehicles |
| 3.7 | Live validation: type a bad email, letters in mobile, weak password | Errors while typing; letters stripped; password checklist; 👁 shows/hides |
| 3.8 | 🗄 DB **User** | Neha and Ravi `approvalStatus` = PENDING; Asha APPROVED |

## 4. Admin reviews requests (sign in as admin)
| # | Action | Expected |
|---|---|---|
| 4.1 | Overview | "Pending account requests 2" |
| 4.2 | Account requests → Pending | Neha (Station Owner, Kapoor EV Parks) and Ravi (Technician) |
| 4.3 | **Approve** Neha | Moves to Approved |
| 4.4 | **Reject** Ravi with reason `Certification not provided` | Moves to Rejected with the reason |
| 4.5 | Sign in as ravi@example.com | "Your registration was rejected: Certification not provided" |
| 4.6 | Users → change Asha's role to Technician, then back to EV Owner | Snackbar each time; your own row is locked |

## 5. Station owner adds stations (sign in as neha@example.com)
| # | Action | Expected |
|---|---|---|
| 5.1 | Sign in | Menu: Overview, **My stations**, Bookings, Charging sessions, Invoices, Maintenance, Help & support |
| 5.2 | My stations → **Add station** → `BLR-001`, Kapoor Mall Chargers, MG Road, Bengaluru, 12.97, 77.6, 00:00–23:59 | Station card: "No chargers yet…" |
| 5.3 | Add station with ID `BLR-001` again | "Station ID BLR-001 already exists" (Rule 1) |
| 5.4 | Add charger `BLR-001-C1` **CCS2** 30 kW | Live error "CCS2 must be 50–350 kW"; 60 kW is accepted |
| 5.4a | Same dialog: a **Price per kWh for CCS2** box appears. Type `0` | Live error "Enter ₹1–100 per kWh". Type `18` → saves. Card shows "CCS2 · 60 kW · ₹18.00/kWh" |
| 5.5 | Add `BLR-001-C4` **CCS2** 120 kW | No price fields: "CCS2 price at this station: ₹18/kWh" (one price per charging type) |
| 5.5a | Add `BLR-001-C2` Type 2 22 kW (price ₹14) and `BLR-001-C3` Bharat DC-001 15 kW (₹12) | Both save with their own price |
| 5.5b | Card → **Prices** → clear the Type 2 box | Live error "Price is required" (Type 2 chargers exist) |
| 5.5c | Prices → CCS2 ₹20 → Save | "Prices saved for BLR-001"; card shows ₹20.00/kWh for CCS2 |
| 5.5d | 🗄 DB **Price** | 3 rows for BLR-001: CCS2 20, TYPE2 14, BHARAT_DC001 12 |
| 5.6 | Sign in as stationowner@evhub.com | **My stations** is empty: they don't see Neha's station |
| 5.7 | Sign in as admin → Stations | BLR-001 shows "Owner: Neha Kapoor · Kapoor EV Parks" |
| 5.8 | 🗄 DB **Station** | `ownerId` = Neha's user id |

## 6. EV owner books and charges (sign in as owner@evhub.com)
| # | Action | Expected |
|---|---|---|
| 6.1 | Home (signed out) → Find a charger | BLR-001 listed; "Sign in to book" (after sign-in you land on Stations) |
| 6.2 | My vehicles → add `KA01AB1234`, Tata, Nexon EV, CCS2, 40.5 | Saved; duplicate registration is rejected |
| 6.3 | Stations → Book on C2 (Type 2) | "None of your vehicles use Type 2 AC" (Rule 3) |
| 6.4 | Book C1 → next time slot, 30 min | "Slot booked! Reference BK-…"; that time is now greyed out (Rule 2) |
| 6.5 | Book C4 tomorrow 10:00 and tomorrow 14:00 | The 2nd succeeds; the 3rd shows "maximum of 2 upcoming bookings" (Rule 6) |
| 6.6 | Bookings → Reschedule tomorrow's booking → 11:00; then Cancel it | Both work |
| 6.7 | Bookings → ▶ Start on the next-slot booking | Sessions page; kWh climbs live |
| 6.8 | Walk-in with the Nexon on C4 | "This vehicle is already charging in another session" |
| 6.9 | Stop | Invoice: energy × ₹20 (BLR-001's CCS2 price) + 18% GST = total (Rules 8–10) |
| 6.10 | Invoices → Pay → UPI | Paid |
| 6.11 | Try http://localhost:5173/approvals | Redirected to Overview |

## 7. Station owner operates (sign in as neha@example.com)
| # | Action | Expected |
|---|---|---|
| 7.1 | Bookings | "Bookings at my stations": the owner's booking appears with the customer's name |
| 7.2 | Invoices | Invoice from 6.9 visible (no Pay button) |
| 7.3 | As EV owner, book C1 again for the next slot; as Neha → Bookings → ▶ Start → Sessions → Stop | The station owner can run on-site sessions at their own charger |
| 7.4 | My stations → ⚠ Report fault on C1 (`Screen flickering`) | Charger turns **Faulty**; upcoming bookings on C1 are cancelled (Rule 4) |
| 7.5 | As stationowner@evhub.com, try reporting a fault on BLR-001 (Swagger `POST /api/maintenance`) | 403 "only report faults on chargers at your stations" |

## 8. Manager handles maintenance (sign in as manager@evhub.com)
| # | Action | Expected |
|---|---|---|
| 8.1 | Sign in | Menu: Overview, Stations, Bookings, Charging sessions, Invoices, Maintenance, Reports, Enquiries |
| 8.2 | Maintenance → **Assign** → Sanjay Kumar | Assigned. Only the manager has the Assign button |
| 8.3 | The manager has no Start work / Resolve buttons | Correct: technician only |

## 9. Technician fixes (sign in as tech@evhub.com)
| # | Action | Expected |
|---|---|---|
| 9.1 | Menu shows **My work queue** + Help & support | none |
| 9.2 | Start work → Resolve (`Replaced display cable`) | Ticket Resolved; C1 back to **Available** everywhere (live) |
| 9.3 | 🗄 DB **ChargerStatusLog** | Rows for each change with timestamps (Rule 11) |

## 10. Help & support → manager replies
| # | Action | Expected |
|---|---|---|
| 10.1 | As owner@evhub.com → Help & support → New request: Billing, `Question about my invoice`, 20+ character message | Card "Waiting for a reply" |
| 10.2 | As manager → Enquiries → click the row → reply `Your bill is energy × price per kWh + 18% GST.`, status Resolved → Save | Moves to Resolved |
| 10.3 | As owner → Help & support | Shows the manager's reply |
| 10.4 | As admin, the menu has no Enquiries or Maintenance | Correct: the manager only |

## 11. Manager reports (BRD 5.6)
| # | Action | Expected |
|---|---|---|
| 11.1 | Manager → Reports | Booking report (completed/cancelled/no-show…), Utilization by station, Utilization by time of day, Revenue by station, Fault & downtime |
| 11.2 | Change Period to 7 / 90 days | Tables refresh |
| 11.3 | Sign in as owner and open http://localhost:5173/reports | Redirected (manager only) |

## 12. Sign-out bug check
| # | Action | Expected |
|---|---|---|
| 12.1 | As manager open **Enquiries**, then sign out | Sign-in page |
| 12.2 | Sign in as owner@evhub.com | Lands on the **owner's Overview** (not Enquiries); only owner data shows |

## 13. No-show auto-release (Rule 5)
| # | Action | Expected |
|---|---|---|
| 13.1 | Set `NO_SHOW_GRACE_MINUTES: 1` in `server/src/common/business-rules.ts:3` | API restarts |
| 13.2 | As owner, book the next slot and don't start it | CONFIRMED |
| 13.3 | 1–2 minutes after the slot starts | Status **No show** |
| 13.4 | Set it back to `15` | none |

## 14. Automated tests and reset
```powershell
npm test
```
Expected: server **16 passed**, client **5 passed**.
```powershell
npm --prefix server run db:seed
```
