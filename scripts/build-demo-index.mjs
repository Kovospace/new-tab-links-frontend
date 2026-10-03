#!/usr/bin/env node
// Writes public/content/demo/index.json from the numbered screenshots in public/images/<language>/demo.
//
// A static site cannot list a folder, so the home page's slideshow reads this index instead. It is
// generated, never edited: npm runs this before `start` and `build`, so adding a slide is dropping
// the next numbered image into public/images/<language>/demo/ and nothing else.
//
//   public/images/<language>/demo/<n>_1x.webp, <n>_2x.webp, <n>_3x.webp   one slide, its densities
//   public/images/<language>/demo/<n>.webp                                 a slide in one density only
//
// Slides are shown in numeric order. A slide is written to the index as its files by pixel density —
// { "1": "4_1x.webp", "2": "4_2x.webp", "3": "4_3x.webp" } — and a name without _<d>x counts as
// density 1. Only files named by a number are slides; anything else in the folder is ignored, so a
// working copy or a source file can sit beside them without appearing on the page.
//
// When one slide has the same density in two formats (4_3x.png beside 4_3x.webp, halfway through a
// conversion), WebP wins.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const IMAGES_ROOT = 'public/images';
const INDEX_FOLDER = 'public/content/demo';
const INDEX_FILE = join(INDEX_FOLDER, 'index.json');
const NUMBERED_IMAGE_PATTERN = /^(\d+)(?:_(\d)x)?\.(png|jpe?g|webp|avif|gif)$/i;

/** Whether a file should stand for its slide and density instead of the one already chosen. */
function isPreferredOver(candidate, chosen) {
  return chosen === undefined || /\.webp$/i.test(candidate);
}

function indexLanguage(language) {
  const folder = join(IMAGES_ROOT, language, 'demo');
  if (!existsSync(folder)) {
    return [];
  }
  const slidesByNumber = new Map();
  for (const fileName of readdirSync(folder)) {
    const match = NUMBERED_IMAGE_PATTERN.exec(fileName);
    if (match === null) {
      continue;
    }
    const slideNumber = Number(match[1]);
    const density = match[2] ?? '1';
    const files = slidesByNumber.get(slideNumber) ?? {};
    if (isPreferredOver(fileName, files[density])) {
      files[density] = fileName;
    }
    slidesByNumber.set(slideNumber, files);
  }
  return [...slidesByNumber.entries()]
    .sort(([first], [second]) => first - second)
    .map(([, files]) =>
      Object.fromEntries(Object.entries(files).sort(([first], [second]) => first - second)),
    );
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
