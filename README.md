# FleetCore – Fleet Maintenance API

REST API built with **NestJS, TypeScript, TypeORM, PostgreSQL, JWT and argon2** to manage the maintenance lifecycle of a vehicle fleet.

## Coder

- **Name:** Valentina Cabas MIRANDA 
- **Clan:** Node/Nest AM

## Requirements

- Node.js 18+ (20 recommended)
- PostgreSQL 14+ running locally

## Installation

```bash
npm install
cp .env.example .env        # then edit the values if needed
```

Create the database (name must match `DB_NAME`):

```bash
sudo -u postgres psql -c "CREATE DATABASE fleetcore;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

```

### Environment variables (`.env.example`)

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `DB_SYNC` | `true` lets TypeORM create/update tables automatically (development) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing secret and lifetime (e.g. `1h`) |
| `API_KEYS` | Comma-separated keys accepted in the `x-api-key` header |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth 2.0 (optional; see below) |

## Run

```bash
npm run seed         # populate the database (safe to run several times, no duplicates)
npm run start:dev    # development with watch
# or: npm run build && npm run start:prod
```

- API: `http://localhost:3000`
- **Swagger:** `http://localhost:3000/api/docs`

An alternative to running the seeder is loading the delivered dump: `psql -U postgres -d fleetcore -f database/fleetcore_dump.sql`.

## Test credentials (created by the seeder)

| Role | Email | Password | Notes |
|---|---|---|---|
| ADMIN | `admin@fleetcore.com` | `Admin123!` | full access |
| TECHNICIAN | `tech1@fleetcore.com` | `Tech123!` | linked to mechanic Carlos Pérez |
| TECHNICIAN | `tech2@fleetcore.com` | `Tech123!` | linked to mechanic Laura Gómez |
| MANAGER | `manager@fleetcore.com` | `Manager123!` | read-only access |

API keys for the integration endpoint: `demo-key-partner-1`, `demo-key-partner-2`.

Seeded data: 4 users, 3 mechanics (2 active linked to the technicians, 1 inactive), 2 workshops (1 active, 1 inactive),
4 vehicles (2 AVAILABLE, 1 IN_MAINTENANCE with an IN_PROGRESS maintenance, 1 INACTIVE) and 3 maintenances
(1 COMPLETED, 1 IN_PROGRESS, 1 SCHEDULED).

## How to use it (Swagger)

1. `POST /auth/login` with one of the users above and copy `data.accessToken`.
2. Click **Authorize** in Swagger and paste the token.
3. For `GET /integrations/vehicles/{plate}/history` use the `api-key` authorization with `demo-key-partner-1` instead of the token.

## Roles and permissions

| Resource | ADMIN | MANAGER | TECHNICIAN |
|---|---|---|---|
| Vehicles: list / get / by plate | ✅ | ✅ | ✅ |
| Vehicles: create / update / activate / delete (logical) | ✅ | – | – |
| Mechanics: list / get | ✅ | ✅ | – |
| Mechanics: create / update / activate / deactivate | ✅ | – | – |
| Workshops: list active / get | ✅ | ✅ | ✅ |
| Workshops: list all, create / update / activate / deactivate | ✅ (all) | list all only | – |
| Maintenances: create | ✅ | – | – |
| Maintenances: list, active, by vehicle, by mechanic, history | ✅ | ✅ | – |
| Maintenances: `GET /maintenances/my` | – | – | ✅ (own) |
| Maintenances: `GET /:id` | ✅ | ✅ | only own |
| Maintenances: `PATCH /:id/status` | ✅ | – | only own |

## Main endpoints

- **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/google`, `GET /auth/google/callback`
- **Vehicles:** `POST|GET /vehicles`, `GET /vehicles/plate/:plate`, `GET|PATCH|DELETE /vehicles/:id`, `PATCH /vehicles/:id/activate`
- **Mechanics:** `POST|GET /mechanics`, `GET|PATCH /mechanics/:id`, `PATCH /mechanics/:id/activate|deactivate`
- **Workshops:** `POST|GET /workshops` (active), `GET /workshops/all`, `GET|PATCH /workshops/:id`, `PATCH /workshops/:id/activate|deactivate`
- **Maintenances:** `POST|GET /maintenances`, `GET /maintenances/active`, `GET /maintenances/my`, `GET /maintenances/vehicle/:id`,
  `GET /maintenances/vehicle/:id/history`, `GET /maintenances/mechanic/:id`, `GET /maintenances/:id`, `PATCH /maintenances/:id/status`
- **Integrations (x-api-key):** `GET /integrations/vehicles/:plate/history`

## Business rules (summary)

- Status flow: `SCHEDULED → IN_PROGRESS → COMPLETED`; `SCHEDULED/IN_PROGRESS → CANCELLED`. `COMPLETED` and `CANCELLED` are final. Invalid transitions return **409** with a descriptive message.
- `IN_PROGRESS` sets the vehicle to `IN_MAINTENANCE`; `COMPLETED` sets it back to `AVAILABLE` and updates its mileage; cancelling an in-progress maintenance also frees the vehicle.
- Completing requires `workDone`, `finalCost`, `completedAt` and `finalMileage` (otherwise **400**).
- A vehicle can have only one active (`SCHEDULED`/`IN_PROGRESS`) maintenance. INACTIVE vehicles, inactive mechanics and inactive/nonexistent workshops cannot be used.
- Maintenance mileage cannot be lower than the vehicle's current mileage.
- A mechanic cannot have overlapping active maintenances in any workshop. Each maintenance has a start (`scheduledDate`) and a duration (`durationMinutes`, default 60); slots that only touch (09:00 end / 09:00 start) are allowed.
- Vehicles, mechanics and workshops are never physically deleted by the API, so history is preserved.

## Response format

Success:
```json
{ "success": true, "statusCode": 200, "codeInWords": "two zero zero", "data": {}, "timestamp": "..." }
```
Error (produced by the global exception filter; database unique violations are returned as 409):
```json
{ "success": false, "statusCode": 409, "codeInWords": "four zero nine", "message": "...", "path": "/maintenances", "timestamp": "..." }
```

## Google OAuth 2.0 (optional)

1. Create OAuth credentials in Google Cloud Console and add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.
2. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` in `.env`.
3. Open `http://localhost:3000/auth/google` in a **browser**. After accepting, the callback returns our own JWT (`data.accessToken`).
New Google users are created with the `TECHNICIAN` role; an existing user with the same email is linked.

## Project structure

```
src/
  common/       enums, decorators (@Roles, @CurrentUser, @Public), guards (JWT, Roles, ApiKey), interceptor, exception filter
  auth/         register, login, JWT + Google strategies
  users/ vehicles/ mechanics/ workshops/ maintenances/   entities, DTOs, services, controllers
  database/     seed.ts
```
