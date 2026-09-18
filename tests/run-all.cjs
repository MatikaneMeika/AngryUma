'use strict';
/* ================= 测试总入口（角色 A 独占） =================
 * 依次运行 tests/smoke.cjs 与每个 tests/feat-*.cjs（自动发现，B/C 新增
 * 自己的 feat 测试无需改动 package.json），任一失败即整体退出非 0。
 * 契约见 dev/CONTRACTS.md 第 5 节。
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dir = __dirname;
const files = ['smoke.cjs']
  .concat(fs.readdirSync(dir).filter(f => /^feat-.+\.cjs$/.test(f)).sort());

for (const f of files) {
  console.log('\n> node tests/' + f);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('FAILED: tests/' + f);
    process.exit(1);
  }
}
console.log('\nALL TESTS PASSED (' + files.length + '): ' + files.join(', '));
