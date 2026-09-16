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

| Layer    | Technology                      |
| -------- | ------------------------------- |
| Admin    | React.js, TypeScript            |
| Backend  | Node.js, Express.js, TypeScript |
| Database | PostgreSQL + Prisma ORM         |
| Monorepo | npm Workspaces                  |

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

### 5. Seed Initial Data (Optional for Development)

```bash
npm run seed
```

### 6. Start the Backend

```bash
npm run dev:backend
```

The API will be available at `http://localhost:4000`.

---

## Available Scripts (Root)

| Script                          | Description                          |
| ------------------------------- | ------------------------------------ |
| `npm run dev:backend`           | Start backend in dev mode            |
| `npm run dev:admin`             | Start admin dashboard in dev mode    |
| `npm run build`                 | Build all workspaces                 |
| `npm run lint`                  | Run ESLint across all workspaces     |
| `npm run format`                | Format all files with Prettier       |
| `npm run typecheck`             | TypeScript type-check all workspaces |
| `npm run seed`                  | Seed initial accounts and database   |
| `npm run test:auth`             | Run auth & authorization test suite  |
| `npm run prisma:generate`       | Generate Prisma client               |
| `npm run prisma:migrate:dev`    | Run Prisma migrations (dev)          |
| `npm run prisma:migrate:deploy` | Run Prisma migrations (production)   |
| `npm run prisma:studio`         | Open Prisma Studio                   |

---

## API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Health Check

| Method | Path             | Access | Description  |
| ------ | ---------------- | ------ | ------------ |
| GET    | `/api/v1/health` | Public | Health check |

### Authentication & Authorization

| Method | Path                                      | Access    | Description                                             |
| ------ | ----------------------------------------- | --------- | ------------------------------------------------------- |
| POST   | `/api/v1/auth/register`                   | Public    | Self-register retailer account & send verification OTP  |
| POST   | `/api/v1/auth/otp/register/send`          | Public    | Resend / send registration OTP verification code        |
| POST   | `/api/v1/auth/otp/register/verify`        | Public    | Verify retailer registration OTP code                   |
| POST   | `/api/v1/auth/login`                      | Public    | Authenticate user and issue JWT access & refresh tokens |
| POST   | `/api/v1/auth/otp/login/send`             | Public    | Send OTP code to user's email for passwordless login    |
| POST   | `/api/v1/auth/otp/login/verify`           | Public    | Verify OTP and issue JWT access & refresh tokens        |
| POST   | `/api/v1/auth/forgot-password`            | Public    | Initiate token-based forgot password email flow         |
| POST   | `/api/v1/auth/reset-password`             | Public    | Reset password using token sent via email               |
| POST   | `/api/v1/auth/otp/forgot-password/send`   | Public    | Send OTP code for password reset                        |
| POST   | `/api/v1/auth/otp/forgot-password/verify` | Public    | Verify OTP and issue temporary reset token              |
| POST   | `/api/v1/auth/otp/forgot-password/reset`  | Public    | Reset password with verified OTP or reset token         |
| POST   | `/api/v1/auth/refresh`                    | Public    | Refresh JWT access token with token rotation            |
| GET    | `/api/v1/auth/invite/verify`              | Public    | Verify organisation invitation token                    |
| POST   | `/api/v1/auth/invite/accept`              | Public    | Accept invitation and register account                  |
| GET    | `/api/v1/auth/me`                         | Protected | Get authenticated user profile and organisation details |
| POST   | `/api/v1/auth/logout`                     | Protected | Revoke refresh token and log out                        |
| POST   | `/api/v1/auth/change-password`            | Protected | Change authenticated user password                      |

---

## User Roles

| Role          | Scope            | Capabilities                                       |
| ------------- | ---------------- | -------------------------------------------------- |
| `SUPER_ADMIN` | Platform-wide    | Manage orgs, products, categories, orders, reports |
| `ADMIN`       | Own organisation | Manage profile, invite staff, create orders        |
| `STAFF`       | Own organisation | Create/manage orders per permissions               |

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable                 | Description                             |
| ------------------------ | --------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string            |
| `PORT`                   | API server port (default: 4000)         |
| `NODE_ENV`               | `development` \| `production` \| `test` |
| `CORS_ORIGIN`            | Allowed CORS origins                    |
| `JWT_SECRET`             | Secret key for signing access tokens    |
| `JWT_EXPIRES_IN`         | Expiry for access tokens (e.g. `1d`)    |
| `JWT_REFRESH_SECRET`     | Secret key for refresh tokens           |
| `JWT_REFRESH_EXPIRES_IN` | Expiry for refresh tokens (e.g. `7d`)   |
| `BCRYPT_SALT_ROUNDS`     | Salt rounds for password hashing (`10`) |

---

## Security Notes

- `.env` files are **never** committed to source control (see `.gitignore`).
- Organisation-level data isolation is **enforced on the backend** — `organisationId` is always derived from the authenticated user's context, never trusted from client requests.
- Refresh tokens are stored with rotation and revocation capabilities in PostgreSQL.
