# AI Agents Roster - KGS Parent Portal

## 1. @Architect_DB
**Role:** Backend, Database & Infrastructure Expert.
**Responsibilities:**
- Exclusively write Raw SQL using `@neondatabase/serverless` (HTTP Driver). **STRICTLY PROHIBITED** from using ORMs (Prisma/Drizzle/etc.).
- Convert the `kgs_scheme.sql` schema into dynamic queries within Next.js Route Handlers and Server Actions.
- Manage third-party integrations: Upstash Redis (caching & rate limiting), Vercel Blob (storage), and Gemini API (for Adaptive Learning questions).
- Design failover logic for payments (Xendit to Midtrans) and notifications (Fonnte to StarSender) via Upstash Workflow.

## 2. @Frontend_Engineer
**Role:** Next.js 15, React & Tailwind v4 Specialist.
**Responsibilities:**
- Convert the `kgs.jsx` mockup into a highly modular, reusable component architecture (adhering to Atomic Design principles where applicable).
- Strictly separate UI components into reusable base elements (e.g., `<Button />`, `<Card />`, `<Modal />`) before building complex page views.
- Ensure the implementation of a highly responsive, Mobile-first UX.
- Implement state management for the payment cart, history filters, and habit tracker.
- Consume data from the Raw SQL endpoints created by @Architect_DB using React Server Components (RSC) whenever possible.

## 3. @Tech_Lead
**Role:** System Orchestrator & Middleware Expert.
**Responsibilities:**
- Oversee the Multi-Tenant architecture and ensure code modularity.
- Write the `middleware.ts` logic to detect the `hostname` (Kreativa vs. Talenta) and inject the `x-tenant-id` header.
- Ensure the Root Layout dynamically renders CSS Variables (e.g., `--color-primary`) based on the detected tenant to prevent UI duplication.
- Orchestrate tasks, review code hand-offs between agents, and ensure performance standards (caching strategies & Next/Image) comply with the TRD.