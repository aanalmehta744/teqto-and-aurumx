# Session Changes Log

A record of all changes made during this working session, grouped by feature.

---

## 1. BA / BDE role adjustments

- **BA now sees the employee-style dashboard** (same as other employees) instead of the admin dashboard.
- **BA sees only their own attendance** — the all-employee attendance routes were removed (commented out).
- **View-only Holidays added** to both BDE and BA sidebars.

**Files:**
- `src/app/ba/ba.routes.ts` — dashboard → employee `DashboardComponent`; removed all-employee attendance routes; added `holidays` route (`AllHolidayComponent`).
- `src/app/client/client.routes.ts` — added `holidays` route.
- `src/app/layout/sidebar/sidebar-items.ts` — BA dashboard path `/ba/dashboard/main` → `/ba/dashboard`; added Holidays items for BDE (`/client/holidays`) and BA (`/ba/holidays`).

---

## 2. BDE / BA "Employee Updates" showing empty — fixed

- Switched from the broken `GET /api/dailyUpdates/all` to the working base endpoint `GET /api/dailyUpdates`.
- Fixed `isTblLoading` never being reset (so the "No results" state now shows).

**Files:**
- `src/app/employee/employee-daily-update/allemployee-daily-update/allemployee-daily-update.component.ts`
- `src/app/employee/employee-daily-update/allemployee-daily-update/allemployee-daily-update.service.ts`

---

## 3. Admin / HR could not see employee daily updates — fixed

- Admin, HR, and all employee levels (intern/junior/senior) can now see daily updates.
- HR was excluded from the assigner-role check and had too-narrow columns — both fixed.

**Files:**
- `src/app/employee/employee-daily-update/employee-daily-update.component.ts` — HR added to the fetch-all condition; HR columns widened to full set.
- `src/app/employee/employee-daily-update/employee-daily-update.service.ts` — `getAllUpdates()` points to base endpoint.
- `src/app/admin/employee-daily-update/employee-daily-update.component.ts` — uses `getAllUpdates()`; `isTblLoading` reset.

---

## 4. Daily-update role-based filtering (BDE / BA)

In `AllEmployeeDailyUpdateComponent` (used by BDE `/client/employee-updates` and BA `/ba/employee-updates`):
- **BDE** → sees only BDE-department updates.
- **Senior BA** → sees all BDE + BA updates.
- **Other BA** → sees only BA-department updates.
- **Admin / HR** → see everything.

**File:** `src/app/employee/employee-daily-update/allemployee-daily-update/allemployee-daily-update.component.ts` (`filterByRole()`).

---

## 5. Header UI

- **Left:** hamburger/menu toggle (≡) then the company logo (aligned to header height).
- **Right:** notification bell + circular profile avatar that opens a dropdown containing: company logo, profile card (avatar + name + role), and Logout.
- **BA home fix:** clicking the logo as BA now goes to `/ba/dashboard` (was the 404 `/ba/dashboard/main`).

**Files:**
- `src/app/layout/header/header.component.html`
- `src/app/layout/header/header.component.ts` — `homePage` for BA fixed.

---

## 6. Sidebar (desktop)

- Profile card moved **above** the Logout button.
- Profile card/avatar is **clickable** → navigates to the profile page for every role.
- **Width switched from percentage to fixed rem** for consistency on all screens: expanded `16rem`, collapsed `4.5rem`; content uses `flex-1` to fill remaining space.

**Files:**
- `src/app/layout/sidebar/sidebar.component.html`
- `src/app/layout/sidebar/sidebar.component.ts` — `goToProfile()`.
- `src/app/layout/app-layout/main-layout/main-layout.component.html` — rem widths + `flex-1` content.

---

## 7. Colors: teal → indigo

Replaced all `teal-*` (`rgb(13 148 136)` / `#0d9488`) with `indigo-*` (`rgb(79 70 229)` / `#4f46e5`) across ~13 dashboards / clients / payslips / targets / daily-notes files.

