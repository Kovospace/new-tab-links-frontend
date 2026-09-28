#!/usr/bin/env node
// Writes public/content/demo/index.json from the numbered screenshots in public/images/<language>/demo.
//
// A static site cannot list a folder, so the home page's slideshow reads this index instead. It is
// generated, never edited: npm runs this before `start` and `build`, so adding a slide is dropping
// the next numbered image into public/images/<language>/demo/ and nothing else.
//
//   public/images/<language>/demo/3.png, 3.png, …   the slides, shown in numeric order
//
// Only files named by a number are slides; anything else in the folder is ignored, so a working
// copy or a source file can sit beside them without appearing on the page.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const IMAGES_ROOT = 'public/images';
const INDEX_FOLDER = 'public/content/demo';
const INDEX_FILE = join(INDEX_FOLDER, 'index.json');
const NUMBERED_IMAGE_PATTERN = /^(\d+)\.(?:png|jpe?g|webp|avif|gif)$/i;

function slideNumber(fileName) {
  return Number(NUMBERED_IMAGE_PATTERN.exec(fileName)[1]);
}

function indexLanguage(language) {
  const folder = join(IMAGES_ROOT, language, 'demo');
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder)
    .filter((name) => NUMBERED_IMAGE_PATTERN.test(name))
    .sort((first, second) => slideNumber(first) - slideNumber(second));
}

const languages = existsSync(IMAGES_ROOT)
  ? readdirSync(IMAGES_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

const index = Object.fromEntries(
  languages
    .map((language) => [language, indexLanguage(language)])
    .filter(([, slides]) => slides.length > 0),
);
mkdirSync(INDEX_FOLDER, { recursive: true });
writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n');
console.log(
  `demo index: ${
    Object.entries(index)
      .map(([language, slides]) => `${language} ${slides.length}`)
      .join(', ') || 'no slides'
  }`,
);
