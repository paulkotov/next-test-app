# User & Client Management

A small Next.js 16 (App Router) application with three **non-hierarchical** roles —
`IT`, `MANAGER`, `USER` — a user directory, and a client directory of 1,200+
generated records. Every access rule is enforced on the server; the UI only
reflects decisions the server already made.

Data lives in memory and is re-seeded on every server start. There is no
database.

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest: unit + HTTP scenario tests
npm run lint    # ESLint
```

`npm run build` / `npm start` build and serve the production bundle (state still
resets on each boot).

## Seed accounts

Passwords are plain text by design (this is a test task) and follow the pattern
`<name>-pass`. The store resets to this table every time the server restarts.

| Email | Password | Role | Status | Manager |
| --- | --- | --- | --- | --- |
| `ivan@example.com` | `ivan-pass` | IT | Active | — |
| `sofia@example.com` | `sofia-pass` | IT | Active | — |
| `anna@example.com` | `anna-pass` | MANAGER | Active | — |
| `marko@example.com` | `marko-pass` | MANAGER | Active | — |
| `ira@example.com` | `ira-pass` | MANAGER | Active | — |
| `olena@example.com` | `olena-pass` | USER | Active | Anna Koval |
| `pavlo@example.com` | `pavlo-pass` | USER | Active | Anna Koval |
| `marta@example.com` | `marta-pass` | USER | Active | Anna Koval |
| `yulia@example.com` | `yulia-pass` | USER | Active | Anna Koval |
| `dmytro@example.com` | `dmytro-pass` | USER | Active | Marko Shevchenko |
| `nazar@example.com` | `nazar-pass` | USER | Deactivated | — |
| `taras@example.com` | `taras-pass` | MANAGER | Deactivated | — |
| `iryna@example.com` | `iryna-pass` | USER | Active | Taras Boyko (deactivated) |

Useful combinations to try:

- **Ivan (IT)** manages accounts but has no access to `/content`.
- **Anna (MANAGER)** sees only her four reports and may edit their name/email
  only — never roles, statuses, or other managers' reports.
- **Olena (USER)** sees clients but is blocked from `/manage-users`.

## Roles and pages

| Page | IT | MANAGER | USER |
| --- | --- | --- | --- |
| `/content`, `/content/client/:id` (clients) | — | ✅ | ✅ |
| `/content/me` (own profile) | — | ✅ | ✅ |
| `/manage-users` (directory) | all users + create/role/status | own reports, name/email only | — |

Rules enforced on the server:

- Only IT creates users and changes roles or statuses.
- A manager edits only the name/email of their own direct reports.
- Nobody deactivates or demotes themselves (`OWN_ACCOUNT`).
- The last active IT account can never be removed (`LAST_ACTIVE_IT`).
- A deactivation takes effect on the **next request**, not the next login.

## Why an opaque session id, not a JWT

The session cookie holds a random id and nothing else; the id maps to a user id
in an in-memory `Map`. Role and status are **never** baked into the token.

Every request re-reads the live user from the store, so if an IT deactivates
someone, that person is signed out on their very next request — no waiting for a
token to expire. A JWT would freeze role/status into the token and break the
"deactivation is immediate" requirement, or force a revocation list that would
just reinvent the server-side session.

The `proxy` (`src/proxy.ts`) only redirects anonymous visitors to `/login` based
on the cookie's presence. It makes **no** role decision and is never the source
of truth — a request with a cookie still goes through the real authorizer.

## Where access is decided

The rules live in **one** module — `src/domain/authz.ts`, the only place roles
are compared:

- `authorize(actor, action, roster)` decides every action: create user, edit
  profile, change role, change status, view content, list users — including
  "you cannot change your own account" and "never remove the last active IT".
- `listVisibleUsers(actor, roster)` decides which users an actor may see.
- `canAccessContent` / `canAccessUserDirectory` / `canManageAccounts` /
  `navigationFor` / `landingPathFor` are thin wrappers over `authorize`.

That one source of truth is applied on **two sides**, so the checks are never
re-derived or duplicated:

### 1. Front end — splits the UI by role (presentation only)

The client shows each role only what it may use. This is UX, **not** security —
every one of these just reads the wrappers above:

- `src/app/layout.tsx` — `navigationFor(user)` renders only the nav links the
  role may open.
- `src/app/page.tsx` / `src/app/login/page.tsx` — `landingPathFor` sends each
  role to the page it is allowed to land on.
- `src/app/manage-users/page.tsx` + `user-forms.tsx` — `canManageAccounts`
  hides the "create user" form and the role/status controls from managers, who
  then see only name/email of their own reports.
- `src/app/content/me/page.tsx` — `canAccessContent` gates the profile page.

### 2. API / server — enforces for real (authoritative)

A hidden button is not a permission. Every request goes through the server
rules **before** any read or write, so a direct API call with a manager's or
user's cookie is rejected even though the UI never showed the control:

- `src/server/users.ts` — `listUsersFor`, `createUser`, `updateUserAccount`
  (authorizes every profile/role/status change before it writes).
- `src/server/clients.ts` — `listClients`, `getClientFor`.
- Route handlers in `src/app/api/**` and the server pages call only these
  use-cases and turn a denial into a `403` / `forbidden()` — the list is also
  sliced here, so the browser never receives the full client dataset.

`src/proxy.ts` is deliberately **not** a decision point: it only redirects
anonymous visitors to `/login`. Identity comes from `resolveSession` /
`readSessionUser`, which re-read the live user from the store on every request.

Adding a fourth role means editing `authz.ts` only; neither the UI nor the API
branches on role names.

## Project layout

```
src/
  domain/    pure rules & types (authz, user, client) — no server/UI imports
  server/    in-memory store, session, use-cases (clients, users, current-user)
  app/       App Router pages, API routes, and client components
  lib/       deterministic entity factory (faker wrapper)
```

- `src/domain` never imports from `src/server` or the UI.
- `src/server` never imports UI; client components never touch the store.
- The client list is always paginated inside `listClients` — the full
  `getClients()` array is never handed to a client component.

## Tests

- Unit tests sit next to each module (`*.test.ts`).
- `src/app/api/scenarios.test.ts` drives the route handlers directly and covers
  the full grading checklist: manager scope, IT-only account control,
  self/last-IT denials, immediate deactivation, and pagination (`total > 1000`,
  20 items per page).

## Next four hours (not done yet)

- Client sorting and status filter persisted in the URL (`?page&sort&status`),
  reusing the same server-side pagination.
- More **humanized** UI

Passwords stay plain text; the API scenarios are already covered by
`src/app/api/scenarios.test.ts`.