---

## 8. Mobile responsive: bottom navigation

- **≥ 1024px (laptop/PC):** full sidebar.
- **< 1024px (mobile/tablet):** the sidebar is replaced by a fixed **bottom navigation bar** (mobile-app style), icons only.
- Bottom nav shows **all role-based icons**, is **horizontally scrollable** (`overflow-x-auto`, hidden scrollbar), with fixed-width items so nothing squishes (works below 320px).
- **Tap** an icon → navigates (`(click)` handler — reliable on mobile).
- **Hold (0.5s)** → shows the icon's name as a single label centered above the bar (not clipped by the scroll container).
- Profile and Logout icons included at the end.

**Key fixes discovered along the way:**
- `bottomNavItems` changed from a getter to a **stored property + `trackBy`** — the getter rebuilt new object refs every change-detection cycle, so `*ngFor` recreated the DOM and taps never landed. This is why profile (static) worked but looped icons didn't.
- Navigation uses `(click)` (proven reliable) instead of touch/`routerLink`.

**Files:**
- `src/app/layout/sidebar/sidebar.component.html`
- `src/app/layout/sidebar/sidebar.component.ts`
- `src/app/layout/app-layout/main-layout/main-layout.component.html`
- `src/app/layout/app-layout/main-layout/main-layout.component.ts`

---

## 9. Mobile safe-area (iPhone home indicator / gesture bar)

- `src/index.html` — added `viewport-fit=cover` (required for `env(safe-area-inset-*)` on iOS).
- Bottom nav — `padding-bottom: env(safe-area-inset-bottom)` so it sits above the home bar.
- Main content — bottom padding `calc(4rem + env(safe-area-inset-bottom) + 1rem)` so no data hides behind the bar.

---

## 10. Performance

- `src/app/app.config.ts` — added `withPreloading(PreloadAllModules)` so lazy route chunks preload in the background → near-instant page switching.
- `src/app/layout/app-layout/main-layout/main-layout.component.ts` — optimized the `document:mouseover` handler (early-exit on mobile, cached the sidebar element, only assign `isHovered` on actual change) to stop constant change-detection thrash.

> Note: the biggest slowness factor is running `ng serve` (development mode, on-demand chunk compilation). A production build is dramatically faster.

---

## 11. Backend: `bde_targets` schema mismatch — fixed

The live `bde_targets` table uses the **new schema** (`amount`, `month`, `year`), but the target endpoints still referenced **old columns** (`target_amount`, `target_month`, `achieved_amount`), causing `Unknown column 'target_amount'` errors on the employee-profile page.

**File:** `backend/employees/employees.js`
- `GET /:id/targets` — reads `amount`, synthesizes `target_month` from `year`+`month`, returns `achieved_amount` as `0`.
- `POST /:id/targets` — inserts `(bde_id, amount, month, year)` (month/year derived from `target_date`), with `ON DUPLICATE KEY UPDATE`.
- `PUT /:targetId/targets` — updates `amount` + `month`/`year` from `target_date`.

> Remaining: the monthly cron (top of `employees.js`) still uses the old columns. It's wrapped in try/catch and only runs on the 1st of each month, so it doesn't crash anything — but it's obsolete and can be disabled/rewritten later.

---

### Reminders
- **Restart the backend** after the `employees.js` change (`cd backend && npm start`) — Node doesn't hot-reload unless using `nodemon`.
- Pre-existing warnings unrelated to this session: `NG0912` (duplicate component selectors), `NG8107`/`NG8103`/`NG8111` template lint warnings. These don't block the build.

---
---

## PART 2 — Later changes (same day)

