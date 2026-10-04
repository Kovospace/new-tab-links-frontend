# Account limits handling

Limits are handled first by the extension wherever it can, and validated by the backend.

Branch in every repo: **`feature/general-limits-refactor`**, built on what PRs #36/#37 (backend),
#67/#68 (extension) and #40/#41 (frontend) already did. Those PRs are superseded by one PR per repo.


## 1. Size of limits

| Limit | Free account | Premium (Fair Use Policy) |
|---|---|---|
| Profiles per account | 1 | 50 |
| Workspaces per profile | 2 | 50 |
| Groups per workspace | FUP | 25 |
| Subgroups per group | FUP | 25 |
| Links per workspace | FUP | 500 |
| Closed tabs kept in the history | 25 | 500 |
| Synchronised installations | 5 | 100 |

- Free means: not signed in, or signed in to an account that is not premium. Where the free
  column says "FUP", the premium number applies.
- Workspaces are counted **per profile**, everywhere - extension and backend alike.
- The closed-tab history is not a slot and is never refused: it keeps the newest 25 (free) or
  500 (premium), and the oldest drop off as new ones arrive. The free 25 is there to make the
  paid version worth having. After premium ends, a longer history shrinks only as new tabs are
  closed - the way any history rolls - never all at once on the downgrade itself.
