#!/usr/bin/env node
/**
 * Copies the official site's release manifest into this site before every dev and build run.
 *
 * `apps/web/public/platforms.json` is refreshed by msime.app's release automation; this site keeps no copy of its own in Git (the copy is gitignored), so a rebuild always lists the installers of the latest releases. The Cloudflare Pages project of this site builds from the repository checkout, where the sibling app is present.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../web/public/platforms.json', import.meta.url));
const target = fileURLToPath(new URL('../public/platforms.json', import.meta.url));

if (!existsSync(source)) throw new Error(`Release manifest not found at ${source}; this site builds from the msime-web repository checkout.`);
copyFileSync(source, target);
console.log(`Release manifest copied from ${source}`);
