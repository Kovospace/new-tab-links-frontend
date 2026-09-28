# Brief — new-tab-links-frontend: ad slot page, visitor signal, admin metrics

> **Status:** the extension side is merged (new-tab-links-extension PR #54). It already calls the
> endpoints below and frames the slot page; until they exist, the slot stays empty and new-tab
> counts wait in the browser (the last 7 days are kept). Start this repo's work on
> `feature/usage-stats-and-ad-slot`, created from `main`.

**Kind:** implementation. **Branch:** `feature/usage-stats-and-ad-slot` (same name in all four repos).
**Depends on:** the backend brief for parts 2 and 3; part 1 is independent.

## 1. Ad slot page — `https://tabilinks.app/slot/workspace-footer.html`

> **Done** on `feature/usage-stats-and-ad-slot`: `public/slot/workspace-footer.html`, and the
> `location ^~ /slot/` block in `docker/nginx/default.conf` (headers from
> `security-headers-shared.conf`, without `X-Frame-Options`). Headers verified from a running
> container; the cluster needs no change. **Parts 2 and 3** are implemented on `feature/usage-stats-admin-metrics`
> (the backend endpoints shipped in backend PR #27). Bot-user management was dropped by the user.

The extension's new tab page shows this in an iframe, at the foot of the workspace. It is what
lets the ad content change — our own promotion now, an ad network's snippet later — **without an
extension release**.

- A **static HTML file** (e.g. `public/slot/workspace-footer.html`), **not a route of the Angular
  app**: it loads with every new tab a user opens, so it must be tiny. Inline CSS, no framework.
- Size: fills the frame, which is **728 × 64 px**. Dark look matching the extension
  (background `#222`, text `#eee`, accent `#09F`).
- Content now: our own promotion — one line such as "Go premium: remove this and support
  development" linking to `https://tabilinks.app/account`. English and Slovak, chosen by `?lang=`
  (`en` default, `sk`).
- Every link opens in a new tab: `target="_blank" rel="noopener"`. The iframe is sandboxed with
  `allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox`, nothing else.
- Leave a clearly marked place where an ad network's snippet will go later (EthicalAds or Carbon,
  both of which allow our own promotion on the same page).
- **No analytics, no visitor signal, no cookies on this page** — it is not a website visit.
- **Once it has drawn its content, it must tell the extension:**
  `window.parent.postMessage('tabilinks-ad-slot-ready', '*')`. The extension keeps the iframe
  hidden until it receives exactly that string from the website's origin, so an offline browser
  shows an empty slot instead of Chrome's error page. Without this message the slot never
  appears. When an ad network's snippet replaces the promotion later, send it once the ad has
  rendered (or immediately, if the network gives no such event).

### Headers (this is what makes the iframe work)
For `/slot/*` only:
- `Content-Security-Policy: frame-ancestors chrome-extension:` (allow being framed by the extension;
  `'self'` too if convenient).
- **No** `X-Frame-Options: DENY/SAMEORIGIN` on these paths.
- `Cache-Control: public, max-age=300` — it is requested on every new tab.

If these headers are set in the cluster rather than in the image's web server config, that part
goes to `devops-engineer` (app `new-tab-links-frontend`), stating the exact header and path.

## 2. Human-visitor signal

Send `POST {apiBaseUrl}/api/v1/stats/website-visit` (empty body) **once per page load**, and only
when the visitor shows signs of being a person:
- the page has been **visible for ≥ 3 s** (use the Page Visibility API; time spent hidden doesn't
  count), **and**
- at least one of `pointermove`, `scroll`, `keydown`, `touchstart` has happened.

Use `navigator.sendBeacon` (or `fetch` with `keepalive`). Remove the listeners once sent. Never on
`/slot/*` or admin pages. No cookie, no localStorage — the backend dedupes per visitor per day.
Errors are ignored silently.

## 3. Admin: metrics page

A new admin page (next to the users page), behind the existing admin sign-in.
- **Two separate graphs**, never combined: **"New tabs opened"** (`metric=new_tabs`) and
  **"Website visitors"** (`metric=website_visitors`), each from
  `GET /api/v1/admin/metrics?metric=…&month=YYYY-MM` →
  `{ metric, month, days: [{ day, value }], total }` (every day of the month present, missing = 0).
- Each graph: daily bars for the month, the month total, a readable value on hover.
- Month navigation (previous / next, default current month), shared by both graphs.
- Inline SVG is enough — do not add a chart library unless the project already has one.
- Follow the project's i18n and admin-page conventions.

## Acceptance
- The slot page loads framed from a `chrome-extension://` page (check response headers), links open
  a new tab.
- The visitor signal fires once, only after visibility + interaction, never on slot/admin pages.
- Admin page shows both graphs for a month and navigates months.
