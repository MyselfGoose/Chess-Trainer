# Deployment

Guide for building and hosting RepertoireLab in production.

## Build

```bash
cd frontend
npm install
npm run build
npm run start    # Local production server on port 3000
```

The build outputs to `frontend/.next/`. TypeScript checking runs as part of `next build`.

### Build requirements

| Requirement | Notes |
|-------------|-------|
| Node.js 20+ | Match development version |
| `npm run build` must pass | Includes `tsc` validation |
| Environment variables | None required for default client-only app |

---

## Hosting model

RepertoireLab is a **Next.js App Router** application. Most routes are client-rendered pages that depend on `localStorage`, which is only available in the browser.

### What works out of the box

| Host type | Support |
|-----------|---------|
| Node.js server (`next start`) | Full support |
| Vercel | Full support (recommended for Next.js) |
| Docker + Node | Full support |
| Static export | **Not configured** — requires `output: 'export'` and route adjustments |

### Data on deployed instances

Even when hosted on a server, **user data stays in the browser**. Deploying does not provide cross-device sync unless you add a backend.

---

## Vercel

The simplest deployment path for Next.js:

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Build command: `npm run build` (default)
5. Output: Next.js (auto-detected)
6. Deploy.

No environment variables are needed for the default configuration.

---

## Render

To deploy on [Render](https://render.com):

### Web service settings

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Start command | `npm run start` |
| Node version | 20+ |

### Port binding

Next.js reads `PORT` from the environment. Render sets this automatically. The start command `next start` binds correctly when `PORT` is set.

For custom servers, bind to `0.0.0.0:$PORT` per Render requirements.

### Free tier notes

- Services spin down after inactivity (cold starts).
- Ephemeral filesystem — irrelevant for this app since data is in the user's browser.
- No persistent server storage needed.

---

## Docker (optional)

Example `Dockerfile` in `frontend/`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
```

Build and run:

```bash
cd frontend
docker build -t repertoirelab .
docker run -p 3000:3000 repertoirelab
```

---

## Static hosting limitations

A pure static export is **not currently supported** because:

- Dynamic routes (`/study/[id]`, `/training/[id]/session`) use Next.js dynamic segments
- The app relies on client-side hydration for all data

To support static hosting (GitHub Pages, S3), you would need:

1. `output: 'export'` in `next.config.ts`
2. `generateStaticParams` or query-string based routing instead of dynamic segments
3. A `basePath` if serving from a subpath (e.g. `username.github.io/chess`)

---

## Production checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Root directory set to `frontend` on hosting platform
- [ ] Node 20+ selected
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] Custom domain configured (optional)

---

## CDN & caching

Next.js handles static asset hashing. No special CDN configuration is required on Vercel or Render.

Client-side `localStorage` is unaffected by CDN caching.

---

## Monitoring

The default app has no server-side logging or analytics. Optional additions:

| Concern | Suggestion |
|---------|------------|
| Error tracking | Sentry (client-side SDK) |
| Analytics | Privacy-respecting analytics (Plausible, etc.) |
| Uptime | Host platform monitoring (Vercel/Render dashboards) |

---

## Security notes

- No secrets required for default deployment
- All data is client-local — no GDPR data processor concerns for user repertoires on your server
- Serve over HTTPS in production
- Content Security Policy can be added via Next.js headers if needed

---

## Related docs

- [Getting started](./getting-started.md) — local development
- [Development](./development.md) — build commands and testing
- [Data & storage](./data-and-storage.md) — what persists where
