#!/usr/bin/env node
// Writes public/content/home-features/index.json from the markdown files beside it.
//
// The home page's list of selling points is one markdown file per point, written exactly like a tip,
// and a static site cannot list a folder - so the page reads this index instead. It is generated,
// never edited: npm runs this before `start` and `build`, so adding a point is dropping a numbered
// markdown file into public/content/home-features/<language>/ and nothing else.
//
//   public/content/home-features/<language>/<number>-<slug>.md   one point; shown in numeric order
//   public/images/<language>/home-features/<slug>/               its images, which the markdown can
//                                                                name relatively: ![Menu](menu.png)
//
// The number only orders the list, so renumbering a point never moves its images: their folder is
// named by the slug alone. The file's first "# " heading is the point's title. A file without a
// number, without a heading, or with a slug that would not survive being a folder name is refused -
// better a failed build than a point that silently disappears or renders blank.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FEATURES_ROOT = 'public/content/home-features';
const INDEX_FILE = join(FEATURES_ROOT, 'index.json');
const FILE_NAME_PATTERN = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function assertHasHeading(markdown, file) {
  if (!markdown.split('\n').some((line) => line.startsWith('# '))) {
    throw new Error(`${file} has no "# " heading to use as its title`);
  }
}

function indexLanguage(language) {
  const folder = join(FEATURES_ROOT, language);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.md'))
    .map((fileName) => {
      const file = join(folder, fileName);
      const match = FILE_NAME_PATTERN.exec(fileName);
      if (!match) {
        throw new Error(`${file}: a point's file name must be <number>-<lowercase-words>.md`);
      }
      assertHasHeading(readFileSync(file, 'utf8'), file);
      return { order: Number(match[1]), slug: match[2], fileName };
    })
    .sort((first, second) => first.order - second.order)
    .map(({ slug, fileName }) => ({ slug, fileName }));
}

const languages = existsSync(FEATURES_ROOT)
  ? readdirSync(FEATURES_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const index = Object.fromEntries(languages.map((language) => [language, indexLanguage(language)]));
writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
console.log(
  `home features index: ${languages.map((language) => `${language} ${index[language].length}`).join(', ')}`,
);
