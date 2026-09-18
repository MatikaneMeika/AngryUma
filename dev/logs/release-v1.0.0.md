# 发布验收记录 — v1.0.0（合并后 main）

日期：2026-09-18 · 执行人：角色 A（平台与整合）
验收对象：git worktree 检出 `v1.0.0`(48e2f97) → 切至 main，本地 `node server.js`(http://localhost:8081) + browser-use。
node 侧闸门：`node tests/run-all.cjs` → **3/3 全绿**（smoke.cjs / feat-items.cjs / feat-scene.cjs），收口文档改动后复跑一次仍全绿。

## 1. 加载与接缝装配（浏览器内主世界探针）

- 脚本链：CDN matter.min.js + `/src/00-boot.js … /src/50-ui-input.js` 共 14 项，含 B 的
  `21-levels-w2w3.js`、`feat-carrot.js`、`feat-zones.js`、`level-zones.js`、`feat-contraptions.js`、`level-contraptions.js`
  与 C 的 `feat-items-uma.js`、`feat-items-time.js` —— 三角色产物同场加载成功。
- `LEVELS.length = 16`、`MATS = wood,glass,stone`（基线三材质未被覆盖）、
  `REG.items = parfait,shoe,alarm,yaki`（C 四道具注册生效）。
- 控制台：`list_console_messages` → **零消息**（无 error/warn/log）。
- 核心接缝修复在发布树内实至名归：浏览器内 `restoreSnapshot.toString()` 含 `if(ent.dead)`（缺口 #6 闭环）。

## 2. 真实交互：B 关卡 + C 道具 + 发射得分

对 L9（`startLevel(8)`，世界 2 首关，B 重构关卡）：

- 关卡装配：`blocks=22`、`pigs=4`、`props = mud,tire`（B 的区域/机关接入正常）。
- 道具栏：`#itemBar` 内 4 个按钮；点击 `data-item="parfait"` → `G.armedItem='parfait'`、次数 1（真实 DOM 点击路径）。
- 真实 `PointerEvent` 拖射（pointerdown → 10×pointermove 拉至 drag≈(-85,42) → pointerup）：
  `phase` 进入 `flight`，结算后 **score 0 → 15600**、存活猪 4 → 2、方块 22 → 11、
  芭菲次数 1 → 0（发射一次性消耗），`props` 仍存活（mud/tire 未被误清）。

## 3. 闹钟 SL 读档 × 复活判定（缺口 #6 回归）

同关取快照（`takeSnapshot()` → `G.snapshot=true`）后完成一发造成 13 个实体死亡（blocks 11、pigs 2 存活）：

- 点击 `data-item="alarm"` 读档后：`score 15600 → 0`、`pigs 存活 2 → 4`、`blocks 存活 11 → 22`、
  **`dead` 标记实体数 13 → 0**、`world` 刚体数 28（死体被重新 `Composite.add`）、状态回到 `playing/loading`、闹钟次数 1 → 0。
- 结论：核心统一复活判定真实工作（若仍用旧 `if(r.dead)`，这 13 个"快照时活着、本发被杀"的实体不会被复活，blocks 会停在 11）。

## 4. 渲染证据与环境限制

- 后台标签 rAF 挂起 → 手动 pump `step()`/`draw()` 驱动；隐藏窗口把 `innerWidth` 压成 1（画布退化），
  在页内恢复 `innerWidth=1280/innerHeight=760` 并 `resize()` 后 `draw()`：画布 1280×760 全采样
  **9728/9728 像素非零**（缩放图 186480/186480 非零），即画面完整绘制、非空白。
- 原生截图受阻：`take_screenshot` 报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`（`visibilityState=hidden`），
  本会话无法把 Browser 视图置为可见；故本轮视觉证据为上述像素采样 + 状态断言，
  位图参考仍为 base 阶段的 `dev/logs/accept-01-load.png`（窗口可见时所摄）。
- 曾尝试把画布缩略图 base64 逐段搬回本地落盘，因人工转录无法保证逐字准确而**放弃**（宁可不出图，也不留伪造/损坏图像）。

## 5. 发布与现场

- 提交拓扑：`67967a8(checkpoint/pre-refactor)` → `aeda50f(base)` → `768e7c0(docs)` → `a59db18(merge B)` → `6caaba7(merge C)` → **`48e2f97(tag v1.0.0)`** → `2251dec(docs)`。
- 合并专用 worktree `../AngryUma-wt/M` 已移除并 prune；本轮验收 worktree `../AngryUma-wt/R` 与 server(8081) 验收后一并清理。
- 主工作区仍为 B 的 `feat/world`(f74eebc) 现场、C worktree `../AngryUma-wt/C` 保留，A 未越权改动。
- 未 push（`origin` remote URL 内嵌明文 PAT，需用户先撤销/轮换）。
