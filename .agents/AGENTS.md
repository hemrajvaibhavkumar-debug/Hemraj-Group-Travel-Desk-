# Execution Tasks - Architecture Refactoring

## Phase 1: Backend Layering & Decoupling
- [x] Create folder structure for controllers, routes, middlewares, services, config
- [x] Implement `env.ts` for type-safe config validation using Zod
- [x] Implement custom middleware logic (Auth & RBAC)
- [x] Extract controllers:
    - [x] Auth & operator routing
    - [x] Employee profiles
    - [x] Travel Indents
    - [x] Job Cards & Quotes
- [x] Extract services:
    - [x] Gemini AI Scanner OCR
    - [x] n8n Webhooks handler
- [x] Setup express routers and integrate into a cleaned `server.ts` entrypoint
- [x] ✅ TypeScript compiles cleanly (`npx tsc --noEmit` → 0 errors)

## Phase 2: Database Schema Refinement
- [x] Research frontend JobCard consumption patterns
- [x] Update `prisma/schema.prisma` with fully normalized models (split JobCard into relational Booking, Invoice, Payment, Rescheduling tables)
- [x] Add proper `updated_at` timestamps and indexes to all models
- [x] Execute Prisma client code regeneration (`npx prisma generate`)
- [x] Update database query/update mapping logic inside `jobcard.controller.ts` to ensure 100% backward compatibility with frontend API payloads

## Phase 3: Frontend Refactoring
- [x] Install Zustand state management library
- [x] Create Zustand store (`src/store/useTravelStore.ts`) for search keywords, filter conditions, list collapse states, active section, and selected card options
- [x] Refactor `JobCardManager.tsx` to integrate Zustand hook, reducing local re-renders and improving testability
- [x] Verify step-by-step sequential lock rules in collapsed accordions
- [x] Verify clean builds and compile type checks (`npx tsc --noEmit` → 0 errors)
- [x] Verify production bundling succeeds (`npm run build` → success)
