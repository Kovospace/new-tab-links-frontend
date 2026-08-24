#!/usr/bin/env bash
# PreToolUse/Bash hook: this repository's branch policy, enforced mechanically.
#
#   * A branch may only be CREATED with a name under feature/ or bugfix/.
#   * A push may only target a branch under feature/ or bugfix/.
#   * main and master are therefore unreachable by either route.
#
# Reads the hook payload on stdin, prints a deny decision as JSON, always exits 0.
# Anything it cannot confidently classify is allowed through: this is a backstop for an
# explicit rule, not a substitute for following it.
set -uo pipefail

command_line=$(jq -r '.tool_input.command // ""' 2>/dev/null)

# A branch name this repository accepts: feature/<something> or bugfix/<something>.
ALLOWED_BRANCH_PATTERN='^(refs/heads/)?(feature|bugfix)/.+'

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

# ---------------------------------------------------------------------------
# Branch creation: git checkout -b NAME | git switch -c/-C NAME | git branch NAME
# ---------------------------------------------------------------------------

created_branch_name=$(printf '%s' "$command_line" \
  | sed -nE 's#.*[[:space:]](checkout[[:space:]]+-b|switch[[:space:]]+-[cC])[[:space:]]+([^[:space:];&|]+).*#\2#p' \
  | head -n1)

# `git branch NAME` with no flag that means list, delete, rename or copy.
if [[ -z "$created_branch_name" ]] \
  && printf '%s' "$command_line" | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^[:space:]]+)?)*[[:space:]]+branch([[:space:]]|$)' \
  && ! printf '%s' "$command_line" | grep -Eq '[[:space:]]branch[[:space:]]+.*(-d|-D|-m|-M|-c|-C|--delete|--move|--copy|--list|--show-current|--contains|--merged|--no-merged|-a|-r|-v|--all|--remotes|--verbose)([[:space:]]|$)'; then
  created_branch_name=$(printf '%s' "$command_line" \
    | sed -nE 's|.*[[:space:]]branch[[:space:]]+||p' \
    | sed -E 's|[;&|].*||' \
    | tr ' ' '\n' | grep -Ev '^(-.*)?$' | head -n1)
fi

if [[ -n "$created_branch_name" ]] \
  && ! printf '%s' "$created_branch_name" | grep -Eq "$ALLOWED_BRANCH_PATTERN"; then
  deny "Blocked: '$created_branch_name' is not an allowed branch name in this repo. Branches may only be created under feature/** or bugfix/**."
fi

# ---------------------------------------------------------------------------
# Push destination
# ---------------------------------------------------------------------------

printf '%s' "$command_line" \
  | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+push([[:space:]]|$)' || exit 0

# Deleting a remote branch is refused outright: nothing here needs to do it.
if printf '%s' "$command_line" | grep -Eq '[[:space:]](--delete|-d)([[:space:]]|$)'; then
  deny "Blocked: deleting a remote branch is not allowed in this repo."
fi

# Positional arguments after `push`, within this one shell command, flags removed.
push_arguments=$(printf '%s' "$command_line" \
  | sed -nE 's|.*[[:space:]]push[[:space:]]*||p' \
  | sed -E 's|[;&|].*||' \
  | tr ' ' '\n' | grep -Ev '^(-.*)?$' || true)

positional_count=$(printf '%s\n' "$push_arguments" | grep -c . || true)

if [[ "$positional_count" -ge 2 ]]; then
  # remote + refspec were given: the destination is the right side of the refspec,
  # or the whole thing when it carries no colon.
  refspec=$(printf '%s\n' "$push_arguments" | sed -n '2p')
  destination_branch=${refspec##*:}
else
  # No refspec: the push follows HEAD, so resolve what that is — in the repo the
  # command actually targets, which `git -C <dir>` may move elsewhere.
  repository_directory=$(printf '%s' "$command_line" \
    | sed -nE 's|.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*|\1|p')
  repository_directory=${repository_directory:-${CLAUDE_PROJECT_DIR:-$PWD}}
  destination_branch=$(git -C "$repository_directory" rev-parse --abbrev-ref HEAD 2>/dev/null)
fi

# An unresolvable destination is left alone rather than guessed at.
[[ -n "$destination_branch" ]] || exit 0

if ! printf '%s' "$destination_branch" | grep -Eq "$ALLOWED_BRANCH_PATTERN"; then
  deny "Blocked: this push would target '$destination_branch'. Pushes are only allowed to feature/** or bugfix/** branches; main is reached through a pull request."
fi

exit 0
