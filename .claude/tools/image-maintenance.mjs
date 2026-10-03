#!/usr/bin/env node
// Keeps the site's content images in WebP and every reference to them pointing at a real file.
// Used by the `image-maintainer` agent (.claude/agents/image-maintainer.md); safe to run by hand.
//
//   node .claude/tools/image-maintenance.mjs scan              what is not WebP yet, what is new,
//                                                             and every reference to each file
//   node .claude/tools/image-maintenance.mjs convert [file…]   encodes to WebP, deletes the original,
//                                                             rewrites every reference; no files =
//                                                             every candidate `scan` lists
//   node .claude/tools/image-maintenance.mjs check             every reference resolves; exits 1 if not
//
// Scope: public/images/<language>/** only. Left alone on purpose: images/share/ (link previews —
// several crawlers still refuse WebP), the favicons, apple-touch-icon and the flags.
//
// A reference is any of:
//   markdown   public/content/{tips,home-features,legal}/<language>/*.md — a short name resolved in
//              the file's image folder (tips/<slug>, home-features/<slug>, legal), a ./ or ../ path
//              resolved from the file, or an absolute /images/… path. HTML comments do not count.
//   code       src/**/*.{html,ts} — '<path>' | localizedImage and buildLocalizedImageUrl('<path>'),
//              which must exist in EVERY language, and quoted '/images/…' literals.
// The demo slides are not referenced by name: scripts/build-demo-index.mjs lists their folder.
//
// Encoding: lossless and lossy (quality 85, as the demo slides were) are both tried and the smaller
// kept. A file WebP would make bigger is left as it is and reported.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, posix, relative, resolve } from 'node:path';
import { Lexer } from 'marked';

const PUBLIC_ROOT = 'public';
const IMAGES_ROOT = join(PUBLIC_ROOT, 'images');
const CONTENT_ROOT = join(PUBLIC_ROOT, 'content');
const CONVERTIBLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const IMAGE_EXTENSION_PATTERN = '(?:png|jpe?g|gif|webp|avif)';
const INDEX_DRIVEN_FOLDERS = ['demo'];
const LOSSY_QUALITY = '85';

