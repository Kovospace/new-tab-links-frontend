---
name: cross-project-contracts
description: How this frontend relates to the NewTabLinks backend and the NewTabGroupedLinks Chrome extension - repo locations, ownership of each concern, the shared data model, and how to answer or raise a cross-repo question. Load before analysing or answering anything that crosses repository boundaries.
---

# Cross-project contracts — NewTabLinks

Three repositories make up the product. This one is the **frontend/portal**.

| Repo | Local path | Remote | Role |
|---|---|---|---|
| Frontend (this) | `/home/kovo/IdeaProjects/new-tab-links-frontend` | `Kovospace/new-tab-links-frontend` | Angular portal: presentation, hosting, everything deliberately kept out of the extension |
| Backend | `/home/kovo/IdeaProjects/new-tab-links-backend` | `Kovospace/new-tab-links-backend` | Spring Boot service: storage, sync, auth |
| Extension | `/home/kovo/IdeaProjects/NewTabGroupedLinks` | `K0V0/NewTabGroupedLinks` | The product itself: Chrome MV3 new-tab page |

Note the owner mismatch — the extension is under **K0V0**, the other two under **Kovospace**.
All three remotes are SSH; `~/.ssh/id_ed25519` authenticates for all of them.

Read the sibling repos with `git -C <path> <cmd>` and plain file reads rather than `cd`.
Read access is granted through `permissions.additionalDirectories` in the gitignored
`.claude/settings.local.json`; if a read is refused, that entry is missing.

## Who owns what

- **The backend owns the API contract.** Never assume an endpoint, field, status code or error
  shape — read `/home/kovo/IdeaProjects/new-tab-links-backend` or its OpenAPI, or ask its
  `developer` agent. Every domain endpoint is bearer-token authenticated and identity comes only
  from the token; nothing accepts a caller-supplied owner id.
- **The extension owns the client data model and its own UX.** Its `CLAUDE.md` is authoritative.
  Its entities are flat `Record<string, T>` maps keyed by UUID —
  `environments`, `groups`, `subgroups`, `links` (`src/backend/entity/AppStateEntity.ts`).
  They carry `createdAt` and ordering fields but **no `updatedAt`, no revision, no delete
  tombstones** — that gap is the product's central sync design problem. Do not assume it away.
- **This repo consumes only the identity half of the backend so far**: `auth/*`, `auth/password/*`,
  `users/me` and `users/me/devices`. The domain CRUD (environments, groups, subgroups, links) and
  `sync/snapshot` belong to the extension and are deliberately not called here — say "no consumer
  exists yet" when asked about them, because that is the truth. The full list this site depends on
  is `src/app/core/api/api-endpoint-paths.ts`; read it before answering.
- **Two pieces of backend configuration pin this frontend** and cannot be changed one-sidedly:
  the three `newtablinks.web.*` paths that fix the `activate`, `reset-password` and `auth/callback`
  routes, and `http://localhost:5173`, which appears as both the allowed CORS origin and the
  website base URL. Details in the `authentication-flows` skill.
- **This repo owns the web presentation** and any feature moved out of the extension for
  maintainability. It is a *consumer* of the backend, never a second source of truth.

## Answering a question another repo asks

Both sibling repos have agents that will query this one (the backend's `developer`, the
extension's `backend-sync`). When answering:

- Answer from files you actually opened, with `path:line`. Never from memory or inference.
- "No consumer exists yet in this repo" is a correct, useful answer — give it when true instead
  of inventing coupling.
- Separate **breaking** from **additive**, and say what a *deployed* frontend build does against
  the changed backend, not only what the source in the working tree would do.
- Ask for what you need explicitly — field names, error shapes, status codes, CORS origins, auth
  scheme, versioning and deprecation window.
- Never answer *on behalf of* another repo. Route those questions to that repo's agent.

## Raising a question outward

- API/contract/sync/auth questions → the backend's `developer` agent.
- Extension behaviour, storage or data-model questions → the extension's `backend-sync` agent.
- Cross-repo work uses **the same branch name in every repo it touches**. Read the other repo's
  current branch first (`git -C <path> rev-parse --abbrev-ref HEAD`) and reuse it; if that repo
  is on `main`/`master`, ask rather than invent a name.
