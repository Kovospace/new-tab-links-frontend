# Code map

Where things are, so that nobody lists the source tree to find out. Paths are relative to
`src/app/`; a spec mirrors the path of the file it covers under `tests/` —
`src/app/core/auth/x.ts` is tested by `tests/app/core/auth/x.spec.ts`. Every page is
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
| Admin statistics page: new tabs and website visitors per month, inline SVG bars (`GET /api/v1/admin/metrics`) | `features/admin/admin-metrics-page*`, `core/admin/admin-usage-metrics.service.ts`, `core/api/models/usage-metric.model.ts` |
| Website visit counting — once per UTC day per browser (date in `localStorage`), only after 3 s visible + an interaction, never automated browsers or `/admin` | `core/statistics/website-visit-reporter.service.ts`, started in `app.config.ts` |
| Account and devices | `core/user/user-account.service.ts`, `core/user/user-device.service.ts` |
| Password set, change, reset | `core/password/password.service.ts` |
| Billing — checkout (`POST /api/v1/payments/checkouts`) and the subscription | `core/billing/premium-checkout.service.ts`, `core/billing/subscription.service.ts`, `core/api/models/subscription.model.ts` |
| Prices and currency — offers per currency read from Creem by the backend (`GET /api/v1/payments/offers`, suggested currency from Cloudflare's country), the site-wide chosen currency (`localStorage`), the `<select>` in the header and the premium form; no currency is listed in frontend code | `core/billing/premium-pricing.store.ts`, `core/api/models/premium-offer.model.ts`, `shared/billing/currency-switcher/`, `shared/formatting/price-formatter.ts` |
| Account page panels (profile, password, premium, cancel, refund, delete) | `features/account/*-panel/` |
| Tips: markdown per language, rendered in the browser | `public/content/tips/<lang>/<slug>.md`; `core/tips/` (fetch with English fallback, `marked` renderer resolving relative image and tip links); `features/tips/` (list + one tip) |
| Home page selling points: one numbered markdown file per point and language, written like a tip, `#` rendered as `<h2>`; images in `public/images/<lang>/home-features/<slug>/` | `public/content/home-features/<lang>/<n>-<slug>.md`; `core/home-features/`; index built by `scripts/build-home-features-index.mjs` (`prestart`/`prebuild`, output gitignored) |
| Legal documents (privacy, terms, refunds, cookies): markdown per language with `{placeholders}`; operator details and the support email written once | `public/content/legal/<lang>/<name>.md`; `core/legal/legal-operator.ts`, `core/legal/legal-documents.service.ts`; `features/legal/legal-text-page*`; the "by submitting you agree" line is `shared/legal/legal-consent-notice/` |
| Shared markdown plumbing for tips and home points: fetch with English fallback, `marked` renderer | `core/content/localized-markdown.service.ts`, `core/content/site-markdown-renderer.ts` |
| Tips index (a static site cannot list a folder) | `scripts/build-tips-index.mjs`, run by `prestart`/`prebuild`; output gitignored |
| Home page demo slideshow: numbered screenshots in `public/images/<lang>/demo/` as `<n>_1x/_2x/_3x.webp` (1280x800 and its 2x, 3x; `image-maintainer` derives them from a `_3x.png`), served as a width `srcset`; 5 s per slide; dots sized from the frame's width | `features/home/demo-slideshow/`; `core/demo/demo-slides.service.ts`; index built by `scripts/build-demo-index.mjs` (`prestart`/`prebuild`, output gitignored) |
| Return from the payment provider; waits for the webhook to make the account premium | `features/purchase-thank-you/` (path pinned by the backend's `checkout.success-path`) |
| Extension pairing code | `features/devices/extension-connect-panel/` |
| Route paths (three pinned by the backend) | `core/routing/application-route-paths.ts`, wired in `app.routes.ts` |
| Environment-dependent values | `core/config/runtime-configuration.ts` (+ `docker/entrypoint/40-write-runtime-config.sh`, `Dockerfile`) |
| Translation | `core/i18n/translation.service.ts`, pipes beside it; strings in `public/i18n/{en,sk}.json` |
| Form view-model base, validation wording | `shared/forms/` |
| Header, footer, language switcher, back button | `shared/layout/*` |
| Providers, translations loaded before first render | `app.config.ts` |
| nginx, caching, security headers | `docker/nginx/` |
| Search engines and link previews: the public origin and indexable route paths (JSON so the build script reads it too), `robots.txt` and `sitemap.xml` generated at build (output gitignored), the site-wide OG tags and share image | `core/seo/public-site.{json,ts}`; `scripts/build-crawler-files.mjs`; `src/index.html`; `public/images/share/` |
| Per-page title, description, canonical link, `noindex`, `<html lang>`: declared on each route with `pageMetadataFor` (indexability looked up from `public-site.json`), strings under `seo.*`; a tip titles itself from its heading | `core/seo/page-metadata*.ts`, `core/seo/document-head.writer.ts`; `core/tips/tip-page-description.ts` |
| Language in the address: public pages (the indexable ones) exist once per language — English bare (`/tips`), others prefixed (`/sk/tips`); the address decides the language, a stored/browser preference only redirects from an English address; other pages have one address. Links to public pages go through `LocalizedRouteLinks`, never `APPLICATION_ROUTE_LINKS` directly; the switcher goes through `LanguageSwitchService` | `app.routes.ts` (`localizedPagesFor`); `core/i18n/localized-address.ts`, `core/i18n/address-language.guard.ts`, `core/i18n/language-switch.service.ts`; `core/routing/localized-route-links.ts` |
| Rendering at build time: which routes are pre-rendered (every public page × language, every tip) and which are browser-only; the server bootstrap; backend calls refused while rendering; nginx serving `<path>/index.html`, `index.csr.html` for browser-only routes and real 404s | `app.routes.server.ts`, `app.config.server.ts`, `src/main.server.ts`; `core/rendering/backend-free-prerendering.interceptor.ts`; `docker/nginx/default.conf` (`location /` and the browser-only regex) |
| Ad slot the extension frames (static, not a route; posts `tabilinks-ad-slot-ready`) | `public/slot/workspace-footer.html`; its frameable headers in `docker/nginx/default.conf` (`location ^~ /slot/`) |

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
