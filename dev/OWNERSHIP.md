# OWNERSHIP.md — 文件所有权矩阵（改谁的文件找谁；跨所有权修改须对应角色评审）

| 文件 | 所有者 | 说明 |
|---|---|---|
| `index.html`（壳）、`src/00-boot.js`、`src/10-registry.js`、`src/20-data.js`、`src/30-engine.js`、`src/40-render.js`、`src/50-ui-input.js` | **A** | 平台基座：壳+脚本链+核心+注册表接缝 |
| `server.js`、`package.json` | **A** | 服务与脚本入口 |
| `tests/harness.cjs`、`tests/smoke.cjs`、`tests/run-all.cjs` | **A** | 测试基座 / base 回归闸门 / 测试总入口（自动发现 feat-*） |
| `dev/CONTRACTS.md`、`dev/OWNERSHIP.md`、`dev/STATUS.md`、`dev/CHANGELOG.md`、`dev/INTEGRATION-CHECKLIST.md` | **A** | 契约与账本（CHANGELOG 收口阶段产出） |
| `src/21-levels-w2w3.js` | **B** | 世界2/3 新关卡（当前为空桩，B 用 `registerLevels` 填） |
| `src/feat-carrot.js` | **B** | carrot 材质/皮肤/爆炸连锁注册 |
| `src/feat-zones.js`、`src/level-zones.js` | **B** | 区域（mud/slopeUp/slopeDown）类型注册与关卡装配 |
| `src/feat-contraptions.js`、`src/level-contraptions.js` | **B** | 机关（tire/bowl）类型注册与关卡装配 |
| `tests/feat-scene.cjs` | **B** | B 玩法自测 |
| `src/feat-items-uma.js`、`src/feat-items-time.js` | **C** | 道具注册（马娘系 / 时间系） |
| `tests/feat-items.cjs` | **C** | C 玩法自测 |
| `media/**`、`vendor/**` | 共享（只增不改） | 既有资源与 Matter 副本 |
| `dev/TASK-BRIEF-*.md` | 用户下发 | 任务书原文，任何角色不得改写 |

## 协作规则

1. B/C 分支基于 tag `base`（worktree：`../AngryUma-wt/B` → `feat/world`，`../AngryUma-wt/C` → `feat/items`），只提交各自所有权文件。
2. 接入核心一律经 `dev/CONTRACTS.md` §2 的注册函数；需要新的**通用**核心钩子时，在各自分支登记需求（或以注释标注），由 A 在 base 演进并同步契约文档。
3. `npm test`（`tests/run-all.cjs`）为合并闸门：smoke + 全部 feat-*.cjs 绿才可合入 `main`。
4. 收口合并（`main(base)` → B → C）与集成回归由 A 按 `dev/INTEGRATION-CHECKLIST.md` 执行。
