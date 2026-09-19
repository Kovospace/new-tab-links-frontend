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
- OPEN: is the workspace cap PER ACCOUNT or PER PROFILE? For a free user it cannot matter, because
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
