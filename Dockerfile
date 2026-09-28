### ---------------------------------------------------------------------------
### NewTabLinks frontend
###
### Multi-stage: a Node image builds the Angular bundle, an unprivileged nginx
### image serves it, so the shipped image carries no Node, no npm and no sources.
###
### Built by .github/workflows/docker-build.yml, which delegates to the shared
### pipeline in Kovospace/kovostack-github-workflows. The build context is the
### repository root.
###
### One image serves every environment. What differs between them arrives as
### environment variables at container start and is written into config.json by
### /docker-entrypoint.d/40-write-runtime-config.sh - see that script.
### ---------------------------------------------------------------------------


### ---------- build stage ----------
#
# Node 22.22.1 is what this project is developed on. Pinned exactly rather than
# tracking a moving tag, so rebuilding an old commit still uses the toolchain
# that commit was written for.
#
# Angular 21 requires ^20.19 || ^22.12 || >=24; note that Angular *22* would need
# >=22.22.3, which is the reason this project is on 21. See CLAUDE.md.
#
FROM node:22.22.1-alpine AS build

WORKDIR /src


### Manifest first. Docker caches this layer, so dependencies are reinstalled
### only when the manifest actually changes - not on every source edit.
#
# Both files are required, and the install is `npm ci` - never `npm install`.
# The lockfile used to be gitignored and this was a fallback to `npm install`,
# which broke CI on 2026-09-15: npm 10.9.4, the version shipped in this pinned
# node image, crashes with `Cannot read properties of null (reading 'edgesOut')`
# while resolving vitest's peer set from scratch. Installing from the lockfile
# skips that resolution entirely and is reproducible besides, so the lockfile is
# now committed and a missing one must fail here loudly rather than silently take
# a path that cannot work.
#
COPY package.json package-lock.json ./
RUN npm ci


### Application sources.
#
COPY angular.json tsconfig*.json ./
COPY public ./public
COPY src ./src
# `npm run build` first runs scripts/build-tips-index.mjs and scripts/build-demo-index.mjs
# (the prebuild hook), which list the tip markdown into public/content/tips/index.json and the
# home page's numbered demo screenshots into public/content/demo/index.json.
COPY scripts ./scripts


### Production build. Emits dist/new-tab-links-frontend/browser - hashed bundles,
### index.html, and everything copied verbatim from public/ including the
### translation files.
#
RUN npm run build


### ---------- runtime stage ----------
#
# The unprivileged variant runs as uid 101 and listens on 8080 out of the box,
# which is what the deployment needs: no root in the container, and no capability
# to bind a privileged port. Its containerPort matches the Helm chart's default.
#
FROM nginxinc/nginx-unprivileged:1.29-alpine


### Server configuration. The stock default.conf is replaced outright rather than
### extended, because the SPA fallback and the caching rules apply to everything.
#
COPY docker/nginx/default.conf         /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/conf.d/security-headers.conf
COPY docker/nginx/security-headers-shared.conf /etc/nginx/conf.d/security-headers-shared.conf


### The entrypoint script that turns environment variables into config.json.
### nginx's own entrypoint runs every /docker-entrypoint.d/*.sh in name order
### before starting the server.
#
# The mode is set with an explicit chmod rather than `COPY --chmod`, which needs
# BuildKit: the shared pipeline builds with buildx, but a plain `docker build`
# must work too. The base image has already switched to uid 101, so this drops to
# root for the one command that needs it and switches straight back.
#
COPY docker/entrypoint/40-write-runtime-config.sh /docker-entrypoint.d/40-write-runtime-config.sh

USER root
RUN chmod 0755 /docker-entrypoint.d/40-write-runtime-config.sh \
 && mkdir -p /var/www/runtime-config \
 && chown 101:101 /var/www/runtime-config
USER 101


### The built site. Left owned by root and read-only to the server: the one file
### that has to be written at start-up lives in /var/www/runtime-config instead,
### and nginx maps it onto /config.json.
#
COPY --from=build /src/dist/new-tab-links-frontend/browser/ /usr/share/nginx/html/


### Documentation only - publishing the port is the deployment's job. Matches the
### listen directive in default.conf and containerPort in the Helm chart.
#
EXPOSE 8080


### Every value below is overridable by the deployment. They are declared here so
### that `docker inspect` shows what this image understands, and so a container
### started with no environment behaves like a developer's machine.
#
ENV NEWTABLINKS_BACKEND_BASE_URL="http://localhost:8080" \
    NEWTABLINKS_WEB_CLIENT_DEVICE_NAME="NewTabLinks website" \
    NEWTABLINKS_FRONTEND_API_KEY="" \
    NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS="250" \
    NEWTABLINKS_CHROME_WEB_STORE_URL="" \
    NEWTABLINKS_SELF_HOSTED_CRX_PATH="/downloads/newtablinks.crx"


### The base image already declares the entrypoint that runs /docker-entrypoint.d
### and then execs nginx in the foreground; there is nothing to add.
