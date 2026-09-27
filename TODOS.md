# TODOS

Things that comes to my mind during solving other shits and should be done


## User experience

### Implement GDPR bullshit
- TODO description

### Implement Cookies bullshit
- TODO description

### SEO
- implement basic seo
- add images for social network post sharing

### Responsive design
- done just partly now

### Social networks share buttons
- + OG tags


## Critical architecture steps, missing parts

### User payment & pro features activation
- basic features are unlimited amount of links and groups and subgroups, but workspaces are limited to 2, profile to 1 and connected devices to 10

**Decided 2026-09-26 - prices**

- lifetime, one-time: **14.99 EUR** / **14.99 USD**
- pro subscription: **0.39 EUR / month, billed yearly** = 4.68 EUR per year, and 4.68 USD
- billed yearly, **never monthly**. a 0.39 charge loses more than half its value to the fixed
  per-transaction fee; the same fee on 4.68 is 11.8%
- lifetime pays back in ~3.2 years against the yearly plan. that gap is what makes both worth
  offering - narrow it and everybody rationally takes lifetime and the subscription is pointless

**Decided 2026-09-26 - currencies: EUR and USD, nothing else, ever**

- Creem can only charge in **USD and EUR**. that is the provider's entire list, so there is no
  third currency to decide about. everyone outside those two is charged in EUR and their own card
  issuer converts, which is what already happens with every foreign card today
- **no per-currency price points.** each one is a number that has to be re-judged by hand as FX
  drifts, and it silently changes what a sale is worth
- **never convert a price in the frontend.** the pricing page renders the two fixed numbers and
  nothing else. anything derived from a locale or a live rate will disagree with what Creem
  actually charges, and that complaint cannot be answered
- the currency follows **the customer's country at checkout**, decided by Creem - not the
  browser's language and not the site's language. a Slovak reading the site in English pays EUR
- therefore **the price is not an i18n key.** it is data with a translated label around it.
  putting the amount in `public/i18n/` would tie the currency to the language, which is wrong
- payout account is EUR, so EUR sales settle unconverted and USD sales carry the FX spread of
  Creem's banking partner on the way out
- store the amount **and the currency actually charged** on the entitlement row. it is the only
  record of what the customer paid, and a refund needs it

**Open - 14.99 USD is a ~12% discount, not parity**

- EUR/USD was **1.1382** on 2026-09-26, so 14.99 EUR = 17.06 USD and 14.99 USD = 13.17 EUR. net
  of Creem's cut and the payout FX spread a European lifetime sale is worth ~14.04 EUR and an
  American one ~12.18 EUR - a 13% gap, not the near-parity the matching digits suggest
- **16.99 USD** would be near-exact parity (~13.85 EUR net, a 1.4% gap) and keeps the .99 ending
- keeping 14.99 USD deliberately, as a US-market price point. revisit if EUR/USD moves further or
  if US sales become a large share

**Resolved - the Chrome Web Store does nothing here**

- Chrome Web Store payments are gone: no new paid items since Sept 2020, charging stopped Feb
  2021, and the old licensing API is not something to build on. the store cannot pair a user with
  a payment and never will again
- so entitlement lives in the backend, on the account that already exists, and the extension
  reads its limits from the sync payload. it never decides them for itself
- "is the payment still in charge" is answered by the signed webhook writing a paid-until instant
  onto the account - not by asking the provider on every request

**Decided 2026-09-26 - the gate is Creem, one merchant of record worldwide**

- a merchant of record is the entire point: it is the legal seller, so no VAT registration, no
  OSS filing, no UK VAT (which has *no* threshold for sellers not established there) and no
  invoices to issue. it costs 7.6% on a 14.99 lifetime and 11.8% on a 4.68 year
- **not** the GoPay-for-EU + MoR-for-the-rest split from an earlier session: two webhook
  contracts and two subscription state machines to save cents, and GoPay's 8 EUR/month needs ~62
  charges a month before it even beats Stripe
- Polar was the runner-up and the nicer API, but it surcharges +1.5% on every non-US card, which
  is every customer we have
- keep it behind **one port** in the backend. the provider is a dumb signal - "this account is
  pro until X" - written by a signed webhook into our own tables. a swap is then one adapter,
  which matters because Creem is a young company
- onboarding is business details -> KYC/KYB -> payout account -> manual review. expect 1-2 weeks
  before money can be taken, so start it well before the code needs it
- payout fee is **7 EUR or 1%, whichever is higher**, minimum 50 EUR balance, paid on the 1st and
  15th. so take payouts rarely: one 400 EUR payout a year costs 7 EUR, twelve small ones cost 84

**Decided 2026-09-27 - going live with Creem: test mode first, review last**

- work in **test mode** until the product is finished: webhook, checkout, prices, product
  descriptions and the presentation site are all tuned there. test mode needs no verification
- Creem's review checks "your website, support email, and product details", so it goes in only
  when those are final. before submitting, the website must have:
  - [ ] a real product description of what pro and lifetime give
  - [ ] visible pricing, matching the Creem products exactly
  - [ ] terms of service, privacy policy and a **refund policy**
  - [ ] the **support email visible on the site** (footer, contact or legal page) - the same one
    registered in Creem. a missing or mismatched one is a named rejection reason
- [ ] the extension **published in the Chrome Web Store**. Creem's docs do not say it is
  required - ask their support if it matters - but a reviewer wants to see a real product
- then, in this order:
  - [ ] switch the dashboard to live, start **Balance -> Payout Account**; KYC/KYB starts from
    there. government ID, business documents if selling as a company, and the same name spelling
    on ID, business details and bank account (a mismatch is the other named rejection reason)
  - [ ] **recreate the products in live mode.** test and live are completely separate; nothing
    transfers and the live product ids are new
  - [ ] register the webhook endpoint in live mode; it gets its own signing secret
  - [ ] swap the backend's Creem values as one change in Infisical: live `CREEM_API_KEY`, live
    `CREEM_WEBHOOK_SECRET`, live API base URL (`https://api.creem.io`, not `test-api`), live
    product ids. a live key against the test URL, or the reverse, fails every call
  - [ ] one real purchase and refund end to end before announcing anything
- rotate the test API key once the integration works - it was pasted into a Claude session

**Decided 2026-09-26 - account deletion is blocked while billing is live**

- an account with a live subscription **cannot be deleted**. the user must cancel first, through
  the Creem customer portal, and only then is deletion offered
- "live" is `source == SUBSCRIPTION` **and** `status in (ACTIVE, PAST_DUE)`. an already-cancelled
  subscription running out its paid period (`SCHEDULED_CANCEL`) **does not block** - the user has
  already done the thing we are asking for, no further charge is ever attempted, and blocking it
  would read as "cancel, then come back in up to eleven months". the check must test `source` too
  or a LIFETIME row sitting at ACTIVE blocks deletion forever
- **the admin delete is deliberately not blocked.** it is the repair tool and the escape hatch for
  the case where Creem's portal is down and the user can neither cancel nor delete. it warns in
  the log and the admin user view shows the entitlement, so the operator sees it before clicking
- 409 with code `SUBSCRIPTION_STILL_LIVE`, and the portal URL is **not** in the error body -
  minting a Creem link on every failed delete is a wasted provider call on an error path. the
  site renders the button itself on seeing the code
- the alternative - cancel on their behalf during deletion - was rejected. a cancel that fails
  silently leaves Creem billing a card for an account that no longer exists, and nobody finds out
- so deletion grows a precondition, and the account page has to say *why* it is refused and link
  straight to the portal. "delete" must not be a dead button with no explanation
- a **lifetime** entitlement does not block deletion - there is nothing recurring to stop. only a
  live subscription does
- today `AccountDeletionService` (backend) would delete an account Creem is still billing yearly.
  that is the bug this prevents, and it is easy to ship without noticing

**Decided 2026-09-26 - the device limit refuses the sign-in, and says why**

- over the 10-device free limit the sign-in is **refused**. there is no soft-fail available:
  `refresh_token.device_id` is NOT NULL with a foreign key, so "sign in but do not record the
  device" cannot exist
- **enforced only where an installation id is present - so, the extension, never the website.**
  otherwise a user at the limit who reinstalls the extension and has never used the website is
  locked out completely: freeing a slot needs the device list, which needs a sign-in, which is
  refused. this leaves the website always reachable as the management surface
- that hole is **spoofable on purpose**: omit the header and you get an eleventh device. the
  consequence is a limit bypass, not a breach, and `frontendApiKey` bounds nothing anyway. the
  alternative was a real lockout that only the operator could clear
- **two call sites, not four.** Google does not mint a device row - it ends in a handoff code that
  the website redeems, so password login and single-use-code redemption cover everything. the
  refusal is therefore always a JSON body on a POST: no redirect error path, no error query
  parameter on the OAuth callback, no second wording for a browser mid-redirect
- 403, not 401: on a sign-in endpoint **401 means the credentials were wrong, 403 means they were
  right and something else refused**. the refresh-on-401 interceptor must not fire on it, and a
  403 from a login response must not clear the session
- the count and the limit are **not** in the error body. the client says "device limit reached"
  without a number - putting numbers there means either widening the error DTO or interpolating
  untranslatable values into the message
- **the user must be told exactly what happened.** a correct password answered with a generic 403
  reads as "wrong password" and produces a support mail every time
- the message says: the device limit is reached, this is a free-tier limit, here is the device
  list to sign one out, here is the pro upgrade. in both languages, in both clients
- this **forces a machine-readable error `code`** onto `ApiErrorResponseDto`. the reason cannot be
  carried by English message text - the site is bilingual and the extension has its own wording,
  so both would be pattern-matching prose in `core/api/backend-failure.translator.ts`. the `code`
  field stops being optional the moment we promise the user an explanation
- a device already known to the account always signs in, limit or not. only a **new** device row
  is refused, and re-pairing or taking over an existing one is never blocked

**Constraints on code not yet written - fold into the design, these are not live bugs**

- **bind the webhook body as `byte[]`, never `String`.** `StringHttpMessageConverter` defaults to
  ISO-8859-1 and Creem sends no charset, so a `String` binding corrupts every non-ASCII byte on
  the way to the HMAC. it would verify for most customers and fail for the one with an accent in
  their name - the easiest way to ship this subtly broken
- **no `ContentCachingRequestWrapper` is needed**, and adding one by reflex causes the very
  dev/prod signature divergence it looks like it prevents. verified: neither servlet filter in
  the chain reads the request body. true only for as long as nobody adds one that does
- **the webhook path needs an explicit security exemption.** the chain ends in
  `anyRequest().authenticated()`, so without it Creem gets 401 five times over 24 hours, gives
  up, and the first anyone knows is a customer who paid and got nothing
- **the idempotency claim needs its own `REQUIRES_NEW` transaction.** a unique-constraint
  violation aborts the whole transaction on PostgreSQL, so catching it inline does not work, and
  an `existsBy` pre-check does not either - two concurrent redeliveries both pass it
- **webhook events arrive out of order.** Creem retries over 24 hours with a 6h final gap, so a
  `paid` can land after the `past_due` that logically preceded it. the entitlement row keeps the
  provider's timestamp of the newest event applied and refuses older ones; `past_due` never
  revokes, it only marks, and the user keeps what they already paid for until the period ends
