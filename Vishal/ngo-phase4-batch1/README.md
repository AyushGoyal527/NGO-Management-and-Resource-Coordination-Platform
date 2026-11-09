# NGO Management System

A MERN application for running an NGO: volunteers, managers, students, beneficiaries, donations, food, resources, tasks, events and a public website, with role-based dashboards and granular permissions. It was built in phases; each phase is a working snapshot of the whole project.

> **This folder is the snapshot for Phase 4, batch 1.** It runs on its own: install it, seed it and log in with the demo accounts below.

## What is in this snapshot

- Everything from Phases 1-3
- Volunteers, students and beneficiaries modules: list, filters, create, edit, archive, history
- Profile photos and document uploads, downloaded through a permission-checked route
- Per-manager record scope, enforced in the database query

## Build status

| Phase | Scope | Status |
|---|---|---|
| 1 | Project structure, MongoDB config, all 17 Mongoose models, seed data, `.env.example` | Done |
| 2 | Register, login, logout, forgot/reset password, JWT, role + permission middleware, protected routes, admin Users and Permissions screens | Done |
| 3 | Admin, manager and volunteer dashboards with live stats and charts | Done |
| 4 | Core modules: volunteers, students, beneficiaries (batch 1); donations, food, resources (batch 2); tasks, events, programs (batch 3) | In progress: batch 1 of 3 done (**this snapshot**) |
| 5 | Notifications (bell, page, hourly alerts), activity log, reports with CSV and PDF export | Planned |
| 6 | Public website, website CMS, announcements, public volunteer application and donation inquiry forms | Planned |
| 7 | Route and permission audit, clean-install check, tests added to the project, final docs | Planned |

## Tech stack

- Frontend: React 18, Vite, React Router, Tailwind CSS, Axios, React Hook Form, React Hot Toast, Recharts, Lucide React
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer, express-validator, Helmet, express-rate-limit

## Installation

You need Node.js 18+ and a running MongoDB (local install or a free MongoDB Atlas cluster).

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

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

In production set `VITE_API_URL` in `client/.env` to your API address, then run `npm run build` in `client/`.

## Demo accounts

Password for all: `Password@123`

| Role | Name | Email | Notes |
|---|---|---|---|
| Admin | Vishal Kumar Jha | admin@ngo.org | Full access |
| Manager | Aryan Yadav | aryan.manager@ngo.org | Tasks, volunteers, food, events |
| Manager | Sumit | sumit.manager@ngo.org | Students, beneficiaries, tasks |
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

## API overview (Phases 1-4)

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

Responses: `{ "success": true, "message": "...", "data": {} }` or `{ "success": false, "message": "..." }`.

## Forgot password in development

No email provider is connected yet. In development the reset link is printed in the server console and shown on the forgot-password page. In production, connect a provider in `server/utils/mailer.js`.

## Folder structure

```
server/
  config/        db connection, roles + permission catalog
  controllers/   thin request handlers
  middleware/    auth, permissions, validation, sanitizing, uploads, errors
  models/        18 Mongoose models
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

- Announcements are shown on the volunteer dashboard but there is no screen to post them yet (the model and seed data exist)
- The sidebar shows Users, Permissions, Volunteers, Students and Beneficiaries so far; each new module appears automatically when its navigation entry and API are added
- Task attachments, donation receipts and event documents arrive with their modules (the upload and download plumbing is already in place)

---
**Vishal Kumar Jha**\
GitHub: https://github.com/vishalkumarjha192

---