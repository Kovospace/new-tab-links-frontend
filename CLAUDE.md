# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this project is

Angular web application for **NewTabLinks** — the presentation site and portal for the
`NewTabGroupedLinks` Chrome extension (a new tab page with grouped links).

It also hosts the functionality deliberately kept **out** of the extension, for design and
maintainability reasons. It is a consumer of the backend API, never a second source of truth.

**Status: the site is built and shippable.** Home, download, register, login, activation,
password reset, the Google OAuth callback, the device list with the extension pairing code, the
account page, the compliance pages and a sitemap are all implemented against the real backend
contract, in English and Slovak. It ships as a container built by the shared pipeline. Verified
2026-08-24: `ng build` clean, 50 tests passing, and the image built and exercised in a running
container.

**The visual identity is the owner's, and it is being written by hand, page by page.** Some of the
site is now styled — the header and its mobile menu, the tables, the form controls, the admin
modals, `src/styles.scss` — and the rest is not. Style a component only when asked to.

**A class exists when a rule uses it.** The site was built with every class shipped as an empty
placeholder rule; those were removed on 2026-09-03, along with the class attributes that named
them. So a component's `.scss` holds only rules that declare something, and a template carries
only classes that are used — by a rule, by a spec, or by TypeScript. Adding a style means adding
both the rule and the class; removing the last declaration means removing both again. Never
re-introduce an empty rule as a hook for later.

Every component still has its own `.scss` wired up through `styleUrl`, most now holding nothing
but the file's header comment. That is deliberate: the file is there to write into.

What is deliberately absent: anything that belongs to the extension rather than the portal —
the environment/group/subgroup/link CRUD and the sync snapshot are not consumed here.

## How work arrives

Tasks come as assignment files in `.claude/assignments/*.md`. Each one is a numbered increment;
later assignments extend what earlier ones built. Read the referenced assignment in full before
starting, and do only what it asks — assignments deliberately defer work to later ones.

## The developer agent

`.claude/agents/developer.md` is the working developer for this repo. Use it for implementation,
risk/impact analysis and effort estimates — and it is the counterpart the **backend** and
**extension** agents query about how their changes land here. It answers from the code, with
`path:line`, or says "no consumer exists yet".

Every sibling repo is reached the same way — a user-level agent in `~/.claude/agents/` that
points at that repo's own project-scoped agent file, because project-scoped agents are invisible
from here:

| Send it to | User-level agent | Points at |
|---|---|---|
| the backend | **`backend-developer`** | `new-tab-links-backend/.claude/agents/developer.md` |
| the extension | **`extension-developer`** | `NewTabGroupedLinks/.claude/agents/backend-sync.md` |
| the cluster | **`devops-engineer`** | `kovostack-infra-gitops/.claude/agents/devops-engineer.md` |

This repo has one too — **`frontend-developer`** — which is how the other three reach *you*. Each
resolves its own checkout and never edits the calling one. A newly added agent file is only
picked up by a **new** session.

## Sibling repositories

| Repo | Local path | Remote |
|---|---|---|
| Backend (Spring Boot) | `/home/kovo/IdeaProjects/new-tab-links-backend` | `Kovospace/new-tab-links-backend` |
| Chrome extension | `/home/kovo/IdeaProjects/NewTabGroupedLinks` | `K0V0/NewTabGroupedLinks` |
| GitOps (cluster state) | `/home/kovo/IdeaProjects/kovostack-infra-gitops` | `Kovospace/kovostack-infra-gitops` |
| Schema migrations (Flyway) | `/home/kovo/IdeaProjects/new-tab-links-migrations` | `Kovospace/new-tab-links-migrations` |

Details — ownership of each concern, the shared data model, how to ask and answer across repos —
live in the **`cross-project-contracts`** skill. Read those repos with `git -C <path> <cmd>`;
access is granted by `permissions.additionalDirectories` in the gitignored
`.claude/settings.local.json`.

**The GitOps repo is read-only from here.** `applications/new-tab-links-frontend/values.yaml` is
what a human edits — `host`, `healthPath`, resources and the `env:` block that becomes
`config.json` — while `versions/new-tab-links-frontend.yaml` carries the image tag CI writes.
Reading them beats guessing what a deployment sets. Never write to it: Argo CD reconciles its
`main` continuously with `prune` and `selfHeal`, so a push there is a production deployment with
no approval gate. Changes to it belong to **`devops-engineer`** (`~/.claude/agents/`), which asks
before every push to `main`. Hand it anything the cluster has to be told — a new environment
variable that needs a value, an image tag, a probe path, an init-container version — and say what
the value must be and why, because that agent knows Kubernetes, not this application.

