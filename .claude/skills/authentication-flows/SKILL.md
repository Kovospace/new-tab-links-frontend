---
name: authentication-flows
description: How this website signs users in and keeps them signed in - the three backend sign-in paths, the Google redirect chain, the extension pairing code and where it lives, token storage, the refresh-on-401 interceptor, route guards, and the backend endpoints and route paths that must not drift. Load before touching anything under core/auth, the login, register, activate, reset-password or OAuth callback pages, or the devices page.
---

# Authentication flows — NewTabLinks frontend

The backend owns identity; this website is one of its clients. Everything here mirrors the
backend's `authentication` skill — when the two disagree, the backend is right.

## Three ways in, one kind of session out

```
CLASSIC                      GOOGLE                        EXTENSION
register form                "Continue with Google"        extension's own form
   |                            |                             |
POST /auth/register       GET /oauth2/authorization/google     |
   |  202, uniform wording     |  full page redirect           |
   |  activation mail          v                               |
   v                     backend + Google + backend            |
GET  /auth/activate            |  redirects to                 |
   |  from the mailed link     v  /auth/callback?code=…        |
   |                     POST /auth/session-handoff            |
   |                           |                               |
   |                    POST /auth/extension-connect-codes     |
   |                           |  user reads "4F2K-9QX1"  -->  |
   |                           |                    POST /auth/extension-connect
   v                           v                               v
              ----------  TokenPairDto  ----------
              access JWT (~15 min)  +  refresh token (30 days)
```

Only the first two are this website's business. The third column is the extension's, and this
site's only part in it is minting the code.

## Where each piece lives here

| Concern | File |
|---|---|
| All sign-in and sign-out calls | `core/auth/authentication.service.ts` |
| Who is signed in, as signals | `core/auth/authentication-session.store.ts` |
| Where tokens are persisted | `core/auth/session-storage.service.ts` |
| Bearer header + refresh-on-401 | `core/auth/authentication.interceptor.ts` |
| Route protection | `core/auth/authentication.guards.ts` |
| Minting the pairing code | `core/user/user-device.service.ts` |

## Decisions already made — do not silently revisit

**Google sits on both the login and the register page, and it is the same button.** The backend
finds the account behind the Google identity or creates one, so "register with Google" and "sign
in with Google" are one operation. Splitting them into two controls that call the same endpoint
would be a lie told twice.

**The extension pairing code lives on the devices page, not on login or register.** Minting it
requires a valid access token (`POST /auth/extension-connect-codes` is authenticated), so nobody
looking at the login page could ever use it. It is not a way in; it is something a signed-in user
does to bring one more browser along, which is exactly what the devices page is about. It matters
most for accounts created through Google, which have no password and therefore cannot use the
extension's own username-and-password form at all.

**Google sign-in is a full page navigation, never a fetch.** `startGoogleSignIn()` assigns
`location.href`. The flow is a redirect chain through Google that no `XMLHttpRequest` can follow,
and the backend — not this site — decides where the browser lands.

**Tokens live in `localStorage`.** The alternative, an http-only refresh cookie, needs the backend
to set cookies for this origin and it does not. The decision is isolated in
`SessionStorageService`; if it changes, only that file changes.

**A 401 triggers exactly one refresh, then the original request is replayed.** Access tokens last
about fifteen minutes, so an open page meets an expired one during any normal visit. Requests
marked `SKIP_AUTHORIZATION_HEADER` are exempt — those are the endpoints that hand out tokens, and
refreshing a refresh would recurse. Covered by `authentication.interceptor.spec.ts`.

**Refresh tokens rotate.** Using one revokes it, so the new pair must replace the old immediately
— which is why `AuthenticationService` updates the store itself rather than leaving it to callers.

**Uniform backend wording is shown as received.** Registration and password-reset answers are
deliberately identical whether or not the address exists. Replacing that text with wording of our
own would turn either form into a way of discovering who has an account.

## Three route paths the backend pins

The backend builds the links it mails and the address it redirects to from its own configuration.
Renaming one of these routes without changing the matching backend property breaks every mail
already sent:

| Route (`core/routing/application-route-paths.ts`) | Backend property |
|---|---|
| `activate` | `newtablinks.web.activation-path` |
| `reset-password` | `newtablinks.web.password-reset-path` |
| `auth/callback` | `newtablinks.web.oauth-callback-path` |

## The dev-server port is not arbitrary

The backend defaults to `http://localhost:5173` for both `newtablinks.web.base-url` and its
allowed CORS origins, so this project's dev server is bound to **5173** in `angular.json` rather
than Angular's usual 4200. Change one side and the other has to follow, or every mailed link
lands nowhere and every API call is refused by CORS.

## Backend behaviour worth remembering

- **Only `ACTIVE` accounts authenticate.** A freshly registered account is `PENDING_ACTIVATION`
  and cannot sign in until the mailed link is followed.
- **Setting and changing a password are one endpoint.** `currentPassword` is required only when
  the account already has one; `UserDto.hasPassword` is what tells this site which to offer.
- **Every password operation signs every device out**, this browser included. Say so in the UI
  before the button is pressed.
- **A device is `(deviceName, browserName)` within one account**, and the device list is a
  *history*: a row stays after sign-out. `signedIn` distinguishes them.
- **Someone else's row is reported 404, never 403.** Do not write UI that treats 404 on a device
  or account as "gone" in a way that leaks whether the id was real.
- **The website labels its own sessions** through the optional `X-Device-Name` header, sent only
  on the endpoints that issue tokens.
