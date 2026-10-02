#!/usr/bin/env node
// Writes public/robots.txt and public/sitemap.xml for search engines.
//
// Generated, never edited. npm runs this before `start` and `build`, after the tips index, because
// every tip is in the sitemap. Adding a tip therefore adds it to the sitemap, and adding an indexable
// page means adding its route path to src/app/core/seo/public-site.json.
//
//   src/app/core/seo/public-site.json   the public origin, the default language, the indexable paths
//   public/i18n/<language>.json         one per language the site is translated into
//   public/content/tips/index.json      the tips, written by build-tips-index.mjs just before this
//
// Every public page has an address per language: the default language's bare (/tips), every other
// one folder down (/sk/tips). Each sitemap entry names all of them as alternates, which is how a
// search engine learns they are one page in several languages. A tip is listed only in the
// languages it is written in; elsewhere the site shows the English text, which is not worth a
// second address in the index.
//
// robots.txt keeps crawlers out of what is private or one-time: the account and devices pages, the
// backend's mailed and redirected addresses (they carry tokens), and the operator's /admin.
// Disallowing a page does not hide it. That is the backend's job, and robots.txt is public.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const PUBLIC_SITE_FILE = 'src/app/core/seo/public-site.json';
const TIPS_INDEX_FILE = 'public/content/tips/index.json';
const TRANSLATIONS_FOLDER = 'public/i18n';
const ROBOTS_FILE = 'public/robots.txt';
const SITEMAP_FILE = 'public/sitemap.xml';

// Route prefixes no crawler has a reason to fetch. Prefix matches, so /auth/ covers the Google
// callback and /admin covers the operator's sign-in and every page behind it.
const DISALLOWED_PATH_PREFIXES = [
  '/account',
  '/devices',
  '/activate',
  '/reset-password',
  '/auth/',
  '/thank-you',
  '/admin',
];

const { siteOrigin, defaultLanguageCode, indexablePagePaths } = JSON.parse(
  readFileSync(PUBLIC_SITE_FILE, 'utf8'),
);
const tipsIndex = JSON.parse(readFileSync(TIPS_INDEX_FILE, 'utf8'));
const languageCodes = readdirSync(TRANSLATIONS_FOLDER)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.slice(0, -'.json'.length))
  .sort((first, second) => (first === defaultLanguageCode ? -1 : first.localeCompare(second)));

// Mirrors localizeAddress in src/app/core/i18n/localized-address.ts.
function absoluteAddress(routePath, languageCode) {
  const prefix = languageCode === defaultLanguageCode ? '' : `/${languageCode}`;
  const path = routePath === '' ? '' : `/${routePath}`;
  return `${siteOrigin}${prefix}${path || (prefix ? '' : '/')}`;
}

function pageEntries() {
  return indexablePagePaths.map((routePath) => ({ routePath, languageCodes }));
}

function tipEntries() {
  const languagesBySlug = new Map();
  for (const [languageCode, tips] of Object.entries(tipsIndex)) {
    for (const { slug } of tips) {
      languagesBySlug.set(slug, [...(languagesBySlug.get(slug) ?? []), languageCode]);
    }
  }
  return [...languagesBySlug.keys()].sort().map((slug) => ({
    routePath: `tips/${slug}`,
    languageCodes: languageCodes.filter((code) => languagesBySlug.get(slug).includes(code)),
  }));
}

function alternateLinks({ routePath, languageCodes: pageLanguageCodes }) {
  const links = pageLanguageCodes.map(
    (code) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${absoluteAddress(routePath, code)}"/>`,
  );
  if (pageLanguageCodes.includes(defaultLanguageCode)) {
    const defaultAddress = absoluteAddress(routePath, defaultLanguageCode);
    links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultAddress}"/>`);
  }
  return links;
}

function sitemapEntries(entry) {
  return entry.languageCodes.flatMap((languageCode) => [
    '  <url>',
    `    <loc>${absoluteAddress(entry.routePath, languageCode)}</loc>`,
    ...alternateLinks(entry),
    '  </url>',
  ]);
}

const entries = [...pageEntries(), ...tipEntries()];
const addressCount = entries.reduce((count, entry) => count + entry.languageCodes.length, 0);

writeFileSync(
  SITEMAP_FILE,
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.flatMap(sitemapEntries),
    '</urlset>',
    '',
  ].join('\n'),
);

writeFileSync(
  ROBOTS_FILE,
  [
    'User-agent: *',
    ...DISALLOWED_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    '',
  ].join('\n'),
);

console.log(`crawler files: robots.txt, sitemap.xml with ${addressCount} addresses`);
