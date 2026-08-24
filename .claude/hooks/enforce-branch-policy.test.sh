#!/usr/bin/env bash
# Checks enforce-branch-policy.sh against the commands it is meant to judge.
# Run it after any edit to that hook:  .claude/hooks/enforce-branch-policy.test.sh
set -uo pipefail

hook_under_test="$(dirname "$0")/enforce-branch-policy.sh"
export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

failure_count=0

# Runs one command past the hook and compares the decision with what is expected.
#
# $1 description, $2 the command line, $3 "allow" or "deny"
check() {
  local description="$1" command_line="$2" expected_decision="$3" hook_output actual_decision
  hook_output=$(printf '{"tool_input":{"command":%s}}' \
    "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$command_line")" \
    | bash "$hook_under_test" 2>/dev/null)

  actual_decision="allow"
  [[ -n "$hook_output" ]] && actual_decision="deny"

  if [[ "$actual_decision" == "$expected_decision" ]]; then
    echo "  PASS [$actual_decision] $description"
  else
    echo "  FAIL expected $expected_decision, got $actual_decision :: $description"
    failure_count=$((failure_count + 1))
  fi
}

echo "Branch creation"
check "allowed prefix feature/"        'git checkout -b feature/sync-api'                    allow
check "allowed prefix bugfix/"         'git checkout -b bugfix/login-401'                    allow
check "bare name"                      'git checkout -b my-experiment'                       deny
check "main itself"                    'git checkout -b main'                                deny
check "switch -c, allowed"             'git switch -c feature/landing'                       allow
check "switch -c, bare name"           'git switch -c quickfix'                              deny
check "switch -C, bare name"           'git switch -C quickfix'                              deny
check "git branch, bare name"          'git branch scratch'                                  deny
check "git branch, allowed"            'git branch feature/scratch'                          allow
check "checking out an existing branch" 'git checkout main'                                  allow
check "switching to an existing branch" 'git switch main'                                    allow
check "listing branches"               'git branch -a'                                       allow
check "reading the current branch"     'git branch --show-current'                           allow
check "deleting a local branch"        'git branch -d feature/old'                           allow
check "-C another repo, bare name"     'git -C /home/kovo/IdeaProjects/new-tab-links-backend checkout -b scratch'    deny
check "-C another repo, allowed"       'git -C /home/kovo/IdeaProjects/new-tab-links-backend checkout -b feature/x'  allow

echo "Push destination"
check "explicit main"                  'git push origin main'                                deny
check "explicit feature branch"        'git push origin feature/x'                           allow
check "refspec onto main"              'git push origin HEAD:refs/heads/main'                deny
check "refspec onto a feature branch"  'git push origin HEAD:refs/heads/feature/x'           allow
check "bare push while HEAD is main"   'git push'                                            deny
check "bare -u push while HEAD is main" 'git push -u origin'                                 deny
check "deleting a remote branch"       'git push origin --delete feature/x'                  deny
check "forced push to main"            'git push --force origin main'                        deny
check "push to a bare-named branch"    'git push origin scratch'                             deny

echo "Left alone"
check "git status"                     'git status'                                          allow
check "npm test"                       'npm test'                                            allow
check "text that merely mentions push" 'grep -r "git push" docs/'                            allow

if [[ "$failure_count" -eq 0 ]]; then
  echo "All checks passed."
else
  echo "$failure_count check(s) failed."
  exit 1
fi
