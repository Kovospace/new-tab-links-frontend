# Code map

Where things are, so that nobody lists the source tree to find out. Paths are relative to
`src/app/`; a spec sits beside the file it covers. Every page is
`features/<page>/<page>-page.{ts,html,scss,view-model.ts}`.
Keep it current: a new folder under `core/` or `shared/`, or a new concern, adds a row here.

## Where to look for…

| Concern | File |
|---|---|
| Every backend path this site calls | `core/api/api-endpoint-paths.ts` |
| The HTTP client — every backend call | `core/api/backend-api.client.ts` |
| Mirrors of the backend's DTOs | `core/api/models/*.model.ts` |
| Backend error → user-facing wording | `core/api/backend-failure.translator.ts` |
| Attaching the token, refresh-on-401 | `core/auth/authentication.interceptor.ts` |
| The signed-in session and where it is stored | `core/auth/authentication-session.store.ts`, `core/auth/session-storage.service.ts` |
| Sign-in, sign-out, Google handoff redemption | `core/auth/authentication.service.ts` |
| Route guards | `core/auth/authentication.guards.ts`, `core/admin/admin.guard.ts` |
| Visitor token, username lookup | `core/auth/visitor-token.service.ts`, `core/auth/username-existence.service.ts` |
| Operator (admin) session and calls | `core/admin/*` |
| Account and devices | `core/user/user-account.service.ts`, `core/user/user-device.service.ts` |
| Password set, change, reset | `core/password/password.service.ts` |
| Billing — checkout (`POST /api/v1/payments/checkouts`) and the subscription | `core/billing/premium-checkout.service.ts`, `core/billing/subscription.service.ts`, `core/api/models/subscription.model.ts` |
| Account page panels (profile, password, premium, cancel, refund, delete) | `features/account/*-panel/` |
| Return from the payment provider; waits for the webhook to make the account premium | `features/purchase-thank-you/` (path pinned by the backend's `checkout.success-path`) |
| Extension pairing code | `features/devices/extension-connect-panel/` |
| Route paths (three pinned by the backend) | `core/routing/application-route-paths.ts`, wired in `app.routes.ts` |
| Environment-dependent values | `core/config/runtime-configuration.ts` (+ `docker/entrypoint/40-write-runtime-config.sh`, `Dockerfile`) |
| Translation | `core/i18n/translation.service.ts`, pipes beside it; strings in `public/i18n/{en,sk}.json` |
| Form view-model base, validation wording | `shared/forms/` |
| Header, footer, language switcher, back button | `shared/layout/*` |
| Providers, translations loaded before first render | `app.config.ts` |
| nginx, caching, security headers | `docker/nginx/` |

## Files big enough to read by range

`grep -n` for the method first, then `sed -n 'a,bp'` around it:
`features/admin/admin-users-page.view-model.ts` (396), `features/register/register-page.view-model.ts`
(351), `features/devices/devices-page.view-model.ts` (283), `public/i18n/*.json` (search the key,
never read the whole file).

## CLAUDE.md, by section

In this repo `CLAUDE.md` is already loaded. An agent reaching it from elsewhere reads only the
section it needs — `grep -n '^##' CLAUDE.md` gives the line numbers:

| Section | Needed for |
|---|---|
| What this project is | styling rules — what may and may not be styled |
| Sibling repositories, Developing against real backend data | cross-repo questions, mirrord |
| Configuration is resolved at container start | a new environment-dependent value |
| Code standards | before writing code (then the skill) |
| Authentication | anything signed-in, the admin identity |
| Git rules | before any branch, commit or push |

## Skills — read the file, only when the topic matches

| Skill | When |
|---|---|
| `.claude/skills/angular-code-standards/SKILL.md` | before writing or reviewing TypeScript, templates or SCSS |
| `.claude/skills/authentication-flows/SKILL.md` | `core/auth/`, a sign-in page, the devices page |
| `.claude/skills/deployment-pipeline/SKILL.md` | `Dockerfile`, `docker/`, `.github/workflows/`, `core/config/` |
| `.claude/skills/cross-project-contracts/SKILL.md` | a question that crosses into the backend or the extension |
