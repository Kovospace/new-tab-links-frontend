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

| Variable                             | Default                      | What it does                                                                                                                                                                               |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEWTABLINKS_BACKEND_BASE_URL`       | `http://localhost:8080`      | Origin of the NewTabLinks backend, no trailing slash. **The visitor's browser resolves this**, so it must be a publicly reachable address — a cluster-internal service name will not work. |
| `NEWTABLINKS_WEB_CLIENT_DEVICE_NAME` | `NewTabLinks website`        | Label this site reports as the device name when it obtains tokens. Sent as `X-Device-Name`; the backend never trusts it and only uses it to name a row in the user's device list.          |
| `NEWTABLINKS_CHROME_WEB_STORE_URL`   | _(empty)_                    | Chrome Web Store listing linked from the download page. Empty shows "not published yet" instead of a dead link.                                                                            |
| `NEWTABLINKS_SELF_HOSTED_CRX_PATH`   | `/downloads/newtablinks.crx` | Path to the packaged extension this site hosts itself. Empty hides that offer.                                                                                                             |

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
