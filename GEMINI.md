# Hemraj Group Personal Travel Desk

Comprehensive system for managing corporate travel indents, approvals, and job cards, integrating Gemini AI for automated document scanning and OCR.

## Project Overview

- **Purpose**: Automates the travel desk workflow from initial request (Indent) to financial reconciliation.
- **Key Modules**:
    - **Indent Management**: Raising and approving travel requests.
    - **Job Card Lifecycle**: Tracking Quotation, Approval, Booking, and Finance stages for each approved indent.
    - **Employee Compliance**: Tracking passport validity, vaccine status, and visas for domestic and international travelers.
    - **AI Integration**: Uses Gemini 2.0 Flash to scan tickets and invoices (PNR, amounts, GST details).
    - **RBAC**: Role-based access control for Travel Desk, Approvers, Finance, and VP Commercial.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Lucide React, Framer Motion.
- **Backend**: Node.js with Express (via `tsx` in development).
- **AI**: `@google/genai` (Gemini SDK).
- **Database**: Persistent JSON storage (`src/db/database.json`) with an SQL-based schema definition (`src/db/01_schema.sql`).
- **Build/Bundle**: Vite for frontend, `esbuild` for backend.

## Key Files & Directories

- `server.ts`: Entry point for the Express backend, includes API endpoints and Gemini integration.
- `src/App.tsx`: Main React application entry point and navigation logic.
- `src/types.ts`: Centralized TypeScript interfaces for Employees, Indents, JobCards, and RBAC.
- `src/components/`: UI components (e.g., `JobCardManager`, `IndentConsole`, `PassportValidityDashboard`).
- `src/db/`: Data persistence layer (JSON database and SQL schema).
- `src/hooks/`: Custom React hooks like `usePersistedState`.

## Building and Running

### Prerequisites
- Node.js installed.
- `GEMINI_API_KEY` set in `.env` (optional, falls back to mock scanning if missing).

### Commands
- **Install Dependencies**: `npm install`
- **Development**: `npm run dev` (Starts backend on port 3000, Vite middleware handles frontend).
- **Build**: `npm run build` (Compiles frontend to `dist/` and backend to `dist/server.cjs`).
- **Production Start**: `npm run start` (Runs the compiled server).
- **Linting**: `npm run lint` (TypeScript type checking).

## Development Conventions

- **Type Safety**: Strictly adhere to types defined in `src/types.ts`.
- **API Pattern**: All backend endpoints are prefixed with `/api`.
- **Database Sync**: The backend automatically syncs state to `src/db/database.json`. Ensure any manual schema changes are reflected in `src/db/01_schema.sql`.
- **UI/UX**: Follow the established aesthetic using Tailwind CSS 4 and Framer Motion for interactive elements.
- **AI Features**: When extending document scanning, update the prompts in `server.ts` to ensure consistent JSON extraction from Gemini.

## API Reference

- `GET /api/indents`: Retrieve all travel indents.
- `POST /api/indents`: Submit a new travel request (enforces constraints).
- `POST /api/job-cards`: Initialize a tracking job card for an approved indent.
- `POST /api/job-cards/scan`: Trigger Gemini OCR for tickets or invoices.
- `GET /api/employees`: Retrieve the employee master directory.
- `GET /api/rbac`: Get system settings and user roles.
