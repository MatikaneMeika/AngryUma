# 任务书 B — 场景与关卡角色（World & Level Props）

> 负责"环境侧一切"：世界2/3 复合建筑、炸裂胡萝卜箱、区域机关（泥泞/冰面/坡牌）、物理机关（轮胎秋千/引力饭盆）。在角色 A 的 `base`（含 `src/` 模块与 `REG` 接缝）之上工作，worktree：`../AngryUma-wt/B`，分支 `feat/world`。

## 0. 依赖前置（开工前确认）
- `git fetch` 后基于 tag `base` 拉出 `feat/world`；先跑 `node tests/smoke.cjs` 确认基座绿。
- 只使用 `dev/CONTRACTS.md` 冻结的接缝：`regMat / regSkin / registerExplosive / registerPropType / registerProp / registerLevels`。**不改** `index.html`、`src/00-50`、`server.js`、`tests/harness.cjs`、`smoke.cjs`。
- 发现缺接缝：在 `dev/STATUS.md` 追加"接缝缺口"条目并绕过实现，**不自行改核心**。

## 1. 独占文件
`src/21-levels-w2w3.js`、`src/feat-carrot.js`、`src/feat-zones.js`、`src/level-zones.js`、`src/feat-contraptions.js`、`src/level-contraptions.js`、`tests/feat-scene.cjs`

## 2. 交付内容

### B-1 世界2/3 复合型建筑（`21-levels-w2w3.js`）
- 用 `registerLevels(8,[...])` 覆盖 `LEVELS[8..15]`（世界2 竞技场 index 8-11、世界3 游泳馆 index 12-15），保持每世界 4 关、`world` 字段与现有 `THEMES` 不变。
- 目标：后两世界出现 **3-5 层及以上**复合结构——双柱承梁、箱柱堆叠、国王猪置中上层、双塔宽体等，参考《愤怒的小鸟》后期关卡层次。
- **必须复用 `20-data.js` 既有格点 helper**：`P/P2/Beam/Box/NP/KP` 与梁长约定（`len150` 配 227/227、`len190` 配 227/265、`len260` 配 190/282、`len360` 配 155/307 等），不要另造坐标体系。`structure` 为块、`pigs` 为猪、`birds` 为马娘序列（`initial/accelerate/boom/split` 已存在）。

### B-2 炸裂胡萝卜箱（`feat-carrot.js`）
- `regMat('carrot',{hp:60,density:.0024,fill:'#e08a2e',edge:'#a85f16',score:600})`（高 hp，避免沉降期被压爆）。
- `registerExplosive('carrot',{onDetonate(x,y){ /* 引爆后额外喷胡萝卜碎屑 + 轻微上扬冲量已含在 explode 内，这里补强视觉 */ }})`。
- `regSkin('carrot',ent=>{ /* 在底框上画橙条纹理 + 顶部绿色缨叶 + 引信，用 ent 的宽高，ctx 已 translate 到块中心 */ })`。
- **散弹连锁**由核心 `processDamage`→`pendingBoom` 有界循环提供（A 实现），本角色只需把箱子作为普通 `m:'carrot'` 块摆进关卡即可实现"点一个炸一片"。
- 摆放：在 `21-levels-w2w3.js` 的部分关卡里作为承重/夹心块放置，位置要经得起预沉降（见验收）。

### B-3 区域机关（`feat-zones.js` + `level-zones.js`）
`registerPropType` 四个类型，每个含 `{make(cfg),inZone(cfg,body),applyStep(cfg),draw(cfg)}`（`draw` 在世界坐标绘制、`applyStep` 每物理步作用一次）：
- `mud` 泥泞水洼：落入区的动态体显著降弹性/加 `frictionAir`（赛马娘名梗"苦手泥"）。用于世界2。
- `ice` 冰面：区内降 `friction`，滑过（世界3/游泳馆周边可选）。
- `slopeUp` 上托重力牌：区内给体持续 +上/沿坡方向力（把马娘托起或偏转）。
- `slopeDown` 下砸重力牌：区内给体持续向下/沿坡力（加速下压，配合砸穿）。
- `level-zones.js` 用 `registerProp(levelIdx,{type,x,y,w,h,...})` 把水洼/坡牌布置到指定关卡（世界2 用 mud，需要处放 slope 牌）。
- 坡牌做成"静态指示牌"外观（`draw` 里画立柱+箭头面板），不承重、不参与结构受力。

### B-4 物理机关（`feat-contraptions.js` + `level-contraptions.js`）
- `tire` 轮胎秋千：`make` 生成轮胎刚体 + `Matter.Constraint` 绳索悬挂（`body.gd={kind:'prop',prop}`）；`applyStep` 让其自然摆动；`onHit(prop,body)` 被马娘/碎片击中时**切断绳索**（移除 Constraint）使轮胎甩飞砸向结构。
- `bowl` 引力饭盆（"绝好调芭菲"的场景版彩蛋）：`make` 生成一个静态指示物；`onHit` 被命中后激活；`applyStep` 在激活后的限时窗口内对半径内动态体施加指向盆心的引力，把碎块/猪聚拢再配合爆炸清场。
- `draw` 分别画轮胎（黑环）与饭盆（碗+发光）。`level-contraptions.js` 用 `registerProp` 摆到世界2/3 关卡。

### B-5 自测（`tests/feat-scene.cjs`，用 `tests/harness.cjs` boot）
- 稳定性：对每张被 B 改动的关卡 `createLevel(i)` 跑 150 步，断言猪不死亡、位移 < 26、无 `carrot` 在沉降期爆炸（`G.pendingBoom` 沉降后为空）。
- 连锁：对某关手动 `killPig`/破坏一个 carrot 块 → `processDamage` → 断言触发 `explode` 且相邻 carrot 依次引爆（`pendingBoom` 被消化）。
- 区域：放一个动态体进 `mud` 区 → 断言速度/弹性下降；`slopeUp` → 断言受向上力。
- 机关：`tire` 命中后 Constraint 被移除；`bowl` 命中激活后对附近体产生向心速度。

## 3. 提交与协作约定
- 提交信息：`feat(world): 世界2/3复合建筑 / 胡萝卜箱连锁 / 区域机关 / 物理机关`，小步多次提交。
- 只在 `feat/world` 分支工作；完成自测绿后在 `dev/STATUS.md` 标记 "B ready"，等待 A 收口合并。
- 不碰 C 的文件与核心文件；如需核心配合，走 STATUS.md 缺口登记。

## 4. 验收标准（DoD）
- `node tests/feat-scene.cjs` 全绿，且 `node tests/smoke.cjs` 仍全绿（未破坏基座）。
- 浏览器实测：世界2/3 出现 3-5 层稳定复合建筑；胡萝卜箱被击后连锁爆炸；泥泞/坡牌/轮胎/饭盆效果肉眼可见、控制台零报错。
- 全程仅通过注册接缝落地，未修改任何 A 独占文件。
