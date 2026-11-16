#!/usr/bin/env node
/**
 * 把 @msime/web-engine 的 wasm、拼音和五笔词库、整句模型复制到 `public/msime/<版本>/`，`vite dev` 直接提供，`vite build` 随 public 一起进产物。
 *
 * 网页输入法的 SDK 和 Worker 由 Vite 从 node_modules 打包，但几十 MB 的资源不该经过打包器，所以用包自带的 `msime-web-engine copy` 作为静态文件发布，运行时用 `assetBase` 指向这里（src/web-ime-engine.ts）。目录带版本号，`_headers` 才能给它配永久缓存；先清空 `public/msime/`，免得升级后旧版本的资源一直留在产物里。日语模型用不到，不复制。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('@msime/web-engine/package.json'));
const { version } = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const target = resolve('public/msime');

rmSync(target, { recursive: true, force: true });
execFileSync(process.execPath, [join(packageRoot, 'bin/msime-web-engine.mjs'), 'copy', join(target, version), '--no-japanese'], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`@msime/web-engine ${version} -> public/msime/${version}`);
