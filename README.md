# OnTime — Distributor Order Management Platform

A monorepo for the OnTime platform. The Distributor (platform owner) manages retailer organisations and a central product catalogue. Retailer organisations place orders against the distributor's catalogue.

---

## Business Hierarchy

```
DISTRIBUTOR / PLATFORM OWNER
│
├── Retailer Organisation A
│     ├── Organisation Admin (primary user)
│     └── Staff Users
│
├── Retailer Organisation B
│     ├── Organisation Admin
│     └── Staff Users
│
└── Retailer Organisation C
      └── Organisation Admin
```

**Key rules:**
- The **Distributor** owns and operates the platform.
- **Retailer Organisations** are the distributor's customers.
- Only the **Distributor** can onboard/create retailer organisations.
- An **Organisation Admin** can invite staff to their own organisation.
- **Organisation Staff** cannot invite users or create organisations.

---

## Repository Structure

```
/
├── apps/
│   ├── backend/          # Node.js + Express + TypeScript API
│   └── admin/            # React.js admin dashboard
├── packages/
│   └── shared/           # Shared TypeScript types, enums, constants
├── docs/
│   └── architecture.md
├── .env.example
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── package.json          # npm workspaces root
├── tsconfig.base.json
└── README.md
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Admin | React.js, TypeScript |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Monorepo | npm Workspaces |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL >= 14

### 1. Clone & Install

```bash
git clone <repo-url>
cd ontime
npm install
```

### 2. Configure Environment

```bash
# Backend
cp .env.example apps/backend/.env
# Edit apps/backend/.env with your PostgreSQL credentials
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migration

```bash
npm run prisma:migrate:dev
```

### 5. Start the Backend

```bash
npm run dev:backend
```

The API will be available at `http://localhost:4000`.

---

## Available Scripts (Root)

| Script | Description |
|---|---|
| `npm run dev:backend` | Start backend in dev mode |
| `npm run dev:admin` | Start admin dashboard in dev mode |
| `npm run build` | Build all workspaces |
| `npm run lint` | Run ESLint across all workspaces |
| `npm run format` | Format all files with Prettier |
| `npm run typecheck` | TypeScript type-check all workspaces |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Run Prisma migrations (dev) |
| `npm run prisma:migrate:deploy` | Run Prisma migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio |

---

## API

Base URL: `http://localhost:4000/api/v1`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |

---

## User Roles

| Role | Scope | Capabilities |
|---|---|---|
| `DISTRIBUTOR_ADMIN` | Platform-wide | Manage orgs, products, categories, orders, reports |
| `ORGANISATION_ADMIN` | Own organisation | Manage profile, invite staff, create orders |
| `ORGANISATION_STAFF` | Own organisation | Create/manage orders per permissions |

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API server port (default: 4000) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | Allowed CORS origins |

---

## Security Notes

- `.env` files are **never** committed to source control (see `.gitignore`).
- Organisation-level data isolation is **enforced on the backend** — `organisationId` is always derived from the authenticated user's context, never trusted from client requests.