- **schema is `new-tab-links-migrations`, not Hibernate.** new tables are a `V10` migration there,
  the migration image ships before the backend, and the flyway version in the backend `pom.xml`
  bumps in the same commit that starts depending on it
- `ddl-auto=validate` checks none of this: not unique constraints, not CHECK constraints, not
  `ON DELETE` rules. the replay guarantee is a unique index nothing in the backend verifies, so
  replay must be tested against a database built by the migration image

**Decided 2026-09-26 - smaller calls that came out of the design**

- **"unlimited" in the sync payload is a nullable Integer, not `-1`.** the natural consumer check
  is `if (count >= limit) refuse`, and `3 >= -1` is true - a sentinel meaning unlimited would
  silently block everything for pro users. null cannot be compared by accident: `strict` makes
  the frontend handle it or fail to compile
- **`GRANT` goes into the data model now, the admin endpoint later.** one word in a CHECK
  constraint today versus an ALTER TABLE and a full migrations release later. it also lets the
  whole pro path be tested without a real card, which is otherwise blocked behind Creem's KYB
- shared branch name across every repo this touches: **`feature/pro-entitlement`**
- a device-limited sign-in rolls back `markConsumed`, so a Google handoff code or a typed
  extension-connect code survives and can be retried. correct, but true only by accident of the
  transaction boundary - it needs a test pinning it, and nothing in that chain may open a new
  transaction
- a device-limited password login forfeits its failed-attempt-counter reset: mistype nine times,
  get it right, hit the limit, and you are still at nine. checking the limit earlier would fix it
  and turn the endpoint into an account-enumeration oracle, so it stays

### Admin account delete bypasses AccountDeletionService

- pre-existing, nothing to do with billing, found while scoping it
- `UserAdministrationService.deleteAccount` calls `userRepository.delete` directly and relies on
  the database's ON DELETE CASCADE, where every other delete path in the codebase removes child
  rows explicitly. the cascades exist only in the migrated schema and `ddl-auto=validate` does
  not check delete rules
- so it **fails on a developer's `ddl-auto=update` schema and succeeds in production** - the exact
  asymmetry the rest of the code is written to avoid

**Decided 2026-09-26 - the workspace limit is per profile, not per account**

- 2 workspaces **per profile**, 1 profile, 10 devices. on the free tier the two readings coincide
  (one profile), and they diverge only for a downgraded pro account holding several profiles
- per profile because the extension can count it **synchronously** from the active profile's
  state. per account would mean reading every profile's blob out of `chrome.storage.local` in an
  async loop from a view model that is currently fire-and-forget, for a case that only a
  downgraded account can reach
- the backend must enforce the same reading. **if the client gate and the server backstop
  disagree, the user loses a workspace** - see the deletion bug below

**Decided 2026-09-26 - pro hides the ads bar**

- `adsBar.ts` in the extension already carries a comment anticipating "a reason not to draw at
  all for somebody who has paid not to see it". `entitlement.tier` is that reason
- one-line consumer of data the snapshot is already going to carry

### Sync silently deletes a record the server refused

- **live today**, not a pro-tier problem - the two existing rejection reasons already reach it
- a refused push operation makes `push()` return without advancing the baseline, deliberately
  leaving the following `pull()` to "correct it wholesale". `pull()` then replaces the profile
  with the account's snapshot - which does not contain the refused record, because the server
  refused it. **the record is deleted from the device with no message**, leaving only a log line
- the system stays self-consistent afterwards, so there is no push loop and nothing looks broken.
  the user just finds their work gone
- this is why the pro limits need a **client-side gate** and not only a server backstop: without
  one, hitting a limit does not refuse the create, it destroys it
- the minimum fix is for the push path to surface a rejection to the user *before* the pull
  erases the evidence. it touches the most carefully reasoned code in the extension - the
  push/pull ordering rule - so it wants a regression test proven to fail against the bug first

**Not a constraint - the extension has no installed users yet**

- an earlier version of this file split limit enforcement into "REST paths now, sync-push later",
  gated on the extension's silent-delete fix reaching users, and floated an `X-Client-Version`
  header so the backend could tell a fixed build from a broken one
- **all of that assumed installed users.** the extension is not published - "product presentation
  and media for google chrome store" is still open work below. there are no old builds in the
  wild, so there is nothing to detect and nothing to gate
- so: **limit enforcement ships in one piece**, REST paths and sync-push insert branches
  together, whenever it is ready. no version header, no cross-repo sequencing
- the silent-delete fix is still worth having on its own merits - it is a real defect and would
  bite the first real user - but nothing waits on it
- **revisit this the moment the extension is published.** from that day a released build cannot be
  assumed to be current, and a server-side refusal reaches clients that may not handle it

- **so land every contract-shaped change BEFORE the Web Store release**, even where the feature
  behind it is unfinished. free today, a migration problem afterwards:
  - the new `LIMIT_EXCEEDED` value on `SyncRejectionReason` - the risky one. an unknown enum
    value can fail deserialisation of the whole push response, breaking sync outright rather
    than degrading it. add the value before anything throws it
  - the `entitlement` component on the sync snapshot - can be present and always null
  - the nullable `code` on `ApiErrorResponseDto` - low risk but it touches every error body
    both clients parse
- this also downgrades "does the extension tolerate an unknown rejection reason?" from a release
  gate to an ordinary code-review item. it answered yes anyway (bare `string`, no runtime
  validation), but with no installs it could not have blocked anything
- grandfathering is theoretical for the same reason: the website does not consume the hierarchy
  CRUD at all, so with no extension users there is essentially no data to be over any limit. the
  production count before enforcement is a five-minute confirmation, not a gate

**The limit field is named `maximumWorkspacesPerProfile`, not `maximumWorkspaces`**

- `maximumWorkspaces` reads as per-account to anyone who has not read this file - which is every
  future reader, including the client that is supposed to gate on it. the point is to make the
  ambiguity **unrepresentable** rather than to rely on care
- `maximumProfiles` and `maximumConnectedDevices` stay per account. null still means unlimited
- on the entitlement endpoint, per-profile usage is not a single number. report
  `usage.largestProfileWorkspaceCount` - the site only needs it to decide whether to show an
  upgrade prompt, and handing it a map invites it to re-implement the gate

**Accepted hole - moving a workspace between profiles is not limit-checked**

- new, and caused by the per-profile decision: under the per-account reading it could not exist
- reassigning a workspace's profile is an **update**, and the design deliberately never
  limit-checks the update branch. so two workspaces can be moved from profile A into profile B
  and leave B holding four
- **left open on purpose**, for consistency with the grandfathering rule that an edit is never
  refused. checking on move would stop a downgraded pro user reorganising what they already own,
  and - through the deletion defect above - would delete the workspace while doing it
- recorded here so nobody later reports it as a bug

**The sign-in status contract, stated once and correctly**

- the generalisation "401 means wrong credentials, 403 means right-but-refused" holds **only for
  `/auth/login`**. discard it everywhere else
- `POST /auth/login` -> **401** credentials wrong, account inactive, or locked out
- `POST /auth/session-handoff` -> **400** code unknown, spent or expired. Google inherits this
- `POST /auth/extension-connect` -> **400** same
- all three -> **403** + `code: DEVICE_LIMIT_REACHED` when authentication succeeded and the
  device limit refused it
- **both clients branch on `code`, never on the bare status.** the frontend-api-key filter also
  answers 403, and although it guards only the username-lookup path today, that set widening is
  a plausible future edit made by somebody with no reason to think about device limits
- a **403 must never be treated as "session expired"**. the refresh-on-401 interceptor is keyed
  on 401 so it is unaffected, but a naive `status >= 401 -> sign out` would log a user out of a
  refusal they could have resolved
- the limit stays per profile while `position` ordering stays per account. not a defect, but the
  two scopes now differ inside the same method and it needs saying where the count goes in

### Premium lapse: 30 day grace period
- when a yearly subscription is not renewed (forgotten card, bank hiccup, gate did not charge),
  keep the account premium for 30 more days instead of downgrading it on the expiry date
- warn by email every week during those 30 days
- the renewal itself should be the payment gate's own annual recurrence, not our cron - see the
  PSD2/SCA and double-charge notes in the backend design
- NOT IMPLEMENTED YET - decided 2026-09-18

### SUPERSEDED 2026-09-19 — read this before anything below it

The blocking design below got too complicated and is replaced. Kept only because the reasoning in
it is worth not re-deriving, and because a few of its findings are live bugs independent of any of
it (closedAt bounds, epoch-millis deserialisation, the profile position churn).

WHAT REPLACES IT, decided by the owner:

- the free limits - 2 workspaces, 1 profile - are enforced AT CREATION on every install, including
  an unsynchronised one. They are the DEFAULT for an extension with no account. So a single device
  can never get over the limit in the first place
- THERE ARE NO EXISTING USERS. The extension is not in the Chrome Web Store
  (NEWTABLINKS_CHROME_WEB_STORE_URL is empty in the GitOps values, and the download page shows its
  "not published yet" wording), so the only account is the owner's own test one. Grandfathering was
  built to protect users who do not exist
- the only way to exceed the limits is therefore MERGING two unsynchronised installs, or lapsing
  from premium. In both cases the answer is not to block anything: the user is TOLD that their
  current setup excludes them from free synchronisation. Sync does not start; nothing is blocked,
  dimmed, ranked or deleted, and every workspace keeps working locally on the device that holds it
- a user excluded from free sync can still install the extension and create workspaces offline, up
  to the same offline free limit

WHAT THIS DELETES OUTRIGHT:
- grandfathering: the effective date, the exemption predicate, the fail-safe off switch, Reading A
  vs Reading B, and the first-contact hole. All of it
- blocking itself: no blocked id lists, no dimming, no read-only workspaces, no tips-panel danger
  warning, no "work in this one instead" swap, no escape hatch, no promotion redraw
- the whole ranking apparatus: last-modified vs creation date, subtree MAX, the client-owned
  modifiedAt, the (timestamp, id) tie-break, the clamp and floor, accept-bump/refuse-content, the
  half-applying batch and its set union, and the two-device settle test as a release gate
- the sync-snapshot landmine, because nothing is ever omitted from a snapshot

WHAT SURVIVES:
- the creation cap, enforced locally and on both write paths (REST and sync push)
- premium as a boolean on the user model, and the operator's grant in the admin surface
- the purchase, refund and cancel flows, which never depended on any of this
- the three live bugs found along the way, which are worth fixing regardless

DECIDED 2026-09-19:
- on connect over the limit, sync is REFUSED OUTRIGHT. Not pull-then-refuse-to-push
- the 10-device cap refuses the 11th pairing, and the user is TOLD it is their eleventh and
  pointed at the device manager on this website to clear out stale devices. The devices page
  already exists and already offers sign-out-and-forget, so the extension needs a link and a
  message rather than anything new here
- the free limits are compiled into the extension for the unsynced case, and belong in a
  configuration file there rather than scattered as literals. Consequence stated out loud:
  changing a limit later needs an extension release

