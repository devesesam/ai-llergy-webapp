# _archive — retired code (kept for reference, NOT built)

Everything under this folder is excluded from the Next.js build and from TypeScript checking
(`tsconfig.json` → `"exclude": ["node_modules", "_archive"]`). It is here so the work isn't lost if
we revisit it; it is not maintained and its dependencies have been removed from `package.json`.

## supabase-dashboard/  (retired 2026-09-05)
The Supabase-backed chef dashboard + auth (login, venue/menu editor, import, public-page panel) and
the Supabase-backed API routes. Built in early 2026 so chefs could edit menus in-app; the chefs preferred
editing the Google Sheet directly, so the public allergen menu runs entirely off the Sheet and this was
never used in production. Paths mirror `src/` at the time of retirement. Also contains the
`supabase/` schema + migrations and the dashboard-era directives.

To restore: move the folders back under `src/`, restore `src/middleware.ts`, reinstall
`@supabase/ssr @supabase/supabase-js framer-motion lucide-react qrcode.react`, re-add the three
Supabase env vars (`.env.example` history has them), remove the tsconfig exclude. Expect drift against
the current `lib/` code.

## orphans/
Files that had no importers anywhere in `src/` at the time of the archive:
- `src/lib/compute-confidence.ts` — rule-based confidence scorer superseded by `ai-filter.ts` + `confidence.ts`.
- `src/components/AllergenTypeModal.tsx` — old severity-type modal (severity slider was retired June 2026).
