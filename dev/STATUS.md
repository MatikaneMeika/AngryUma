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
| `node tests/smoke.cjs` | ✅ 绿 | A 闸门（行为零差异证据）；纯 base 树（C worktree）内复验同样全绿 |
| tag `base` + worktree B/C | ✅ | `base`=`aeda50f`（parent 为 checkpoint，纯平台基座）；`main`→base；C worktree `../AngryUma-wt/C`（`feat/items`@base）已建；B worktree 未建——`feat/world` 分支被主工作区的 B 会话占用（git 拒绝双 checkout，A 不抢占），B 如需隔离 worktree 自行 `git worktree add ../AngryUma-wt/B feat/world`（前提：主工作区切离该分支） |

## base 落点与分支拓扑说明

- 并发事实：B 会话直接把主工作区 checkout 到了自建的 `feat/world` 分支（基于 checkpoint，5 个提交只动 B 所有权文件，无越权）。A 的首个 base 提交一度误落在 feat/world 顶端，已用 plumbing（commit-tree 换父 + update-ref）修正：feat/world 原样归还 B，base 挂在 checkpoint 之上，`main`→base。主工作区 HEAD 仍在 feat/world@f74eebc，工作区文件零改动。
- 收口合并预期冲突：`feat/world` 与 `main(base)` 对 B 的 6 个 src 槽位文件为 add/add（base 侧=空桩，B 侧=真实代码）→ 合并时**取 B 侧**（`--theirs`），其余不相交自动合并。已列入 INTEGRATION-CHECKLIST §1。
- 主工作区残留 untracked：A 的壳/核心文件在 feat/world 视角下为未跟踪（内容即 base 版本，运行/smoke 不受影响）；B 提交时请只 add 自有文件（其至今纪律良好）。

## 并发会话事实记录

- 另一会话（角色 B）在主工作区实时写入：`src/feat-carrot.js`、`src/feat-zones.js`（真实玩法代码，覆写了我建的空桩）、`tests/feat-scene.cjs`。均为 **B 所有权文件，A 未改动**。
- A 的 base 提交将只含 A 所有权文件 + B/C 空桩（脚本链自洽所需）；B 的 WIP 代码保持 untracked，由 B 自行在其分支提交。

## 接缝缺口登记区（B/C 提出或 A 观察到）

1. **[B 侧待修] `tests/feat-scene.cjs` 断言红**：`L11 未出现 3 层以上结构 (topY=351)` —— 属 B 的关卡数据/断言范畴；A 的接缝与 harness 已就绪（该测试能跑通加载与注册链路）。B 需在 `feat/world` 分支补齐世界关卡结构或调整断言。
2. **[已解决的契约缺口] harness boot() 返回形态**：feat-scene 期望 `boot()` 返回 vm.Context；A 已在 harness 兼容（返回值可直接 `vm.runInContext`，元信息挂 `__source/__html/__srcs`）。契约固化于 CONTRACTS §5。
3. **[扩展点已登记] `registerLevels → refreshCounts()`**：任务书签名之外新增，动态扩关后派生常量与 save 槽位自动补齐（CONTRACTS §3）。
4. **[语义细化已登记] `restoreSnapshot()` 末尾**：有剩余鸟 → `loading→loadNextBird()`（回瞄准态），否则 `waitClear`；C 时间系道具按此语义接入（CONTRACTS §2）。
5. **[待观察] onHit 第三参 `rel`**：核心传入相对速度，B 现有 2 参 handler 兼容；若 B/C 需要更上下文化的回调，走规则 2 登记由 A 演进。
6. **[C 登记 → C 侧已补正] `restoreSnapshot()` 复活语义不完整**：`if(r.dead){ent.dead=false;Composite.add(...)}` 只复活"快照时就已死"的实体；对"快照时活着、发射后被杀"的 block/pig（闹钟 SL 的典型回滚场景）不翻转 `ent.dead`、不加回 world。C 未改核心，已在 `feat-items-time.js` 的 `alarm.arm()` 内于 `restoreSnapshot()` 后用公开句柄补齐复活（幂等）。**建议 A 收口时把语义统一进核心**：对快照记录 `!r.dead` 的实体强制 `ent.dead=false` + 条件 `Composite.add`，随后可删除 C 的补偿循环。**【A 收口闭环 ✅ v1.0.0：核心已统一为 `if(ent.dead)` 复活判定，feat-items 转绿确认；C 补偿现为空操作】**

