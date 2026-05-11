# Restructure ApniDukan: Proper Frontend ↔ Backend ↔ Database Architecture

## Problem

Currently, the frontend (React/Vite) directly imports `@supabase/supabase-js` and makes all database calls from the browser. The `server/` folder only has a placeholder health endpoint and an admin creation script. This is an anti-pattern:

- **Security risk**: Supabase anon key + direct DB access from client exposes query logic
- **No centralized business logic**: Validation, authorization, and data transformations happen in the browser
- **Not scalable**: Adding middleware (rate limiting, logging, caching) is impossible

## Goal

Restructure into a clean **Frontend → Backend API → Supabase** architecture where:
1. **Backend (Express)** handles ALL Supabase/database calls and exposes REST APIs
2. **Frontend (React)** only calls backend APIs via `fetch()` — zero Supabase imports
3. **Auth** uses Supabase Auth on the frontend for login/signup (this is standard practice), but the backend verifies JWTs for protected routes
4. Production-ready for **Vercel** (frontend) + **Render** (backend)

> [!IMPORTANT]
> **Auth Strategy**: Supabase Auth (signIn/signUp/signOut/onAuthStateChange) will remain on the frontend since it manages the JWT session. The backend will verify the JWT token from the `Authorization` header to authenticate API requests. This is the industry-standard pattern.

---

## Proposed Changes

### 1. Backend — Full API Server

#### [MODIFY] [server/index.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/index.ts)

Complete rewrite to a production-grade Express server with:
- CORS configured for the Vercel frontend URL
- JSON body parsing
- Supabase Admin client initialization (using `SUPABASE_SERVICE_ROLE_KEY`)
- JWT verification middleware (`authMiddleware`) that extracts user from `Authorization: Bearer <token>`
- Admin-only middleware (`adminMiddleware`)
- All route imports

#### [NEW] [server/middleware/auth.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/middleware/auth.ts)

- `authMiddleware`: Verifies Supabase JWT from the `Authorization` header, attaches `req.user` (with `uid`, `role`)
- `adminMiddleware`: Checks `req.user.role === 'admin'`

#### [NEW] [server/lib/supabase.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/lib/supabase.ts)

- Server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (full DB access)
- Exported as singleton for all route handlers

#### [NEW] [server/routes/auth.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/auth.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/profile` | GET | ✅ JWT | Get current user's profile from `users` table |
| `/api/auth/register-profile` | POST | ✅ JWT | Create user profile after Supabase auth signup |

#### [NEW] [server/routes/products.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/products.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/products` | GET | ❌ Public | List all products |
| `/api/products/:id` | GET | ❌ Public | Get single product |
| `/api/products` | POST | 🔒 Admin | Create product |
| `/api/products/:id` | PUT | 🔒 Admin | Update product |
| `/api/products/:id` | DELETE | 🔒 Admin | Delete product |

#### [NEW] [server/routes/orders.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/orders.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/orders` | POST | ✅ JWT | Place new order |
| `/api/orders/my` | GET | ✅ JWT | Get current user's orders |
| `/api/orders/all` | GET | 🔒 Admin | Get all orders (admin dashboard) |
| `/api/orders/:id/status` | PUT | 🔒 Admin | Update order status |
| `/api/orders/:id/owner-note` | PUT | 🔒 Admin | Update owner note |
| `/api/orders/:id/response` | PUT | ✅ JWT | Customer response (OK/Cancel) |
| `/api/orders/:id/pick` | PUT | 🔒 Admin | Mark order picked with payment status |
| `/api/orders/:id/payment-status` | PUT | 🔒 Admin | Update payment status |

#### [NEW] [server/routes/config.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/config.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/config` | GET | ❌ Public | Get store config |
| `/api/config` | PUT | 🔒 Admin | Update store config (settings, toggle open/close) |

#### [NEW] [server/routes/customers.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/customers.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/customers` | GET | 🔒 Admin | List all customers |
| `/api/customers/:uid/trust-label` | PUT | 🔒 Admin | Update trust label |
| `/api/customers/:uid/credit-limit` | PUT | 🔒 Admin | Update credit limit |

#### [NEW] [server/routes/khata.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/routes/khata.ts)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/khata/:userId` | GET | ✅ JWT | Get khata entries for user |
| `/api/khata` | POST | 🔒 Admin | Add khata entry |
| `/api/khata/:entryId/flag` | PUT | ✅ JWT | Flag khata entry as disputed |
| `/api/khata/order/:orderId` | DELETE | 🔒 Admin | Delete khata entry by orderId |

#### [NEW] [server/tsconfig.json](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/server/tsconfig.json)

Separate tsconfig for the server (Node.js target, no DOM libs).

---

### 2. Frontend — API Client Layer

#### [NEW] [src/lib/api.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/lib/api.ts)

Central API client module that:
- Reads `VITE_API_URL` env var (backend URL)
- Provides typed helper functions: `api.get()`, `api.post()`, `api.put()`, `api.delete()`
- Automatically attaches the Supabase JWT token to every request (`Authorization: Bearer <token>`)
- Handles errors consistently

#### [MODIFY] [src/lib/supabase.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/lib/supabase.ts)

Strip down to **ONLY** Supabase Auth methods. Remove `.from()`, `.channel()`, `.removeChannel()`. The frontend will only use `supabase.auth` for login/signup/signOut/session management.

#### [MODIFY] [src/hooks/useDatabase.ts](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/hooks/useDatabase.ts)

Complete rewrite. Every function now calls the backend API via `src/lib/api.ts` instead of direct Supabase calls. Realtime subscriptions will be replaced with polling (periodic refetch every 5-10 seconds) since the frontend no longer has direct Supabase access.