const languages = readdirSync(join(PUBLIC_ROOT, 'i18n'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => basename(name, '.json'));

/** Every file below a folder, as repo-relative paths. */
function listFiles(folder) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** The in-scope images: everything below public/images/<language>/. */
function listContentImages() {
  return languages.flatMap((language) => listFiles(join(IMAGES_ROOT, language)));
}

/** Image files git reports as untracked or newly added — dropped in by hand. */
function listNewImages() {
  const output = execFileSync('git', ['status', '--porcelain', '-uall', '--', IMAGES_ROOT], {
    encoding: 'utf8',
  });
  return new Set(
    output
      .split('\n')
      .filter((line) => /^(\?\?|A)/.test(line))
      .map((line) => line.slice(3).trim()),
  );
}

/** The folder below images/<language>/ a markdown file's short image names live in. */
function imageFolderOf(kind, markdownFile) {
  const name = basename(markdownFile, '.md');
  if (kind === 'tips') return `tips/${name}`;
  if (kind === 'home-features') return `home-features/${name.replace(/^\d+-/, '')}`;
  return 'legal';
}

/** Every image address a markdown file writes, outside HTML comments. */
function imageAddressesIn(markdown) {
  const addresses = [];
  const tokens = new Lexer().lex(markdown);
  const visit = (token) => {
    if (token.type === 'image') addresses.push(token.href);
    for (const child of token.tokens ?? []) visit(child);
    for (const item of token.items ?? []) visit(item);
  };
  tokens.forEach(visit);
  return addresses;
}

/**
 * Where a markdown image address points on disk, or null for an external URL.
 * Mirrors src/app/core/content/site-markdown-renderer.ts.
 */
function resolveMarkdownImage(address, markdownFile, language, imageFolder) {
  const path = address.split(/[?#]/)[0];
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null;
  if (path.startsWith('/')) return join(PUBLIC_ROOT, path);
  if (/^\.\.?\//.test(path)) return join(dirname(markdownFile), path);
  return join(IMAGES_ROOT, language, imageFolder, path);
}

/** The line a piece of text first appears on, 1-based. */
function lineOf(text, needle) {
  const index = text.indexOf(needle);
  return index < 0 ? 0 : text.slice(0, index).split('\n').length;
}

/** References from the site's markdown. */
function collectMarkdownReferences() {
  const references = [];
  for (const kind of ['tips', 'home-features', 'legal']) {
    for (const language of languages) {
      const folder = join(CONTENT_ROOT, kind, language);
      for (const file of listFiles(folder).filter((path) => path.endsWith('.md'))) {
        const markdown = readFileSync(file, 'utf8');
        for (const address of imageAddressesIn(markdown)) {
          const target = resolveMarkdownImage(address, file, language, imageFolderOf(kind, file));
          if (target === null) continue;
          references.push({
            source: file,
            line: lineOf(markdown, `(${address}`),
            written: address,
            targets: [posix.normalize(target)],
          });
        }
      }
    }
  }
  return references;
}

/** Whether a match sits on a comment line — a doc example, not a reference. */
function isOnCommentLine(text, index) {
  const lineStart = text.lastIndexOf('\n', index) + 1;
  return /^\s*(\*|\/\/|\/\*)/.test(text.slice(lineStart, index));
}

/** References from templates and TypeScript. */
function collectCodeReferences() {
  const localized = new RegExp(
    `(['"\`])([^'"\`\\s]+\\.${IMAGE_EXTENSION_PATTERN})\\1\\s*\\|\\s*localizedImage`,
    'g',
  );
  const localizedCall = new RegExp(
    `buildLocalizedImageUrl\\(\\s*(['"\`])([^'"\`\\s]+\\.${IMAGE_EXTENSION_PATTERN})\\1`,
    'g',
  );
  const absolute = new RegExp(
    `(['"\`])(/?images/[^'"\`\\s]+\\.${IMAGE_EXTENSION_PATTERN})\\1`,
    'g',
  );
  const references = [];
  const sources = listFiles('src').filter((path) => /\.(html|ts)$/.test(path));
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of [localized, localizedCall]) {
      for (const match of text.matchAll(pattern)) {
        if (isOnCommentLine(text, match.index)) continue;
        const below = match[2].replace(/^\/+/, '');
        references.push({
          source: file,
          line: text.slice(0, match.index).split('\n').length,
          written: match[2],
          targets: languages.map((language) => join(IMAGES_ROOT, language, below)),
        });
      }
    }
    for (const match of text.matchAll(absolute)) {
      if (isOnCommentLine(text, match.index)) continue;
      references.push({
        source: file,
        line: text.slice(0, match.index).split('\n').length,
        written: match[2],
        targets: [join(PUBLIC_ROOT, match[2].replace(/^\/+/, ''))],
      });
    }
  }
  return references;
}

function collectReferences() {
  return [...collectMarkdownReferences(), ...collectCodeReferences()];
}

function isIndexDriven(image) {
  const [, , , folder] = image.split('/');
  return INDEX_DRIVEN_FOLDERS.includes(folder);
}

function kilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function scan() {
  const references = collectReferences();
  const newImages = listNewImages();
  const candidates = listContentImages().filter((path) =>
    CONVERTIBLE_EXTENSIONS.has(extname(path).toLowerCase()),
  );
  console.log(`Languages: ${languages.join(', ')}`);
  console.log(`\nNot WebP yet (${candidates.length}):`);
  for (const image of candidates) {
    const marker = newImages.has(image) ? ' [new]' : '';
    console.log(`  ${image}  ${kilobytes(statSync(image).size)}${marker}`);
    const pointing = references.filter((reference) => reference.targets.includes(image));
    for (const reference of pointing) {
      console.log(`      ← ${reference.source}:${reference.line}  ${reference.written}`);
    }
    if (pointing.length === 0 && !isIndexDriven(image))
      console.log('      ← (nothing refers to it)');
  }
  const otherNew = [...newImages].filter((path) => !candidates.includes(path));
  if (otherNew.length > 0) {
    console.log(`\nNew, already in a kept format or out of scope:`);
    otherNew.forEach((path) => console.log(`  ${path}`));
  }
  check({ quietWhenClean: false, exitOnFailure: false });
}

/** Encodes one image both ways and returns the smaller WebP's bytes, or null. */
function encodeSmallest(image) {
  const lossless = `${image}.lossless.webp`;
  const lossy = `${image}.lossy.webp`;
  execFileSync('magick', [
    image,
    '-strip',
    '-define',
    'webp:lossless=true',
    '-define',
    'webp:method=6',
    lossless,
  ]);
  execFileSync('magick', [
    image,
    '-strip',
    '-quality',
    LOSSY_QUALITY,
    '-define',
    'webp:method=6',
    lossy,
  ]);
  const encodings = [lossless, lossy].map((path) => ({ path, bytes: readFileSync(path) }));
  encodings.forEach(({ path }) => unlinkSync(path));
  encodings.sort((a, b) => a.bytes.length - b.bytes.length);
  return {
    bytes: encodings[0].bytes,
    mode: encodings[0].path.endsWith('.lossless.webp') ? 'lossless' : `lossy q${LOSSY_QUALITY}`,
  };
}

/** Rewrites one reference's written address to the WebP name, in place. */
function rewriteReference(reference, oldTarget) {
  const written = reference.written;
  const webpWritten = written.replace(/\.(png|jpe?g)(?=([?#].*)?$)/i, '.webp');
  const text = readFileSync(reference.source, 'utf8');
  const escaped = written.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = reference.source.endsWith('.md')
    ? new RegExp(`\\(${escaped}(?=[\\s)])`, 'g')
    : new RegExp(`(['"\`])${escaped}\\1`, 'g');
  const rewritten = text.replace(pattern, (match) => match.replace(written, webpWritten));
  if (rewritten !== text) writeFileSync(reference.source, rewritten);
  return `${reference.source}:${reference.line}  ${written} → ${webpWritten}  (for ${oldTarget})`;
}

function convert(requested) {
  const candidates = (requested.length > 0 ? requested : listContentImages()).filter((path) =>
    CONVERTIBLE_EXTENSIONS.has(extname(path).toLowerCase()),
  );
  const scope = resolve(IMAGES_ROOT);
  let savedBytes = 0;
  for (const image of candidates) {
    if (
      !resolve(image).startsWith(scope + '/') ||
      resolve(image).startsWith(join(scope, 'share'))
    ) {
      console.log(`skipped  ${image}  (outside public/images/<language>/)`);
      continue;
    }
    const target = image.slice(0, -extname(image).length) + '.webp';
    if (existsSync(target)) {
      console.log(`skipped  ${image}  (${target} already exists — decide which one stays)`);
      continue;
    }
    const originalSize = statSync(image).size;
    const { bytes, mode } = encodeSmallest(image);
    if (bytes.length >= originalSize) {
      console.log(
        `kept     ${image}  ${kilobytes(originalSize)} — WebP would be ${kilobytes(bytes.length)}`,
      );
      continue;
    }
    writeFileSync(target, bytes);
    unlinkSync(image);
    savedBytes += originalSize - bytes.length;
    console.log(
      `webp     ${image}  ${kilobytes(originalSize)} → ${kilobytes(bytes.length)} (${mode})`,
    );
  }
  // References are rewritten after every file is converted, so that a code reference covering
  // several languages changes only once every language's copy is WebP.
  const references = collectReferences();
  for (const reference of references) {
    const allWebpNow = reference.targets.every((path) => {
      const webp = path.replace(/\.(png|jpe?g)$/i, '.webp');
      return !existsSync(path) && existsSync(webp) && webp !== path;
    });
    if (allWebpNow)
      console.log(`link     ${rewriteReference(reference, reference.targets.join(', '))}`);
  }
  console.log(`\nSaved ${kilobytes(savedBytes)}.`);
  check({ quietWhenClean: false, exitOnFailure: true });
}

function check({ quietWhenClean, exitOnFailure }) {
  const references = collectReferences();
  const broken = references.flatMap((reference) =>
    reference.targets
      .filter((target) => !existsSync(target))
      .map(
        (target) =>
          `${reference.source}:${reference.line}  ${reference.written}  → missing ${target}`,
      ),
  );
  const referenced = new Set(references.flatMap((reference) => reference.targets));
  const unused = listContentImages().filter(
    (path) => !referenced.has(path) && !isIndexDriven(path),
  );
  const notWebp = listContentImages().filter((path) =>
    CONVERTIBLE_EXTENSIONS.has(extname(path).toLowerCase()),
  );
  console.log(`\nReferences checked: ${references.length}`);
  if (broken.length > 0) {
    console.log(`BROKEN (${broken.length}):`);
    broken.forEach((line) => console.log(`  ${line}`));
  } else if (!quietWhenClean) {
    console.log('Broken: none');
  }
  if (unused.length > 0) {
    console.log(`Unreferenced images (${unused.length}):`);
    unused.forEach((path) => console.log(`  ${path}`));
  }
  if (notWebp.length > 0) console.log(`Still PNG/JPEG: ${notWebp.length}`);
  if (broken.length > 0 && exitOnFailure) process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
process.chdir(resolve(dirname(new URL(import.meta.url).pathname), '..', '..'));
if (command === 'scan') scan();
else if (command === 'convert') convert(rest.map((path) => relative(process.cwd(), resolve(path))));
else if (command === 'check') check({ quietWhenClean: false, exitOnFailure: true });
else {
  console.error('usage: image-maintenance.mjs scan | convert [file…] | check');
  process.exit(2);
}
