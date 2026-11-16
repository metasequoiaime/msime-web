import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const oldServer = 'https://download.opensuse.org/repositories/home:/msime/Arch/$arch';
const originServer = 'https://downloadcontent.opensuse.org/repositories/home:/msime/Arch/$arch';
const installer = readFileSync(new URL('../public/install.sh', import.meta.url), 'utf8');
const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;

// 只替换固定系统路径；真实执行安装脚本，以命令夹具接住包管理器和网络调用。
function installFixture(initialConfig, runs = 1) {
  const root = mkdtempSync(join(tmpdir(), 'msime-install-fixture-'));
  try {
    const bin = join(root, 'bin');
    const config = join(root, 'pacman.conf');
    const release = join(root, 'os-release');
    const calls = join(root, 'calls');
    const script = join(root, 'install.sh');
    mkdirSync(bin);
    writeFileSync(config, initialConfig);
    writeFileSync(release, 'ID=arch\n');
    writeFileSync(calls, '');
    writeFileSync(script, installer
      .replaceAll('/etc/os-release', shellQuote(release))
      .replaceAll('/etc/pacman.conf', shellQuote(config)));
    const command = (name, body) => writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    command('id', "printf '0\\n'");
    command('uname', "printf 'x86_64\\n'");
    command('curl', 'printf "curl %s\\n" "$*" >> "$MSIME_INSTALL_TEST_LOG"\nprintf "fixture-key\\n"');
    command('pacman-key', '[ "$1" != --add ] || cat >/dev/null\nprintf "pacman-key %s\\n" "$*" >> "$MSIME_INSTALL_TEST_LOG"');
    command('pacman', 'printf "pacman %s\\n" "$*" >> "$MSIME_INSTALL_TEST_LOG"');
    for (let i = 0; i < runs; i++) {
      const result = spawnSync('sh', [script], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MSIME_INSTALL_TEST_LOG: calls },
      });
      assert.equal(result.status, 0, result.stderr);
    }
    return { config: readFileSync(config, 'utf8'), calls: readFileSync(calls, 'utf8'), backup: existsSync(`${config}.msime-backup`) ? readFileSync(`${config}.msime-backup`, 'utf8') : null };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('Arch 新安装从 OBS 源站取数据库、包和公钥，保留完整升级和验签', () => {
  const result = installFixture('[options]\nSigLevel = Required DatabaseOptional\n');
  assert.ok(result.config.includes(`Server = ${originServer}\n`));
  assert.ok(result.config.includes('SigLevel = Required DatabaseOptional'));
  assert.ok(result.calls.includes('https://downloadcontent.opensuse.org/repositories/home:/msime/Arch/x86_64/home_msime_Arch.key'));
  assert.ok(result.calls.includes('pacman-key --lsign-key F339A91A4C77008B49101BEFF9D283EB1137FF6B'));
  assert.ok(result.calls.includes('pacman -Syu --noconfirm --needed msime-bin'));
});

test('Arch 重跑迁移旧默认源，其他仓库的同名地址和自定义镜像保持不变', () => {
  const config = `[options]\nSigLevel = Required\n[other]\nServer = ${oldServer}\n[home_msime_Arch]\n  Server  =  ${oldServer}\nServer = https://custom.invalid/msime/$arch\n[core]\nServer = ${oldServer}\n`;
  const result = installFixture(config, 2);
  assert.equal(result.backup, config);
  assert.equal(result.config, config.replace(`  Server  =  ${oldServer}`, `  Server  =  ${originServer}`));
});

test('Arch 自定义源和源站配置重复运行不会增加节或覆盖地址', () => {
  for (const server of [originServer, 'https://custom.invalid/msime/$arch']) {
    const config = `[options]\nSigLevel = Required\n[home_msime_Arch]\nServer = ${server}\n`;
    assert.equal(installFixture(config, 2).config, config);
  }
});
