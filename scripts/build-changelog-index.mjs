#!/usr/bin/env node
// Writes public/content/changelog/index.json from the markdown files beside it.
//
// The changelog is one markdown file per released version and language, and a static site cannot
// list a folder - so the list page reads this index instead. It is generated, never edited: npm
// runs this before `start` and `build`, so publishing a release's notes is dropping a markdown file
// into public/content/changelog/<language>/ and nothing else.
//
//   public/content/changelog/<language>/<version>.md   one release; the file name is /changelog/<version>
//   public/images/<language>/changelog/<version>/       its screenshots, named relatively from the markdown
//
// Every file must begin the same way, because the list is generated from that beginning while the
// detail page shows the whole file:
//
//   # <version>                       the same version as the file name
//
//   *Released: <YYYY-MM-DD>*          the label is free (Slovak writes "Vydané"); the date is not
//
//   ## Most important changes         the heading's words are free too
//
//   - one change per bullet           at least one; these are the list's bullets
//
// Anything after the bullets is the release's description and screenshots, shown only in detail.
// A file that does not begin like this is refused - better a failed build than a release that
// silently drops out of the list. The list is ordered newest version first.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CHANGELOG_ROOT = 'public/content/changelog';
const INDEX_FILE = join(CHANGELOG_ROOT, 'index.json');
const VERSION_PATTERN = /^\d+(?:\.\d+)*(?:-[a-z0-9.]+)?$/;
const RELEASE_DATE_LINE = /^\*[^:*]+:\s*(\d{4}-\d{2}-\d{2})\*$/;

function plainText(markdown) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}

function readRelease(markdown, version, file) {
  const lines = markdown.split('\n').map((line) => line.trim());
  let position = 0;
  const nextLine = () => {
    while (position < lines.length && lines[position] === '') position++;
    return lines[position++] ?? '';
  };
  const refuse = (expectation) => {
    throw new Error(`${file}: ${expectation} (see scripts/build-changelog-index.mjs)`);
  };

  if (nextLine() !== `# ${version}`) refuse(`must begin with "# ${version}"`);
  const releaseDate = RELEASE_DATE_LINE.exec(nextLine());
  if (!releaseDate || Number.isNaN(Date.parse(releaseDate[1]))) {
    refuse('needs "*Released: YYYY-MM-DD*" under the version');
  }
  if (!nextLine().startsWith('## ')) refuse('needs a "## Most important changes" heading next');

  while (position < lines.length && lines[position] === '') position++;
  const highlights = [];
  while (position < lines.length && /^[-*+] /.test(lines[position])) {
    highlights.push(plainText(lines[position++].slice(2)));
  }
  if (highlights.length === 0) refuse('needs at least one "- change" under that heading');

  return { version, releasedOn: releaseDate[1], highlights };
}

function compareVersionsNewestFirst(first, second) {
  const firstParts = first.version.split(/[.-]/);
  const secondParts = second.version.split(/[.-]/);
  for (let index = 0; index < Math.max(firstParts.length, secondParts.length); index++) {
    const difference = (Number(secondParts[index]) || 0) - (Number(firstParts[index]) || 0);
    if (difference !== 0) return difference;
  }
  return second.version.localeCompare(first.version);
}

function indexLanguage(language) {
  const folder = join(CHANGELOG_ROOT, language);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const version = name.slice(0, -'.md'.length);
      const file = join(folder, name);
      if (!VERSION_PATTERN.test(version)) {
        throw new Error(`${file}: a release's file name must be its version, such as 1.4.0.md`);
      }
      return readRelease(readFileSync(file, 'utf8'), version, file);
    })
    .sort(compareVersionsNewestFirst);
}

const languages = existsSync(CHANGELOG_ROOT)
  ? readdirSync(CHANGELOG_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const index = Object.fromEntries(languages.map((language) => [language, indexLanguage(language)]));
writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
console.log(
  `changelog index: ${languages.map((language) => `${language} ${index[language].length}`).join(', ')}`,
);