## A 阶段5/6完成记录

- [x] dev/ 一次性工具已删除：`split-once.cjs`、`finish-shell.cjs`、`apply-seams.cjs`。
- [x] 浏览器验收：`node server.js`(8081) + browser-use——14 脚本链+8 媒体全 200、console 零消息、进关/拖射/切关/接缝状态断言通过，证据 `dev/logs/integration.md` + `accept-01-load.png`（后续截图受窗口最小化限制，改用状态断言留证）。
- [x] CodeReview 子代理：零 Critical/Major，结论"可合入 base"（纯搬运/连锁等价/500→matDef().score 等价经基线 MATS 证实；两条 Minor 为接缝语义说明，已同步 CONTRACTS）。
- [x] base 提交 → tag `base`(aeda50f)、`main`→base、C worktree `feat/items` 建好并复验 smoke 绿；B worktree 受阻于分支占用（见上）。
- [x] 本文件已更新 base 落点与 B/C 可开工状态。

## 安全提示（义务登记，不代为处置）

- `origin` remote URL 内嵌**明文 GitHub PAT**（`ghp_...`）。建议用户尽快在 GitHub 撤销/轮换该 token，并改用凭证管理器；A 不 push、不修改 remote 配置。

## 角色完工登记

- **C ready**（feat/items @ worktree `../AngryUma-wt/C`，base `aeda50f`）：
  - 四道具经 `registerItem` 全部落地：绝好调芭菲 🍨（tank 霸体+刚体×1.25）、决胜蹄铁 🐴（frictionAir 0.0008→0.00015+瞄准预测弹道）、闹钟 SL ⏰（即时型 `restoreSnapshot` 读档）、黄金船炒面 🍜（飞行随机横向暴走+碎屑）。
  - `node tests/feat-items.cjs` 绿（TDD：先红 13 项→实现转绿）；`node tests/smoke.cjs` 仍绿。
  - 浏览器实测（localhost:8082 + browser-use）：道具栏 4 按钮+角标、四道具行为逐项核验、控制台零报错；证据 `dev/logs/items-c.md` + 3 张截图。
  - 改动仅限 C 独占文件（`src/feat-items-uma.js`、`src/feat-items-time.js`、`tests/feat-items.cjs`、`dev/logs/items-c.*`、本文件追加条目）；未合并 main、未打 tag，等 A 收口。
  - 接缝缺口 1 项已登记（上方第 6 条，C 侧已幂等补正）。注：`npm test`（run-all）当前因 B 的 `feat-scene.cjs` 红灯非零退出，与 C 无关。

## A 收口记录（v1.0.0 发布）

- **B ready 补记**：feat/world @ 主工作区（HEAD f74eebc），5 个提交仅限 B 所有权文件（6 个 src 槽位 + tests/feat-scene.cjs），无越权；其分支树与主工作区最终一致。
- **合并**：`merge feat/world`（6 槽位 add/add 冲突按清单取 B 侧 `--theirs`）→ `merge feat/items`（自动合并零冲突，STATUS.md 双方追加共存）。合并于专用 worktree `../AngryUma-wt/M` 执行，未扰动主工作区 B 现场。
- **收口补缝（A 核心）**：`restoreSnapshot()` 复活判定 `if(r.dead)` → `if(ent.dead)` 统一（缺口 #6 闭环）；合入后 `npm test` 3/3 全绿（smoke + feat-scene + feat-items）。C 的 alarm 补偿循环现为幂等空操作，C 可在后续提交自行删除。
- **产出**：`dev/CHANGELOG.md` 新建、README 增补玩法与项目结构、CONTRACTS §2 快照语义更新、INTEGRATION-CHECKLIST 勾选。
- **账本关闭**：tag `v1.0.0` 打在合并后的 main；worktree 清理（`git worktree remove` M/C；B 分支留主工作区待 B 会话自行收尾）归用户择机执行。


- **环境清理（收口后）**：合并专用 worktree `../AngryUma-wt/M` 已 `git worktree remove` + `prune`；验收 server(8081) 已停。C worktree `../AngryUma-wt/C`（feat/items @ a1ff530）保留待 C 会话自行收尾；主工作区仍为 B 的 feat/world 现场（f74eebc），A 未越权。tag 链：`base`(aeda50f) → `v1.0.0`(48e2f97，发布提交)；main tip 为本条 docs 记录。
