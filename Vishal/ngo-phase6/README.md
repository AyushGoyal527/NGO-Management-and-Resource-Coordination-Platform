# NGO Management System

A MERN application for running an NGO: volunteers, managers, students, beneficiaries, donations, food, resources, tasks, events and a public website, with role-based dashboards and granular permissions. It was built in phases; each phase is a working snapshot of the whole project.

> **This folder is the snapshot for Phase 6.** It runs on its own: install it, seed it and log in with the demo accounts below.

## What is in this snapshot

- Everything from Phase 5
- Public website: Home, About, Programs, Events, Volunteer, Donate and Contact pages
- Website CMS for admins, announcements for admins and managers
- Public volunteer application and donation inquiry forms with rate limits

## Build status

| Phase | Scope | Status |
|---|---|---|
| 1 | Project structure, MongoDB config, all 17 Mongoose models, seed data, `.env.example` | Done |
| 2 | Register, login, logout, forgot/reset password, JWT, role + permission middleware, protected routes, admin Users and Permissions screens | Done |
| 3 | Admin, manager and volunteer dashboards with live stats and charts | Done |
| 4 | Core modules: volunteers, students, beneficiaries (batch 1); donations, food, resources (batch 2); tasks, events, programs (batch 3) | Done |
| 5 | Notifications (bell, page, hourly alerts), activity log, reports with CSV and PDF export | Done |
| 6 | Public website, website CMS, announcements, public volunteer application and donation inquiry forms | Done (**this snapshot**) |
| 7 | Route and permission audit, clean-install check, tests added to the project, final docs | Planned |

## Tech stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, Axios, React Hook Form, React Hot Toast, Recharts, Lucide React
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, express-validator, Helmet, express-rate-limit, PDFKit

## Installation

You need Node.js 18+ and MongoDB 4.2 or newer (a local install or a free MongoDB Atlas cluster). Food stock is updated with a MongoDB 4.2 feature, so older versions will not work.

```bash
# 1. Server
cd server
npm install
npm run seed                # creates server/.env (with a new JWT_SECRET) if missing, then loads demo data
npm run dev                 # API on http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # App on http://localhost:5173
```

If MongoDB is not on `127.0.0.1:27017`, edit `MONGO_URI` in `server/.env` first. Then open http://localhost:5173/login and sign in with a demo account below.

## Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens. Never commit it |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Frontend URL, used for CORS and password-reset links |
| `UPLOAD_DIR` | Folder for uploaded files |
| `APP_TIMEZONE` | Optional. Time zone used to group donations by month, decide "overdue" and filter the activity log by day. Default `Asia/Kolkata` |
| `TRUST_PROXY` | Optional. Set to `1` (or the number of proxies) when the server runs behind a load balancer or reverse proxy, so the public-form rate limits see each visitor's real IP. Leave unset when there is no proxy |
| `PAYMENT_PROVIDER` | Optional. `manual` (default). `razorpay` and `stripe` are not built yet and fall back to `manual` with a console warning |
| `ALERTS_DISABLED` | Optional. Set to `true` to stop the hourly deadline, event and stock checks |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

In production set `VITE_API_URL` in `client/.env` to your API address, then run `npm run build` in `client/`.

## Demo accounts

Password for all: `Password@123`

| Role | Name | Email | Notes |
|---|---|---|---|
| Admin | Vishal Kumar Jha | admin@ngo.org | Full access |
| Manager | Aryan Yadav | aryan.manager@ngo.org | Tasks, volunteers, food, events |
| Manager | Sumit | sumit.manager@ngo.org | Students, beneficiaries, tasks (can create tasks but **not assign** them, to show how permissions work) |
| Volunteer | Manas Jain, Ayush, Bharat, Ashish, Varun, Bhavya Anand, Aman CR, Aman | volunteer1@ngo.org to volunteer9@ngo.org (except volunteer5) | Active |
| Volunteer | Priyanshu | volunteer5@ngo.org | Pending approval (cannot log in until an admin approves) |

`npm run seed` wipes the NGO collections first and then loads linked demo records (volunteers, students, beneficiaries, donations, food, resources, programs, events and tasks). It refuses to run in production unless you add `--force`.
These are sample accounts with a shared password: never use them on a real deployment.

## How authorization works

Every protected request goes through the same steps on the server:

1. `authenticate` verifies the JWT and loads the user from the database
2. Account status must be `active`
3. `requireRole(...)` checks the role (where a route is role-specific)
4. `requirePermission('module.action')` checks the permission (admins always pass)
5. The controller runs

