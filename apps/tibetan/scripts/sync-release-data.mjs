#!/usr/bin/env node
// Copies the official site's release manifest into this app. The official site's automation refreshes apps/web/public/platforms.json every 30 minutes; this site's Pages project rebuilds when that file changes, so the download page always lists the installers the official site lists. The copy is gitignored: keeping a second committed snapshot would let the two sites drift.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(app, '../web/public/platforms.json');
const target = resolve(app, 'public/platforms.json');

if (!existsSync(source)) throw new Error(`Release manifest not found at ${source}; this app must be built inside the msime-web workspace.`);
copyFileSync(source, target);
console.log(`Release manifest copied from ${source}`);