- The numbers live in one place per repo. The backend also **sends the effective limits to the
  extension** (with the account's standing), so the extension's compiled numbers are only the
  default for an installation that is not signed in. Changing a limit later must not need an
  extension release.


## 2. Slots: what synchronises

### "First" means first to take a slot

- The limits are slots. Whatever is already synchronised holds its slot; a device that brings
  more than the slots left gets nothing synchronised beyond them.
- When data was created or modified is irrelevant. Only who took the slot first counts.
- Examples, free plan (1 profile, 2 workspaces):
  - the first synchronised installation fills the profile with two workspaces - the quota is full
  - the first installation synchronises one workspace, a second installation the other one - the
    quota is full, and a third installation with the same profile name and a third workspace is
    unlucky: that workspace stays local only
- The slots belong to the account, not to a device: whatever the account holds is first.
- The order is the backend's `createdAt`, stamped when an item first reached the server.
  Profiles: the account's first N profiles hold slots. Workspaces: the first N workspaces of a
  slot-holding profile hold slots; a workspace under a profile without a slot holds none.

### Who decides: the extension

- The backend lists the account's profiles and workspaces without their content
  (`GET /api/v1/profiles`, `GET /api/v1/environments`).
- Before a push the extension reads both lists, works out the slot-holders, and pushes only what
  holds a slot or fits into a free one. The rest stays local only and is marked unsynchronised.
  The backend never accepts half a push.
- A pull applies the account's data **only to what holds a slot** and never touches local-only
  data. Today a pull replaces a profile with the account's copy, which would delete a local-only
  workspace ("Sync silently deletes a record the server refused" in `TODOS.md`) - this is fixed
  first, or "never delete" does not hold.
- A fresh installation signing in downloads only what holds a slot.

### The backend validates

- It refuses creating a profile or workspace beyond the plan's slots.
- It refuses writes into a profile or workspace that holds no slot (and into its groups and
  links), by the same `createdAt` order - otherwise data left over after premium ends would
  still synchronise its edits.
- It refuses adding groups, subgroups or links beyond the Fair Use caps of their container.
- Both sync push and the REST endpoints are guarded; a push is checked on its end state, under
  the account-row lock (as built in #36).
- Refusal: HTTP 409 with top-level `code` (`FREE_PLAN_LIMIT_REACHED` | `FAIR_USE_LIMIT_REACHED`),
  `limit` (`PROFILES` | `WORKSPACES_PER_PROFILE` | `GROUPS_PER_WORKSPACE` | `SUBGROUPS_PER_GROUP`
  | `LINKS_PER_WORKSPACE` | `DEVICES`), `maximum`, and `manageUrl` (the website's devices page,
  from configuration - the extension does not hardcode the site).
- With the extension deciding first, a refusal only comes from a race: two devices taking the
  last free slot at once. The extension re-reads the lists and pushes again without what lost.
  That cannot loop - the second push no longer contains it.


## 3. Never delete

- Data over a limit is NEVER deleted, hidden or locked for editing on the device that holds it.
- It stays local only, and the user is told which data is synchronised and which is not.
- On a device that is over a limit, nothing more of that kind can be added until it is back
  under the limit.


## 4. When premium ends

- The same "first" rule: only the free plan's slots keep synchronising, and they go to what was
  synchronised earliest. Everything else stays in the account and on its devices, untouched, but
  stops synchronising.
- Devices that already hold the rest keep what they have, as their last synchronised copy.
- The user sees it through the unsynchronised icons and messages. That pressure is intended - it
  is what may bring them back to premium.
- Installations beyond 5, in the order they first signed in, are signed out with the same
  message as a refused sign-in (section 9).
- After upgrading again, everything local only starts synchronising on its own, slot by slot.


## 5. Fair Use caps

- At a cap, adding that kind of data is not allowed - and the cap is local to where it was
  reached: 500 links stops new links in that workspace only, not anywhere else. Same for groups
  in a workspace and subgroups in a group.
- Tell the user what they have reached, and link to the Fair Use Policy page (`/fair-use`), which
  also says how to ask for a raise.
- A workspace that ends up over a cap anyway - through a merge, where adding could not be
  prevented - stops synchronising as a whole. Never half: no workspace is ever partly
  synchronised.
- The Fair Use Policy page and the home page's price table are updated to the table in section 1
  (groups, subgroups, 100 installations, 50 workspaces *per profile*); the premium columns'
  "UNLIMITED" installations get the asterisk. The price table gains a closed-tab history row:
  25 on free, 500 on premium.


## 6. Merging an installation into an account

- Matching by name happens only at **first contact** of an item. A rename of something already
  synchronised propagates as a rename, as today - that ability must not be lost.
- First contact is per item: a profile or workspace that has never been synchronised (local only)
  is still at first contact. So renaming a local-only profile to the name of the account's profile
  makes the next sync match and merge it - which is the advice the user is given (section 10).
- Profiles match by name; workspaces by name within the matched profile. Duplicate links (the
  same address in both) are joined the way the merge joins them today.
- If a merge would push something over a Fair Use cap, the merge of that item stops: it stays
  local only, and the user gets an error advising them to audit (the devices page) or to ask for
  a raise as the Fair Use Policy describes.


## 7. Example data

- A flag on each profile and workspace says whether it is still **example data**: created from
  the start screen and still a 1:1 copy of the template - same structure and same order.
- Any change the user makes clears the flag for good, and the data becomes the user's own.
- Example data is never synchronised, and is shown on screen as example data that does not
  synchronise until edited.
- Untouched example data is removed when the installation signs in to an account.
- While it is on the device, example data counts toward the local limits - it is real data on
  that screen. It stops counting once removed at sign-in or deleted by the user.
- Once it is the user's own, the ordinary slot rules apply.


## 8. The extension without an account

- It is a free account: the free limits apply.
- An installation that was signed in to a premium account and is over the free limits by its
  content keeps everything, but cannot add more of that kind until it is back under the limits.
- An installation still under the free limits, about to do something that would go over them, is
  asked to sign in to an account that has premium, or to create one and upgrade.


## 9. Synchronised installations

- A synchronised installation is a signed-in extension installation. Counted are installations
  signed in now - never rows: the device list keeps history after sign-out.
- Signing in past the limit is refused, with a message saying why and what can be done: sign out
  of another installation on the devices page (`manageUrl`), or upgrade.
- The website's own sign-in never counts.


## 10. Telling the user and letting them audit

### Inventory reporting (extension → backend)

The server never sees local-only data, so each installation reports what it holds:

- `PUT /api/v1/users/me/devices/current/inventory` (the installation from its session /
  `X-Installation-Id`), after a sync cycle whenever the inventory changed since the last report.
- Body: per profile - its account id (or null when local only), name, sync state; per workspace -
  its account id (or null), name, sync state, number of groups, subgroups and links.
  Sync state: `SYNCHRONISED` | `LOCAL_ONLY_FREE_LIMIT` | `LOCAL_ONLY_FAIR_USE` | `EXAMPLE`.
- Names and counts only - never a link, a URL or a group name.
- The extension decides the states; the backend stores the report as it is, with its time.
- Stored with the device (a new column or table - a migration in `new-tab-links-migrations`),
  replaced by each report, deleted with the device and with the account.
- The privacy policy gets a line: profile and workspace names and counts of an installation are
  sent to the account, including data that does not synchronise, so the devices page can show it.

### Website

- `/devices`: one more column, the installation's synchronisation state:
  - SYNCHRONISED
  - PARTIALLY - over the limit
  - NOT SYNCHRONISED - over the limit
  - (no report yet)
- A detail page per device (`/devices/<id>`, signed in, not indexable): its profiles, each with
  its sync state and its workspaces - sync state, number of groups, total number of links.
- So a user who does not want to upgrade, or is over a Fair Use cap, can audit where they are
  bleeding out.

### Extension

- A crossed-out sync icon on every profile that is not synchronised: in the profiles menu and in
  the profiles manager.
- For a workspace that is not synchronised: a warning where the "you are signed out" message
  normally sits, saying why, with buttons to the website's account page (upgrade) and devices
  page (audit).
- When a second installation's profile or workspace stays local only because of a different
  name: the advice that renaming it to the account's name merges it (section 6).
- At a Fair Use cap: what was reached, and a link to `/fair-use`.