> [!NOTE]
> **Realtime trade-off**: Currently, the app uses Supabase Realtime (WebSocket subscriptions) for live updates. Moving all DB calls to the backend means the frontend loses direct WebSocket access. We'll replace this with **polling every 5 seconds** which is perfectly adequate for a village retail app with low concurrency. If you need true realtime later, we can add a WebSocket layer to the Express backend.

#### [MODIFY] [src/App.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/App.tsx)

- Auth session still uses `supabase.auth` (unchanged)
- Profile fetch now uses `api.get('/api/auth/profile')` instead of direct DB query
- Config fetch uses `api.get('/api/config')`
- Remove store config realtime subscription, replace with polling

#### [MODIFY] [src/components/AuthView.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/AuthView.tsx)

- `supabase.auth.signUp/signIn` stays (auth is client-side)
- After signup, call `api.post('/api/auth/register-profile', profileData)` instead of direct DB insert

#### [MODIFY] [src/components/admin/AdminApp.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminApp.tsx)

- `toggleStore` → `api.put('/api/config', { isOpen: !storeConfig.isOpen })`
- `supabase.auth.signOut()` stays (auth)

#### [MODIFY] [src/components/admin/AdminOrders.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminOrders.tsx)

- All order operations through backend API
- Owner note update → `api.put('/api/orders/:id/owner-note')`
- Polling instead of realtime subscription

#### [MODIFY] [src/components/admin/AdminInventory.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminInventory.tsx)

- Product CRUD → backend API calls
- Status update → `api.put('/api/products/:id', { availabilityStatus })`
- Featured toggle → `api.put('/api/products/:id', { isFeatured })`

#### [MODIFY] [src/components/admin/AdminKhata.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminKhata.tsx)

- All khata operations through backend API
- `handleMarkCollected` → `api.put` + `api.delete` via backend

#### [MODIFY] [src/components/admin/AdminSettings.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminSettings.tsx)

- Store settings save → `api.put('/api/config')`
- Customer management → `api.get('/api/customers')`, `api.put('/api/customers/:uid/...')`

#### [MODIFY] [src/components/admin/AdminOffers.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/admin/AdminOffers.tsx)

- Apply/remove discounts → `api.put('/api/products/:id')`

#### [MODIFY] [src/components/OwnerDashboard.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/OwnerDashboard.tsx)

- All direct `supabase.from(...)` calls → backend API calls

#### [MODIFY] [src/components/CatalogView.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/CatalogView.tsx)

- Remove `import { supabase }` — only uses `useDatabase` hook (which now uses API)

#### [MODIFY] [src/components/OrdersView.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/OrdersView.tsx)

- `updateOrderResponse` → through `useDatabase` (now API-backed)

#### [MODIFY] [src/components/KhataView.tsx](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/src/components/KhataView.tsx)

- No direct Supabase usage (already uses `useDatabase`)

---

### 3. Configuration & Build

#### [MODIFY] [.env](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/.env)

Add:
```
VITE_API_URL=http://localhost:3000
```
Keep existing Supabase keys (frontend still needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase Auth only).

#### [NEW] [.env.example](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/.env.example)

Template with all required env vars (no secrets).

#### [MODIFY] [package.json](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/package.json)

- Add `jsonwebtoken` and `@types/jsonwebtoken` for JWT verification

#### [MODIFY] [render.yaml](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/render.yaml)

- Add required environment variable references for backend deployment

#### [MODIFY] [.gitignore](file:///c:/Users/Hemant%20Natani/Downloads/Natani%20Shop/.gitignore)

- Ensure `.env` is ignored (already is)

---

## Deployment Configuration

### Vercel (Frontend)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_SUPABASE_URL` — for Supabase Auth only
  - `VITE_SUPABASE_ANON_KEY` — for Supabase Auth only
  - `VITE_API_URL` — points to Render backend URL (e.g., `https://apni-dukan-api.onrender.com`)

### Render (Backend)
- **Build Command**: `npm install`
- **Start Command**: `npx tsx server/index.ts`
- **Environment Variables**:
  - `VITE_SUPABASE_URL` — backend uses this to init Supabase admin client
  - `SUPABASE_SERVICE_ROLE_KEY` — server-only key
  - `VITE_SUPABASE_ANON_KEY` — for JWT verification
  - `FRONTEND_URL` — Vercel URL for CORS
  - `PORT` — Render provides this automatically

---

## Open Questions

> [!IMPORTANT]
> **Polling interval**: I plan to use **5-second polling** to replace the current Supabase Realtime subscriptions. For a village retail app, this is more than sufficient. Is this acceptable, or would you prefer a different interval?

> [!NOTE]
> **The `OwnerDashboard.tsx` file** appears to be a legacy/duplicate version of the admin panel (before the `admin/` folder was created). It has overlapping functionality with `AdminApp.tsx` + `AdminOrders.tsx` + `AdminInventory.tsx` + `AdminSettings.tsx`. Should I keep both or can we remove `OwnerDashboard.tsx`?

---

## Verification Plan

### Automated Tests
1. Start backend: `npm run dev:backend` — verify all API routes return correct responses
2. Start frontend: `npm run dev` — verify all pages load and CRUD operations work through APIs
3. Verify no direct Supabase imports remain in frontend (except `supabase.auth`)

### Manual Verification
1. Test login/register flow
2. Test product browsing (customer)
3. Test order placement (customer)
4. Test admin order management workflow
5. Test admin product CRUD
6. Test admin customer management
7. Test admin settings save
8. Confirm CORS works between frontend and backend
