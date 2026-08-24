# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this project is

Angular web application for **NewTabLinks** — the presentation site and portal for the
`NewTabGroupedLinks` Chrome extension (a new tab page with grouped links).

It also hosts the functionality deliberately kept **out** of the extension, for design and
maintainability reasons. It is a consumer of the backend API, never a second source of truth.

**Status: skeleton.** Angular is installed and a single hello-world page renders
(`src/app/app.html`). There is no routing target, no HTTP client, no backend integration and no
feature code yet — those arrive in later assignments. Verify with `ls`/`glob` before referring
to any component, service or route.

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
live in the **`cross-project-contracts`** skill. Load it before any cross-repo question instead
of guessing. Read those repos with `git -C <path> <cmd>`; access is granted by
`permissions.additionalDirectories` in the gitignored `.claude/settings.local.json`.

## Tech stack

Decided (verified 2026-08-24):

| Concern | Choice |
|---|---|
| Framework | **Angular 21.2 LTS**, standalone components, signals |
| Language | **TypeScript 5.9**, `strict` on |
| Styling | **SCSS** |
| Routing | `@angular/router`, configured in `src/app/app.routes.ts` (currently empty) |
| Build | `@angular/build:application` (esbuild) |
| Tests | **Vitest** via `ng test` (Angular 21 default), jsdom |
| Formatting | Prettier, 100 cols, single quotes (`.prettierrc`) |
| Package manager | npm |

**Node caveat — why 21 and not 22.** Angular 22.1.5 is the current latest but requires Node
`>=22.22.3`; this machine has **Node v22.22.1**, and the CLI hard-refuses to run. Angular 21.2
LTS accepts `^22.12.0` and is what is installed. Upgrading Node past 22.22.3 unlocks
`ng update` to Angular 22 — nothing else blocks it.

## Commands

```bash
npm install                # install dependencies
npm start                  # ng serve, dev server on http://localhost:4200
npm run build              # production build into dist/
npm test                   # ng test (vitest); add -- --watch=false for one-shot
npx ng test --watch=false  # one-shot test run, what CI-style checks should use
```

Both `npm run build` and the test run were verified green on 2026-08-24.

## Layout

```
src/
├── index.html          page shell, <app-root>
├── main.ts             bootstrapApplication(App, appConfig)
├── styles.scss         global styles only
└── app/
    ├── app.ts          root component (hello-world placeholder)
    ├── app.html        the placeholder page + <router-outlet />
    ├── app.scss        root component styles
    ├── app.config.ts   providers (router, global error listeners)
    ├── app.routes.ts   route table — empty
    └── app.spec.ts     root component spec
public/                 static assets copied verbatim into the build
```

## Code standards

Full rules live in the **`angular-code-standards`** skill — load it before writing or reviewing
any TypeScript, template or SCSS. The short version:

- **MVVM, strictly**: templates bind presentation-ready values only. No data transformation,
  formatting or computation in a template — that belongs in the view-model.
- SOLID; short methods, small classes; extract into reusable services/util classes rather than
  growing a class.
- Long, descriptive names — a reader should guess the purpose from the name alone.
- Javadoc-style TSDoc on every class, method and non-trivial field.
- Standalone components, signals, `inject()`, `OnPush`, lazy routes, no `any`.

## Git rules

- **Never push to `main`/`master`** — here or in the sibling repos. Push only to `feature/**` or
  `bugfix/**` and open a PR. A `PreToolUse` hook (`.claude/hooks/block-push-to-main.sh`)
  enforces this; it is a backstop, not permission to try.
- Cross-repo work uses the **same branch name in every repo it touches**.
- Commit only when the user asks; confirm the current branch first.
- `gh` is not installed — hand the user a GitHub compare URL instead of opening a PR directly.

## Claude config in this repo

```
.claude/
├── agents/developer.md               the frontend developer agent
├── skills/angular-code-standards/    coding rules (loaded on demand)
├── skills/cross-project-contracts/   cross-repo knowledge (loaded on demand)
├── hooks/block-push-to-main.sh       PreToolUse guard on git push
├── settings.json                     registers the hook
├── settings.local.json               read access to sibling repos (gitignored)
└── assignments/                      incoming work
```

Knowledge that is bulky or only needed sometimes belongs in a **skill**, not in this file — this
file is loaded into every session and stays lean on purpose. Non-obvious constraints and
hard-won debugging results belong in memory or a skill, and should be recorded when found.
