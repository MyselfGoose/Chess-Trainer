# Development

## Running the app

```bash
cd frontend
npm install
npm run dev          # Next.js dev server (Turbopack, default in Next 16)
npm run dev:webpack  # Dev server with Webpack (if Turbopack causes issues)
npm run build
npm run start        # Production server (after build)
npm test
npm run lint
```

## Turbopack `contentWindow` runtime error

If you see a runtime error like:

```
can't access property "contentWindow", document.querySelector(...) is null
```

this is **not** from RepertoireLab application code (there is no `contentWindow` usage in `frontend/src`). It typically comes from the **Next.js 16 Turbopack dev client** or an embedded browser preview when a dev-runtime script cannot find its target element.

**Workarounds:**

1. Use Webpack dev: `npm run dev:webpack`
2. Use production preview: `npm run build && npm run start`
3. Use a normal browser tab (Chrome/Firefox) instead of an embedded preview if the error only appears there

If the error persists in production (`npm run start`), capture the full stack trace from DevTools and file an issue with the stack location.
