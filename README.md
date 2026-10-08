# new-tab-links-frontend

Webpage and portal for the NewTabLinks chrome extension.

## Getting started

```bash
npm install    # install dependencies
npm start      # dev server on http://localhost:5173
npm run build  # production build into dist/
npm test       # unit tests (vitest)
```

Requires Node `^22.12.0` (Angular 21 LTS).

The dev server runs on **5173**, not Angular's usual 4200, because the backend expects the
website there by default — both as an allowed CORS origin and as the base of the links it mails.

## Local development stack

`docker-compose.yml` runs everything this site talks to — PostgreSQL and the published backend
image — so developing the frontend needs no backend checkout, no Java and no local database.

```bash
docker compose up -d   # postgres + backend on http://localhost:8080
npm start              # this site, with reload, on http://localhost:5173
```

That is the whole setup. It needs no configuration because `ng serve` has no `config.json` and
falls back to the defaults, whose `backendBaseUrl` is `http://localhost:8080` — exactly where the
stack publishes the backend. The backend, in turn, already trusts `http://localhost:5173` as a
CORS origin and mails its links there.

The backend image comes from the private registry and is pulled, never built here:

```bash
docker compose pull backend       # take a newer backend
docker compose logs -f backend    # follow it
docker compose down               # stop; registered accounts survive
docker compose down -v            # stop and discard the database
```

### Registering, activating and resetting a password

There is no SMTP relay on a developer's machine, so the backend logs each message in full instead
of sending it, activation link included. That is what makes those three flows testable locally:

```bash
docker compose logs backend | grep -o 'http://localhost:5173/[a-z-]*?token=[A-Za-z0-9._-]*'
```

Paste the link into the browser. It already points at the dev server.

### Serving the production bundle instead

The `web` profile runs *this repository's* image — the real production build behind nginx — in
place of the dev server. Use it to check what the dev server cannot show: that the build works,
that `config.json` is written correctly, that nginx's SPA fallback catches `/activate?token=…`,
and that the caching and security headers are right.

```bash
docker compose --profile web up -d --build frontend
```

It publishes the same port **5173** as `npm start`, so the two are alternatives — stop the dev
server first. Both are origins the backend already trusts, so neither needs it reconfigured.

### Changing the defaults

Everything worth varying per machine is read from a gitignored `.env` beside the compose file:

| Variable | Default | What it does |
| --- | --- | --- |
| `BACKEND_IMAGE_TAG` | `latest` | Pins an older backend image when bisecting a regression |
| `BACKEND_PORT` | `8080` | Host port for the backend |
| `FRONTEND_PORT` | `5173` | Host port for the dev server *and* the `web` profile |
| `POSTGRES_PORT` | `5432` | Host port for the database. Change it if something already holds 5432 |
| `BACKEND_LOG_LEVEL` | `INFO` | `DEBUG` on the backend's own packages |

To run a backend you built yourself — an unreleased fix the registry does not have yet — tag it
under the registry's name and point `BACKEND_IMAGE_TAG` at it:

```bash
docker build -t registry.matejkovac.sk/apps/new-tab-links-backend:my-fix ../new-tab-links-backend
BACKEND_IMAGE_TAG=my-fix docker compose up -d backend
```

Changing `FRONTEND_PORT` also changes what the backend trusts and where it mails links, because
both are derived from it — but `npm start` has its own port in `angular.json`, so the two must be
changed together.

Backend variables that are **not** listed in the compose file go in an optional
`.env.backend.local`, which is gitignored. That is where the Google sign-in credentials belong,
without which the Google button has no provider behind it:

```dotenv
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=…
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=…
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_SCOPE=openid,email,profile
```

Register `http://localhost:8080/login/oauth2/code/google` as the redirect URI in the Google
console. These three cannot simply be declared empty in the compose file: Spring Boot refuses to
start when a declared client id is blank, which is why they live in a file that may be absent.

The `environment:` block in `docker-compose.yml` wins over `.env.backend.local`, so that file can
only add variables, not override the ones already set there.

## Developing against real backend data — mirrord

The compose stack above gives a working backend with an empty database, mail disabled and no
Google client. When you need the *deployed* backend's data, secrets and mail instead, run the
backend under mirrord — **not this repository**:

```bash
cd ~/IdeaProjects/new-tab-links-backend && mirrord exec -- ./mvnw spring-boot:run
npm start        # here, unchanged: the dev server still talks to localhost:8080
```

