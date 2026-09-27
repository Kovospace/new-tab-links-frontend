---
name: deployment-pipeline
description: How this frontend is built, shipped and deployed - the multi-stage Dockerfile, the nginx runtime, how environment variables reach a static Angular bundle through config.json, the shared GitHub Actions pipeline in Kovospace/kovostack-github-workflows, and what the GitOps values file has to set. Load before touching the Dockerfile, docker/, .github/workflows, or anything about how a change reaches the cluster.
---

# Deployment pipeline — NewTabLinks frontend

Verified end to end on 2026-08-24 by building the image and running it: `docker build`, then a
container exercised with curl and headless Chrome.

## The shape of it

```
this repo
 └── .github/workflows/docker-build.yml   (thin caller, workflow_dispatch)
        │ uses:
        ▼
 Kovospace/kovostack-github-workflows@2.0.2
 └── .github/workflows/build-deploy.yml   (on: workflow_call — the real pipeline)
        │ 1. docker build . -> push
        ▼
 registry.matejkovac.sk/apps/new-tab-links-frontend:sha-<7 char sha> (+ :latest)
        │ 2. writes imageTag into
        ▼
 Kovospace/kovostack-infra-gitops
 └── versions/new-tab-links-frontend.yaml  -> `imageTag: sha-abc1234`
        │ Argo CD reconciles
        ▼
 Kubernetes namespace new-tab-links-frontend
```

**CI never talks to the cluster.** It builds, pushes, and commits a tag. Argo CD rolls it out.
This mirrors the backend exactly; only `image_name` and `app_namespace` differ.

## How environment variables reach a static Angular bundle

This is the part that has no equivalent on the backend, and the part most likely to be
"simplified" into something wrong.

An Angular production build is static JavaScript. By the time it runs it is in a browser on
someone else's machine, so it can never read the container's environment. Baking values in at
build time would mean a separate image per environment — which defeats promoting one tested
artefact from staging to production.

So the values are written at **container start** and fetched **before Angular boots**:

```
docker run -e NEWTABLINKS_BACKEND_BASE_URL=https://api.example
        │
        ▼  /docker-entrypoint.d/40-write-runtime-config.sh   (runs before nginx starts)
   /var/www/runtime-config/config.json
        │  nginx aliases it onto /config.json, Cache-Control: no-store
        ▼
   main.ts: await loadRuntimeConfiguration()   → then bootstrapApplication(...)
        │  value provided as RUNTIME_CONFIGURATION
        ▼
   BackendApiClient, DownloadPageViewModel, …
```

| Environment variable | Lands in | Default |
|---|---|---|
| `NEWTABLINKS_BACKEND_BASE_URL` | `backendBaseUrl` | `http://localhost:8080` |
| `NEWTABLINKS_WEB_CLIENT_DEVICE_NAME` | `webClientDeviceName` | `NewTabLinks website` |
| `NEWTABLINKS_FRONTEND_API_KEY` | `frontendApiKey` | empty (username check never runs) |
| `NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS` | `usernameCheckDebounceMilliseconds` | `250` |
| `NEWTABLINKS_CHROME_WEB_STORE_URL` | `extensionDownload.chromeWebStoreUrl` | empty (offer hidden) |
| `NEWTABLINKS_SELF_HOSTED_CRX_PATH` | `extensionDownload.selfHostedCrxPath` | `/downloads/newtablinks.crx` |

Rules that hold this together:

- **Adding a value means touching three files**, and all three must agree: the interface and its
  defaults in `src/app/core/config/runtime-configuration.ts`, the heredoc in
  `docker/entrypoint/40-write-runtime-config.sh`, and the `ENV` block in the `Dockerfile`.
- **Defaults are duplicated on purpose** — once in TypeScript, once in the shell script. They must
  match. The TypeScript ones make `ng serve` and the unit tests work with no file at all; the
  shell ones make a container started with no environment behave the same way.
- **`usernameCheckDebounceMilliseconds` is written into `config.json` as a JSON number**, not a
  string, so a non-numeric value would produce a file the browser cannot parse — and the loader
  answers unparseable JSON by falling back to *every* default, backend URL included. The
  entrypoint therefore refuses anything that is not a run of digits and warns instead. It also has
  to stay above the backend's `VISITOR_TOKEN_MINIMUM_REQUEST_INTERVAL`, or real typing is answered
  with 429; see the `authentication-flows` skill.
- **`config.json` must never be cached.** It is the one file whose contents differ between
  deployments of the same image; a stale copy points the browser at the wrong backend.
- **Nothing secret may go in here.** Every value is served to the visitor's browser in plain text.
  `frontendApiKey` is not an exception to that rule — it is a public value that happens to be
  called a key. It must equal the backend's `FRONTEND_API_KEY`, which the GitOps values file has
  to set on both workloads; an empty one silently disables the registration form's
  username-existence check rather than breaking anything.
- **`backendBaseUrl` is resolved by the visitor's browser**, not by the pod — a cluster-internal
  service name will not work.