**The database schema is not the backend's to generate.** `new-tab-links-migrations` owns it:
Flyway SQL shipped as an image that runs as an init container, and deployed backends run
`ddl-auto=validate` against what it produced. **A schema Hibernate generates for itself is not
equivalent** — it has no `ON DELETE` rules, where the migrated one cascades throughout — so a
claim about how the database behaves is only true if it was checked against `sql/`, not against a
`ddl-auto=update` dev database. This repo never touches it, but any reasoning here about what the
backend's storage does has to read it. Unlike the others it is **not** listed in this repo's
`additionalDirectories` (the backend's does list it) — so if a read of that path is refused from
here, that missing entry is why.

## Developing against real backend data

`docker-compose.yml` is the default loop and needs no secrets. When real data, real mail or the
real Google client is needed, the backend is run under **mirrord** — it inherits the deployed
Pod's Infisical environment, DNS and network — and this repo stays exactly as it is, pointing at
`http://localhost:8080`.

`.mirrord/steal.json` here is the one case that involves this repo: it serves `ng serve` at
`https://new-tab-links.matejkovac.sk`, for real TLS, the real origin and testing from another
device, at the cost of taking the deployed site offline while it runs. See `.mirrord/README.md`,
and `kovostack-infra-gitops/docs/mirrord.md` for the one-time setup. Nothing is installed in the
cluster and nothing about it is in the GitOps manifests.

## Tech stack

Decided (verified 2026-08-24):

| Concern | Choice |
|---|---|
| Framework | **Angular 21.2 LTS**, standalone components, signals, zoneless |
| Language | **TypeScript 5.9**, `strict` on |
| Styling | **SCSS**, one file per component, hand-written and partial (see above) |
| Routing | `@angular/router`, every route lazy |
| HTTP | `provideHttpClient` with one functional interceptor |
| i18n | Home-grown, JSON files in `public/i18n/`, English and Slovak |
| Build | `@angular/build:application` (esbuild) |
| Tests | **Vitest** via `ng test`, jsdom |
| Formatting | Prettier, 100 cols, single quotes (`.prettierrc`) |

**Node caveat — why Angular 21 and not 22.** Angular 22 requires Node `>=22.22.3`; this machine
has **v22.22.1** and the CLI hard-refuses. Angular 21.2 LTS accepts `^22.12.0`. Upgrading Node
past 22.22.3 unblocks `ng update` to 22; nothing else does.

**The dev server runs on 5173, not 4200.** The backend defaults to `http://localhost:5173` for
both its allowed CORS origins and the base URL of the links it mails. Changing one side requires
changing the other.

## Commands

```bash
npm install                # install dependencies
docker compose up -d       # postgres + the published backend image on :8080 (see README)
npm start                  # dev server on http://localhost:5173
npm run build              # production build into dist/
npx ng test --watch=false  # one-shot test run
./.claude/hooks/enforce-branch-policy.test.sh   # check the git hook still judges correctly

# the production bundle behind nginx instead of the dev server, same port
docker compose --profile web up -d --build frontend

# the shipped artefact, as the pipeline builds it
docker build -t new-tab-links-frontend:verify .
docker run --rm -p 8099:8080 \
  -e NEWTABLINKS_BACKEND_BASE_URL="https://api.newtablinks.example" \
  new-tab-links-frontend:verify
```

## Layout

```
Dockerfile                     multi-stage: node builds, unprivileged nginx serves
docker/nginx/                  server config: SPA fallback, caching, security headers
docker/entrypoint/             writes config.json from the container's environment
.github/workflows/             thin caller into the shared Kovospace pipeline
public/i18n/{en,sk}.json        every user-visible string; identical key sets
src/app/
├── app.ts | app.html | app.scss    the shell: header, router outlet, footer
├── app.config.ts                   providers; loads translations before the first render
├── app.routes.ts                   every route, all lazy
├── core/                           one instance of each, application-wide
│   ├── api/         backend client, endpoint paths, DTO mirrors, failure wording
│   ├── admin/       the operator's session, sign-in, account CRUD, route guard
│   ├── auth/        session store, sign-in service, interceptor, guards, storage
│   ├── i18n/        translation service, the impure translate pipe, dictionary helpers
│   ├── user/        account and device services
│   ├── password/    set, change and reset
│   ├── config/      the one file holding environment-dependent values
│   └── routing/     route paths, three of them pinned by backend configuration
├── shared/                         reused by features
│   ├── layout/      page header, page footer, language switcher
│   ├── forms/       form view-model base, validation wording, feedback component
│   └── formatting/  instant formatter
└── features/                       one folder per page: component + view-model + template + scss
    home · download · register · login · activate-account · reset-password
    oauth-callback · devices (+ extension-connect-panel) · account (+ three panels)
    legal (shared text page + sitemap) · not-found · admin (sign-in + account list)
```

## Configuration is resolved at container start

The bundle is static JavaScript, so it cannot read the container's environment — by the time it
runs it is in someone else's browser. One image is therefore built once and promoted through
every environment, and what differs arrives as environment variables that the entrypoint writes
into `config.json`, which `main.ts` fetches **before** Angular bootstraps.

Consume it by injecting `RUNTIME_CONFIGURATION` (`core/config/runtime-configuration.ts`). Never
add an environment-dependent value as a compiled-in constant.

Adding one means touching three files that must agree: the interface and defaults in
`runtime-configuration.ts`, the heredoc in `docker/entrypoint/40-write-runtime-config.sh`, and
the `ENV` block in the `Dockerfile`. Details, and what the GitOps values file must set, are in
the **`deployment-pipeline`** skill.

## Code standards

Full rules live in the **`angular-code-standards`** skill — load it before writing or reviewing
any TypeScript, template or SCSS. The short version:

- **MVVM, strictly**: every page is a thin component plus a `.view-model.ts` beside it. Templates
  bind finished text — no transformation, formatting or computation in a template.
- Every user-visible string is a key in `public/i18n/`; the two files' key sets must match.
- SOLID; short methods, small classes; split rather than grow.
- Long, descriptive names. Javadoc-style TSDoc on every class, method and non-trivial field.
- Standalone, signals, `inject()`, `OnPush`, lazy routes, no `any`.

## Authentication

Three sign-in paths, the Google redirect chain, the extension pairing code and why it lives on
the devices page, token storage, refresh-on-401, the three route paths the backend pins, and the
**visitor token** that meters registration and the username lookup: all in the
**`authentication-flows`** skill. Load it before touching `core/auth/`, any sign-in page, or the
devices page.

One thing worth knowing before you read it: `frontendApiKey` bounds nothing — it is public. The
visitor token is what limits username enumeration, and it is deliberately **not** per IP address,
because carrier-grade NAT puts whole neighbourhoods behind one.

**The operator is a third identity, and shares nothing with the other two.** `/admin` signs in
against `ADMIN_USERNAME` / `ADMIN_PASSWORD` on the backend and gets a short-lived admin token,
held in `core/admin/admin-session.store.ts` — a separate store, in `sessionStorage` rather than
`localStorage`, so it dies with the tab. Admin calls carry that token explicitly and tell the
interceptor to keep out; a user's token can never authorise one, and an admin token cannot act as
a user. `/admin` is linked from nowhere — not the header, not the sitemap — on purpose.

## Deployment

The Dockerfile, the nginx runtime, how environment variables reach the bundle, the shared
pipeline and what the GitOps values file must set: all in the **`deployment-pipeline`** skill.
Load it before touching `Dockerfile`, `docker/`, `.github/workflows/`, or `core/config/`.

Two things the deployment must get right: `healthPath: /healthz`, because the Helm chart renders
probes only when it is set, and `NEWTABLINKS_BACKEND_BASE_URL` pointing at the backend's
*public* address, because the visitor's browser is what resolves it.

## Git rules

- **Branches may only be created under `feature/**` or `bugfix/**`**, and a push may only target
  such a branch. `main` is reached through a pull request, never directly.
- A `PreToolUse` hook (`.claude/hooks/enforce-branch-policy.sh`) enforces both, in this repo and
  in the sibling repos reached through `git -C`. It is a backstop, not permission to try.
  `./.claude/hooks/enforce-branch-policy.test.sh` checks it after any edit.
- Cross-repo work uses the **same branch name in every repo it touches**.
- Commit only when the user asks; confirm the current branch first.
- `gh` is installed and authenticated as **K0V0** over SSH, so a PR can be opened directly.
  Opening one is still the user's call to make, like any push.

## Claude config in this repo

```
.claude/
├── agents/developer.md                    the frontend developer agent
├── skills/angular-code-standards/         coding rules
├── skills/authentication-flows/           identity, sessions, the pairing code
├── skills/deployment-pipeline/            image, nginx, runtime config, CI/CD
├── skills/cross-project-contracts/        cross-repo knowledge
├── hooks/enforce-branch-policy.sh         PreToolUse guard on branch creation and push
├── hooks/enforce-branch-policy.test.sh    its own test suite
├── settings.json                          registers the hook
├── settings.local.json                    read access to sibling repos (gitignored)
└── assignments/                           incoming work
```

Knowledge that is bulky or only needed sometimes belongs in a **skill**, not in this file — this
file is loaded into every session and stays lean on purpose. Non-obvious constraints and hard-won
debugging results belong in memory or a skill, and should be recorded when found.
