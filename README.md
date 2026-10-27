# FleetCore – Fleet Maintenance API

REST API built with **NestJS, TypeScript, TypeORM, PostgreSQL, JWT, and argon2** to manage the maintenance lifecycle of a vehicle fleet.

## Context & Problem Statement

FleetCore is a transport company that needs a system to manage the maintenance lifecycle of its vehicle fleet.

Currently, preventive and corrective maintenance activities are tracked using spreadsheets and manual records. This practice leads to several operational inefficiencies:

* **Data duplication** across multiple files and records.

* **Lack of visibility** regarding real-time vehicle availability.

* **Delays and conflicts** when scheduling preventive and corrective maintenance.

* **Poor traceability** of past interventions, repairs, costs, and mechanic assignments.

### Objective

As a Backend Developer, the goal is to design and implement a robust REST API using **NestJS, TypeScript, TypeORM, PostgreSQL, JWT, and argon2**. This system automates and streamlines fleet management operations by enabling FleetCore to:

* Register and manage vehicles, mechanics, and workshops.

* Schedule and track preventive and corrective interventions.

* Automatically reflect vehicle availability based on ongoing maintenance statuses.

* Maintain a clear, audited history of maintenance logs, associated costs, mileage, and completed work.

## Coder

* **Name:** Valentina Cabas Miranda

* **Clan:** Node/Nest AM

## Requirements

* **Node.js:** 18+ (20 recommended)

* **PostgreSQL:** 14+ running locally

## Installation

```
npm install
cp .env.example .env        # Edit the environment values if needed

```

Create the PostgreSQL database (name must match `DB_NAME`):

```
sudo -u postgres psql -c "CREATE DATABASE fleetcore;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

```

### Environment Variables (`.env.example`)

| Variable | Description | 
| ----- | ----- | 
| `PORT` | HTTP port (default: `3000`) | 
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection parameters | 
| `DB_SYNC` | `true` lets TypeORM create/update tables automatically (recommended for development) | 
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT signing secret and token lifetime (e.g., `1h`) | 
| `API_KEYS` | Comma-separated keys accepted in the `x-api-key` header | 
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth 2.0 configuration (optional) | 

## Running the Application

```
npm run seed        # Populate database (safe to run multiple times, prevents duplicates)
npm run start:dev   # Run in development watch mode
# Or build and run in production:
# npm run build && npm run start:prod

```

* **API Base URL:** `http://localhost:3000`

* **Swagger Documentation:** `http://localhost:3000/api/docs`

> **Alternative Execution:** Instead of running the seeder, you can load the database dump directly:
> `psql -U postgres -d fleetcore -f database/fleetcore_dump.sql`

## Test Credentials (Created by Seeder)

| Role | Email | Password | Notes | 
| ----- | ----- | ----- | ----- | 
| **ADMIN** | `admin@fleetcore.com` | `Admin123!` | Full system access | 
| **TECHNICIAN** | `tech1@fleetcore.com` | `Tech123!` | Linked to mechanic *Carlos Pérez* | 
| **TECHNICIAN** | `tech2@fleetcore.com` | `Tech123!` | Linked to mechanic *Laura Gómez* | 

* **API Keys for integration endpoint (`x-api-key` header):** `demo-key-partner-1`, `demo-key-partner-2`

### Seeded Summary Data

* **4 Users** (1 Admin, 2 Technicians, 1 Regular)

* **3 Mechanics** (2 active linked to technicians, 1 inactive)

* **2 Workshops** (1 active, 1 inactive)

* **4 Vehicles** (2 AVAILABLE, 1 IN_MAINTENANCE with an active maintenance, 1 INACTIVE)

* **3 Maintenances** (1 COMPLETED, 1 IN_PROGRESS, 1 SCHEDULED)

## How to Use It (Swagger Workflow)

1. Navigate to `http://localhost:3000/api/docs`.

2. Send a `POST` request to `/auth/login` using one of the test credentials above and retrieve the `data.accessToken` value.

