# INTEGRATION-CHECKLIST.md — 收口合并与集成回归清单（角色 A 执行）

前提：B 在 `feat/world`、C 在 `feat/items` 分支完成自测（各自 `npm test` 绿），任务书 §4 启动收口。

## 1. 合并顺序（文件不相交，冲突即异常信号）

- [x] `git merge feat/world` → main(base)
- [x] `git merge feat/items` → main
- [x] 若出现任何冲突：核对 OWNERSHIP.md，确认是否有角色越权改了非己文件；越权改动回退到对应角色的注册实现（实际：B/C 均无越权）
- [x] 已知预期冲突：B 实际分支 `feat/world` 从 checkpoint 而非 base 切出，与 base 对 `src/21-levels-w2w3/feat-carrot/feat-zones/level-zones/feat-contraptions/level-contraptions` 六个槽位为 add/add（base=空桩，B=真实代码）→ 一律取 B 侧（`git checkout --theirs`），详见 STATUS"base 落点与分支拓扑说明"

## 2. 跨模块重点核对（合并后逐项人工过一遍）

- [ ] `G.props` 结构：B 的 make(cfg) 产物含 `type`，刚体 `body.gd={kind:'prop',prop}`
- [ ] `G.items` 复位：createLevel 按注册 `uses` 重置；C 两文件的 uses/arm/onLaunch 不互相覆盖 id
- [ ] `armedItem` 一次性消耗：launch 后扣 1、置 null、`renderItemBar()` 刷新
- [ ] `processDamage` 有界连锁**唯一实现在 30-engine**（A 独占）；B 只经 `registerExplosive` 提供 `onDetonate`
- [ ] 材质/皮肤名不冲突：`matDef` 查表下 carrot 等注册名不覆盖内置 `wood/glass/stone`
- [ ] LEVELS 扩关：`registerLevels(16,...)` 后 `NLEVELS/LAST/WORLDS/PER` 与 `save.stars` 一致（refreshCounts 生效）
- [ ] 顶层符号无重名（classic script 共享全局作用域，重复 `const/let/function` 会直接 SyntaxError 白屏）

## 3. 回归闸门

- [ ] `npm run test:smoke` 绿（base 行为零差异）
- [ ] `npm test` 全绿（smoke + feat-scene + feat-items，自动发现）
- [ ] `node server.js` 起服务，浏览器验证并截图贴证至 `dev/logs/integration.md`：
  - [ ] 4 世界主题渲染、复合建筑稳定性（预沉降不塌）
  - [ ] 胡萝卜连锁爆炸一次；水洼/坡牌/轮胎/饭盆各生效一次
  - [ ] 4 道具各用一次（含 `#itemBar` 角标扣减、瞄准态覆盖层、时间系快照回溯回瞄准态）
  - [ ] 通关→下一关→选择屏徽章/解锁正常；旧 localStorage 存档向后兼容
  - [ ] `list_console_messages` **零报错**（含 404）
- [ ] 多分辨率/移动端抽查（1280×720 / 手机竖屏 / 高 DPI）

## 4. 收尾产出

- [ ] 逐角色 code review 记录（证据驱动：先复现再改）
- [ ] 可在核心安全补齐的接缝缺口补上；破坏性契约变更回炉评审并同步 CONTRACTS.md
- [ ] `dev/CHANGELOG.md`（功能落点/关卡清单/玩法说明）+ 根 `README.md` 更新
- [ ] 合并回 `main`，打发布 tag；`git worktree remove ../AngryUma-wt/B ../AngryUma-wt/C` 清理
- [ ] STATUS.md 关闭账本
