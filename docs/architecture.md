# OnTime — Architecture & Data Ownership Reference

## Business Hierarchy

```
DISTRIBUTOR / PLATFORM OWNER
│
├── Retailer Organisation A
│     ├── Organisation Admin (primary user)
│     └── Staff Users (1..*)
│
├── Retailer Organisation B
│     ├── Organisation Admin
│     └── Staff Users
│
└── Retailer Organisation C
      └── Organisation Admin
```

### Key Architectural Rules

| Rule                       | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| Distributor creates orgs   | Only `DISTRIBUTOR_ADMIN` can onboard retailer organisations |
| Org Admin invites staff    | `ORGANISATION_ADMIN` can invite staff to their own org only |
| Staff cannot invite        | `ORGANISATION_STAFF` has no invitation permissions          |
| Org cannot create orgs     | Retailer organisations cannot create other organisations    |
| Distributor ≠ Organisation | The distributor is NOT modelled as an Organisation entity   |

---

## User Role Hierarchy

```
DISTRIBUTOR_ADMIN
  ↕ Full platform access
  ├── Manage Organisations
  ├── Manage Products & Categories
  ├── Manage all Orders
  ├── Manage all Users
  └── View all Reports

ORGANISATION_ADMIN
  ↕ Own organisation access only
  ├── Manage organisation profile
  ├── Invite ORGANISATION_STAFF
  ├── Create/manage orders
  └── View organisation reports

ORGANISATION_STAFF
  ↕ Own organisation access only (limited)
  ├── Create/manage orders
  └── View own orders
  ✗ Cannot invite users
  ✗ Cannot manage organisation
  ✗ Cannot create organisations
```

---

## Data Ownership Model

```
DISTRIBUTOR-LEVEL ENTITIES (no organisationId)
  Category
  Product

RETAILER ORGANISATION-LEVEL ENTITIES (have organisationId)
  Organisation          — is the org itself
  User                  — organisationId = null for DISTRIBUTOR_ADMIN
  OrganisationInvitation

ORDER-LEVEL ENTITIES (scoped through Order)
  Order                 — has organisationId + createdByUserId
  OrderItem             — scoped through orderId
  Delivery              — scoped through orderId
  Cancellation          — scoped through orderId
```

### Visual Ownership Map

```
Distributor
  │
  ├── [Manages] → Category
  │                   └── Product
  │
  └── [Onboards] → Organisation A
                       ├── User (ORGANISATION_ADMIN)
                       ├── User (ORGANISATION_STAFF)
                       ├── OrganisationInvitation
                       └── Order #1001
                               ├── OrderItem → Product X (distributor-owned)
                               └── OrderItem → Product Y (distributor-owned)
```

---

## Multi-Organisation Data Isolation

### Strategy

Data isolation is enforced **exclusively at the backend layer**. The frontend is never trusted to provide the correct `organisationId`.

### How It Works

1. **Authentication** (JWT — future): User logs in → receives a JWT containing `userId`, `role`, `organisationId`.

2. **Auth Middleware**: Validates the JWT on every authenticated request → populates `req.user` (the `AuthContext`).

3. **Organisation Scoping Middleware**: For all organisation-scoped routes:
   - Reads `organisationId` from `req.user.organisationId` (from JWT)
   - **Never** reads `organisationId` from `req.body`, `req.params`, or `req.query`
   - Injects the verified `organisationId` into the service call

4. **Repository Layer**: All queries for organisation-scoped data include a `WHERE organisationId = :verified_org_id` clause.

### What This Prevents

```
❌ Attack: Retailer A sends a request with organisationId = "org_B_id"
✅ Defence: Backend ignores the supplied organisationId;
            uses req.user.organisationId from the JWT instead.
            Retailer A's JWT contains their own organisationId → query returns their own data only.
```

### Isolation Matrix

| Actor                | Own Org Data | Other Org Data | Distributor Products | All Org Data |
| -------------------- | ------------ | -------------- | -------------------- | ------------ |
| `DISTRIBUTOR_ADMIN`  | ✅           | ✅             | ✅                   | ✅           |
| `ORGANISATION_ADMIN` | ✅           | ❌             | ✅ (read)            | ❌           |
| `ORGANISATION_STAFF` | ✅ (limited) | ❌             | ✅ (read)            | ❌           |

---

## Request Flow

```
HTTP Request
  │
  ↓ helmet()              — Security headers
  ↓ cors()                — CORS validation
  ↓ morgan()              — Request logging
  ↓ express.json()        — Body parsing
  │
  ↓ authMiddleware        — JWT validation → populates req.user
  ↓ requireRoles([...])   — RBAC check → 403 if role not allowed
  ↓ scopeToOrganisation() — Injects verified organisationId from JWT
  │
  ↓ Controller            — Validates request shape
  ↓ Service               — Business logic
  ↓ Repository            — Database queries (always org-scoped)
  ↓ Prisma Client
  ↓ PostgreSQL
```

---

## Future Schema Extension Points

The Prisma schema is designed to naturally accommodate:

```prisma
model Category {
  id       String    @id @default(uuid())
  name     String
  // NO organisationId — distributor-owned
  products Product[]
}

model Product {
  id         String    @id @default(uuid())
  categoryId String
  name       String
  // NO organisationId — distributor-owned
  category   Category   @relation(...)
  orderItems OrderItem[]
}

model Order {
  id              String       @id @default(uuid())
  organisationId  String       // required — retailer org
  createdByUserId String       // required — user who placed order
  organisation    Organisation @relation(...)
  createdBy       User         @relation(...)
  orderItems      OrderItem[]
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  productId String  // distributor product — no organisationId here
  quantity  Int
  order     Order   @relation(...)
  product   Product @relation(...)
}
```
