import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('dist');
const pages = ['index.html', 'descargas/index.html', 'desarrollo/index.html', '404.html'];

test('Todos los enlaces y recursos locales del sitio construido tienen destino', () => {
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    for (const [, url] of html.matchAll(/(?:href|src|poster)="(\/[^\"]*)"/g)) {
      const path = url.split(/[?#]/)[0];
      assert(existsSync(resolve(root, '.' + path)) || existsSync(resolve(root, '.' + path, 'index.html')), `${page}: ${url}`);
    }
    assert(html.includes('https://onesecurezone.com/'));
    assert(html.includes('lang="es"'));
  }
});

test('Los videos y posters públicos respetan el presupuesto de carga', () => {
  for (const name of readdirSync(resolve(root, 'media'))) {
    const bytes = statSync(resolve(root, 'media', name)).size;
    if (/\.(mp4|webm)$/.test(name)) assert(bytes <= 1_000_000, `${name}: ${bytes} bytes; optimizar antes de publicar`);
    if (/\.webp$/.test(name)) assert(bytes <= 50_000, `${name}: poster demasiado pesado`);
  }
});

test('No se ofrecen instaladores ficticios antes de configurar publicaciones', () => {
  const html = readFileSync(resolve(root, 'descargas/index.html'), 'utf8');
  for (const platform of ['windows','macos','linux']) assert(html.includes(`data-platform="${platform}"`));
  assert.equal((html.match(/class="availability"/g) || []).length, 3);
  assert(!/href="[^"]+\.(exe|dmg|msi|AppImage|deb)"/.test(html));
});
