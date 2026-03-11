# Netlify 404 / MIME Type Errors — Postmortem

**Date:** 2026-03-08
**Affected URL:** https://manthanby.netlify.app

## Symptoms

All pages on the production site showed console errors like:

- `Failed to load resource: the server responded with a status of 404` for multiple `.js` and `.css` chunks
- `Refused to apply style from '...' because its MIME type ('text/plain') is not a supported stylesheet MIME type`
- `Refused to execute script from '...' because its MIME type ('text/plain') is not executable`

The page HTML loaded (200), but the JS/CSS/font chunks it referenced either returned 404 or were served as `text/plain` (Netlify's default error response content type).

## Root Cause

The issue had **two layers**:

### 1. Broken deploys from local `netlify deploy --prod --build`

Running `netlify deploy --prod --build` from a local machine does not properly set up the Netlify SSR function and edge functions for Next.js 16. The deploys appeared successful (`Deploy is live!`) but all page routes returned 404 from the server function. This was verified by testing unique deploy URLs (e.g., `https://<deploy-id>--manthanby.netlify.app/login`), which returned 404 or 502.

Only **remote builds** triggered via git push (Netlify's CI) correctly bundle the Next.js SSR function and static assets.

### 2. Aggressive Netlify CDN edge caching

The production URL (`manthanby.netlify.app`) served a stale cached HTML response from the **last working deploy** for over 6+ hours (`age: 24000+` seconds), despite the `Cache-Control: public, max-age=0, must-revalidate` header. The Netlify CDN edge nodes did not revalidate.

This masked the broken deploys — the site appeared to "work" (the old cached HTML loaded), but the old HTML referenced chunk hashes from the previous build that no longer existed on the CDN, causing the 404s.

Key evidence:
- Production URL: `age: 24000+`, `cache-status: "Netlify Edge"; hit` (stale cache)
- Unique deploy URL: `age: 1`, correct chunks, all 200s (when using remote build)

### Why the chunks mismatched

Each Next.js build generates chunk filenames with unique content hashes (e.g., `turbopack-4594a373ca54d404.js`). When the CDN served HTML from build A but the static assets were from build B, the HTML referenced chunks that didn't exist, causing 404s. The 404 responses from Netlify used `content-type: text/plain`, which triggered the MIME type errors in the browser.

## Resolution

### Step 1: Revert to known-working configuration

Reverted `netlify.toml`, `package.json`, and `src/app/login/page.tsx` to match the last known-working deploy state:

```toml
# netlify.toml
[build]
  command = "pnpm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  PNPM_FLAGS = "--no-frozen-lockfile"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

```json
// package.json build script
"build": "next build"
```

### Step 2: Push to git and use remote build only

Committed and pushed to `main`, then triggered a remote build with cache clearing:

```bash
netlify api createSiteBuild --data '{"site_id": "<site-id>", "clear_cache": true}'
```

This ensured the Netlify CI properly bundled the SSR function, edge functions, and static assets.

### Step 3: Force CDN cache invalidation

The remote build alone didn't flush all CDN edge caches globally. Used the Netlify API to restore the deploy, which forced CDN invalidation:

```bash
netlify api restoreSiteDeploy --data '{"site_id": "<site-id>", "deploy_id": "<deploy-id>"}'
```

After this, the CDN edge nodes returned `cache-status: fwd=stale` (recognized stale content) and fetched fresh HTML from the origin. A second `createSiteBuild` with `clear_cache: true` was needed to fully recover the SSR function after the restore.

### Verification

After the fix, all resources returned 200:

```
[GET] /login                                    => [200]
[GET] /_next/static/chunks/05ff46f6bd6f1c1b.css => [200]
[GET] /_next/static/chunks/c9f4c89a91d8e4ed.css => [200]
[GET] /_next/static/chunks/turbopack-4594a373ca54d404.js => [200]
[GET] /_next/static/chunks/9cb112fffcc4620d.js  => [200]
... (all 14 resources: 200)
```

## What didn't work

| Attempt | Why it failed |
|---------|---------------|
| `netlify deploy --prod --build` from local | SSR function not properly bundled — all pages 404 |
| `output: "standalone"` in next.config.ts | Incompatible with `@netlify/plugin-nextjs` — function crashes (502) |
| `export const dynamic = "force-dynamic"` on login page | SSR function couldn't render dynamically from local deploys |
| Adding `[[headers]]` for cache control in netlify.toml | Didn't affect already-cached CDN responses |
| `createSiteBuild` with `clear_cache: true` alone | Cleared build cache but didn't purge all CDN edge nodes |

## Lessons learned

1. **Never use `netlify deploy --prod --build` from local for Next.js 16 projects.** Always push to git and let Netlify's remote CI handle the build and deploy. The local CLI doesn't properly bundle SSR functions.

2. **Netlify CDN edge caches can persist for hours** even with `max-age=0, must-revalidate`. The `clear_cache` flag on builds only clears the *build* cache, not the CDN edge cache. Use `restoreSiteDeploy` API followed by a fresh build to force global CDN invalidation.

3. **Always test unique deploy URLs** (e.g., `https://<deploy-id>--site.netlify.app`) to bypass CDN caching and verify the actual deploy output. The production URL may serve stale cached content.

4. **Chunk hash mismatches are the symptom, not the cause.** If HTML references chunks that 404, the HTML is stale — investigate CDN caching, not the build output.