- A missing or unparseable `config.json` falls back to the defaults rather than failing to start.
  That is deliberate (`runtime-configuration.loader.spec.ts` covers it): a blank page would be a
  worse failure than a wrong backend URL, which is at least visible and diagnosable.

## The image

Multi-stage: `node:22.22.1-alpine` builds, `nginxinc/nginx-unprivileged:1.29-alpine` serves.

- **The unprivileged nginx variant runs as uid 101 and listens on 8080 by default**, which is
  exactly what the deployment needs — no root in the container, and the Helm chart's
  `containerPort` default is 8080 too.
- **The document root stays root-owned and read-only to the server.** The entrypoint writes into
  `/var/www/runtime-config/` instead, and nginx maps that onto `/config.json` with `alias`.
  Making `/usr/share/nginx/html` writable by the serving process would be the easy way and is
  worth not doing.
- **`package-lock.json` is committed and the build stage is a plain `npm ci`** - a missing
  lockfile has to fail the build. It was gitignored until 2026-09-15, with the build falling back
  to `npm install` when absent, and that fallback is what broke CI: **npm 10.9.4 - the version
  inside the pinned `node:22.22.1-alpine` image - crashes with `Cannot read properties of null
  (reading 'edgesOut')`** resolving this graph from scratch, in `arborist`'s `#loadPeerSet` while
  building vitest's peer set. Reproduce it with
  `docker run --rm -v "$PWD":/s -w /s node:22.22.1-alpine sh -c 'npm install'` in a directory
  holding only `package.json`. `npm ci` on the committed lockfile installs cleanly, because it
  never runs that resolution. Two non-fixes: npm 12 refuses to install on this Node
  (it wants `^22.22.2`), and npm 11 resolves the graph but no longer runs install scripts by
  default, which silently changes what the native dependencies (`lmdb`, `@parcel/watcher`,
  `esbuild`) end up as.
- **Regenerate the lockfile with npm 9.2.0** - the version this machine has, and the one in
  `packageManager`. The committed lockfile was produced by it (`lockfileVersion` 3) and npm 10.9.4
  reads it without complaint; regenerating it *inside* the build image is not possible, because
  that is the very resolution that crashes.
- **`scripts/` is excluded by `.dockerignore`, except `scripts/build-tips-index.mjs`.** `npm run
  build` runs it first (the `prebuild` hook) to list the tips' markdown into
  `public/content/tips/index.json`, so the Dockerfile copies `scripts/` and the ignore file lets
  that one script through. Excluding it again fails the image build at `COPY scripts`.
- **Tips' markdown is served from `/content/`, not `/tips/`.** `/tips` is a client-side route, and
  a folder of the same name would be caught by the SPA fallback's `$uri/` before `index.html`.
  `/content/` is `no-cache` like `/i18n/`, and serves `.md` as `text/markdown; charset=utf-8`.
- **`COPY --chmod` is not used** — it requires BuildKit. The shared pipeline builds with buildx,
  but a plain `docker build` has to work too, so the mode is set with an explicit `RUN chmod`
  inside a short `USER root` block.

## Two nginx traps already hit here

- **`add_header` is replaced, not merged.** A location block that declares any `add_header` of its
  own discards every inherited one — so the security headers would silently vanish from exactly
  the responses that set `Cache-Control`. They live in `docker/nginx/security-headers.conf` and
  are `include`d into every location that adds a header of its own. Verified by curling each
  location and checking the headers survive.
- **The SPA fallback is load-bearing for the mailed links.** `/activate?token=…`,
  `/reset-password?token=…` and `/auth/callback?code=…` are client-side routes with no file
  behind them; without `try_files $uri $uri/ /index.html` every activation mail leads to a 404.

## What the GitOps values file must set

`applications/new-tab-links-frontend/values.yaml` in the infra repo:

- **`healthPath: /healthz`.** The chart renders probes **only** when `healthPath` is set — an
  unset one disables both readiness and liveness rather than defaulting to `/`. nginx answers
  `/healthz` with a plain `200 ok`.
- **`containerPort: 8080`** (the chart's default, so it can be left alone).
- **`env`** carrying at least `NEWTABLINKS_BACKEND_BASE_URL`, pointing at the backend's
  *public* address. None of this image's variables is secret, so none of them belongs in
  Infisical.

## Local verification recipe

```bash
docker build -t new-tab-links-frontend:verify .

docker run --rm -p 8099:8080 \
  -e NEWTABLINKS_BACKEND_BASE_URL="https://api.newtablinks.example" \
  new-tab-links-frontend:verify

curl -s localhost:8099/config.json          # what the entrypoint wrote
curl -s localhost:8099/healthz              # what the probes will hit
curl -s -o /dev/null -w '%{http_code}\n' localhost:8099/auth/callback   # SPA fallback -> 200
curl -sD - -o /dev/null localhost:8099/i18n/en.json | grep -i cache     # no-cache

# does the browser really use the configured backend? point it at a stub that
# logs requests, then load a page that calls the backend on open:
google-chrome --headless --disable-gpu --no-sandbox --virtual-time-budget=12000 \
  --dump-dom "http://localhost:8099/activate?token=x"
```
