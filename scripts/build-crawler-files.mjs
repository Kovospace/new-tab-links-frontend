#!/usr/bin/env node
// Writes public/robots.txt and public/sitemap.xml for search engines.
//
// Generated, never edited. npm runs this before `start` and `build`, after the tips index, because
// every tip is in the sitemap. Adding a tip therefore adds it to the sitemap, and adding an indexable
// page means adding its route path to src/app/core/seo/public-site.json.
//
//   src/app/core/seo/public-site.json   the site's public origin and the indexable route paths
//   public/content/tips/index.json      the tips, written by build-tips-index.mjs just before this
//
// robots.txt keeps crawlers out of what is private or one-time: the account and devices pages, the
// backend's mailed and redirected addresses (they carry tokens), and the operator's /admin.
// Disallowing a page does not hide it. That is the backend's job, and robots.txt is public.
import { readFileSync, writeFileSync } from 'node:fs';

const PUBLIC_SITE_FILE = 'src/app/core/seo/public-site.json';
const TIPS_INDEX_FILE = 'public/content/tips/index.json';
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

const { siteOrigin, indexablePagePaths } = JSON.parse(readFileSync(PUBLIC_SITE_FILE, 'utf8'));
const tipsIndex = JSON.parse(readFileSync(TIPS_INDEX_FILE, 'utf8'));

function absoluteAddress(routePath) {
  return routePath === '' ? `${siteOrigin}/` : `${siteOrigin}/${routePath}`;
}

function tipRoutePaths() {
  const slugs = new Set(Object.values(tipsIndex).flatMap((tips) => tips.map((tip) => tip.slug)));
  return [...slugs].sort().map((slug) => `tips/${slug}`);
}

function sitemapEntry(routePath) {
  return `  <url><loc>${absoluteAddress(routePath)}</loc></url>`;
}

const routePaths = [...indexablePagePaths, ...tipRoutePaths()];

writeFileSync(
  SITEMAP_FILE,
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routePaths.map(sitemapEntry),
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

console.log(`crawler files: robots.txt, sitemap.xml with ${routePaths.length} addresses`);
