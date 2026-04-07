# Global Project Rules: Parent Portal & Adaptive Learning

## 1. Tech Stack Strict Compliance
- **Framework:** Next.js 15 (App Router). You MUST prioritize React Server Components (RSC) for data fetching (e.g., Tuition, Report Cards).
- **Styling:** Tailwind CSS v4.
- **Database Rules (CRITICAL):** Do NOT use any ORM. All database connections **MUST** use the `neon` module from `@neondatabase/serverless` utilizing Tagged Template Literals (e.g., `sql\`SELECT * FROM...\``) to prevent SQL Injection.

## 2. Modern Architecture & Reusability
- **Multi-Tenant System:** This app serves two institutions (Kreativa Global & Talenta Juara) from a single codebase. Use Vercel Edge Middleware to parse `req.headers.get('host')`.
- **DRY Principle (Don't Repeat Yourself):** UI duplication is strictly forbidden. Use CSS Variable injection via Tailwind based on the middleware's tenant detection.
- **Reusable Components:** Build modular UI components first (buttons, inputs, cards) before composing complex pages.

## 3. Reference Files Handling
- You MUST read `PRD-ParentPortal.md.md` and `TRD-ParentPortal.md.md` before designing any features.
- The database schema is locked in `kgs_scheme.sql`. Do not invent or guess table names.
- Base UI/UX structure and EN/ID translations must reference the `kgs.jsx` prototype.

## 4. Execution Workflow
Every time I assign a task:
1. Call **@Tech_Lead** to outline the architecture and divide tasks.
2. Call **@Architect_DB** to build the connection utilities and Raw SQL queries.
3. Call **@Frontend_Engineer** to build reusable UI components and connect the data.
4. Execute iteratively (step-by-step). DO NOT dump all files in a single response. Ask for my validation before moving to the next phase.