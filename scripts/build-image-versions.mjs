#!/usr/bin/env node
// Writes public/content/image-versions.json: a short hash of every image's content, by its path.
//
// Images keep their names when they are replaced - a re-shot demo slide is still 3_1x.webp - and
// nginx lets browsers keep images for a week, so without this a visitor goes on seeing the old
// picture. The site appends the hash to every image address it builds (?v=<hash>), so a changed
// image gets a new address and nothing cached can stand in for it. It is generated, never edited:
// npm runs this before `start` and `build`.
//
//   public/images/**, public/flags/**   every file in them, keyed by its path below public/
//
//   { "images/sk/demo/3_1x.webp": "9f2c4e1a7b", "flags/sk-48.png": "04d1be93c2", ... }
//
// The hash is of the content, not the modification time, so a fresh checkout or a rebuilt image
// keeps every address the same until a picture actually changes.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const PUBLIC_ROOT = 'public';
const VERSIONED_FOLDERS = ['images', 'flags'];
const MANIFEST_FOLDER = 'public/content';
const MANIFEST_FILE = join(MANIFEST_FOLDER, 'image-versions.json');
const HASH_LENGTH = 10;

/** Every file below a folder, depth first, or none when the folder does not exist. */
function listFilesBelow(folder) {
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? listFilesBelow(path) : [path];
  });
}

/** The first characters of the file's SHA-256: unique enough among a site's images. */
function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, HASH_LENGTH);
}

const versions = Object.fromEntries(
  VERSIONED_FOLDERS.flatMap((folder) => listFilesBelow(join(PUBLIC_ROOT, folder)))
    .map((path) => [relative(PUBLIC_ROOT, path).split(sep).join('/'), hashFile(path)])
    .sort(([first], [second]) => first.localeCompare(second)),
);

mkdirSync(MANIFEST_FOLDER, { recursive: true });
writeFileSync(MANIFEST_FILE, `${JSON.stringify(versions, null, 2)}\n`);
console.log(`image versions: ${Object.keys(versions).length} files in ${MANIFEST_FILE}`);
