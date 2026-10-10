# CRM Sales Management API

RESTful backend for a CRM sales process: lead generation → qualification → customer conversion → deal management → closure.

No frontend is required. Interactive API docs are served at `/api/docs`.

## Links
- **GitHub repository:** https://github.com/YOUR_USERNAME/YOUR_REPO
- **API docs (Swagger UI):** `http://localhost:5000/api/docs` (locally) — `<LIVE_URL>/api/docs` once deployed
- **Live deployment:** _not deployed — run locally using the steps below_ (replace with the URL if you deploy)

## Technologies
- Node.js 20+ and Express 5
- MongoDB Atlas and Mongoose
- JWT authentication with bcrypt password hashing
- Zod request validation
- Helmet, CORS, and rate limiting

## Installation
```bash
npm install
cp .env.example .env
```

## Environment variables
| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default `5000`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret, at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origins |

## Database setup
1. Create a MongoDB Atlas cluster and database user.
2. Allow your current IP in Network Access.
3. Put the connection string in `MONGODB_URI`. Transactions are used for lead conversion (Atlas replica sets support this).

## Run the server
```bash
npm run create-admin   
npm run dev            
npm start
```

API: `http://localhost:5000`  
Docs: `http://localhost:5000/api/docs`  
Health: `http://localhost:5000/api/health`

## Authentication
Use JWT Bearer tokens.

```http
Authorization: Bearer <token>
```

- Public `POST /api/auth/register` always creates a **Sales Executive**. It cannot grant Admin.
- `POST /api/auth/login` returns `{ user, token }`. Passwords are never returned.
- `POST /api/auth/logout` increments `tokenVersion`, which invalidates previously issued tokens.
- `GET /api/auth/me` returns the current profile.

Create privileged users with `npm run create-admin` or `POST /api/users` as an Admin.

## User roles and permissions
| Role | Access |
| --- | --- |
| **Admin** | All records. User CRUD. Assign any executive. CRM settings. Reports. |
| **Sales Manager** | Team members (`reportsTo` = manager) plus own records. Assign/reassign leads to team executives. Team performance. |
| **Sales Executive** | Only records assigned to them. Create/update own leads, customers, deals, and activities. Convert assigned qualified leads. |

Executives cannot change assignments. Inactive users cannot log in and cannot be assigned work.

## API overview
| Area | Base path |
| --- | --- |
| Auth | `/api/auth` |
| Users | `/api/users` |
| Leads | `/api/leads` |
| Convert lead | `POST /api/leads/:id/convert` |
| Assign lead | `PATCH /api/leads/:id/assign` |
| Customers | `/api/customers` |
| Deals | `/api/deals` |
| Deal stage | `PATCH /api/deals/:id/stage` |
| Activities | `/api/activities` |
| Timeline | `/api/timeline/:entityType/:entityId` |
| Dashboard | `/api/dashboard`, `/pipeline`, `/team` |
| Settings | `/api/settings` |

List endpoints support `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, `from`, `to`, plus resource-specific filters in a single request.

Pagination metadata:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "totalPages": 3
}
```

## Sample requests

### Register
```json
POST /api/auth/register
{
  "name": "Priya Shah",
  "email": "priya@example.com",
  "phone": "+91 9000000000",
  "password": "ChangeThisPassword123"
}
```

### Create lead
```json
POST /api/leads
Authorization: Bearer <token>
{
  "name": "Amit Kumar",
  "email": "amit@acme.com",
  "phone": "+91 9876543210",
  "company": "Acme Ltd",
  "source": "Website",
  "priority": "High",
  "description": "Requested a demo"
}
```

### Convert qualified lead
```json
POST /api/leads/:id/convert
{
  "dealValue": 250000,
  "probability": 30,
  "expectedClosingDate": "2026-12-31",
  "dealName": "Acme Annual License"
}
```

### Close a lost deal
```json
PATCH /api/deals/:id/stage
{
  "stage": "Lost",
  "lostReason": "Chose a competitor on price"
}
```

