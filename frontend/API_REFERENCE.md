# Fonebook API Reference

Base URL: `http://localhost:8080`

Auth: JWT via `Authorization: Bearer <token>` header. Obtained from `/api/auth/login`.
Two roles: `ADMIN`, `MANAGER`. No public user accounts — all GET endpoints are open, no token needed.

All error responses (any non-2xx) share this shape:

```json
{
  "timestamp": "ISO-8601",
  "status": 404,
  "error": "Not Found",
  "message": "human-readable reason"
}
```

- `403` — bad login credentials, or authenticated but wrong role/no clique access
- `404` — referenced id (manager/clique/contact) doesn't exist
- `500` — unexpected server error (generic message, no details)

---

## Auth

### `POST /api/auth/login`

Public. Body:

```json
{ "email": "string", "password": "string" }
```

Success `200`:

```json
{ "token": "eyJ..." }
```

Failure `403` (bad email or password — same message either way, doesn't leak which).

Token payload (for reference, not needed by frontend logic): `sub` = user id, `role` = `"ADMIN"`/`"MANAGER"`, 24h expiry.

---

## Cliques

### `GET /api/cliques`

Public. Returns all cliques.

```json
[{ "id": 1, "name": "Test Church", "description": "A test clique" }]
```

---

## Contacts

### `GET /api/contacts/clique/{cliqueId}`

Public. Returns all contacts belonging to that clique.

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "phoneNumber": "555-1234",
    "notes": "test contact",
    "clique": {
      "id": 1,
      "name": "Test Church",
      "description": "A test clique"
    },
    "addedBy": {
      "id": 2,
      "name": "Test Manager",
      "email": "manager@test.com",
      "role": "MANAGER"
    },
    "timestamp": "2026-08-04T20:34:12.736382"
  }
]
```

### `POST /api/contacts`

Requires `MANAGER` role + manager must be assigned to the target clique (else `403`).
Body:

```json
{ "cliqueId": 1, "name": "string", "phoneNumber": "string", "notes": "string" }
```

Success `200`: full `Contact` object (same shape as above).

### `PUT /api/contacts/{contactId}`

Requires `MANAGER` role + must manage the contact's existing clique.
Body (note: `cliqueId` field required by DTO shape but ignored — contact can't be moved to a different clique via this endpoint):

```json
{ "cliqueId": 1, "name": "string", "phoneNumber": "string", "notes": "string" }
```

Success `200`: updated `Contact` object.

### `DELETE /api/contacts/{contactId}`

Requires `MANAGER` role + must manage the contact's clique.
Success `200`, empty body.

---

## Admin (all require `ADMIN` role)

### `POST /api/admin/managers`

Create a manager account. Body:

```json
{ "name": "string", "email": "string", "password": "string" }
```

Success `200`:

```json
{ "id": 2, "name": "string", "email": "string", "role": "MANAGER" }
```

(no `managedCliques` in response — fetch via clique list + cross-reference if needed, or a future admin listing endpoint)

### `DELETE /api/admin/managers/{managerId}`

Deletes a manager. `404` if id doesn't exist. Success `200`, empty body.

### `POST /api/admin/cliques`

Create a clique. Body:

```json
{ "name": "string", "description": "string" }
```

Success `200`: full `Clique` object (`id`, `name`, `description`).

### `POST /api/admin/assign-clique`

Assigns a manager to a clique (many-to-many). Body:

```json
{ "managerId": 2, "cliqueId": 1 }
```

Success `200`, empty body. `404` if manager or clique id doesn't exist.

### `POST /api/admin/remove-clique`

Removes a manager's assignment to a clique. Same body shape as above. Success `200`, empty body.

### `DELETE /api/admin/delete-clique`

Deletes a clique. Contacts are preserved with no clique assignment, and manager assignments are removed. Body:

```json
{ "cliqueId": 1 }
```

Success `200`, empty body. `404` if the clique id doesn't exist.

---

## Known gaps (not yet built — don't assume these exist)

- No endpoint to list all managers, or which cliques a specific manager manages (would need to be added to `AdminController` if the admin UI needs it — currently the only way to see this is indirectly, there's no `GET /api/admin/managers`).
- No signup/self-registration for anyone — only Admin creates managers, and there's exactly one Admin (seeded directly in DB, no Admin-creation endpoint at all).

## Frontend architecture (agreed context)

- Plain HTML/CSS/JS, no framework, no build step. Motion (motion.dev) via CDN for animations.
- JWT stored in `localStorage` after login.
- Pages: `index.html` (public browse), `login.html`, `dashboard.html` (manager), `admin.html`.