3. Click the **Authorize** button at the top of Swagger and paste your bearer token.

4. *Integration Access:* For the `GET /integrations/vehicles/{plate}/history` endpoint, use the `x-api-key` authorization header with `demo-key-partner-1` instead of a bearer token.

## Roles and Permissions Matrix

| Resource | ADMIN | TECHNICIAN | REGULAR / OTHER | 
| ----- | ----- | ----- | ----- | 
| **Vehicles:** List / Get / By Plate | ✅ | ✅ | ✅ | 
| **Vehicles:** Create / Update / Activate / Logical Delete | ✅ | – | – | 
| **Mechanics:** List / Get | ✅ | ✅ | – | 
| **Mechanics:** Create / Update / Activate / Deactivate | ✅ | – | – | 
| **Workshops:** List Active / Get | ✅ | ✅ | ✅ | 
| **Workshops:** List All, Create / Update / Status Toggle | ✅ | – | – | 
| **Maintenances:** Create | ✅ | – | – | 
| **Maintenances:** List / Active / By Vehicle / By Mechanic / History | ✅ | ✅ | – | 
| **Maintenances:** `GET /maintenances/my` | – | ✅  | – | 
| **Maintenances:** `GET /maintenances/:id` | ✅ | ✅  | – | 
| **Maintenances:** `PATCH /maintenances/:id/status` | ✅ | ✅  | – | 

## Main Endpoints

* **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/google`, `GET /auth/google/callback`

* **Vehicles:** `POST|GET /vehicles`, `GET /vehicles/plate/:plate`, `GET|PATCH|DELETE /vehicles/:id`, `PATCH /vehicles/:id/activate`

* **Mechanics:** `POST|GET /mechanics`, `GET|PATCH /mechanics/:id`, `PATCH /mechanics/:id/activate|deactivate`

* **Workshops:** `POST|GET /workshops` (active), `GET /workshops/all`, `GET|PATCH /workshops/:id`, `PATCH /workshops/:id/activate|deactivate`

* **Maintenances:** `POST|GET /maintenances`, `GET /maintenances/active`, `GET /maintenances/my`, `GET /maintenances/vehicle/:id`, `GET /maintenances/vehicle/:id/history`, `GET /maintenances/mechanic/:id`, `GET /maintenances/:id`, `PATCH /maintenances/:id/status`

* **Integrations (`x-api-key` header):** `GET /integrations/vehicles/:plate/history`

## Business Rules & Validation Highlights

* **Status Flow:** `SCHEDULED → IN_PROGRESS → COMPLETED`; `SCHEDULED / IN_PROGRESS → CANCELLED`. `COMPLETED` and `CANCELLED` are final states. Invalid transitions trigger a **409 Conflict** error.

* **Vehicle Availability:** Transitioning a maintenance to `IN_PROGRESS` automatically updates the vehicle status to `IN_MAINTENANCE`. Setting it to `COMPLETED` or cancelling an active maintenance reverts the vehicle back to `AVAILABLE` and updates its recorded mileage.

* **Completion Constraints:** Completing a maintenance strictly requires `workDone`, `finalCost`, `completedAt`, and `finalMileage` parameters.

* **Active Maintenance Limit:** A vehicle can only have one active (`SCHEDULED` or `IN_PROGRESS`) maintenance record at a time. Inactive vehicles, inactive mechanics, and inactive/non-existent workshops cannot be assigned.

* **Mileage Control:** Maintenance mileage cannot be lower than the vehicle's current mileage.

* **Mechanic Schedule Protection:** Mechanics cannot have overlapping active maintenances across any workshop. Each maintenance has a start (`scheduledDate`) and duration (`durationMinutes`, default: 60); adjacent schedule slots (e.g., end at 09:00 / start at 09:00) are allowed.

* **Soft Deletion:** Vehicles, mechanics, and workshops are never permanently deleted from the database via the API, preserving full audit and history data.