### Sample responses

Login — `POST /api/auth/login` → `200`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Priya Shah", "email": "priya@example.com", "role": "Sales Executive", "isActive": true },
    "token": "<jwt>"
  }
}
```

List leads — `GET /api/leads?status=New&priority=High&page=1&pageSize=5` → `200`
```json
{
  "success": true,
  "message": "Leads fetched successfully",
  "data": {
    "items": [ { "_id": "...", "name": "Amit Kumar", "status": "New", "priority": "High", "assignedTo": { "name": "Priya Shah" } } ],
    "pagination": { "page": 1, "pageSize": 5, "total": 1, "totalPages": 1 }
  }
}
```

Convert lead — `POST /api/leads/:id/convert` → `200`
```json
{
  "success": true,
  "message": "Lead converted successfully",
  "data": {
    "lead": { "status": "Converted" },
    "customer": { "name": "Amit Kumar", "lead": "<leadId>" },
    "deal": { "name": "Acme Annual License", "value": 250000, "probability": 30, "expectedRevenue": 75000, "stage": "Qualification" }
  }
}
```

Validation error → `400`
```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [ { "path": "body.email", "message": "Invalid email address" } ]
}
```

Success responses follow:

```json
{
  "success": true,
  "message": "Lead fetched successfully",
  "data": {}
}
```

Errors follow:

```json
{
  "success": false,
  "message": "Lead not found"
}
```

## Testing
An end-to-end smoke test (about 80 checks: auth, RBAC, assignment, conversion, deal rules, activities, timeline, dashboard) is included. With the server running and an Admin created:
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run smoke

```

## Important business rules
- Only **Qualified** leads can be converted. Converted leads cannot be converted again or edited.
- Conversion creates a Customer and a Deal in a MongoDB transaction, then marks the lead Converted and writes timeline events.
- Customer keeps `lead`. Deal keeps `customer` and `lead`.
- Expected revenue is `value * probability / 100`. Won deals force probability 100; Lost deals force 0.
- Closed Won/Lost deals cannot move back to an open stage.
- Won deals require value > 0. Lost deals require `lostReason`.
- Deal value must be > 0. Probability is 0–100. Closing date must be within 5 years of today.
- Activities with status Pending and `dueDate` in the past are returned as **Overdue**.
- Users who still have assigned leads/customers/deals/activities or team members cannot be hard-deleted (409); deactivate them instead.
- Assignment is recorded on the timeline. Only active Sales Executives can receive leads.

## Database design and indexes
Collections: `users`, `leads`, `customers`, `deals`, `activities`, `timelines`, `settings`.

Relationships use ObjectId references (not embedding) so lists stay paginated and independently queryable.

Indexed fields include user email/role/active, lead status/source/assignedTo/createdAt, customer email/assignedTo, deal stage/assignedTo/closing date/value, activity dueDate/status, and timeline entityType+entityId.

## Assumptions
- A Sales Manager’s team is the set of executives with `reportsTo` pointing at that manager.
- Public registration is executive-only; Admins are created by script or by an existing Admin.
- One converted customer per lead (`customer.lead` is unique). Additional deals may be created for that customer.
- Overdue is computed on read rather than rewritten in the background.
- Unassigned records (e.g. a lead created by a manager) are visible to all Sales Managers until assigned.
- Deals and activities may be assigned to any active user within the manager's permitted scope; leads only to Sales Executives.
- Authentication uses a single JWT access token (no refresh token). Logout invalidates all of the user's tokens via `tokenVersion`.
- Deployment: see **Links** above. The app is host-agnostic (Render, Railway, Fly) with MongoDB Atlas; set the same environment variables on the host.

## Project structure
```
src/
├── controllers/
├── routes/
├── models/
├── services/
├── middleware/
├── validators/
├── utils/
├── config/
├── constants/
├── docs/openapi.json
├── app.js
└── server.js
```