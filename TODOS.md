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