BACKEND DESIGN CONFIRMED 2026-09-19. Effort collapses from L (3-4 days) to M (1-2), and the
limits half needs NO DATABASE MIGRATION AT ALL - no column, no table, no migrations release, no
schema version bump, no two-repo release sequence. Configuration and service logic end to end.

THREE LOCKOUTS THAT ARE EACH ONE `if` IN THE WRONG PLACE:
- the creation check belongs in the INSERT BRANCH of the synchronisation services, not in the
  appliers and not on the upsert as a whole. An upsert of an EXISTING row must never be refused,
  or a user sitting at exactly the limit can no longer edit what they already have
- the device cap applies ONLY on the create branch of find-or-create. Otherwise an account sitting
  at exactly 10 can never sign in again on ANY of its own devices - including the one it would use
  to free a slot. A total lockout reachable by a completely normal user
- count SIGNED-IN devices, never rows. The device list is a history and deliberately keeps rows
  after sign-out, so counting rows would refuse someone who has merely used eleven browsers over
  two years and signed out of eight

A RACE THAT REINTRODUCES THE STATE THIS DESIGN DELETED: two devices pushing at once both count 1,
both insert, and the account holds 3 - with no blocking machinery left to cope, because we just
removed it. Needs a per-account lock (SELECT FOR UPDATE on the user row, or an advisory lock)
around count-and-insert. Creates are rare, so serialising them per account costs nothing.

REFUSAL SHAPE: 409 Conflict, never 403 (the token is valid and the caller is who they say),
never 401, never 402 (poorly supported, and payment is not the only exit). Body is TYPED, not
prose - the extension must not parse English to word its own message: a stable `code`, the
`resource`, `accountCount`, `limit`, the full `limits` set, and a `manageUrl`.
- for the device cap NEVER 401 or 403: telling someone their password was wrong when their device
  count was the problem is the worst available failure
- manageUrl comes FROM THE SERVER, alongside the existing activation, password-reset and OAuth
  callback paths, so the extension never hardcodes the site address and a deployment can move it

SEND THE LIMITS TO THE CLIENT, in three places - the refusal body, the sync snapshot, and
plan-usage. That demotes the extension's compiled values to a BOOTSTRAP DEFAULT used only before
first contact, which is what they should be. Otherwise raising the limit to 3 leaves an installed
extension enforcing 2, and lowering it lets the extension offer what the server then refuses -
both of which look like bugs in the extension.

EXTENSION SIDE VERIFIED 2026-09-19. Effort M -> S-M, about a day to a day and a half.

- SIX creation call sites, not four. Two of them are BULK IMPORTS from a file, where the question
  is not "have I room for one more" but "does this file fit" - the check runs after parsing and
  before writing, and must refuse the file WHOLE. Importing the first two workspaces and dropping
  the rest is silent data mangling, and the user still holds the file believing it was taken
- the guard goes in the VIEW MODELS, not in a repository choke point - the opposite of the old
  blocking design. A repository guard would also catch the sync paths and the registry REPAIR
  path, and refusing the repair would make a damaged registry unrepairable
- counting is now O(1): free allows one profile and premium is uncapped, so "workspaces across the
  account" and "workspaces in this profile" coincide for every account the limit can bite. The
  multi-profile storage loop is not needed and the refusal handlers stay synchronous

- A REFUSED CONNECT IS NOT QUITE A NO-OP TODAY, and it is one line out of place: the connect
  rewrites and persists local identifiers BEFORE anything else, so a refused attempt would still
  have permanently renamed the user's profile and workspace ids. Harmless in itself and eventually
  necessary, but it is a lasting local change caused by an attempt that failed. Move the check
  ahead of it, and clear the session on refusal - otherwise the device sits holding valid tokens
  with no synchronisation and re-attempts on every new tab
- THE MERGE REFUSAL CANNOT BE THE SERVER'S. The merged total is local union remote and the server
  has never seen the joining device's data. Only the client can know it, and only after fetching
  the snapshot. There is a clean seam because the merge is PURE: compute every profile's merge in
  memory, count, then write them all or none
- DELETE-ONLY PUSH HAS A BASELINE TRAP: a clean push stores the whole local state as the new
  baseline, so after a delete-only push the baseline would record the account as holding every
  local upsert that was never sent - and if sync later resumes because the user paid, those
  upserts are gone for ever, silently, server-side. Either forget exactly the confirmed-deleted
  rows, or make it a one-shot user action that re-attempts the connect on success, which repairs
  the baseline by the normal route rather than patching it
- delete-only is needed ONLY for the lapsed case. A joining device can get under the limit
  entirely locally, because the merged total is a union - deleting its own workspaces reduces it

- RECONCILED: the two agents assumed different refusal points, and the backend's choice resolves
  the extension's blocking question. The extension assumed sync would be refused AT TOKEN ISSUE,
  which would make delete-only push impossible - a device with no token cannot push anything. The
  backend instead put eligibility in a service consulted by the SNAPSHOT and PUSH paths, so the
  token IS issued and a delete-only push works. Only the DEVICE cap sits at token issue, which is
  correct because that refusal is about the device rather than the account
- both agents independently reached "typed reason code plus numbers, never prose". The extension's
  reason is worth keeping: it renders a server message string inside a TRANSLATED frame, so prose
  would arrive in the backend's language while the rest of the page is in the user's

- SERVER-SENT LIMITS, recommended by both sides: compile the numbers as defaults and let the
  server override them, cached locally. The compiled values then serve only an install that has
  never had an account, and a limit INCREASE reaches users without a store release. Without it the
  asymmetry bites - client stricter than server is harmless, client laxer means the user creates a
  third workspace and is then refused sync, punished for using the app as it let them

BLOCKING QUESTION FOR THE BACKEND: IS THE SNAPSHOT SERVED TO AN OVER-LIMIT ACCOUNT?
- a delete-only push needs a BASELINE, because the change set is a difference against one. Two
  ordinary ways a lapsed user arrives without a baseline: signing out and back in, which clears it
  deliberately, and a reinstall or a second machine
- with no baseline, push() diverts to the merge path, which fetches a snapshot FIRST. So if
  eligibility refuses the snapshot as well as the push, that device is BLIND: it cannot compute a
  delete list, cannot show the user what the account holds, and cannot even say which workspaces
  are the problem. The one-shot remedy would be offered and do nothing - on precisely the device a
  user reaches for after a reinstall
- RECOMMENDED: serve the snapshot to an over-limit account and refuse only the PUSH. Reading your
  own data was never what the cap was about, and without it the remedy has no input
- APPROVED 2026-09-19: the snapshot IS served, only the push is refused. The eligibility service
  therefore has ONE call site, the push, and the snapshot service is untouched by the whole feature

- THE CONDITION, AND IT IS A FULLER RULE THAN FIRST STATED. "Fetch and do not apply" was HALF the
  rule and the half alone is worse than neither. The pull does two things: it applies the snapshot
  AND stores it as the baseline. The baseline is what "deleted" MEANS in this client - there are no
  tombstones, so a record in the baseline that is absent locally IS a deletion to push. A device
  that stores a baseline describing six workspaces while holding two locally has just declared
  FOUR DELETIONS, and the one-shot remedy would then remove four workspaces that device never held
  and the user never saw. On a freshly reinstalled machine that is the worst possible outcome of a
  remedy meant to save their data
- SO THE RULE, COMPLETE: while the account is over the limit a snapshot is fetched FOR DISPLAY AND
  DIAGNOSIS ONLY - neither applied to local state nor stored as the baseline. A delete list is
  computed only where a baseline and the local data it describes were written TOGETHER
- the codebase already contains this reasoning one case over: first contact withholds computed
  deletions because a deletion there describes the merge's mistake rather than the user's intent
- IT NEEDS A GUARD, NOT AN OMISSION. Apply-snapshot has one caller, but the pull has THREE entry
  points and one of them is driven by another device's activity on nobody's schedule - so the
  over-limit device will be told to pull while the user is mid-deletion. And the merge path is a
  SECOND independent writer that never goes through apply-snapshot at all. "Do not call the second
  half" would have to be remembered at four sites, one of them asynchronous
- the MERGE path should keep writing, and this does not contradict the rule: it writes local state
  and the baseline TOGETHER from the same snapshot, so they are consistent by construction and no
  false deletions arise. That is exactly the input the remedy needs, and before this decision it
  was unreachable because the snapshot fetch itself failed
- DERIVE over-limit FROM THE SNAPSHOT, not from a refused push: the limits now arrive on the
  snapshot, so the client counts what it holds and compares. Effective on the FIRST fetch rather
  than after a wasted round trip, a pure function of one payload so trivially testable, and the
  device knows BEFORE it writes anything - which is what the rule above requires

- NO MARKER ON THE SNAPSHOT, and the reason is better than "the client already knows": the server
  CANNOT answer the question a marker would appear to answer. The merge case is local UNION remote
  and the server has never seen the joining device's data, so a flag could only report whether the
  ACCOUNT ALONE is over - telling a device about to merge two local workspaces into a
  two-workspace account "you are fine" moments before it discovers it is not. A field that is
  correct for one caller and misleading for another is worse than no field: absent, the client
  knows it must compute; present, it is invited to trust
- log at INFO when an ineligible account pulls a snapshot. That sequence precedes every one-shot
  remedy and you will want to see it happening rather than infer it

- NAME THE CONDITION, NOT THE CONSEQUENCE: the 409 code becomes ACCOUNT_OVER_FREE_LIMIT.
  FREE_PLAN_SYNC_NOT_AVAILABLE is now inaccurate, since reading IS available - and naming it
  ..._PUSH_NOT_AVAILABLE would name a consequence that has already changed once this week
- A COLLISION TO PREVENT BEFORE IT IS WRITTEN: SyncRejectionReason.FREE_PLAN_LIMIT_REACHED is ONE
  OPERATION refused with the batch continuing and a 200, while the 409 ACCOUNT_OVER_FREE_LIMIT is
  the WHOLE REQUEST with nothing applied. Different mechanisms, one word apart, and near-identical
  names would eventually be merged by someone tidying up. Keeping them verbally distinct is most
  of the defence
