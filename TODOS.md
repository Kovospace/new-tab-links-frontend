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
- explore how chrome store works and how to pair user with user payment
- explore how to check if payment is still in charge - user will probably be paying monthly

### Premium lapse: 30 day grace period
- when a yearly subscription is not renewed (forgotten card, bank hiccup, gate did not charge),
  keep the account premium for 30 more days instead of downgrading it on the expiry date
- warn by email every week during those 30 days
- the renewal itself should be the payment gate's own annual recurrence, not our cron - see the
  PSD2/SCA and double-charge notes in the backend design
- NOT IMPLEMENTED YET - decided 2026-09-18

### Downgrading must not silently destroy data
- premium lifts the free limits (2 workspaces, 1 profile, 10 devices), so an account coming off
  premium can be holding more than the free plan allows
- VOLUNTARY cancellation: refuse it until the account is back inside the free limits, and tell the
  user exactly what has to go. This is the case the owner asked for
- INVOLUNTARY lapse (expiry, failed card) cannot be refused - nobody clicked anything. DECIDED:
  never delete anything. After the 30 day warning period the excess is BLOCKED, not removed,
  and the rule is by creation date - the oldest rows up to the free limit stay usable, everything
  newer is locked. Paying restores access in full
- the lock should be DERIVED, never stored. "not premium AND older than the Nth oldest" is a rule
  that needs no writer, so paying restores access with zero writes and nothing can go stale. A
  stored `locked` flag would need writing on lapse and unwriting on payment, which is the same
  denormalisation trap as the premium flag itself
- blocked should mean visible but locked, not hidden. Hidden reads as data loss and generates
  support mail; the user needs to see what they are paying to get back
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
- rank by (created_at, id), never created_at alone - a sync push can create several workspaces in
  one transaction, and a tie that resolves differently per request makes the blocked one flicker
- OPEN, blocks enabling this: GRANDFATHERING. The day the limits switch on, every existing account
  already holding 3 workspaces or 11 devices has data blocked overnight, with no purchase and no
  lapse. Options: exempt rows created before an effective date, a per-account exemption flag, or
  warn by email with a window. Build it behind config and ship it DISABLED until this is answered
- OPEN: a blocked row must still count toward the limit, or blocking one frees a slot and the next
  one unblocks - an oscillation
- NOT IMPLEMENTED YET - decided 2026-09-18

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
