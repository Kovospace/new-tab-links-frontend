# Serving this dev server on the real domain — mirrord

**Read this first: you almost certainly do not need it.** The normal way to develop this site
against real backend data is to put *the backend* inside the cluster, not this site — see
`~/IdeaProjects/new-tab-links-backend/.mirrord/README.md`. That gives a local backend the
deployed Pod's Infisical secrets, database and mail relay, and this repository then runs
completely unchanged:

```bash
cd ~/IdeaProjects/new-tab-links-backend && mirrord exec -- ./mvnw spring-boot:run
cd ~/IdeaProjects/new-tab-links-frontend && npm start        # no mirrord
```

mirrord relocates a **local process** into the cluster. `ng serve` is a local process, but the
thing that calls the API is the visitor's *browser*, which is outside mirrord's reach — so
running the dev server under mirrord does nothing for CORS, cookies or data access on its own.

## What `steal.json` is actually for

One thing, and it is worth having: **serving this dev server at
`https://new-tab-links.matejkovac.sk`**.

```bash
mirrord exec -f .mirrord/steal.json -- npm start
```

Requests arriving at the real Ingress are taken from the deployed Pod and answered by `ng serve`
instead — through the real DNS, the real Let's Encrypt certificate and the real origin. That
buys you the things a `localhost` dev server can never have:

- **the real origin**, so `SameSite`/`Secure` cookies and the OAuth redirect behave exactly as
  they do in production, with no CORS exception anywhere;
- **HTTPS with a valid certificate**, so anything gated on a secure context works;
- **reachability from another device** — a phone, or a colleague — pointed at the public URL.

`port_mapping: [[5173, 8080]]` is what connects the two: `ng serve` listens on **5173**
(`angular.json` sets it; it is not Angular's usual 4200), while the deployed container serves
nginx on **8080**, and it is 8080 that the Service and Ingress send traffic to.

## This is an outage while it runs

There is no header filter here, and there cannot usefully be one — a browser loading a page will
not add a custom header. So **every** visitor to `new-tab-links.matejkovac.sk` is served from
this machine for as long as the session lasts, including a cold, unoptimised dev build. Stop it
when you are done; the deployed Pod takes over again immediately with no cluster change.

If you want the filtered, non-disruptive version anyway, add

```json
"http_filter": { "header_filter": "(?i)^x-mirrord-steal: 1$" }
```

next to `"mode": "steal"` and use a header-injecting browser extension such as ModHeader.
Unmatched requests then go to the real Pod as usual.

## Which backend it talks to

`ng serve` ships no `config.json`, so the app falls back to `DEFAULT_RUNTIME_CONFIGURATION` in
`src/app/core/config/runtime-configuration.ts` — `backendBaseUrl: http://localhost:8080`. That
still works while stealing, because the browser resolving `localhost` is *your* browser. Pair it
with the backend running under mirrord and you have the real data.

To point it at the deployed API instead, drop a `public/config.json` with
`"backendBaseUrl": "https://api.new-tab-links.matejkovac.sk"` and remember that the deployed
backend's CORS list contains `https://new-tab-links.matejkovac.sk` — which, while stealing, is
exactly the origin the browser is on. It works, and it is the one configuration where the
website and the API are both production.

> A page served from another device will *not* reach `http://localhost:8080`, since that resolves
> on the device. Testing on a phone means the `public/config.json` route.

## Why there is no `mirrord.json` here

`.mirrord/mirrord.json` is what `mirrord exec` and the IDE plugins pick up with no `-f`. There is
no sensible default for this repository — mirror mode would hand `ng serve` copies of requests it
has nothing to do with — so the file is deliberately absent and stealing must be asked for by
name.

## Requirements

The mirrord CLI, a kubeconfig for the cluster and the SSH tunnel, all set up once:
`~/IdeaProjects/kovostack-infra-gitops/docs/mirrord.md`. Nothing is installed in the cluster.

## Why there is no `$schema` key

mirrord's config schema sets `additionalProperties: false`, so a `$schema` line at the top of
these files is an unknown field and is rejected rather than ignored. Editors that want
completion should be pointed at
`https://raw.githubusercontent.com/metalbear-co/mirrord/main/mirrord-schema.json` through their
own settings instead. These three files were validated against that schema on 2026-09-03.
