#!/usr/bin/env bash
### ---------------------------------------------------------------------------
### Writes public/config.json for `ng serve`, from the same variables the
### container's entrypoint reads.
###
### The bundle is static JavaScript and cannot read an environment, so every
### environment-dependent value reaches it through config.json, fetched by
### main.ts before Angular boots. In a container that file is written by
### docker/entrypoint/40-write-runtime-config.sh; on a developer's machine there
### is no container, so this script plays the same part. Keep the two in step:
### a variable added to one belongs in the other on the same day.
###
### Values are taken from, in order of precedence:
###   1. the environment this script is run in  — so `infisical run -- npm start`
###      works with no file at all;
###   2. .env.local in the repository root      — gitignored, the hand-edited
###      fallback for whoever is not running the Infisical CLI;
###   3. the defaults below, which match src/app/core/config/runtime-configuration.ts.
###
### The output is generated, not authored: every `npm start` overwrites it, so a
### value hand-edited into public/config.json survives exactly until the next run.
### Edit .env.local instead.
### ---------------------------------------------------------------------------
set -euo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENT_FILE="${REPOSITORY_ROOT}/.env.local"
CONFIGURATION_FILE="${REPOSITORY_ROOT}/public/config.json"

### Reads .env.local without letting it override the real environment.
###
### Deliberately not `set -a; . .env.local`, which would do the opposite: the
### file would win over variables the caller exported, and `infisical run` would
### be silently defeated by a stale line in a file nobody remembered editing.
###
### Only the name is ever passed to `eval`, and only after it is confirmed to be
### a plain identifier; the value is assigned through `export name=value`, so a
### value containing a backtick or a `$(...)` is data rather than code.
load_environment_file_without_overriding() {
    local environment_file="$1"
    local line variable_name variable_value already_set

    [ -f "$environment_file" ] || return 0

    while IFS= read -r line || [ -n "$line" ]; do
        line="${line#"${line%%[![:space:]]*}"}"          # drop leading blanks
        case "$line" in ''|'#'*) continue ;; esac
        line="${line#export }"
        case "$line" in *=*) ;; *) continue ;; esac

        variable_name="${line%%=*}"
        variable_value="${line#*=}"

        ### Anything that is not a shell identifier is a typo, not a variable.
        if ! printf '%s' "$variable_name" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then
            echo "runtime-config: ignoring unparseable line in $(basename "$environment_file"): ${line}" >&2
            continue
        fi

        ### Surrounding quotes are how a .env file carries a value with spaces;
        ### they are the file's syntax and never part of the value itself.
        case "$variable_value" in
            \"*\") variable_value="${variable_value#\"}"; variable_value="${variable_value%\"}" ;;
            \'*\') variable_value="${variable_value#\'}"; variable_value="${variable_value%\'}" ;;
        esac

        eval "already_set=\${${variable_name}+set}"
        [ -n "${already_set:-}" ] && continue

        export "${variable_name}=${variable_value}"
    done < "$environment_file"
}

load_environment_file_without_overriding "$ENVIRONMENT_FILE"

### `${VAR-default}` and not `${VAR:-default}`, because empty is a meaningful
### value here rather than an absent one: an empty backendBaseUrl is what points
### the site at the dev-server proxy in proxy.conf.json instead of at an origin
### of its own. `:-` would quietly replace that choice with localhost:8080.
NEWTABLINKS_BACKEND_BASE_URL="${NEWTABLINKS_BACKEND_BASE_URL-http://localhost:8080}"
NEWTABLINKS_WEB_CLIENT_DEVICE_NAME="${NEWTABLINKS_WEB_CLIENT_DEVICE_NAME-NewTabLinks website}"
NEWTABLINKS_FRONTEND_API_KEY="${NEWTABLINKS_FRONTEND_API_KEY-}"
NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS="${NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS-250}"
NEWTABLINKS_CHROME_WEB_STORE_URL="${NEWTABLINKS_CHROME_WEB_STORE_URL-}"
NEWTABLINKS_SELF_HOSTED_CRX_PATH="${NEWTABLINKS_SELF_HOSTED_CRX_PATH-/downloads/newtablinks.crx}"

### Written as a JSON number, unquoted, so a non-numeric value would produce a
### file the browser cannot parse - and the loader answers unparseable JSON by
### falling back to every default, backend URL included. Same guard as the
### container entrypoint's, for the same reason.
if ! printf '%s' "$NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS" | grep -Eq '^[0-9]+$'; then
    echo "runtime-config: NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS is not a whole number of milliseconds ('${NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS}'); using 250" >&2
    NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS=250
fi

### Escapes a value for a JSON string literal: backslashes first, then quotes.
escape_for_json() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIGURATION_FILE" <<EOF
{
  "backendBaseUrl": "$(escape_for_json "$NEWTABLINKS_BACKEND_BASE_URL")",
  "webClientDeviceName": "$(escape_for_json "$NEWTABLINKS_WEB_CLIENT_DEVICE_NAME")",
  "frontendApiKey": "$(escape_for_json "$NEWTABLINKS_FRONTEND_API_KEY")",
  "usernameCheckDebounceMilliseconds": ${NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS},
  "extensionDownload": {
    "chromeWebStoreUrl": "$(escape_for_json "$NEWTABLINKS_CHROME_WEB_STORE_URL")",
    "selfHostedCrxPath": "$(escape_for_json "$NEWTABLINKS_SELF_HOSTED_CRX_PATH")"
  }
}
EOF

### The key is reported as set/unset rather than by value - not because it is
### confidential, it is served to every visitor in config.json, but because
### whether it is set at all is the entire diagnosis: unset looks to a user
### exactly like a username check that silently never happens.
if [ -n "$NEWTABLINKS_FRONTEND_API_KEY" ]; then
    FRONTEND_API_KEY_STATE="set"
else
    FRONTEND_API_KEY_STATE="unset"
fi

if [ -z "$NEWTABLINKS_BACKEND_BASE_URL" ]; then
    BACKEND_DESCRIPTION="(relative - through the dev-server proxy)"
else
    BACKEND_DESCRIPTION="$NEWTABLINKS_BACKEND_BASE_URL"
fi

echo "runtime-config: wrote public/config.json - backend=${BACKEND_DESCRIPTION} frontend-api-key=${FRONTEND_API_KEY_STATE}"
