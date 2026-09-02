#!/bin/sh
### ---------------------------------------------------------------------------
### Writes /usr/share/nginx/html/config.json from the container's environment.
###
### This is how environment variables reach an Angular application. The bundle is
### static JavaScript built once and promoted through every environment, so it
### cannot read the container's environment itself - by the time it runs it is in
### a browser on someone else's machine. The values are therefore written into a
### small JSON file at container start and fetched by main.ts before Angular
### boots. See src/app/core/config/runtime-configuration.loader.ts.
###
### Run by nginx's own entrypoint, which executes every /docker-entrypoint.d/*.sh
### in name order before starting the server.
### ---------------------------------------------------------------------------
set -eu

### Written outside the document root, which stays owned by root and read-only
### to the server: nginx maps this file onto /config.json with an alias. A web
### root writable by the process serving it is worth avoiding for one file.
CONFIGURATION_FILE="/var/www/runtime-config/config.json"

### Defaults match src/app/core/config/runtime-configuration.ts, so a container
### started with no environment at all behaves exactly like `ng serve`.
NEWTABLINKS_BACKEND_BASE_URL="${NEWTABLINKS_BACKEND_BASE_URL:-http://localhost:8080}"
NEWTABLINKS_WEB_CLIENT_DEVICE_NAME="${NEWTABLINKS_WEB_CLIENT_DEVICE_NAME:-NewTabLinks website}"
NEWTABLINKS_FRONTEND_API_KEY="${NEWTABLINKS_FRONTEND_API_KEY:-}"
NEWTABLINKS_CHROME_WEB_STORE_URL="${NEWTABLINKS_CHROME_WEB_STORE_URL:-}"
NEWTABLINKS_SELF_HOSTED_CRX_PATH="${NEWTABLINKS_SELF_HOSTED_CRX_PATH:-/downloads/newtablinks.crx}"

### Escapes a value for inclusion in a JSON string literal: backslashes first,
### then double quotes. Without this a value containing either would produce a
### config.json the browser cannot parse, and the application would silently fall
### back to its defaults.
escape_for_json() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIGURATION_FILE" <<EOF
{
  "backendBaseUrl": "$(escape_for_json "$NEWTABLINKS_BACKEND_BASE_URL")",
  "webClientDeviceName": "$(escape_for_json "$NEWTABLINKS_WEB_CLIENT_DEVICE_NAME")",
  "frontendApiKey": "$(escape_for_json "$NEWTABLINKS_FRONTEND_API_KEY")",
  "extensionDownload": {
    "chromeWebStoreUrl": "$(escape_for_json "$NEWTABLINKS_CHROME_WEB_STORE_URL")",
    "selfHostedCrxPath": "$(escape_for_json "$NEWTABLINKS_SELF_HOSTED_CRX_PATH")"
  }
}
EOF

### Reported so that a misconfigured deployment is visible in the pod's first
### lines of output rather than only as a browser talking to the wrong host.
###
### The frontend API key is reported as set/unset rather than by value. Not
### because it is confidential - it is written into config.json and any visitor
### can read it - but because its value tells an operator nothing, while whether
### it is set at all is the whole diagnosis: the backend denies the
### username-existence check by default, so an unset key looks to a user exactly
### like a check that silently never happens.
if [ -n "$NEWTABLINKS_FRONTEND_API_KEY" ]; then
    FRONTEND_API_KEY_STATE="set"
else
    FRONTEND_API_KEY_STATE="unset"
fi

echo "runtime-config: backend=${NEWTABLINKS_BACKEND_BASE_URL} device=${NEWTABLINKS_WEB_CLIENT_DEVICE_NAME} frontend-api-key=${FRONTEND_API_KEY_STATE}"
