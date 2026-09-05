# Menukey allergen webapp — directives

This folder holds app-local notes. The **authoritative** directives for the whole workspace live one
level up in `../../directives/` (see `../../CLAUDE.md`) — start there.

## What this app is (Sept 2026)

The public allergen menu at **menukey.co.nz** (`/kisa`, `/mr-gos`, `/ombra`): a diner picks allergens
and sees what they can eat, with chef substitutions. It reads the shared Google Sheet only
(`GOOGLE_SHEET_ID`); the custom-allergy interpreter uses Anthropic (`ANTHROPIC_API_KEY`).

Live surface: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[venue]/page.tsx` →
`components/VenueApp.tsx` (+ allergen grid, results, autocomplete), `src/app/api/submit`,
`src/app/api/interpret`, `src/lib/{allergens,venues,menu-service,google-sheets,filter-menu,
substitutions,confidence,ai-filter,interpret-allergy}.ts`. `src/app/v/[slug]` is a permanent
redirect to `/[slug]` for old QR codes.

## Retired: the Supabase chef dashboard

Login, venue/menu editor, import, Supabase API routes, RLS/RPC notes and the dashboard UI kit were
moved to **`../_archive/supabase-dashboard/`** on 2026-09-05 (excluded from the build via
`tsconfig.json`). The chefs preferred editing the Google Sheet directly. See `../_archive/README.md`
for what's there and how to restore it.

## Files here

| File | Status |
|---|---|
| [design-system.md](./design-system.md) | Colour/typography/spacing tokens. Still describes `globals.css`; the dashboard sections are historical. |
| [changelog.md](./changelog.md) | Project history and migration notes. |

Dashboard-era directives (`dashboard-ui-components.md`, `icon-system.md`, `api-endpoints.md`,
`supabase-rls-policies.md`, `supabase-rpc-typing.md`, `venue-creation.md`) are in the archive folder.

## Working rules

- `globals.css` is append-only. Dead `.dashboard-*` rules are inert and were deliberately left in place.
- `src/lib/allergens.ts` and `src/lib/substitutions.ts` are copied into `../../set-menu-builder/`;
  run `python ../../execution/check_lib_sync.py` after editing either.
- Deploy = push this repo's `master` (Netlify). Verify at menukey.co.nz/kisa afterwards.