Roles and permissions are never trusted from the frontend. The React route guards and the sidebar filtering only improve the experience.

Permissions use the `module.action` format (for example `volunteers.edit`). Granting any action on a module also grants `module.view`. The full catalog is in `server/config/permissions.js`. Admins assign permissions from **Admin > Permissions**.

Safety rules built in:
- Public sign-up always creates a **pending volunteer**. An admin must approve it
- Only admins can change roles, permissions or reset passwords
- Non-admins with `users.create` can only create plain volunteers
- Nobody can change their own role or status
- Password change invalidates older tokens

## API overview (Phases 1-6)

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password/:token` | Public |
| POST | `/api/auth/logout` | Logged in |
| GET | `/api/auth/me` | Logged in |
| GET | `/api/users` | `users.view` (search, role, status, sortBy, order, page, limit) |
| GET | `/api/users/stats` | `users.view` |
| GET | `/api/users/permission-catalog` | `users.view` |
| POST | `/api/users` | `users.create` |
| GET / PUT | `/api/users/:id` | `users.view` / `users.edit` |
| PATCH | `/api/users/:id/status` | `users.edit` |
| DELETE | `/api/users/:id` | `users.delete` (archives) |
| PATCH | `/api/users/:id/role` | Admin |
| PATCH | `/api/users/:id/permissions` | Admin |
| POST | `/api/users/:id/reset-password` | Admin |

### Dashboards (Phase 3)

| Method | Route | Access |
|---|---|---|
| GET | `/api/dashboard/admin` | Admin. Org-wide widgets and 7 chart datasets |
| GET | `/api/dashboard/manager` | Manager. Only records assigned to or created by them |
| GET | `/api/dashboard/volunteer` | Volunteer. Only their own tasks, hours and events |

All numbers are calculated from MongoDB on each request. A manager only receives widgets for modules where they have `<module>.view`, narrowed further by the "Dashboard modules" the admin ticks on the Permissions page (leave it empty to show everything they may view).

### Volunteers, students, beneficiaries (Phase 4, batch 1)

Each module has the same endpoints (`/api/volunteers`, `/api/students`, `/api/beneficiaries`):

| Method | Route | Permission |
|---|---|---|
| GET | `/` | `<module>.view` (query: `search`, `status`, `manager`, `program`, `sortBy`, `order`, `page`, `limit`, `from`, `to`) |
| POST | `/` | `<module>.create` |
| GET | `/:id` | `<module>.view` |
| PUT | `/:id` | `<module>.edit` |
| DELETE | `/:id` | `<module>.delete` (students and beneficiaries are archived, volunteers are deleted) |
| GET | `/:id/history` | `<module>.view` (who changed what, from the activity log) |
| POST | `/:id/photo` | `<module>.edit` (JPG, PNG or WEBP, 5 MB) |
| POST | `/:id/documents` | `<module>.edit` (up to 5 files, JPG, PNG, WEBP or PDF, 5 MB each) |
| DELETE | `/:id/documents/:docId` | `<module>.edit` |
| POST | `/api/students/:id/attendance` | `students.edit` (one record per day) |
| POST | `/api/beneficiaries/:id/assistance` | `beneficiaries.edit` |
| GET | `/api/documents/:id/download` | `<module>.view` and the record must be in the person's scope |
| GET | `/api/lookups/managers`, `/api/lookups/programs` | Dropdown lists for forms and filters |

**Who sees which records:** admins see everything. A manager only sees records whose *assigned manager* is them, and anything a manager creates is assigned to them automatically. A manager cannot reassign records. This is enforced in the database query, so a changed URL or query string cannot widen it.

**Uploads:** the file type is checked twice, once from the upload and once from the first bytes of the file, so a renamed `.exe` or text file is rejected. Documents are stored outside any public folder and are downloaded through the permission-checked route above. Profile photos are the only publicly served files. File details are stored in the `Document` collection, and swapping disk storage for Cloudinary or S3 later only touches `middleware/upload.js` and `services/documentService.js`.

### Donations, food, resources (Phase 4, batch 2)

These share the same standard routes as batch 1 (list, create, get, update, delete, history). Unlike volunteers and students they are **not** limited to "records assigned to me": anyone with the module's `view` permission sees all of it, because stock, money and equipment belong to the whole organisation.

| Method | Route | Permission |
|---|---|---|
| GET | `/api/donations` | `donations.view` (query: `search`, `status`, `type`, `method`, `campaign`, `donorType`, `from`, `to`, `sortBy`, `order`, `page`, `limit`) |
| GET | `/api/donations/stats` | `donations.view` (totals, by month, type, method and campaign; follows `from` and `to`) |
| GET | `/api/donations/campaigns` | `donations.view` |
| GET | `/api/donations/export` | `donations.view` **and** `reports.export` (CSV of the current filters) |
| GET | `/api/donations/:id/receipt` | `donations.view` (PDF, only once the donation is received) |
| GET | `/api/donations/:id/donor-history` | `donations.view` (other gifts with the same email, or the same name if there is no email) |
| GET | `/api/food` | `food.view` (query: `search`, `alert=low|out|expiring|expired`, `unit`, `from`, `to`) |
| GET | `/api/food/alerts` | `food.view` (low stock, expiring within 14 days, expired but still in stock) |
| GET | `/api/food/available` | `food.distribute` (stock that can be handed out right now) |
| GET | `/api/food/distributions` | `food.view` (managers see their own, admins see all) |
| POST | `/api/food/distributions` | `food.distribute` (takes the stock off, see below) |
| DELETE | `/api/food/distributions/:id` | `food.delete` (puts the stock back) |
| GET/POST/PUT/DELETE | `/api/resources` | `resources.view / create / edit / delete` |
| GET | `/api/lookups/volunteers`, `/api/lookups/people` | Form dropdowns. Need `food.distribute`, `tasks.assign`, `events.create` or `events.edit` (volunteers), or `resources.create` or `resources.edit` (people) |

**Receipts:** a receipt number such as `RCPT-2026-0007` is created automatically when a donation becomes *received*, from an atomic counter, and never changes afterwards. A client cannot choose it. The PDF uses "Rs." because the standard PDF fonts have no rupee sign. If a save fails after a number was issued, that number is skipped, so there can be gaps in the sequence.

**CSV export:** streams the rows that match the filters on screen. Cells that start with `=`, `+`, `-` or `@` get a leading `'` so Excel cannot run them as formulas (this also means phone numbers written as `+91...` show as `'+91...` in the file).

**Food stock:** remaining stock = received minus distributed, kept by the server. Recording a distribution takes each item off with a single conditional update, so two people cannot give out the same last 5 kg. MongoDB standalone has no transactions, so if the second item of a distribution is short, the first is put back. Expired food cannot be distributed (an expiry date counts as good through the end of that day). Deleting a distribution restores its stock. You cannot lower an item's quantity below what was already given out.

Responses: `{ "success": true, "message": "...", "data": {} }` or `{ "success": false, "message": "..." }`.

### Tasks, events, programs (Phase 4, batch 3)

All three use the standard routes (list, create, get, update, delete, history) plus the extras below.

**Who sees what.** Unlike the earlier modules these are not filtered by "assigned manager":

| | Admin | Manager | Volunteer |
|---|---|---|---|
| Tasks | all | tasks they created | tasks assigned to them, or where they are on the team |
| Events | all | events they manage or organised | events they are assigned to |
| Programs | all | all (read); change only programs they run | no access by default |

Volunteers are **read-only** on events, and on tasks they can only move their own task forward and comment. This is enforced on the server even if an admin grants a volunteer extra permissions.

| Method | Route | Access |
|---|---|---|
| GET | `/api/tasks` | `tasks.view` (search, status, priority, assignee, category, `overdue=true`, from/to on due date) |
| POST / PUT / DELETE | `/api/tasks`, `/api/tasks/:id` | `tasks.create` / `tasks.edit` / `tasks.delete` (managers and admins only) |
| POST | `/api/tasks/:id/status` | Volunteer on the task (assigned > accepted > in progress > completed), or `tasks.edit` (any status) |
| POST | `/api/tasks/:id/comments` | Anyone who can see the task (max 1000 characters, 200 per task) |
| DELETE | `/api/tasks/:id/comments/:commentId` | The author, or `tasks.edit` |
| POST / DELETE | `/api/tasks/:id/documents` | `tasks.edit` (attachments; JPG, PNG, WEBP, PDF up to 5 MB) |
| GET | `/api/events` | `events.view` (search, status, program, type, volunteer, `when=upcoming\|past`, from/to) |
| POST / PUT / DELETE | `/api/events`, `/api/events/:id` | `events.create` / `events.edit` / `events.delete` |
| GET | `/api/programs` | `programs.view` (search, status, type, manager, from/to) |
| GET | `/api/programs/:id/summary` | `programs.view` (events, upcoming events, students, beneficiaries) |
| POST / PUT / DELETE | `/api/programs`, `/api/programs/:id` | `programs.create` / `programs.edit` / `programs.delete` |

Rules worth knowing:

- Assigning (or changing) a task's assignee or team needs `tasks.assign`. Only active volunteers can be assigned.
- A task's status changes only through `/status`; the move is applied only if nobody changed it in between (otherwise 409), and `completedAt` is set or cleared automatically.
- "Overdue" means the due date is before today (in `APP_TIMEZONE`, default `Asia/Kolkata`) and the task is still open. A task due today is not overdue.
- Event end time must be after the start time. Managers can attach only their own students and beneficiaries to an event.
- A program that events, students or beneficiaries still use cannot be deleted (409); mark it Completed instead.
- Assigning a task or event, changing a task's status and commenting create in-app notifications (see Phase 5 below).
- `programs.*` is a new permission group. Existing manager accounts in an old database will not have it until an admin grants it on the Permissions screen; a fresh `npm run seed` includes it.

### Notifications, activity log, reports (Phase 5)

**Notifications.** Everyone has a bell in the top bar and a full page at `/<role>/notifications`. A person can only ever read, change or delete their own notifications.

| Method | Route | Access |
|---|---|---|
| GET | `/api/notifications` | Logged in (own only; `unread=true`, `type`, `page`, `limit`) |
| GET | `/api/notifications/unread-count` | Logged in |
| PATCH | `/api/notifications/read-all`, `/api/notifications/:id/read` | Logged in |
| DELETE | `/api/notifications/:id`, `/api/notifications/read` (clear all read) | Logged in |
| POST | `/api/notifications/run-checks` | Admin (runs the hourly checks now) |

What creates a notification:

| Type | When |
|---|---|
| `task-assigned`, `task-status` | A task is assigned, changes status, or gets a comment |
| `task-deadline` | Hourly check: a task is due today or tomorrow, or is overdue (assignees, plus the creator when overdue) |
| `event-upcoming` | You are assigned to an event, or an event you are part of is today or tomorrow |
| `donation-received` | A donation is received (people with `donations.view`) |
| `food-low`, `food-expiring` | Hourly check: food at or below its low-stock level, expiring within 14 days, or expired (people with `food.view`) |
| `resource-low` | Hourly check: a resource that has a low-stock level set (Resources > edit) is at or below it (people with `resources.view`) |
| `manager-assigned` | An admin assigns a volunteer, student or beneficiary to a manager |
| `permission-changed` | An admin changes someone's permissions |

The hourly check starts with the server (about 5 seconds after start-up). Each alert carries a key, so the same alert is never sent to the same person twice, and notifications delete themselves after about six months. If the server is switched off, the checks simply catch up when it starts again.

**Activity log** (`/admin/activity`, admin only). Lists who did what, filterable by person, module, action and date range (days are in `APP_TIMEZONE`). Each entry expands to a before/after table. `GET /api/activity-logs`, `/filters` and `/export` (CSV, up to 50,000 rows) are admin-only, and exporting is itself logged. Passwords and reset tokens are never written to the log.

**Reports** (`/admin/reports`, `/manager/reports`).

| Method | Route | Access |
|---|---|---|
| GET | `/api/reports` | `reports.view` (lists only the reports you may run) |
| GET | `/api/reports/:key` | `reports.view` **and** `<source>.view`; returns a 50-row preview and a summary |
| GET | `/api/reports/:key/export?format=csv\|pdf` | the above **and** `reports.export` |

Reports: volunteers, students, beneficiaries, donations, food stock, food distributions, resources, tasks, events, programs. A report uses the same scope rules as its module, so a manager's volunteer report only has their own volunteers. Volunteers do not get `reports.view` by default. Every download is recorded in the activity log.

- `reports.create` exists in the permission list but nothing uses it yet; viewing and exporting are the two that matter.
- CSV files open cleanly in Excel (UTF-8 with a BOM), dates are `yyyy-mm-dd`, amounts are plain numbers, and cells that start with `=`, `+`, `-` or `@` are neutralised so they cannot run as formulas.
- CSV and previews cover up to 20,000 rows. A PDF is a printout and holds up to 1,000 rows; if there are more, it says so at the end.
- PDFs use the standard Latin fonts, so text in other scripts (for example Devanagari names) appears as `?` in the PDF. The CSV keeps it exactly.
- The summary figures above the preview (totals, counts by status) are worked out over all matching rows, up to the 20,000-row limit.

### Public website, CMS, announcements (Phase 6)

**Public website** (`/`, `/about`, `/programs`, `/events`, `/volunteer`, `/donate`, `/contact`). All text and photos come from the database. A section with nothing in it is left out, so a new installation shows only the organisation name until the CMS is filled in. Impact numbers are counted from real records (or typed in by hand when you choose that).

**Public API** (`/api/public/*`, no login):

| Route | What it does |
|---|---|
| `GET /site` | Organisation details, the CMS sections that have content, and resolved impact numbers. Bank and UPI details are deliberately not in here |
| `GET /programs` | Programs marked "Show on website" that are active, planned or completed |
| `GET /events?when=upcoming` or `past`, with `page` and `limit` | Public events that are not cancelled |
| `POST /volunteer-applications` | Creates a **pending** volunteer (`source: website`) and notifies admins. If the email already exists it answers the same way and stores nothing, so the form cannot be used to find out who is registered. A hidden `website` field catches simple bots (they get a normal-looking success) |
| `POST /donation-inquiries` | Creates a donation with status `inquiry` and **no receipt**, returns a short reference and (for money) the payment details from the CMS. Notifies people with `donations.view`. An inquiry is not a payment: staff record the real donation when the money arrives, which issues the receipt |

Reads are limited to 120 a minute per IP, forms to 5 an hour per IP, and the responses only contain fields that are meant to be public (never budgets, managers, volunteer lists or emails). The limits are switched off when `NODE_ENV=test`.

**Website CMS** (`/admin/website`, `settings.view` to open, `settings.edit` to save). The server sends the list of sections and fields, so the screen is built from it and the same definition validates every save (`server/config/websiteSchema.js`). To add a section or field, add it there. All text is plain (no HTML is stored or rendered), links must be `https://`, and images must be uploads from the CMS or `https://` addresses. Uploaded images are checked by their first bytes, stored under random names in `uploads/site` (the only upload folder besides avatars that is public), and images no section uses any more are removed an hour after they were uploaded. Every save is written to the activity log under module `website`.

**Announcements** (`/admin/announcements`, `/manager/announcements`). Admins post to everyone, managers or volunteers. Managers need `announcements.create` and can post to volunteers only, and can edit or delete only their own. Posting notifies the audience. Announcements appear on the volunteer dashboard and now on the manager dashboard.

**Payments** are modular (`server/services/payments`). Today only `manual` works: donors see the UPI/bank details entered in the CMS. `razorpay.js` and `stripe.js` are stubs that refuse with a clear error; they show where to add order creation and webhook verification.

**Volunteers list** has a "Source" filter (applied on the website or added by staff), and programs have a "Show on website" tick box.

**Existing databases.** New permission groups only reach users created after this update. Admins always have everything. For existing managers, grant `announcements.*` on the Permissions screen, and re-run the seed on a development database (it clears data) to get the full demo website.

## Forgot password in development

No email provider is connected yet. In development the reset link is printed in the server console and shown on the forgot-password page. In production, connect a provider in `server/utils/mailer.js`.

## Folder structure

```
server/
  config/        db connection, roles + permission catalog
  controllers/   thin request handlers
  middleware/    auth, permissions, validation, sanitizing, uploads, errors
  models/        19 Mongoose models
  routes/        route definitions
  services/      business logic
  utils/         helpers (errors, tokens, logging, mailer)
  validators/    express-validator rules
  seed.js
client/src/
  components/  context/  hooks/  layouts/  routes/  services/  utils/
  pages/{admin,manager,volunteer,auth,public}
```

## Known gaps (by design, for later phases)

- Online payment is not built. The Razorpay and Stripe files are stubs; donors pay by UPI or bank transfer and staff record the donation
- There is no contact form (the contact page only shows details), and no email is sent to applicants or donors; admins are told in the app
- The CMS has no draft or undo step: a save goes live at once (the activity log keeps the previous value)
- Public pages are not server-rendered, so search engines and link previews see an empty page until scripts run
- Donations have no refund or edit-after-receipt lock yet. Editing a received donation is allowed and is recorded in its history
- Events can store beneficiaries, students and required resources through the API, but the event form only picks volunteers for now
- Volunteers can read task attachments but cannot upload their own yet
- Overdue tasks are computed live (past the due date and still open)

## License

No license file is included yet. Add one (for example MIT) before making the repository public if you want others to reuse the code.
