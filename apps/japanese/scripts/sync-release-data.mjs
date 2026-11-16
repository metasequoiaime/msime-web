#!/usr/bin/env node
/**
 * Copies the official site's release manifest (apps/web/public/platforms.json) into this app's public/ before `dev` and `build`.
 *
 * The official site's automation refreshes that file every 30 minutes, and the Cloudflare Pages project of this site rebuilds when it changes, so a copy committed here would only ever be stale. The copy is gitignored; the download page picks this edition's installers out of it by file name (src/download/editions.ts).
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(app, '../web/public/platforms.json');
const target = resolve(app, 'public/platforms.json');

if (!existsSync(source)) throw new Error(`Release manifest not found at ${source}; this app reads the official site's copy and must be built from the workspace checkout.`);
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`platforms.json copied from ${source}`);
