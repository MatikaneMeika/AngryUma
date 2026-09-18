# 任务书 C — 玩家道具角色（Player Items）

> 负责"弹弓侧一切"：4 个可主动使用的赛马娘梗道具，通过 A 的 `REG.items` + 道具栏（`#itemBar` / `renderItemBar`）注册落地，不改核心。worktree：`../AngryUma-wt/C`，分支 `feat/items`。

## 0. 依赖前置（开工前确认）
- 基于 tag `base` 拉出 `feat/items`；先跑 `node tests/smoke.cjs` 确认基座绿。
- 只用接缝：`registerItem(id,def)`，`def={uses,icon,arm,onLaunch(birdEnt),onFlightStep(),onAimDraw()}`；核心提供 `G.armedItem`（一次性，`launch` 时消耗并回调 `onLaunch`）、`G.items`（剩余次数，`renderItemBar` 渲染、点按钮调 `arm()`）、`restoreSnapshot()`、`applyHitRules` 的 `ent.tank` 分支、`onAimDraw/onFlightStep` 广播。
- **不改** `index.html`、`src/00-50`、`server.js`、`tests/harness.cjs`、`smoke.cjs`；缺接缝记 `dev/STATUS.md`，不自行改核心。

## 1. 独占文件
`src/feat-items-uma.js`、`src/feat-items-time.js`、`tests/feat-items.cjs`

## 2. 交付内容

### C-1 状态类道具（`feat-items-uma.js`）
- `绝好调芭菲 parfait`（`uses:1`）：`arm()` 设 `G.armedItem='parfait'`；`onLaunch(e)` 里 `e.tank=true` 并适度放大刚体（`Body.scale`），配合核心 `applyHitRules` 的 tank 分支（伤害 ×2.2、无视材质衰减）——"吃下芭菲进入绝好调，横冲直撞"。`icon` 用文字/emoji 占位（如 `🍨`），`draw` 由核心 itemBar 负责。
- `决胜蹄铁 shoe`（`uses:1`）：`arm()` 设 `G.armedItem='shoe'`；`onLaunch(e)` 降 `e.body.frictionAir` 提高穿透速度；`onAimDraw()` 在瞄准时用 `getAimTarget`/相机把一条更"远更直"的预测抛物线画出来（决胜姿的视觉提示）。

### C-2 时空类道具（`feat-items-time.js`）
- `闹钟 SL alarm`（`uses:1`）：**即时型**，`arm()` 直接调 `restoreSnapshot()` 回到本关发射前状态并消耗一次（不进入 `armedItem`）——"读档重来"。核心已在 `createLevel` 预沉降后采集 `G.snapshot`。
- `黄金船炒面 yaki`（`uses:1`）：`arm()` 设 `G.armedItem='yaki'`；`onLaunch(e)` 给该次飞行打 chaos 标记；`onFlightStep()` 在标记生效时对飞行中的马娘施加随机横向脉冲 + 少量碎屑粒子（"黄金船式不可控暴走"），落点后清除。

### C-3 自测（`tests/feat-items.cjs`，用 `tests/harness.cjs` boot）
- 注册：boot 后断言 `REG.items` 含 `parfait/shoe/alarm/yaki` 且 `uses` 正确。
- 消耗：`createLevel(i)` → `G.items.parfait===1`；模拟 `arm()`+`launch()` → `G.armedItem` 归 null、`G.items.parfait===0`、`ent.tank===true`。
- SL：改动若干 body 位置后调 `alarm.arm()` → 断言 body 位置/血量回到 `G.snapshot`、`phase==='aim'`、次数减一。
- 炒面：`yaki` 发射后进入 flight，跑若干 `step()` 断言马娘轨迹相对无道具发生横向偏离（速度的 x 分量被扰动）。

## 3. 提交与协作约定
- 提交信息：`feat(items): 芭菲/蹄铁/闹钟SL/炒面 + 道具栏注册`，小步多次。
- 只在 `feat/items` 分支；自测绿后在 `dev/STATUS.md` 标 "C ready"，等 A 收口。
- 不碰 B 的文件与核心文件。

## 4. 验收标准（DoD）
- `node tests/feat-items.cjs` 全绿，且 `node tests/smoke.cjs` 仍全绿。
- 浏览器实测：过关后 `#itemBar` 出现 4 个道具按钮与次数角标；芭菲发射明显更横、蹄铁射程更远、闹钟 SL 一键回到发射前、炒面飞行随机暴走；控制台零报错。
- 全程仅通过 `registerItem` 落地，未修改任何 A/B 独占文件。
