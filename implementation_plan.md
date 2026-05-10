# Smart Pre-Order Web App Implementation Plan

We will build the Village Retail Store Smart Pre-Order Web App (Hone Dukaan) according to the PRD v4.0. The focus will be on delivering a **premium, fast, mobile-first PWA** with a beautiful UI (vibrant colors, glassmorphism, and micro-animations) while adhering to the specific constraints of the Indian village market (Hinglish, low data usage).

We will strictly enforce the separated deployment model:
- **Frontend**: Hosted on Vercel
- **Backend**: Hosted on Render
- **Database**: Supabase PostgreSQL

> [!IMPORTANT]
> **Firebase Removal**: All Firebase references will be stripped out as requested. We will use Supabase for Auth, Database, and Realtime subscriptions.

## User Review Required

> [!WARNING]
> **Phone Authentication Setup**: The PRD specifies WhatsApp OTP authentication. Supabase Auth supports Phone OTP, but it requires configuring a third-party SMS/WhatsApp provider (like Twilio, MessageBird, or Textlocal) in the Supabase Dashboard. 
> 
> **Question**: Do you have a WhatsApp/SMS provider configured in your Supabase project? 
> - If **YES**, we will implement the real OTP flow.
> - If **NO**, we can implement a "Mock OTP" flow for development (where any 6-digit code works) or fallback to Email auth for now. Please advise.

## Open Questions

1. **Backend Role on Render**: The PRD v4.0 states "Cloud Functions removed from MVP... All business logic moves to client-side". However, you requested a Render backend. We will set up a standalone Express backend on Render. For the MVP, it will handle basic health checks, fallback API routes, and can be used to send the WhatsApp fallback notifications to the owner. Is this acceptable?
2. **Supabase Project**: I see you have a Supabase project named `MeriDukan`. I will use this project for the database schema and RLS policies. Please confirm.

## Proposed Changes

### 1. Database & Schema (Supabase)
We will run SQL migrations to update the database schema to support all PRD v4.0 requirements.
- **`config` table**: Add `reopenMessage`.
- **`products` table**: Add `variants` JSONB array.
- **`users` table**: Track `trustLabel`, `creditLimit`, `balance`.
- **`orders` table**: Add `ownerNote`, `customerResponse`.
- **`khata_entries` table**: Track `isDisputed` flag.
- **Row Level Security (RLS)**: Implement strict RLS policies ensuring customers can only read/write their own data, and the owner has full access.

### 2. Backend Architecture (Render)
We will split the current `server.ts` into a dedicated backend structure.
#### [NEW] `server/index.ts`
- Standalone Express app configured for Render.
- Endpoints for health checks (`/api/health`) and placeholder for webhook notifications.
#### [NEW] `render.yaml`
- Configuration file for deploying the backend easily to Render via Blueprint.

### 3. Frontend Architecture (Vercel)
We will optimize the Vite + React frontend for Vercel deployment.
#### [MODIFY] `vite.config.ts`
- Separate the frontend build from the Express server.
- Configure proxy for local development and absolute URL for production.
#### [MODIFY] `package.json`
- Update scripts to support independent frontend/backend deployment (`build:frontend`, `build:backend`).

### 4. UI/UX Improvements & PRD Implementation
We will overhaul the UI to feel premium while remaining simple for village users.
#### [MODIFY] `src/index.css` & Tailwind config
- Introduce curated color palettes (deep oranges, warm yellows), glassmorphism utility classes, and optimized typography.
#### [MODIFY] `src/App.tsx`
- Implement robust App routing, global Loader, and AnimatePresence page transitions.
#### [MODIFY] `src/components/CatalogView.tsx`
- Implement Variant Selector (e.g., 1kg vs 5kg).
- Improve the "Store Closed" banner and "Minimum Order" enforcement.
- Add "Frequently Bought" and "Usual Orders" intelligent sections.
#### [MODIFY] `src/components/CartView.tsx`
- Enforce the minimum order value.
- Add dynamic pickup slot visibility (hide 5-10min if store closed).
#### [MODIFY] `src/components/OwnerDashboard.tsx`
- Add Customer Label assignment (Trusted, Normal, Careful).
- Implement Khata Credit Limits and Dispute flag visibility.
- Add "Store Open/Closed" toggle and custom reopen messages.
#### [NEW] `src/components/StoreInfoView.tsx`
- Create the Store Info page with QR code generation and WhatsApp share links for onboarding.

## Verification Plan

### Automated Tests
- Run `tsc --noEmit` to ensure TypeScript types are correct (especially product variants and Supabase responses).
- Verify Vite build succeeds without errors.

### Manual Verification
- **Frontend Deployment**: Ensure the Vercel app loads correctly, connects to Supabase, and the PWA manifests are valid.
- **Backend Deployment**: Ensure the Render backend returns `200 OK` on health checks.
- **Flow Tests**: Place an order, modify items, test variant selection, test the store closed override, and verify khata credit limits.
