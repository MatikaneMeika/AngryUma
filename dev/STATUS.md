# STATUS.md — 角色 A 账本（平台与整合基座）

> 更新者：角色 A。git 可执行文件实际路径：`D:\gongju\Git\Git\cmd\git.exe`（任务书路径已失效）。

## 基线与里程碑

| 项 | 状态 | 说明 |
|---|---|---|
| tag `checkpoint/pre-refactor` | ✅ `67967a8` | 拆分前单文件基线（1569 行 index.html） |
| A-2 模块化拆分 | ✅ | 壳 202 行 + `src/` 5 核心模块（纯搬运）+ 10-registry + 9 个 B/C 桩文件；脚本链 14 项与 CONTRACTS §1 一致 |
| A-3 注册表接缝 | ✅ | 17 处核心调用点落地（30-engine×12、40-render×4、50-ui-input×1）；无注册时行为与基线等价 |
| A-4 测试基座 | ✅ | `tests/harness.cjs`（boot() 返回 context，兼容 feat-* 用法）；smoke 断言零缩水 + 新增接缝断言；`tests/run-all.cjs` 总入口 |
| A-5 服务 | ✅ | server.js 通配静态路由已覆盖 `src/*.js` 与 `media/**`（全 `.png`，MIME 表完备），**无需改动** |
| `node tests/smoke.cjs` | ✅ 绿 | A 闸门（行为零差异证据） |
| tag `base` + worktree B/C | ⏳ 阶段6 | 见下方"待办" |

## 并发会话事实记录

- 另一会话（角色 B）在主工作区实时写入：`src/feat-carrot.js`、`src/feat-zones.js`（真实玩法代码，覆写了我建的空桩）、`tests/feat-scene.cjs`。均为 **B 所有权文件，A 未改动**。
- A 的 base 提交将只含 A 所有权文件 + B/C 空桩（脚本链自洽所需）；B 的 WIP 代码保持 untracked，由 B 自行在其分支提交。

## 接缝缺口登记区（B/C 提出或 A 观察到）

1. **[B 侧待修] `tests/feat-scene.cjs` 断言红**：`L11 未出现 3 层以上结构 (topY=351)` —— 属 B 的关卡数据/断言范畴；A 的接缝与 harness 已就绪（该测试能跑通加载与注册链路）。B 需在 `feat/world` 分支补齐世界关卡结构或调整断言。
2. **[已解决的契约缺口] harness boot() 返回形态**：feat-scene 期望 `boot()` 返回 vm.Context；A 已在 harness 兼容（返回值可直接 `vm.runInContext`，元信息挂 `__source/__html/__srcs`）。契约固化于 CONTRACTS §5。
3. **[扩展点已登记] `registerLevels → refreshCounts()`**：任务书签名之外新增，动态扩关后派生常量与 save 槽位自动补齐（CONTRACTS §3）。
4. **[语义细化已登记] `restoreSnapshot()` 末尾**：有剩余鸟 → `loading→loadNextBird()`（回瞄准态），否则 `waitClear`；C 时间系道具按此语义接入（CONTRACTS §2）。
5. **[待观察] onHit 第三参 `rel`**：核心传入相对速度，B 现有 2 参 handler 兼容；若 B/C 需要更上下文化的回调，走规则 2 登记由 A 演进。

## A 待办（阶段5/6）

- [ ] 删除 dev/ 一次性工具：`split-once.cjs`、`finish-shell.cjs`、`apply-seams.cjs`（阶段5 前，diff 审查证据已留存于会话记录）。
- [ ] 浏览器验收：`node server.js` + browser-use，加载/进关/拖射/切关，`list_console_messages` 零报错，截图留证。
- [ ] CodeReview 子代理审查拆分与接缝（纯搬运红线、processDamage 连锁、行为等价）。
- [ ] base 提交（仅 A 文件 + 重建空桩）→ tag `base` → `git worktree add ../AngryUma-wt/B -b feat/world`、`../AngryUma-wt/C -b feat/items`（工作区外目录，需沙箱权限）。
- [ ] 更新本文件：base 落点、B/C 可开工状态。

## 安全提示（义务登记，不代为处置）

- `origin` remote URL 内嵌**明文 GitHub PAT**（`ghp_...`）。建议用户尽快在 GitHub 撤销/轮换该 token，并改用凭证管理器；A 不 push、不修改 remote 配置。
