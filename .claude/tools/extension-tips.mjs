#!/usr/bin/env node
// Tracks which of the website's tips the Chrome extension has been told about.
//
// The extension shows one-sentence teasers of the tips (new-tab-links-extension,
// src/ui/tips/tips.json) that link to /tips/<slug> here. Nothing ties the two together, so a tip
// written here stays invisible in the extension until someone adds it there. This script notices.
//
// The list is .claude/extension-tips.json: every tip slug the extension has been dealt with for,
// and how - "in-extension", "in-progress" (an extension-developer run is on it), "pull-request"
// (with the URL) or "excluded" (with the reason). A tip committed under public/content/tips/en/
// and missing from that list is new. Only committed tips count, so a draft never triggers a sync.
//
//   node .claude/tools/extension-tips.mjs check           list new tips; exit 1 if there are any
//   node .claude/tools/extension-tips.mjs check --staged  the same, counting staged tips too (git hook)
//   node .claude/tools/extension-tips.mjs brief           the brief for extension-developer
//   node .claude/tools/extension-tips.mjs record <status> [<url-or-reason>] <slug>...
//   node .claude/tools/extension-tips.mjs hook            Claude Code SessionStart/PostToolUse hook
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPOSITORY_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const LEDGER_FILE = join(REPOSITORY_ROOT, '.claude/extension-tips.json');
const TIPS_FOLDER = 'public/content/tips';
const TOOL = 'node .claude/tools/extension-tips.mjs';
const STATUSES_WITH_DETAIL = { 'pull-request': 'url', excluded: 'reason' };
const STATUSES = ['in-extension', 'in-progress', ...Object.keys(STATUSES_WITH_DETAIL)];

function git(...args) {
  return execFileSync('git', ['-C', REPOSITORY_ROOT, ...args], { encoding: 'utf8' });
}

function slugsOf(paths) {
  const tipPath = new RegExp(`^${TIPS_FOLDER}/en/([a-z0-9-]+)\\.md$`);
  return paths.map((path) => path.match(tipPath)?.[1]).filter(Boolean);
}

function committedSlugs() {
  return slugsOf(git('ls-tree', '--name-only', 'HEAD', `${TIPS_FOLDER}/en/`).split('\n'));
}

function stagedSlugs() {
  return slugsOf(git('diff', '--cached', '--name-only', '--diff-filter=AR').split('\n'));
}

function readLedger() {
  return JSON.parse(readFileSync(LEDGER_FILE, 'utf8'));
}

function newSlugs({ includeStaged = false } = {}) {
  const ledger = readLedger();
  const candidates = new Set([...committedSlugs(), ...(includeStaged ? stagedSlugs() : [])]);
  return [...candidates].filter((slug) => !(slug in ledger)).sort();
}

function titleOf(language, slug) {
  const file = join(REPOSITORY_ROOT, TIPS_FOLDER, language, `${slug}.md`);
  if (!existsSync(file)) return null;
  const heading = readFileSync(file, 'utf8').split('\n').find((line) => line.startsWith('# '));
  return heading ? heading.slice(2).trim() : slug;
}

function extensionBranchName(slugs) {
  const branch = git('branch', '--show-current').trim();
  if (/^(feature|bugfix)\//.test(branch)) return branch;
  return slugs.length === 1 ? `feature/tip-${slugs[0]}` : `feature/sync-tips-${new Date().toISOString().slice(0, 10)}`;
}

function brief(slugs) {
  const tips = slugs.map((slug) => {
    const slovak = titleOf('sk', slug);
    return [
      `- \`${slug}\` — "${titleOf('en', slug)}"`,
      `  en: ${join(REPOSITORY_ROOT, TIPS_FOLDER, 'en', `${slug}.md`)} → url \`/tips/${slug}\``,
      slovak
        ? `  sk: ${join(REPOSITORY_ROOT, TIPS_FOLDER, 'sk', `${slug}.md`)} → url \`/sk/tips/${slug}\` ("${slovak}")`
        : '  sk: no Slovak version yet — give the entry no `sk` url; still write an `sk` text',
    ].join('\n');
  });
  return `Job: implementation.

The website gained tips that the extension's tips bar does not show yet. Add one entry per tip to
\`src/ui/tips/tips.json\`, shaped like the existing ones: \`id\` = the slug, \`text.en\` and
\`text.sk\` = one sentence in the voice of the neighbouring entries that makes the user want to
read the tip (read the markdown for what it says; do not copy its heading), \`url\` per language as
given. Append at the end of the array.

${tips.join('\n')}

The markdown files belong to the website repo — read them, never edit anything there.

Then, following your repo's git rules: branch \`${extensionBranchName(slugs)}\` off an up-to-date
\`main\`, run the checks your rules require, commit, push, and open a pull request with \`gh pr create\`.

Report back only: the pull request URL, and the entries you added (id + en text). If you stopped
short of the pull request, say where and why.`;
}

function record(status, rest) {
  if (!STATUSES.includes(status)) throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  const detailKey = STATUSES_WITH_DETAIL[status];
  const detail = detailKey ? rest.shift() : undefined;
  if (rest.length === 0) throw new Error('name at least one slug');
  const ledger = readLedger();
  for (const slug of rest) {
    ledger[slug] = { status, ...(detailKey ? { [detailKey]: detail } : {}), recorded: new Date().toISOString().slice(0, 10) };
  }
  const sorted = Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(LEDGER_FILE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`recorded ${rest.join(', ')} as ${status}`);
}

function hookContext(slugs) {
  return `Tips committed on the website but not yet in the Chrome extension: ${slugs.join(', ')}.
Unless the user is in the middle of something this would disrupt, sync them now:
1. \`${TOOL} record in-progress ${slugs.join(' ')}\` (so a second trigger does not start a second run).
2. Spawn \`extension-developer\` in the background with exactly the output of \`${TOOL} brief ${slugs.join(' ')}\` as its prompt.
3. When it reports, \`${TOOL} record pull-request <url> ${slugs.join(' ')}\` and tell the user the PR URL.
   If it failed, tell the user why and remove the slugs from .claude/extension-tips.json so the next trigger retries.
A tip the user says must not reach the extension: \`${TOOL} record excluded "<reason>" <slug>\`.
If you cannot spawn agents (you are a subagent), only mention the unsynced tips in your report.`;
}

function hook() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const event = input.hook_event_name;
  const commandLines = (input.tool_input?.command ?? '').split(/\n|&&|\|\||;/);
  const committed = commandLines.some((line) => /^\s*git(\s+-C\s+\S+)?\s+commit\b/.test(line));
  if (event === 'PostToolUse' && !committed) return;
  const slugs = newSlugs();
  if (slugs.length === 0) return;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: hookContext(slugs) } }));
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'check': {
    const slugs = newSlugs({ includeStaged: rest.includes('--staged') });
    if (slugs.length === 0) {
      console.log('every committed tip is accounted for in the extension');
      break;
    }
    console.log(`tips not yet in the extension: ${slugs.join(', ')}`);
    process.exitCode = 1;
    break;
  }
  case 'brief': {
    const slugs = rest.length > 0 ? rest : newSlugs();
    if (slugs.length === 0) throw new Error('no new tips to brief about');
    console.log(brief(slugs));
    break;
  }
  case 'record':
    record(rest.shift(), rest);
    break;
  case 'hook':
    hook();
    break;
  default:
    console.error(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 18).join('\n'));
    process.exitCode = 2;
}