### 12. Mobile bottom navigation (phones/tablets < 1024px)
- Desktop keeps the full sidebar; below 1024px it's replaced by a fixed **bottom nav** (icons only).
- Shows **all** role-based icons, horizontally scrollable; **tap navigates**, **press-and-hold shows the name**.
- Fixed the tap-not-navigating bug: `bottomNavItems` is a stable property (not a getter) with `trackBy`, and navigation runs on `(click)`.
- Safe-area padding so it sits above the iPhone home indicator; `viewport-fit=cover` added to `index.html`.
- Sidebar desktop width switched from `%` to fixed **rem** (16rem / 4.5rem) with `flex-1` content.
- **Files:** `sidebar.component.ts/html`, `main-layout.component.ts/html`, `index.html`.

### 13. Performance
- `app.config.ts` — `withPreloading(PreloadAllModules)` so route chunks preload → near-instant switching.
- `main-layout.component.ts` — optimized the `document:mouseover` handler (early-exit on mobile, cached element, change only on real change).

### 14. Daily updates — 400 fixed + role-scoped "Employee Updates"
- `backend/daily-updates/daily-updates.js`:
  - `GET /api/dailyUpdates` no longer 400s without `employeeId` — returns all records (Admin view).
  - New `?viewerId=` role-scoped view: **BDE** → updates on his clients' projects; **Senior BA** → BDE + BA + junior/senior employees; **other BA** → BA only; **Admin/HR** → all.
- Frontend: `allemployee-daily-update.service.ts` sends `viewerId`; component passes it and the old frontend `filterByRole` was removed.

### 15. Breadcrumbs work everywhere
- `breadcrumb.component.ts/html` — the Home icon/link now navigates to the user's role-based dashboard (Admin/BDE/BA/Employee); active item styled indigo.

### 16. Dashboards — consistent overview + cards
- Added the **"Dashboard Overview"** gradient banner to the **employee** and **client (BDE)** dashboards (admin already had it; upgraded to the same gradient).
- Admin's 4 KPI cards now use varied icon colors + left borders (rose/indigo/amber/emerald) to match the employee style.
- **Files:** `admin/dashboard/main/main.component.html`, `employee/dashboard/dashboard.component.html`, `client/dashboard/dashboard.component.html`.

### 17. UI polish → white / blue / indigo palette
- **Header** — frosted white, indigo menu icon, gradient notification header, gradient profile dropdown banner, indigo avatar ring.
- **Sidebar** — active item is an indigo→blue gradient pill; indigo hover; gradient profile footer; rose logout.
- **Mobile bottom nav** — frosted white, indigo active pill, gradient hold-label.
- **Files:** `header.component.html`, `sidebar.component.html`.

### 18. Login page
- **No reload on failed login** — `error.interceptor.ts` now only auto-logout+reloads on a 401 for an **authenticated** request (has token, non-auth URL). A wrong-password login just shows the error inline.
- **Full-screen loader until the company logo loads** — overlay shown until the logo `(load)` fires (with a 5s safety fallback). `login.component.ts/html`, `login.component.scss` (`login_spin`).

### 19. Profile photo persists after logout/login
- `backend/employees/employees.js` — both `/:id/upload-photo` and `/me/upload-photo` now write **both** `img` and `uploadImg` columns (login returns these).
- `header.component.ts` + `sidebar.component.ts` — read `user.img || user.uploadImg` so photos uploaded before the sync still show.

### 20. Admin → BDE Targets: list fix + multi-select dropdown
- `backend/bde-kpi/bde-kpi.js` — fixed the empty list: query now `WHERE LOWER(TRIM(department)) = 'bde' AND (status = 1 OR status IS NULL)` (BDEs are role `Employee`, dept `BDE`, not role `BDE`). Verified against the live DB.
- `bde-targets.component.ts/html` — "Choose BDE(s)" is now a **`mat-select` multiple dropdown**; targets can be saved for **one or more** selected BDEs at once (`forkJoin`).

### Backend restarts required for
- `daily-updates.js`, `employees.js`, `bde-kpi.js` changes (Node doesn't hot-reload without `nodemon`).
