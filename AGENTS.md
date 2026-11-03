<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## heesu project rules

- Design spec: `docs/superpowers/specs/2026-11-03-heesu-architecture-design.md` (read §4 folders, §13 security first).
- `src/app` routing only; each page renders one feature screen. `src/core` infra (supabase, auth, query, env). `src/design-system` UI parts and motion. `src/features/<name>` data / model / state / components / screen. `supabase/` migrations, pgTAP tests, functions, seed.
- Dependencies: `app -> features -> core, design-system`. `design-system` never imports `features` or `core`, and only `react, motion, canvas-confetti, lucide-react, class-variance-authority, clsx, tailwind-merge`.
- `@supabase/supabase-js` only in `src/core/supabase/**` and `src/features/*/data/**`.
- Static export (`output: "export"`): no Route Handlers, Server Actions, middleware, or `next/image` optimization.
- Tokens only: no hex or raw color values in screen code (Tailwind default palette is off).
- No `any`, no `dangerouslySetInnerHTML`. Never commit secrets; only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reach the browser.
- Do not add a table without RLS policies and a pgTAP test. All DB changes go through `supabase/migrations`; regenerate types with `npm run db:types`.
- If you cannot explain an auth, permission, or DB-write change in one line, do not merge it.
- UI copy is Korean "-해요" style; error messages say how to fix it.
- Verify: `npm run typecheck && npm run lint && npm test && npm run db:test && npm run build`
