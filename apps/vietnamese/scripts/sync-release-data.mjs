#!/usr/bin/env node
/**
 * Copies the official site's release manifest (apps/web/public/platforms.json) into this app's public/ before dev and build.
 *
 * The official site's automation refreshes that file every 30 minutes through an automatic PR, and this site's Pages project rebuilds when it changes, so the download page always lists the newest installers without a second copy in Git. The copy is gitignored. The download history ledger (some 100 KB of asset names nobody here reads) is dropped on the way.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../web/public/platforms.json');
const target = resolve(root, 'public/platforms.json');

const { downloadHistory: _history, ...manifest } = JSON.parse(readFileSync(source, 'utf8'));
if (!manifest.platforms || typeof manifest.generatedAt !== 'string') throw new Error(`${source} is not a release manifest`);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`platforms.json synced from apps/web (generated ${manifest.generatedAt})`);
