import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = 'https://jabach811.github.io/garcia-innovations/';
const services = [
  {
    file: 'patios-pavers.html',
    url: `${siteUrl}patios-pavers.html`,
    title: 'Patio & Paver Contractor in Tracy, CA | Garcia Innovations',
    service: 'Patios & Pavers',
  },
  {
    file: 'pergolas-outdoor-kitchens.html',
    url: `${siteUrl}pergolas-outdoor-kitchens.html`,
    title: 'Pergolas & Outdoor Kitchens in Tracy, CA | Garcia Innovations',
    service: 'Pergolas & Outdoor Kitchens',
  },
  {
    file: 'kitchens-baths.html',
    url: `${siteUrl}kitchens-baths.html`,
    title: 'Kitchen & Bath Remodeling in Tracy, CA | Garcia Innovations',
    service: 'Kitchens & Baths',
  },
  {
    file: 'flooring-tile.html',
    url: `${siteUrl}flooring-tile.html`,
    title: 'Flooring & Tile Contractor in Tracy, CA | Garcia Innovations',
    service: 'Flooring & Tile',
  },
  {
    file: 'fences-yard-upgrades.html',
    url: `${siteUrl}fences-yard-upgrades.html`,
    title: 'Fences & Yard Upgrades in Tracy, CA | Garcia Innovations',
    service: 'Fences & Yard Upgrades',
  },
];

function siteFile(file) {
  return readFileSync(path.join(projectRoot, file), 'utf8');
}

function assertMeta(html, attribute, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(html, new RegExp(`<meta[^>]+${attribute}="${escaped}"`, 'i'));
}

test('publishes a crawl map for the homepage and every service page', () => {
  const sitemap = siteFile('sitemap.xml');
  const expectedUrls = [siteUrl, ...services.map((service) => service.url)];

  for (const url of expectedUrls) {
    assert.match(sitemap, new RegExp(`<loc>${url}</loc>`));
  }
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, expectedUrls.length);

  const robots = siteFile('robots.txt');
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, new RegExp(`Sitemap:\\s*${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}sitemap\\.xml`, 'i'));
});

test('gives the homepage a canonical, social preview, and local contractor data', () => {
  const homepage = siteFile('index.html');

  assert.match(homepage, new RegExp(`<link rel="canonical" href="${siteUrl}">`));
  assert.match(homepage, /<h1[^>]*>\s*Construction &amp; remodeling in Tracy, California\s*<\/h1>/i);
  assertMeta(homepage, 'name', 'description');
  assert.match(homepage, /<meta[^>]+property="og:image"[^>]+content="https:\/\/jabach811\.github\.io\/garcia-innovations\/img\/share\.jpg"/i);
  assert.match(homepage, /<script type="application\/ld\+json">[\s\S]*"@type": "GeneralContractor"[\s\S]*"sameAs"[\s\S]*facebook\.com[\s\S]*yelp\.com[\s\S]*<\/script>/i);
});

test('makes every service page locally specific, shareable, and crawlable', () => {
  for (const service of services) {
    assert.equal(existsSync(path.join(projectRoot, service.file)), true, `${service.file} is published`);
    const html = siteFile(service.file);

    const serializedTitle = service.title.replace('&', '&amp;');
    assert.match(html, new RegExp(`<title>${serializedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
    assert.match(html, new RegExp(`<link rel="canonical" href="${service.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
    assert.match(html, /<meta[^>]+name="description"[^>]+Tracy, CA/i);
    assert.match(html, /<meta[^>]+property="og:image"[^>]+content="https:\/\/jabach811\.github\.io\/garcia-innovations\/img\//i);
    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/i);
    assert.match(html, new RegExp(`"name": "${service.service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));

    const imageSources = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi)];
    assert.ok(imageSources.length >= 2, `${service.file} has real project images with alt text`);
    for (const [, source, alt] of imageSources) {
      assert.ok(alt.trim().length > 8, `${source} describes the work`);
      assert.equal(existsSync(path.join(projectRoot, source)), true, `${source} exists`);
    }
  }
});

test('reserves layout space for every published project image', () => {
  const pages = ['index.html', ...services.map((service) => service.file)];

  for (const page of pages) {
    const html = siteFile(page);
    const images = [...html.matchAll(/<img\b[^>]*\bsrc="[^"]+"[^>]*>/gi)];
    assert.ok(images.length > 0, `${page} has images to review`);

    for (const [tag] of images) {
      assert.match(tag, /\bwidth="\d+"/i, `${page} image reserves its width`);
      assert.match(tag, /\bheight="\d+"/i, `${page} image reserves its height`);
    }
  }
});

test('publishes clean HTML without batch-edit artifacts', () => {
  for (const page of services.map((service) => service.file)) {
    assert.doesNotMatch(siteFile(page), /`n/, `${page} does not show a literal newline marker`);
  }
});