- manageUrl gains a contract line now that one shape serves two refusals: NON-NULL means the
  remedy is elsewhere, send the user there (the device cap, resolved on this website); NULL means
  the remedy is here (the push refusal, resolved by the extension's own one-shot action)
- the message field is an ENGLISH DIAGNOSTIC for logs and a fallback line, NEVER a display string.
  Say so in its documentation, or someone will eventually "fix" the prose by translating it
  server-side - which would put the same sentence in two repositories when the typed fields exist
  precisely so the client can render it in its own language

- THE EMPTY-BATCH PROBE IS NOW LOAD-BEARING, and it is exactly the kind of thing a later refactor
  deletes. Before this decision a client could infer eligibility from a refused snapshot; now the
  snapshot always answers 200, so an empty push is the ONLY way to ask "may I sync?" and get a
  true answer. Short-circuiting an empty batch to a 200 before the eligibility check is an
  obvious-looking tidy-up that would remove the only probe in the system, with no test failing and
  no symptom until some client quietly stops being able to ask. Defend it twice: document it on
  the endpoint as a permitted probe rather than a no-op, and name the test for the behaviour

THE CACHED LIMIT OVERRIDE APPLIES ONLY WHILE A SESSION EXISTS. Otherwise a premium user signs out,
keeps "uncapped" cached, creates five workspaces offline, signs back in and is refused - the exact
asymmetry decision 16 exists to prevent, arriving by the back door. With no session the compiled
defaults apply, which is what decision 14 says those numbers are for.

THE CLIENT'S RESULT TYPE CANNOT CARRY A REASON CODE OR COUNTS TODAY, and both approved answers
depend on it: the rejected variant reduces the response body to one human-readable string and
discards everything else, so a typed body would be parsed and thrown away before any caller saw
it. Widen it once to carry the parsed body, and keep the message field populated regardless so an
older build still says something true. Use the SAME shape for the limits in the refusal body and
in the snapshot, so there is one parser rather than two that can drift.

THE INVARIANT, worth having in one line because it was invisible from either side alone:
ACCOUNT-level eligibility lives in the service layer, consulted by the two sync entry points.
DEVICE-level capacity lives at token issue. The account's state governs what it may sync; the
device's existence governs whether this machine gets a token at all. A device refused at token
issue has no token and so cannot delete-push - which is correct, because that refusal's remedy is
on the website's device manager, not in the extension.
- and the connect-immediately-after-a-delete-only-push sequence is safe for a reason nobody
  designed for it: the device cap applies only to the CREATE branch of find-or-create, and the
  device pushing the deletes already exists, so its follow-up connect cannot be refused by the cap

THE EMPTY-BATCH TRAP, and it would have shipped: allMatch over an empty list is vacuously true, so
a naive delete-only predicate returns 200 for an EMPTY push from an ineligible account. An empty
push is the obvious way for a client to ask "may I sync?", so a false green light there is worse
than useless. The predicate must require NON-EMPTY and all-DELETE.

THE ELIGIBILITY REFUSAL IS A WHOLE-REQUEST FAILURE, never a per-operation rejection. That channel
means "this operation was wrong"; ineligibility is a property of the ACCOUNT, so reporting it per
operation would return four hundred identical rejections. A 409 from the endpoint, thrown before
anything is applied, which also keeps the single transaction from doing work it will roll back.

A MULTI-PROFILE DELETE BATCH WORKS BY CONSTRUCTION, not by care: the predicate inspects only the
operation KIND, never what it addresses. Every delete is ownership-scoped in its own query, and a
delete of an already-absent row is a silent no-op - so the whole-batch retry that decision 15's
one-shot-then-reconnect flow makes realistic is idempotent and costs nothing.

THE LIMITS RIDE ON THE SNAPSHOT AS A SIBLING OF `owner`, not as a field on the user DTO. They are
DEPLOYMENT CONFIGURATION, not account state, and that DTO is also returned by /users/me and
through the operator's account list - so putting them there would ship three integers of config
into the admin surface and need explaining later.
- do NOT add usage counts to the snapshot. It already contains every profile and environment the
  account owns, so the client can count what it holds from the payload in hand. Only the limits
  are new information
- record the asymmetry as the field's own documentation, because it is not obvious from the field:
  a client stricter than the server refuses something that would have been allowed, which is a
  disappointment; a client laxer lets the user create something and then punishes them for it

DECIDED 2026-09-19 — both approved:
- if sync is refused OUTRIGHT then deletions cannot reach the server either. A lapsed user deletes
  four workspaces on their laptop, the account still holds six, and they can NEVER get back to
  free sync - paying becomes the only exit, which reads as a hostage situation rather than a limit
- APPROVED: deletes always push, even when sync is otherwise refused. Stated as a rule rather than
  a carve-out: eligibility governs what an account may GROW to, never what it may SHRINK to
- SHAPE: a one-shot user action, not a silent channel - "remove these from my account" in the
  application menu, which pushes the deletes and on success re-attempts the connect. That repairs
  the baseline by the normal snapshot route rather than patching it, and it is explicit to the
  user, which matters for something that deletes rows on a server
- APPROVED: the server sends the limits it enforces, in three places - the refusal body, the sync
  snapshot, and plan-usage. The extension's compiled numbers become a BOOTSTRAP DEFAULT used only
  before first contact, and a limit increase then reaches users without a Chrome Web Store release
  and its review latency
- there is a PRINCIPLED statement of it that makes it a rule rather than a carve-out: eligibility
  governs what an account may GROW to, never what it may SHRINK to. A delete can never make an
  ineligible account more ineligible. Implementation is one predicate over the batch, before the
  eligibility check: accept the push if every operation is a DELETE

- BUT IT SOLVES ONLY ONE OF THE TWO ROUTES OVER THE LIMIT, and the difference decides the wording:
  - LAPSED FROM PREMIUM: the excess is ON THE SERVER. The account holds 6, free allows 2. The
    delete-only push is exactly the exit, and without it this is the hostage situation. Solved
  - MERGING TWO UNSYNCED INSTALLS: the excess is LOCAL. Device B holds 2, the account already
    holds 2, the merge would make 4 - and there is nothing on the server to remove, because B's
    own 2 were never uploaded. B's exit is to delete LOCALLY, which needs no push at all, or to pay
  - so the same refusal has two different remedies. "Delete some workspaces" means ON THE SERVER in
    one case and ON THIS DEVICE in the other, and getting it backwards sends the user to delete the
    wrong data. That is why the refusal body carries accountCount: the extension compares it against
    its own local count and words the message accordingly

### Downgrading must not silently destroy data
- premium lifts the free limits (2 workspaces, 1 profile, 10 devices), so an account coming off
  premium can be holding more than the free plan allows
- the cancel confirmation is supposed to say what will be blocked at the period end, but THIS SITE
  CANNOT KNOW THAT - it deliberately does not consume workspace or profile CRUD, so it has no way
  to learn the account holds four workspaces. Today's wording is therefore generic on purpose. The
  fix proposed by the backend is GET /api/v1/users/me/plan-usage returning limits, usage and
  blockedIfDowngraded, with the arithmetic done server-side so the wording cannot drift from the
  enforcement. It is S, it also feeds the extension's tips panel, and it belongs in the read-state
  slice rather than with the payments work. NOT DECIDED YET
- VOLUNTARY cancellation is ALWAYS ALLOWED. An earlier idea to refuse it until the account was
  back inside the limits was dropped on 2026-09-19: it would keep a user in a contract that
  charges them again unless they first delete their own data, which is obstruction of termination
  and squarely a dark pattern in the EU. It was also unnecessary - blocking already handles the
  over-limit case at the period end. The confirmation step says what will be blocked instead
- INVOLUNTARY lapse (expiry, failed card) cannot be refused - nobody clicked anything. DECIDED:
  never delete anything. After the 30 day warning period the excess is BLOCKED, not removed,
  and the rule is by LAST MODIFIED - the most recently changed rows up to the free limit stay
  usable, everything staler is locked. Paying restores access in full. REVISED 2026-09-19: this
  was originally oldest-first by creation date, and that was backwards. See the note below
- the lock should be DERIVED, never stored. "not premium AND outside the N most recently modified"
  is a rule that needs no writer, so paying restores access with zero writes and nothing can go
  stale. A stored `locked` flag would need writing on lapse and unwriting on payment, which is the
  same denormalisation trap as the premium flag itself

- WHY LAST MODIFIED AND NOT CREATION DATE - decided 2026-09-19, and there is no user-facing choice
  of any kind. The owner's reasoning: do not make the user care, and settings for edge cases are
  overwhelming. An earlier idea to let the user pick which N stay active was dropped for that
  reason. Three things fall out of the change, all improvements:
  - THE ESCAPE HATCH STOPS BEING ABSURD. Under oldest-first, promoting your blocked workspaces
    meant deleting the WORKING ones - "delete the 2 you still use to unlock the 2 you cannot
    touch". Under last-modified the blocked ones are the stale ones, so the user deletes what they
    had already stopped using, which is what anyone would have done anyway
  - IT TELLS A STORY THAT IS TRUE. "the ones you have worked on recently still work" is how people
    think about their own data; "the ones you made first" is not
  - WRONG, corrected 2026-09-19: it was claimed this solves the two-unsynced-devices merge with no
    UI. It does not. Ranking by last-modified keeps the most recently PUSHED, not the most
    recently worked on: merged rows are stamped now() on insert, so a laptop that sat in a drawer
    for a year and is signed in for the first time arrives stamped "now" and BLOCKS the desktop's
    genuinely current workspaces. Only a client-owned timestamp fixes this (see below)
  - blocked rows are read-only, so their timestamp freezes and they can never bump themselves back
    into the live set. The blocked set only changes on a delete, or when premium changes. No
    oscillation
  - RANK ON THE SUBTREE, NOT ON THE ROW. This is the trap, found 2026-09-19 and it would have
    shipped: environment.updated_at does NOT move when you work in a workspace. It moves when the
    ROW changes - renamed, re-described, re-parented, repositioned. Adding a link or editing a
    group writes OTHER rows and leaves the environment untouched. So a workspace used every day
    for two years but never renamed has a two-year-old timestamp, while one created last month,
    renamed once and never opened again looks fresher - and the ranking locks the workspace the
    user lives in. That is decision 10's own failure mode reintroduced one level down, and worse,
    because it is neither stable nor explicable
  - so "last modified" must mean max(updated_at) across the row AND everything beneath it. Still
    DERIVED, still nothing stored: it is a fold over collections the snapshot path already holds
    in memory, so it is free exactly where it matters. A stored last_active_at would need a writer
    on every link, group and subgroup mutation - the hottest write path in the application
  - subtree ranking also gives the user a NON-DESTRUCTIVE way back. With no stored preference,
    deletion was going to be the only control over which rows are live, and deletion is
    irreversible. Under subtree ranking, opening a workspace and using it promotes it
  - do not rank on updated_at as a redefinition of it: that column already has an owner, it exists
    for the extension's sync ("the field a client compares against to discover what changed"). One
    column serving two policies in two repositories means a future sync change silently locks
    someone out of their data. Subtree ranking READS it rather than redefining it, which is the
    coupling we want
  - MIGRATIONS MUST NEVER BULK-SET updated_at. JPA callbacks do not run for Flyway SQL, so a
    migration leaves it alone unless it sets it explicitly - and one UPDATE ... SET updated_at =
    now() would silently reshuffle the live set for every user on the platform, with no deploy-time
    symptom at all
  - no index on (owner_id, updated_at). It would be an index on a column that changes on every
    write, costing maintenance on the sync push. Add one only if a slow-query log asks for it
  - THE OSCILLATION PATH THAT MUST STAY CLOSED: a client that renumbers siblings on a drag and
    pushes them all would write position on blocked rows too, bumping them and promoting them
    while demoting a live one. Already closed by "writes to blocked rows are refused, the
    container's own delete excepted" - but ONLY if the refusal covers POSITION-ONLY writes and not
    merely content changes. Needs a test named for exactly that
  - the tips panel now has to explain WHY a workspace locked, not just that it did - the live set
    is a function of behaviour, so it can legitimately change while the user is not looking

- THE TWO CANDIDATE FIXES ARE NOT EQUIVALENT. Choose deliberately:
  - SERVER-SIDE subtree MAX(updated_at) over the row and everything beneath it. Fixes "using a
    workspace does not count". Does NOT fix offline edits, and does NOT fix the merge, because the
    client still has no number of its own
  - CLIENT-OWNED modifiedAt on environments and profiles, written by the extension on any mutation
    in that subtree, carried on the upsert, stored verbatim, ranked on by the server. Fixes all
    three. Both agents independently recommend this one
- why the client-owned version matters most, the offline DEADLOCK: with server stamps, a blocked
  workspace cannot be rescued by working in it, because the edit is the very thing that is
  refused. You cannot bump because you are blocked, and you are blocked because you did not bump.
  Under the old oldest-first rule the ranking was immutable so nobody expected editing to help;
  last-modified creates that expectation and then denies it. With a client-owned timestamp an
  offline edit carries the moment it happened, so the workspace ranks itself back in and the push
  is accepted - self-healing, no message needed
- RESOLVED 2026-09-19: client-owned it is. The backend withdrew subtree MAX, on the grounds that
  every server stamp is a stamp of when a row ARRIVED and the whole problem is that arrival time
  is not activity time - aggregating arrival times more cleverly does not turn them into activity
  times. The client-owned version also SUBSUMES subtree MAX: "bumped on any mutation anywhere in
  the subtree" is the same semantics, computed on the side that knows which workspace a link
  belongs to, with no aggregate query and no write amplification
- build it as a column with a fallback, not a hard dependency on the client: supplied and valid ->
  stored verbatim after clamping; absent -> now(); and any SERVER-side content change (the REST
  update paths, the website) also sets it to now(). An older extension that never sends it then
  degrades to what the ranking would have been anyway rather than breaking
- CLAMP a future value to now - a device with a clock a decade ahead would otherwise pin its
  workspaces live for ever and lock out everything else the account owns, undiagnosably. Also put
  a FLOOR on it: Instant.EPOCH or a negative value ranks a row below everything for ever, the
  mirror image of the same bug
- DO NOT refuse a bumped modifiedAt on a blocked row. That was my suggestion and it is WRONG - it
  re-creates the very deadlock the client-owned timestamp exists to break: the laptop's workspaces
  are stale so they are blocked, the user works on one, the bump is refused, the row stays stale
  and stays blocked. The correct rule separates the two: modifiedAt is ALWAYS accepted and always
  clamped (it is ranking metadata, not content), the rank is RECOMPUTED, and only then is the
  operation's CONTENT refused if the row is still blocked. The offline edit then ranks itself back
  in and its content write is accepted, demoting something else in exchange - which is what a cap
  means. So the round-4 rule now reads: on a blocked row the permitted writes are the container's
  own delete, AND the ranking timestamp. Those two look unrelated and are the only two things that
  can get a user out of the state
- what refusing the bump was really reaching for is a CLIENT-CORRECTNESS requirement, and it must
  be written into the contract in these words: SEND THE STORED MOMENT OF THE LAST REAL MUTATION,
  NEVER now() AT PUSH TIME. A client that stamps now() on every push makes every row tie at the
  present moment, the ranking becomes noise, and the live set is whatever sorted last
- and that requirement has a second, named victim. Adding a column that differs on every push
  makes every pushed row DIRTY under Hibernate's dirty-checking, where today a re-pushed unchanged
  row produces no UPDATE at all. Every row would then get an UPDATE and updated_at would be
  re-stamped on rows whose content did not change - corrupting the one field whose documented
  purpose is telling clients what changed. Benign if and only if the client sends the stored
  moment and pushes only rows its baseline diff says changed

- CONTENT AND THE TIMESTAMP TRAVEL AS ONE OPERATION - do not split them on the client. A correct
  client never emits a content change for a row it knows is blocked, so it never builds a
  timestamp-only write by accident. The only client that sends both together is one that does not
  know yet - offline when the entitlement lapsed, or a stale build - and for that client the
  combined operation is exactly what makes recovery atomic: the same operation carrying the new
  ranking carries the content the recompute then authorises. Split in two, they could be separated
  by anything else in the batch and the content judged against a rank the bump had not moved yet
- THE SNAPSHOT MUST RETURN modifiedAt, as a field DISTINCT from updatedAt. Keep updatedAt meaning
  when the row arrived; let the new field mean when the user last changed it. If the server stores
  it and never returns it nothing loops - local state and the baseline lose it symmetrically - but
  it hollows out everything the field is for: the client forgets its own ranking after every pull,
  an unsynced install has nothing to derive from once it has synced even once, and no UI can ever
  say WHY a workspace is dimmed
- bump it in the MUTATORS, never in the shared save(). save() is also how a PULL writes the
  account's data over local state, so a bump there would re-stamp every row on every pull - the
  "every row ties at the present moment" failure arriving by the back door
- the filter then falls out of the list of mutators: a user action bumps, a pull does not, and a
  position flip-flop re-derived from insertion order does not, because nothing calls a mutator
  for it

- THE SWAP IS NOW NEARLY FREE, and it was expensive before. "Work in this one instead" on a dimmed
  workspace is exactly a modifiedAt-only upsert, which the server now always accepts and always
  re-ranks on. No new endpoint, no server allowance, no stored preference, no picker - one menu
  item, and the cap does the rest by demoting whatever is least recently used. It is also the
  answer to "the live set freezes for ever once the cap bites". Worth re-deciding in this light

- A BATCH CAN HALF-APPLY AND THE LOSER IS DISCARDED SILENTLY. Recomputing the rank per operation
  means one batch's own operations can demote each other: free cap of 1, four workspaces, user
  edits two of them offline. Bumping A promotes A, bumping B then demotes A again, and A's link
  operations - later in the batch - are refused against a rank that A's own bump had already won
  and lost. Which edit survives is decided by operation order, which is object iteration order and
  arbitrary from the user's point of view. The client logs and lets the next pull fix it, so the
  work disappears with no message. REMEDY on the client, and it belongs in scope rather than
  deferred: surface rejections once in the account menu's status line, which already exists

- AN OLD BUILD PLUS THE POSITION CHURN IS A LOCKOUT NOBODY CAUSED. "Absent means the server stamps
  now()" is right in isolation, but an old build never sends the field AND takes part in the
  position ping-pong. Every one of those pushes re-stamps modified_at to now for the profiles
  involved, so they pin themselves permanently at the top of the ranking and the user's other
  profile is blocked - produced entirely by a disagreement no user ever made. The correct-client
  filter cannot help, because old builds are precisely the ones that lack it. So the CLIENT HALF
  of the two-device settle test should land BEFORE the ranking does, not alongside it

- LIVE BUG FOUND 2026-09-19, worth fixing in the same change: closedAt ALREADY has the wrong-clock
  bug. It is the existing precedent for a client-owned timestamp - stored exactly as sent, never
  replaced by a server clock - but its validation checks only that the value is non-null. No upper
  bound, no lower bound, no clamp. So a device with a bad clock pins its closed tabs at the top of
  the user's list for ever and nothing notices. The bounds helper written for modifiedAt should be
  applied to closedAt too; it is a two-line reuse that fixes something real

- EPOCH MILLIS CONFIRMED EMPIRICALLY, not from memory: the backend was run against its own
  classpath and a bare JSON number deserialises as epoch SECONDS. Sending millis lands the row in
  the year 57687, with no exception, no warning and no validation. Send ISO-8601 strings. The
  clamp above makes the whole class of bug unreachable regardless, which is the real reason to
  have it - a bug already paid for once should not depend on every future client getting units
  right

- TRUST: do NOT over-engineer defences on a client-supplied ranking input. Worked through, a
  hostile client that lies about modifiedAt gains NOTHING in quantity - the cap is N regardless of
  how rows sort - only a choice of WHICH N of its own rows are live. Which is to say the worst
  case is the feature that was rejected as a user-facing setting. No resource gained, no other
  account affected, every row involved already the attacker's own. The clamp and the floor are the
  whole defence; signing or attestation would be cost with no threat behind it
- send it as an ISO INSTANT, never epoch millis - the backend reads a bare number as epoch SECONDS
  and files the row in the year 58664, silently. That bug has been paid for once already
- cost: this is the "new field on an entity" case - five places or it is silently lost. Side effect:
  every link edit now also emits an environment upsert to carry the number, so pushes grow slightly
  and every mutation touches two rows

- "THE ONES YOU WORKED ON RECENTLY" GOES STALE AND STAYS STALE. Because only live rows can be
  modified, the live set FREEZES at the instant the cap takes effect. Six months later the honest
  wording is "the ones you happened to be working on the day you lapsed". And the escape hatch
  inverts again: the only ways back into a blocked workspace are paying, or deleting fresher ones -
  and "fresher" now means "the ones you use". So the instruction becomes "delete your current work
  to get the old one back", which is the oldest-first absurdity moved rather than removed
- PROPOSED FIX, one action and not a setting: allow exactly ONE privileged operation on a blocked
  workspace - "work in this one instead" - which bumps its modifiedAt and thereby demotes whatever
  is currently freshest. A SWAP, not a limit lift, so it cannot exceed the cap. No picker, no
  stored preference, nothing new to configure; it reuses the derived rule and stores nothing beyond
  the timestamp that already exists. Needs the server to accept a modifiedAt-only write on a
  blocked row. It also gives a dimmed workspace something honest to offer besides "buy premium"

- DECISION 11 IS AN UPGRADE-DAY REGRESSION FOR EXISTING UNSYNCED USERS. Someone who has never
  signed in, with 4 workspaces and 2 profiles, loses access to 2 workspaces and 1 profile on the
  day this ships - with no account, no explanation, and NO PURCHASE PATH IN THE EXTENSION AT ALL
  ("upgrade to premium" is still an unimplemented TODO there). The profile cap of 1 is the sharper
  edge: anyone who ever made a second profile is by definition an engaged user
- RECOMMENDED INSTEAD: an install that has never connected an account REFUSES NEW CREATIONS past
  the limit but BLOCKS NOTHING THAT ALREADY EXISTS. A fresh install still cannot pretend to be
  premium - it cannot make a third workspace - and nobody wakes up to find their data greyed out
  by an update. Retroactive blocking begins only once an account has been connected, which is also
  the first moment the user has somewhere to go and something to buy
- the up-front refusal covers FOUR call sites, not one: add workspace, create profile, IMPORT
  profile (creates one as a side effect), and the first-run screen's load-defaults/import

- PRE-EXISTING BUG THAT DECISION 10 WOULD PROMOTE INTO THE RANKING INPUT: two signed-in devices may
  already be fighting over profile `position`, because it is derived from object insertion order
  and the snapshot never reorders the registry. Each device pushes its own positions on every sync,
  each push bumps both profile rows and notifies the other. Invisible today; under last-modified
  ranking it churns the ranking input for ever
- the backend could not falsify it and confirms the server has NO mechanism that would break the
  loop: no normalisation, no conflict detection, no version check, conflicts resolved by arrival
  order. Equal values cost nothing, so the churn requires genuine disagreement - but once two
  clients disagree the server oscillates indefinitely with no symptom
- ANOTHER ARGUMENT FOR THE CLIENT-OWNED TIMESTAMP: a position flip-flop driven by re-deriving
  order from insertion order is NOT a user mutation, so a correct client would not bump modifiedAt
  for it and the churn stays invisible instead of becoming a lockout. Server-stamped ranking has
  no such filter - it sees an UPDATE and stamps it. The honest flip side is that the ranking now
  inherits whatever correctness the client has, which is the real cost of this design
- TWO-DEVICE SETTLE TEST SHOULD BE A RELEASE GATE, not a nice-to-have: decision 10 converts a
  latent invisible churn into a visible loss of access to data. Server half: push an identical
  batch twice and assert no row's updated_at moved; push two conflicting orderings alternately and
  assert it settles. Cheap diagnostic meanwhile: log at DEBUG when a pushed upsert results in an
  UPDATE whose only changed field is position

- FRESH-INSTALL MERGE BLOCKS THE USER'S REAL WORKSPACES AT SIGN-IN - the worst first-run case in
  the feature, and it sits on decision 11's happy path rather than at an edge. A free user with 2
  workspaces used for a year does a fresh install, creates 2 scratch workspaces before signing in
  (allowed - the cap permits exactly that), then signs in. Merged rows are stamped now() on insert
  and the extension has NO updatedAt to supply a truer value, so the 2 scratch workspaces outrank
  a year of real work and the real ones are blocked the moment the user signs in. Recoverable -
  delete the scratch ones and everything returns - but the first impression of signing in is that
  it locked their data. No clean backend fix exists without a client-supplied activity time.
  OPEN, choose one: have the extension defer creating local workspaces until sign-in has been
  offered and declined, or warn before the merge unions, or fix it in the tips wording only
- blocked means VISIBLE BUT LOCKED, never hidden. Hidden reads as data loss and generates support
  mail; the user needs to see what they are paying to get back

- HOW BLOCKING LOOKS IN THE EXTENSION - decided 2026-09-19, extension work, not this repo:
  - an over-limit workspace stays visible and openable, with its button DIMMED
  - inside it nothing is clickable: links do not open, and no editing, renaming or any other
    operation is offered. Read-only in the strict sense
  - DELETING the workspace is the one thing still allowed, and it is the escape hatch: with 4
    workspaces on a free account, deleting the 2 stale blocked ones leaves 2, which are all
    inside the limit. Falls out of the ranking for free, with no unblock job
  - profiles work the same way: an over-limit profile stays accessible, and every workspace inside
    it is read-only
  - the tips panel shows a warning in the danger colour on each restricted workspace, saying what
    the limit is and how to lift it (re-enable premium)
  - so a blocked row DOES still count toward the limit (answering the open question below);
    deletion is what actually frees a slot, because it removes the row rather than hiding it

- RESOLVED 2026-09-19: pushed deletes of blocked rows ARE allowed. No special case, no second
  delete mechanism. Refusing them would produce a ZOMBIE WORKSPACE - the client believes the row
  is gone, the server believes it is present, and the next pull resurrects it. Delete, it comes
  back; delete again, it comes back. A permanent divergence, and far worse than anything allowing
  the delete risks. The protection that actually matters is the invariant we already have: the
  snapshot always stays complete, so no client can mistake a blocked row for an absent one
- log deletes of blocked rows distinctly at INFO with a count per push. If a client ever starts
  mass-deleting them, that line is the difference between noticing in a week and noticing in a
  support ticket
- over-limit CREATES arriving by push must NOT throw. Reject the single operation through the
  channel the protocol already has, with a new FREE_PLAN_LIMIT_REACHED rejection reason, so the
  rest of an offline device's batch still applies. This is also the answer to "a cap added only to
  the REST services lets the extension create unlimited rows by pushing them"
- the only CONTENT write permitted on a blocked container is DELETING THE CONTAINER ITSELF, plus
  the ranking timestamp per the accept-bump/refuse-content rule. Everything else below it is
  read-only from both the REST path and the push
- BUT "the container's own delete" is too narrow as worded, and reads as refusing the very deletes
  the escape hatch emits. A link inside a blocked workspace is itself a blocked row, and the
  client emits explicit deletes for every link, subgroup and group BEFORE the environment. It was
  verified that the server cascades and that deleting an already-absent row is a silent no-op, so
  the hatch does work - but it takes two pushes, and the first comes back as a batch full of
  rejections on the single path we most want clean. Permit a delete of ANY row whose container is
  blocked: one condition on the server, and it keeps the rejection channel meaning "something
  genuinely went wrong"
- the deleting device does not see its own promotion: the push echo is deliberately ignored by the
  origin device, and it cannot recompute blocking locally because it holds neither the rule nor
  the limits. Fix is small - put the blocked id lists on the PUSH RESULT as well as the snapshot.
  General rule: blocking state rides on every response that can change it
- UNSYNCED EXTENSIONS ARE CAPPED AT THE FREE LIMITS - decided 2026-09-19. An extension with no
  account cannot know whether the person is premium, so free limits are the only safe default.
  Cost worth knowing: a PAYING customer doing a fresh install is capped until they sign in. Soften
  it by applying the cap only before any account has ever been connected on that install, and by
  remembering the last known entitlement across a sign-out
- capping each device does NOT solve two unsynced devices each creating workspaces and then
  merging - the collision happens at the join, not at creation. Verified in the extension:
  mergeWithAccount pairs profiles by identity then by name and ProfileMergeEngine.merge is a
  union, so 2 local + 2 remote really is 4. Note this is TRUE TODAY, premium or free - the limits
  do not create the problem, they only make it visible
- the merge needs no new mechanism: merge everything, block the excess by the ranking above,
  nothing is lost and delete still frees a slot. With last-modified ranking the outcome is also
  the right one automatically, so there is no sign-in prompt and no picker
- do NOT refuse a sign-in over a count. Refusing would be far worse than the problem
- keep SEPARATE: the same workspace edited on two unsynced devices is a CONTENT conflict, not a
  count conflict, and the existing protocol resolves it by arrival order. Different problem

- THE CREATION PATH IS NOT COVERED BY ANY OF THIS, AND IT IS THE COMMON CASE. A free user with 2
  workspaces presses "add workspace". Either the server refuses it and the next pull deletes it
  locally - the exact data loss this feature exists to prevent - or the server accepts and blocks
  it instantly and the user is staring at a dimmed, unusable workspace they just made. The
  extension must refuse the action UP FRONT with a message pointing at premium, which means the
  NUMERIC LIMITS have to reach the client, not just the blocked id lists. Otherwise the client
  hard-codes 2 and 1 and drifts. Biggest hole in the design; fix first

- PROMOTION AFTER DELETING DOES NOT HAPPEN BY ITSELF. Three independent reasons, all verified in
  the extension code: (a) a local delete schedules a push only, and the change notification names
  this device as origin so its own echo is deliberately skipped - nothing pulls; (b) even a pull
  may not redraw, because the observable is deep-equal guarded and after a delete the pulled state
  equals local state, so it never fires; (c) even a fired observable does not redraw the
  workspace switcher, which reuses DOM elements by key and never updates their content. As the
  code stands the user deletes two workspaces, the other two stay dimmed, and F5 fixes it - on the
  one interaction the whole design calls the escape hatch. Fix: blocked lists on the PUSH RESULT,
  plus reload the page when entitlements genuinely change (the established idiom there)

- DELETING A WORKSPACE EMITS DELETES FOR EVERY LINK, SUBGROUP AND GROUP BENEATH IT, children
  first. Every one of those is a blocked row. If the backend refuses writes to blocked rows
  without exempting the whole subtree delete, the escape hatch does not work at all

- A REFUSED OPERATION COSTS A PERMANENT RETRY LOOP in the extension as it stands: push() returns
  early on any rejection without advancing the baseline, and the debounced path calls push() alone
  rather than pushThenPull(). So the rejected operation is re-sent on every subsequent push, and
  each push notifies the account's other devices - the two-devices-answering-each-other loop.
  Client-side blocking is therefore NOT merely presentation here. Gate the client properly AND fix
  the debounced path

- OFFLINE EDITS TO A NEWLY BLOCKED WORKSPACE ARE SILENTLY DESTROYED. User edits offline, the
  workspace becomes blocked meanwhile, the push is refused, the baseline does not advance, and the
  next pull writes the account's state over local state with no message. "An account keeps every
  byte" holds for data the server already had; it does not hold for work made on a stale client.
  Decide whether that is acceptable or whether the client must surface it

- TIPS BAR CSS IS IN THE WAY: a rule hides the WHOLE bar when the tip face is hidden, so a warning
  added inside it would be invisible for exactly the users who hid tips. Either make that rule
  conditional on the warning being absent, or put the warning in its own element beside the bar.
  Also: the tips view-model does not know which workspace is open, and a per-workspace warning
  needs that - about 30 lines, and the real cost of the tips item
- "openable but nothing works" reads as a broken extension rather than a paywall. A dead link
  click should SAY why rather than fail silently, and the explanation belongs where the eye is -
  a band across the workspace head, not only in the bar at the foot of a long scroll

- DEVICES ARE IN THE CAPS AND IN NOBODY'S PLAN. The extension IS a device, and there is no wiring
  anywhere for being device 11 - a refused device that keeps pushing is the retry loop above. At
  minimum the account menu must be able to say "this browser is over your free limit"
- CLOSED TABS HANG OFF A PROFILE, not a workspace. The service worker records them continuously
  and they ride along with every push, so a blocked profile would produce refused operations
  forever with no UI anywhere to stop it. Decide explicitly

- TIPS WORDING CAUTION: with 4 workspaces and a limit of 2, deleting ANY two fixes it. The ranking
  only decides WHICH are blocked while the account is over, never whether deleting helps. So the
  warning must say "you have 4 workspaces, free allows 2" and must NOT name particular ones or
  suggest deleting particular ones - the ranking decides which are blocked, never whether deleting
  helps
- DEVICES, resolved: rank by last use, not creation date. The backend already has the query and
  keeps last_used_at on every sign-in, so this is nearly free - and creation order would need new
  logic AND be wrong
- devices must NOT be capped at sign-in. Refusing a sign-in locks someone out of the product on
  the machine in their hand, and the 11th device is by definition the one they are holding. The
  sign-in always succeeds, the new device becomes most-recently-used, and the LEAST recently used
  falls out of the live set and is signed out
- count only devices with a LIVE SESSION, not rows in the device list. The list is a history and
  deliberately keeps rows after sign-out; counting those would block someone who has merely used
  eleven browsers over two years
- the extension has to render the locked state, and so does this site's devices page

- CRITICAL, do not get this wrong: a blocked workspace must STILL APPEAR in the sync snapshot.
  The extension takes the snapshot as authoritative and treats an absent record as deleted, so
  filtering blocked rows out of it makes every client delete them locally, and the next push then
  deletes them on the server. Implementing "blocking" by omission would cause exactly the data
  loss this whole decision exists to prevent - silently, on the user's own devices, with no error
  anywhere. Blocking travels as separate lists of blocked ids; the snapshot itself stays complete
- an older extension that ignores those lists therefore fails OPEN and shows everything. That is
  the correct failure direction, because the server refuses the writes regardless: client-side
  blocking is presentation, server-side refusal is enforcement
- the caps must be refused on WRITE, and there are two independent creation paths for each kind -
  the REST service the website uses, AND the sync push, which does not go through it. A cap added
  only to the services leaves the extension able to create unlimited workspaces by pushing them.
  Writes INTO a blocked workspace must be refused too, or it is not blocked
- blocked rows have no TTL, no sweep and no cleanup, ever. Whoever writes the token cleanup job
  must never generalise it over domain rows
- rank by (modified_at, id), NEVER the timestamp alone. This was nearly lost in relay and the
  argument is STRONGER under the new field than under created_at: the server clamps future values
  to now, so every value clamped in the same instant ties EXACTLY, and a first-contact merge
  inserts a whole device's worth of rows at one timestamp. Without the id tie-break the flicker
  returns on precisely the paths that produce ties
- clamping a fast clock to now also compresses that device's genuine edit ordering into a single
  instant - harmless once the id tie-break is there, meaningless without it
- GRANDFATHERING DECIDED 2026-09-19: do not block anything that already exists. Rows created
  before the effective date are PERMANENTLY EXEMPT from blocking. This was the item that blocked
  enabling the whole feature; it is now answered
- implement it as part of the same derived rule, with no new storage: blocked = not premium AND
  created_at >= effective date AND outside the N most recently modified. The effective date is one
  configured instant, not a per-account flag, so nothing has to be written or backfilled
- note what the effective date does NOT protect, and this is the right line: someone who WAS
  premium, created ten workspaces, and then lapsed created those rows after the date, so they are
  blocked normally. Grandfathering protects people who never had a chance to know a limit existed,
  not people who bought premium and stopped paying
- ANSWERED 2026-09-19: grandfathered rows DO count toward the cap, and creating new workspaces or
  profiles past it is refused. The exemption applies to BLOCKING only, never to COUNTING. So an
  account with 5 grandfathered workspaces keeps all 5 usable for ever and cannot create a 6th
- the reason, and it is the whole point: not counting them would be a loophole that removes any
  motivation to pay. A long-standing free user would never meet a limit and the paywall would
  only ever apply to new users
- THE ONE OPEN QUESTION THE TWO AGENTS DISAGREE ON. Do grandfathered rows consume the N ranking
  slots? Worked on an account with 5 grandfathered workspaces that bought premium, made 3 more and
  lapsed, free cap 2:
  - READING A - rank over all rows, exempt pre-date rows from the outcome:
    blocked = !premium AND created_at >= effectiveAt AND rank > N
    -> 5 grandfathered + the 2 most recently modified premium-era = 7 usable, 1 blocked
  - READING B - grandfathered rows consume slots:
    blocked = !premium AND created_at >= effectiveAt AND rank_among_post_date > max(0, N - pre_date_count)
    -> 5 grandfathered + 0 premium-era = 5 usable, 3 blocked
  - the EXTENSION argues for A: under B every workspace made while PAYING is blocked the moment
    payment stops, and the most recent work is by definition what someone is actually using
  - the BACKEND argues for B: it is the literal reading of "keep what you have, do not grow past
    the cap for free" applied to blocking as well as creation, and under A an account with
    grandfathered rows ends up with MORE free capacity than one without, so holding old rows earns
    new slots
  - NOT DECIDED. It changes user-visible behaviour for a real class of account and must not be
    settled by whoever implements it first

- THE FIRST-CONTACT MERGE DEFEATS GRANDFATHERING FOR THE PEOPLE IT PROTECTS. created_at is
  server-stamped at insert and no client creation time travels in any sync operation, so a
  first-contact merge pushes a device's local-only rows as ordinary upserts and they are inserted,
  and stamped, NOW. An unsynced user of two years who signs in next month therefore has every
  workspace stamped as created after the effective date, none grandfathered, and the newest
  blocked on the spot. That is the upgrade-day regression decision 12 exists to prevent, arriving
  through the one door we most want these users to walk through - and it lands on exactly the
  population decision 12 was written for, since long-standing free users are by definition the
  ones who never connected an account
- FIX, and the cheap one is better: GRANDFATHER EVERYTHING CARRIED OVER AT FIRST CONTACT. The
  account has never seen those rows; they predate the account itself. One condition on the
  server's first-contact path, no new field, nothing for the client to send, and it does not make
  grandfathering depend on a client clock. The alternative - send the client's createdAt and
  honour it, clamped - costs a field through the same five places and does depend on that clock

- THE EFFECTIVE DATE'S ABSENCE IS THE OFF SWITCH, and the default must fail SAFE. If the property
  is unset, nothing is blocked at all - not "no rows are exempt". Backwards, and a deployment that
  forgets one environment variable blocks every existing user's data on the next rollout, which is
  the exact catastrophe grandfathering exists to prevent. Making absence disable the feature also
  means you cannot switch blocking on without having decided the date, and gives the ship-disabled
  posture with no second flag
- the date is SET ONCE AND NEVER CHANGED. Moving it later retroactively blocks or unblocks data
  for every user on the platform, with no deploy-time symptom and nothing that would fail. It
  belongs in the GitOps values file with a comment saying so, and should be handed to
  devops-engineer framed as a migration rather than as one more tunable
- it rides on created_at, the one column in the schema that provably never moves - not updatable,
  no setter, no path that writes it after insert. So grandfathering is a property of the ROW, not
  of the account: one account can hold both exempt and blockable rows, which is what makes "bought
  premium, made ten, stopped paying" resolve correctly with no special case
- CAPTURE THE CLAMP INSTANT ONCE PER REQUEST, not per row. Clamping each row against its own now()
  spreads them by microseconds and orders them by arrival within the batch - arbitrary, and not
  reproducible if the batch is replayed. One captured instant makes the ties real, lets id break
  them deterministically, and makes a replayed batch produce the identical ranking. Fix the id
  direction and write it down; arbitrary is fine, unspecified is not

- THE BLOCKED-ROW RULE, AMENDED THREE TIMES, STATED ONCE. On a blocked row:
  1. the ranking timestamp is always accepted, clamped;
  2. ANY DELETE is always accepted - of anything, not just the container. Refusing a delete
     protects nothing: blocking exists to stop a free account USING and GROWING PAST the cap, and
     a user destroying their own data deliberately does neither. Only containers are capped, so
     deleting links inside a blocked workspace changes no counted number;
  3. every other write is refused.
  Items 1 and 2 are the only two ways out of the state, which is why they are the only exceptions

- NO MONOTONICITY CHECK ON modifiedAt. Do not validate that it never goes backwards, exactly or
  with an epsilon. It would be conflict detection in a system that deliberately has none and
  resolves by arrival order; it would fire spuriously on the microsecond-to-millisecond truncation
  the client's own mapper performs; and the clamp and floor already bound the value to
  [created_at, now], which is all the ranking needs. With no comparison in the code there is no
  comparison to get wrong

- THE HALF-APPLYING BATCH HAS A SERVER-SIDE FIX, and only the server can do it because only the
  server knows the rank. Compute the batch's live set ONCE, before the apply loop, and hold it
  fixed for the whole batch - a read-only pass over the operation list, overlaying the modifiedAt
  values the batch declares onto the account's current ones. Deterministic, order-independent,
  reproducible on replay, no two-phase write
- REFINEMENT that removes most of the remaining pain: judge content against the UNION of the
  pre-batch and post-batch live sets. Cap 1, workspaces A and B both edited offline - A was live
  before, B is live after, both are in the union, so BOTH batches of content apply and nothing is
  rejected, with the final state B live and A blocked. That is exactly what an offline session
  looks like: work in the one you are leaving and the one you are arriving at. Costs one set union

- HONEST LIMIT OF THE CONTENT REFUSAL, worth re-reading if it ever seems to cost too much: it buys
  less enforcement than it looks like, because the snapshot ships every blocked row's CONTENTS to
  the client anyway - that invariant is not negotiable. So a patched client can already USE a
  blocked workspace; what refusal actually prevents is SYNCING new edits in it. The genuine,
  unavoidable enforcement is the container-creation check, and that is the one worth being strict
  about

- THE CLIENT NOW NEVER RANKS, ANYWHERE. Decision 12 plus "an unsynced install blocks nothing, it
  only refuses creation" collapse into one invariant: in every state the extension is ever in,
  blocking is a LIST IT WAS GIVEN, never a computation it performs. A never-connected install
  blocks nothing; one that connected and signed out keeps the last server-provided lists. This
  retires local ranking, local blocked-set derivation, the effective date on the client, and with
  them the whole class of client/server ranking disagreement. modifiedAt is still needed - the
  server ranks on it and it is what makes the offline self-heal work - but the client only ever
  REPORTS it, never sorts by it

- SEND THE USED-COUNTS, NOT ONLY THE LIMITS. The extension has no account-wide view: AppState is
  one profile's data, so counting workspaces across the account means reading every profile's
  storage key one at a time, and a profile this device has never loaded holds data it cannot see.
  The server computes those counts anyway to derive the blocked lists, so send environmentsUsed /
  environmentLimit, profilesUsed / profileLimit, devicesUsed / deviceLimit. The client then
  refuses by comparing two numbers it was given, and the message can state real figures - which is
  what makes the grandfathered case comprehensible rather than reading as a bug
- RESOLVED by the extension: it does not matter. Free allows ONE profile and premium is uncapped,
  so "workspaces across the account" and "workspaces in this profile" coincide for every account
  the limit can bite. Counting is O(1) off the loaded profile
- (superseded question) is the workspace cap PER ACCOUNT or PER PROFILE? For a free user it cannot matter, because
  the profile cap is 1. It bites only for the population decisions 12 and 13 just created - a
  grandfathered user with two or three profiles. Per-profile is dramatically cheaper for the
  client. Settle it explicitly rather than by implementation accident
- the refusal has TWO wordings that cannot share a sentence: at the cap ("free accounts can have 2
  workspaces"), and over the cap while grandfathered ("you have 5 and they all keep working; free
  accounts can create up to 2, so adding another needs premium"). The second is the one nobody has
  written and the one most likely to read as a bug if it is worded like the first

- CONSEQUENCE for the extension: the up-front creation refusal is the ONLY thing a grandfathered
  user ever sees of the limits. No dimming, no read-only state - just a refusal at the moment they
  try to create. That makes the wording of that refusal far more load-bearing than it looked as
  one signal among several, and it makes the numeric limits reaching the client non-negotiable
- NOT IMPLEMENTED YET - decided 2026-09-18

### Admin premium grant: must not write the flag directly
- the operator's grant/revoke checkbox is DONE on this site (admin DTO mirrors, edit and create
  forms, a column in the account list)
- BACKEND CONSTRAINT: it must NOT write app_user.premium directly. It goes through the single
  writer, which creates or removes a LIFETIME subscription row with provider = MANUAL_GRANT, and
  the column is updated as a consequence. Writing the column from the admin path re-creates the
  floating-flag problem - a premium: true with nothing behind it, which nothing can later prove
  right or wrong

### Right of withdrawal: 14 day full refund
- full refund within 14 days of purchase, no reason needed, nothing deducted for days used
- deliberately more generous than EU law requires, which is why NO consent checkbox is needed at
  checkout - the checkbox only ever buys the right to charge pro-rata, and we are not charging it
- the pre-contractual NOTICE is still mandatory though: it is on the purchase form already, and
  omitting it stretches the withdrawal window from 14 days to 12 months and 14 days
- DONE on this site: a "Get a refund" button on the account page, shown while the backend says
  `refundable`. Two-step confirmation, no reason asked - asking for one would be a condition on
  exercising a right that has none
- backend still needed: the `refundable` flag on the subscription status (it is a deadline, so it
  must be computed server-side, never against the browser clock), and a refund endpoint that calls
  the gate's refund API. Both `refundable` and `refundableUntil` are already in the frontend model
- a refund must NEVER be refused for being over the free limits. A statutory withdrawal right
  cannot carry conditions - blocking is the only available answer on that path
- the 30 day grace period must NOT apply to a refund. That grace is for a FAILED RENEWAL, where
  the user probably still wants the product. A refund is the user saying they do not. Letting the
  two meet gives a month of free product to anyone who asks for their money back
- OPEN: refund-and-rebuy on LIFETIME is free premium forever - buy, use 13 days, refund, buy
  again. The amounts being small is exactly why someone would automate it. Fix cheaply: one refund
  per account, or refuse a new purchase for N days after one
- OPEN: does the 14 day refund apply to every annual renewal, or only the first purchase?
- still missing: a refund policy page, and the order confirmation email on a durable medium

### Money operations: everything not yet built
Consolidated 2026-09-19 from the billing design. The site already renders the purchase form, the
refund button and the cancel panel, all behind flags no backend serves yet, so every item here is
backend or non-code unless it says otherwise.

CHECKOUT
- POST /api/v1/billing/checkouts, bearer token. Request is {plan, countryCode}; response is
  {checkoutId, redirectUrl, provider, expiresAt}
- the browser reaches redirectUrl by TOP-LEVEL NAVIGATION, never fetch - it is cross-origin and a
  payment gate sends no CORS headers
- the backend picks the provider from the country: GoPay inside the EU, a merchant-of-record
  outside it. The website sends a bare ISO code and nothing else, because the EU list is really a
  list of TERRITORIES and any version of it in a public bundle is a tax bug shipped to every
  browser that cannot be recalled - and one the buyer could edit, which means choosing who carries
  the tax liability
- 409 when a live subscription or an outstanding checkout already exists, returning the existing
  checkoutId so the page can resume rather than double-charge

THE WEBHOOK IS WHAT GRANTS PREMIUM - not the browser coming back
- POST /api/v1/billing/webhooks/{provider}, no bearer token, verified by provider signature. The
  frontend must never call it and must never be able to
- read the RAW BODY for the HMAC before Jackson touches it; be idempotent on the provider's event
  id; re-verify the payment server-to-server before granting anything
- register the signature filter CONSTRUCTED, not as a @Bean, or Boot's servlet auto-registration
  runs it a second time outside the security chain. Add its path to the public endpoints; do NOT
  add it to the CORS origin list or its headers to the allowed request headers
- highest-risk piece in the whole feature

THE RETURN PAGE is a completely separate thing from the webhook, and carries NO authority
- a route on this site, /account/purchase/return?checkoutId=..., which only says which checkout to
  poll. NOT YET BUILT ON THIS SITE
- it polls GET /api/v1/billing/checkouts/{id}, backing off, capped around a minute
- it must render THREE outcomes: succeeded, failed, and STILL PENDING - and pending is the COMMON
  case, not an edge case, because the webhook and the browser race and the webhook usually loses
- once the backend pins the path as a property, renaming it becomes a two-repo change like the
  activation and reset paths. Choose the name to keep now

RENEWAL, AND THE ONLY THING THAT EVER REVOKES ANYTHING
- renewal should be the GATE'S own annual recurrence, not our cron. Charging a stored card from
  our scheduler makes us responsible for the PSD2/SCA exemption chain
- BUT THE EXPIRY SWEEP IS STILL MANDATORY, and it is the single most forgettable item here: a
  renewal that does not happen is a NON-EVENT. No webhook fires, because the gate has nothing to
  report. Only a clock on our side can notice. Build read-state and checkout without the sweep and
  every expiry becomes permanent free premium
- hourly, fixed delay, plus once at startup. Past its period end: CANCELLED -> EXPIRED; ACTIVE ->
  PAST_DUE, keeping premium true through the 30 day grace
- while PAST_DUE, RE-QUERY THE PROVIDER for the real state of the period. Never treat "no webhook
  arrived" as "no payment happened" - webhooks are lost, retried and delivered out of order. This
  step is what makes the whole thing self-correcting
- DOUBLE-CHARGE HAZARD: the scheduler runs in every replica and there is no leader election. Two
  pods charge the same card in the same instant. Needs all three: SELECT ... FOR UPDATE SKIP
  LOCKED to claim rows, an idempotency key derived from (subscription_id, period_end) so a retry
  of the same period can never become a second charge, and fixedDelay rather than fixedRate
- DUNNING: retry around day 1, 3 and 7, a reminder email on the first failure and a final notice
  before expiry. Silently forgotten in most first passes

PRICES COME FROM THE SERVER, ALWAYS
- GET /api/v1/billing/plans?countryCode=, returning amount, currency, tax-inclusive flag, period
- NO price literal in the Angular bundle and none in public/i18n. A price in a public bundle
  drifts from what is actually charged the first time VAT or currency differs by country
- the purchase form currently shows no price at all, deliberately, for this reason

ACCOUNT DELETION MUST CANCEL THE PROVIDER-SIDE RECURRENCE FIRST
- the real hazard is not the foreign key, it is the provider: deleting the account drops the local
  row while the mandate at the gate KEEPS CHARGING THE CARD, and the customer now has no account
  to cancel from
- so DELETE /api/v1/users/me gains a step, ordered deliberately: cancel at the provider, and fail
  the deletion if the cancel fails. It is a network call inside a transactional method
- payment_order must SURVIVE the deletion - invoice retention runs to years - so user_id is
  nullable with ON DELETE SET NULL and the buyer's email is denormalised onto the row. Everything
  else in the schema cascades from the user; billing must not follow that reflex wholesale

REFUNDS - the site half is DONE, the rest is not
- POST /api/v1/billing/subscription/refund, empty body, returning the updated status
- a refund is ASYNCHRONOUS: the gate confirms by webhook, so the button says "on its way", not
  "refunded". Entitlement ends IMMEDIATELY though - take the feature away at request time, give
  the money back when the gate says so. That asymmetry is deliberate and in the user's favour
- payment_refund is its own table, one row per money movement. Reversing the order row in place
  destroys the record of what was actually charged, which is the thing an accountant wants
- subscription state becomes REFUNDED, not CANCELLED: cancelled means "paid up until the period
  end", and a refunded buyer has been paid back, so they are owed nothing
- premium goes false immediately with NO grace. The 30 day grace is for a FAILED RENEWAL, where
  the user probably still wants the product

NOT A CODE PROBLEM, BUT IT CONSTRAINS THE CODE
- invoicing, VAT reporting and OSS registration are an accounting decision. The EUR 10 000
  threshold is about VAT place-of-supply and is unrelated to withdrawal rights, which apply from
  the first euro
- GoPay is a PSP and NOT a merchant of record, so on the EU route the owner is the seller and
  carries the invoices, the VAT registration, the refunds and the consumer-law duties themselves.
  Only the non-EU MoR route offloads that. Worth weighing against GoPay's lower fee
- still missing and not buildable by guessing: a refund policy page, and the order confirmation
  email on a durable medium restating the contract

### Product presentation homepage
- homepage screenshots, text, extension presentation

### Product presentation and media for google chrome store


# Ideas

## Rename app to MyLinks
- user can share its links collections as readonly to outside world using webpage
  - can make it absolutelly public
  - or acessible only via link
  - or via link and password
  - have a profile picture and short description
  - do not add other content or widgets, it is not going to be another social network
  - the shared links = profile that was made public


# DONE

### Connection code copy to clipboard widget
- small square with rounded corners icon next to the connection code with scissors logo
- done: a square accent button carrying U+2702 sits beside the code and copies it with the
  Clipboard API; both outcomes are worded in the view-model and announced in a live region,
  because the API can refuse for reasons that have nothing to do with the page

### Back buttons
- especially in sections like cookies & gdpr which are not in top menu, back button is more than expected
- done: a shared `app-back-button` on the gdpr, cookies and sitemap pages. It goes back through
  the browser's own history, except when this page is the only entry in the tab — arrived at from
  a bookmark or a search engine — where back would do nothing at all and it goes home instead

### Bring synchroniation into chrome extension finally
- as we said and did, synchronization is going to be performed using obtained sync code
- chrome extension have menu widget in top panel on the right (three dots)
  - there should appear menu items like "Log in", "Register", and "Enter sync code" for user that is not logged in (extension that is not synced)
  - for logged in user, there should be items like "Log out"
- If user is logging into extension that have some links already added to the same profile as "data on the backend", then:
  - merge groups and links, implement some separate class or module handling migration logic
  - if there are for example two exact same links with exact same name in the same group or subgroup, do not add them duplicitly
  - in another case, if there are two duplicates with differen name, keep both
- connect to a backend according to specification
- connect to the websocket link or implement it if it is not implemented on backend yet - the websocket should only perform ping if there is new content on the backend for given user
  - this user experience is primarily in case user rusn mutiple browsers or workstations at once
- otherwise check for new content only when browser first opened, then websocket should work i guess - i do not want to wreck my backend by requesting endpoint that should provide info
  if there is something new on each tab open
  - check who has new content - if it is extension or backend and merge respectivelly
- if content changes in some computer or browser (new link, rename, order change, anything that changes data), then send that change to the backend in the moment when it happens
  - make this somehow non-blocking the user if for example is currently offline

### Device name
- for work after synchronization is implemented into chrome extension actually
- implement device (or rather say installation ?) name to each chrome extension that user is installing typed by user alongside connection code
- ~~make it required~~ **softened: naming is optional.** A user who does not care types nothing
  and keeps the automatic label, which is what the extension already sends. The point of the
  field is to let somebody who runs several browsers on one machine tell them apart, and that
  is a want, not an obligation - making it mandatory would tax every user for a problem only
  some of them have
- if user type name that is already in device list as online, show him warning and ask him what to do (cancel / rename / overwrite)
- **the identity half is already done, separately from this task.** Two Chromium browsers on one
  machine used to be recorded as one device, because a device was keyed on the name it sent and
  neither the device name (built from a frozen `navigator.platform`, which names the OS) nor the
  browser name (parsed from a user agent Chromium forks impersonate Chrome in) can tell them
  apart. They shared a row, so signing one out signed out both. A device is now keyed on the
  installation id the extension has always minted for itself, and the name is only a label.
  What is left here is therefore the *naming*, not the identity
- decided: "overwrite" on a name clash means the new installation **takes over the existing device
  row** - its history and first-seen date survive and the old installation is signed out. That is
  the "I reinstalled on this machine" case, which is what the word was reaching for
- blocked, one clause only: "will not be counted into free account limits" needs the
  **User payment & pro features** task below. There are no device limits in the code yet, so
  there is nothing to exclude a signed-out device from
- if is in list but as logged out:
  - will not be counted into free account limits
  - just inform user (after connection) that this device was once logged out (welcome back)

### Repurpose download section to how to / install section
- with images & dumb tutorial
