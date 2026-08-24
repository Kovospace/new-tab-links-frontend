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

**The site is deliberately unstyled.** Every component ships its class selectors as empty SCSS
rules; the visual identity is the owner's to write by hand. Do not add styling unless asked.

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

## Sibling repositories

| Repo | Local path | Remote |
|---|---|---|
| Backend (Spring Boot) | `/home/kovo/IdeaProjects/new-tab-links-backend` | `Kovospace/new-tab-links-backend` |
| Chrome extension | `/home/kovo/IdeaProjects/NewTabGroupedLinks` | `K0V0/NewTabGroupedLinks` |

Details — ownership of each concern, the shared data model, how to ask and answer across repos —
live in the **`cross-project-contracts`** skill. Read those repos with `git -C <path> <cmd>`;
access is granted by `permissions.additionalDirectories` in the gitignored
`.claude/settings.local.json`.

## Tech stack

Decided (verified 2026-08-24):

| Concern | Choice |
|---|---|
| Framework | **Angular 21.2 LTS**, standalone components, signals, zoneless |
| Language | **TypeScript 5.9**, `strict` on |
| Styling | **SCSS**, deliberately empty (see above) |
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
npm start                  # dev server on http://localhost:5173
npm run build              # production build into dist/
npx ng test --watch=false  # one-shot test run
./.claude/hooks/enforce-branch-policy.test.sh   # check the git hook still judges correctly

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
    legal (shared text page + sitemap) · not-found
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
the devices page, token storage, refresh-on-401, and the three route paths the backend pins:
all in the **`authentication-flows`** skill. Load it before touching `core/auth/`, any sign-in
page, or the devices page.

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
- `gh` is not installed — hand the user a GitHub compare URL instead of opening a PR directly.

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