mirrord relocates a local *process* into the cluster, and the thing calling the API is the
browser, so there is nothing for this repository to do — that is the point. The one case where
it helps here is serving `ng serve` at `https://new-tab-links.matejkovac.sk` itself, for real
TLS, the real origin and testing from another device: `.mirrord/steal.json`, documented in
`.mirrord/README.md`. That one takes the deployed site offline while it runs.

One-time setup is in `kovostack-infra-gitops/docs/mirrord.md`.

## Running the container

```bash
docker build -t new-tab-links-frontend .

docker run --rm -p 8080:8080 \
  -e NEWTABLINKS_BACKEND_BASE_URL="https://api.newtablinks.example" \
  new-tab-links-frontend
```

The image serves the built site with nginx on port **8080**, as an unprivileged user, and answers
`/healthz` for readiness and liveness probes.

## Environment variables

The bundle is static JavaScript, so it cannot read the container's environment directly — by the
time it runs it is in the visitor's browser. Instead the container's entrypoint writes these
values into `config.json` at start-up, and the application fetches that file before it boots.

**One image is built once and promoted through every environment**; only these variables differ
between them. None of them is a secret — every value is served to the visitor's browser in plain
text, so nothing sensitive may be put here.

That includes `NEWTABLINKS_FRONTEND_API_KEY`, despite the name. It is written into `config.json`,
which any visitor can fetch, and it travels on a request their browser makes, so anyone who looks
can read it and call the endpoint themselves. It raises the cost of casually scripted username
enumeration; it does not prevent it, and nothing that matters may be gated on it.

What does bound that enumeration is the **visitor token**: the backend meters both endpoints that
disclose whether a username is registered — the lookup and registration itself, whose 409 answers
the same question — and this site obtains a pass on demand, paces itself against the limits the
backend reports, and replaces a spent pass once. The limits live on the backend
(`VISITOR_TOKEN_*`); nothing about them is configured here except the debounce above, which has to
stay on the right side of the backend's minimum interval. See the `authentication-flows` skill.

| Variable                             | Default                      | What it does                                                                                                                                                                               |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEWTABLINKS_BACKEND_BASE_URL`       | `http://localhost:8080`      | Origin of the NewTabLinks backend, no trailing slash. **The visitor's browser resolves this**, so it must be a publicly reachable address — a cluster-internal service name will not work. |
| `NEWTABLINKS_WEB_CLIENT_DEVICE_NAME` | `NewTabLinks website`        | Label this site reports as the device name when it obtains tokens. Sent as `X-Device-Name`; the backend never trusts it and only uses it to name a row in the user's device list.          |
| `NEWTABLINKS_FRONTEND_API_KEY`       | _(empty)_                    | Shared key admitting this site to the backend's username-existence check, which the registration form makes while someone types. Must equal the backend's `FRONTEND_API_KEY` exactly; empty means the check never runs. Readable by anyone — see below.       |
| `NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS` | `250`                    | How long typing has to stop before the registration form looks a username up. Must stay **above** the backend's `VISITOR_TOKEN_MINIMUM_REQUEST_INTERVAL` (200ms), or real typing is answered with 429. Must be a whole number of milliseconds; anything else is refused at start-up and 250 is used. |
| `NEWTABLINKS_CHROME_WEB_STORE_URL`   | _(empty)_                    | Chrome Web Store listing linked from the download page. Empty shows "not published yet" instead of a dead link.                                                                            |

Every variable is optional. A container started with none of them behaves exactly like a
developer's machine, and so does `npm start` — the dev server has no `config.json` and falls back
to the same defaults.

To check what a running container resolved:

```bash
curl -s http://localhost:8080/config.json
```

### Adding a variable

Three files have to agree, or the new value silently falls back to its default:

1. `src/app/core/config/runtime-configuration.ts` — the interface and the defaults
2. `docker/entrypoint/40-write-runtime-config.sh` — the value written into `config.json`
3. `Dockerfile` — the `ENV` block, so `docker inspect` shows what the image understands

## Deployment

Built and shipped by the shared Kovospace pipeline (`.github/workflows/docker-build.yml`), which
pushes the image and commits its tag to the GitOps repository; Argo CD rolls it out.

The deployment must set `healthPath: /healthz` — the Helm chart renders probes only when it is
set, and leaves the pod unprobed otherwise.

## Further reading

`CLAUDE.md` covers the stack, architecture and project rules, and points at the skills in
`.claude/skills/` for authentication, deployment and cross-repository work.
