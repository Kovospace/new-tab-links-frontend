#!/usr/bin/env node
// Writes public/content/tips/index.json from the markdown files beside it.
//
// A static site cannot list a folder, so the /tips page reads this index instead. It is generated,
// never edited: npm runs this before `start` and `build`, so adding a tip is dropping a markdown
// file into public/content/tips/<language>/ and nothing else.
//
//   public/content/tips/<language>/<slug>.md    the tip; the file name is its address, /tips/<slug>
//   public/images/<language>/tips/<slug>/        its screenshots, which the markdown can name
//                                                relatively: ![Menu](open-menu.png)
//
// The title is the file's first "# " heading, and the list is ordered by it. A file without one is
// refused, because the list would have nothing to show for it - better a failed build than a blank
// entry. So is a slug that would not survive being an address.
//
// Each entry also carries the tip's body as plain text, which is what the list's search reads: the
// browser searches every tip without fetching eighteen markdown files first. Image references,
// link addresses, headings' hashes and emphasis are dropped, so only words a reader sees are matched.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TIPS_ROOT = 'public/content/tips';
const INDEX_FILE = join(TIPS_ROOT, 'index.json');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readTitle(markdown, file) {
  const heading = markdown.split('\n').find((line) => line.startsWith('# '));
  if (!heading) {
    throw new Error(`${file} has no "# " heading to use as its title`);
  }
  return heading.slice(2).trim();
}

function readSearchableText(markdown) {
  return markdown
    .split('\n')
    .filter((line) => !line.startsWith('# '))
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:#+|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function indexLanguage(language) {
  const folder = join(TIPS_ROOT, language);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const slug = name.slice(0, -'.md'.length);
      const file = join(folder, name);
      if (!SLUG_PATTERN.test(slug)) {
        throw new Error(`${file}: a tip's file name must be lowercase words joined by hyphens`);
      }
      const markdown = readFileSync(file, 'utf8');
      return { slug, title: readTitle(markdown, file), text: readSearchableText(markdown) };
    })
    .sort((first, second) => first.title.localeCompare(second.title, language));
}

const languages = existsSync(TIPS_ROOT)
  ? readdirSync(TIPS_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const index = Object.fromEntries(languages.map((language) => [language, indexLanguage(language)]));
writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
console.log(
  `tips index: ${languages.map((language) => `${language} ${index[language].length}`).join(', ')}`,
);
