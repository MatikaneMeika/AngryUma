# 角色 C 修改计划 01 —— 蹄铁/炒面效果增强 · 道具契约字段补齐

- 里程碑：**v1.0.1**（承接 v1.0.0 = `48e2f97`）
- 负责人：角色 C（玩家与道具）
- 所有权边界：**只改 `src/feat-items-uma.js`、`src/feat-items-time.js`、`tests/feat-items*.cjs`**；
  **禁止修改 `src/30-engine.js` / `src/40-render.js` / `src/50-ui-input.js` / `index.html`**（核心接缝与 HUD 布局由 `dev/FIX-PLAN-A-01.md` 负责）
- 取证与闸门：`node dev/logs/items-balance-probe.cjs`（A 已入库，本计划完成时 P2/P3 四条须转 PASS）

## 一、诊断取证（main = ec1ae48 实测）

| 编号 | 用户反馈 | 实测证据 | 判定 |
| --- | --- | --- | --- |
| C-01 | 蹄铁🐴"没看到效果" | 首落地 1920→1995（**+75px / +4.6%**），含滚动 2574→2797（+8.7%）；预测线本身极准（误差 **4px**） | 接缝与积分模型**正常**，是**增益量级太小 + 触发条件苛刻 + 无引导**；预测线仅当 `G.armedItem==='shoe' && G.slingBird.drag && hypot(drag)≥16` 时才画（`feat-items-uma.js:30-32`） |
| C-02 | 炒面🍜"没看到效果" | 30 次采样：**平均漂移 +22px（≈0）**，sd 166px，spread 741px；不调 `onFlightStep` 时 1920（=基线） | 接缝正常；问题是 `pulse = (rand<0.5?-1:1)*(0.18+rand*0.22)` **正负完全对称**⇒ 期望净偏移为 0，玩家只看到"手抖噪声"，不叫暴走。**且代码注释自称"单调漂移 + 高频抖动"，实现里没有单调项**（`feat-items-time.js:39-41`） |
| C-03 | 芭菲🍨放大没传导到分裂 | 母体 `r 16→20`，分裂子体 `r=13 / tank=false` | **根因在核心**（`30-engine.js:227` 硬编码 13），修复归 A-01/A-02；C 侧只需配合契约字段（见 C-03 小节） |
| C-04 | v1.0.0 遗留清理 | 核心 `restoreSnapshot` 已统一 `if(ent.dead)` 复活（`30-engine.js:336`） | C 在 `feat-items-time.js:20-22` 的补偿循环已成**幂等空操作**，应删除，避免误导后续维护者 |

## 二、修改项与实施细节

### C-01 蹄铁：把"远投"做成能看见的远投

1. **量级**：`onLaunch` 从"只降摩擦"改为"低摩擦 + 飞行中持续微弱前向加速度"，两种机制叠加才能同时体现"更平直"和"明显更远"：

```js
registerItem('shoe', {
  name: '决胜蹄铁', icon: '🐴', uses: 1, label: '决胜蹄铁：远投',
  arm() { if ((G.items.shoe | 0) > 0) G.armedItem = 'shoe'; },
  onLaunch(e) { e.body.frictionAir = 0.00005; e.shoe = 1; },
  onFlightStep() {
    const e = G.flock.find(x => !x.dead && x.shoe);
    if (!e) return;
    const b = e.body, v = b.velocity, sp = Math.hypot(v.x, v.y) || 1;
    if (sp < 26) Body.setVelocity(b, { x: v.x + v.x / sp * 0.22, y: v.y + v.y / sp * 0.22 }); // 沿弹道方向助推，设上限防无限加速
    if (G.t % 3 === 0) fx('spark', b.position.x, b.position.y, 1, { s: 3, col: '#ffd23e' });   // 金色尾迹=这一发确实用了蹄铁
  },
  onAimDraw() { ...同现有积分，摩擦常数同步改为 0.00005 并按助推规则迭代，否则预测线会失准... }
});
```

   - **必须同步改 `onAimDraw` 的积分参数**：预测线用的是 `1 - 0.00015`，若 `frictionAir` 改了而积分没改，预测线就从 4px 误差变成几十上百px 误差，比"没效果"更糟。
   - 硬指标（探针闸门）：`P2.firstLandGainPct ≥ 12`，且 `P4.errPx ≤ 80`。
2. **触发与引导**（解决"要点两次、要拖够 16px 才看得见"）：
   - `armed` 且**尚未拖拽**时，在弹弓上方画一行小字提示（走 `onAimDraw` 即可，无需改核心）：`🐴 拉弓显示金色预测线`；
   - 拖拽阈值从 16px 降到 8px；
   - 金色点的 `globalAlpha` 下限从 0.2 提到 0.45、半径 3.4→4.2，提升天空背景下的对比度。

### C-02 炒面：加上真正的"单调漂移"，让暴走有方向

把对称脉冲改成**带持久方向的蛇形漂移**（方向由本发决定，每 ~14 步换一次向，净偏移不再相互抵消）：

```js
let yakiT = 0, yakiDir = 1;
registerItem('yaki', {
  name: '黄金船炒面', icon: '🍜', uses: 1, label: '黄金船炒面：暴走',
  arm() { if ((G.items.yaki | 0) > 0) G.armedItem = 'yaki'; },
  onLaunch(e) { e.chaos = 1; yakiT = 0; yakiDir = Math.random() < 0.5 ? -1 : 1; },
  onFlightStep() {
    const e = G.flock.find(x => !x.dead && x.chaos);
    if (!e) return;
    yakiT++;
    if (yakiT % 14 === 0) yakiDir *= -1;                       // 蛇形换向，但每段同向 ⇒ 有净漂移
    const b = e.body, v = b.velocity;
    const drift = yakiDir * 0.55;                              // 单调项
    const jitter = (Math.random() - 0.5) * 0.4;                // 抖动项
    const vy = v.y + (Math.random() - 0.5) * 0.5;              // 轻微上下颠簸
    Body.setVelocity(b, { x: v.x + drift + jitter, y: vy });
    if (yakiT % 4 === 0) fx('smoke', b.position.x, b.position.y, 1, { s: 4, col: '#d8b25e' });
  },
});
```

   - 硬指标：`P3.meanDriftPx` 绝对值 ≥ 250、`P3.spreadPx ≥ 600`（散度已达标，别改小）。
   - 参数调法：先调 `drift` 常数到平均漂移 ~2.5%（`vx=15,vy=-15` 满弓 ~112 步落地 ⇒ `0.55 × 112` 量级），再用探针复测，不要凭手感。
   - 注释必须与实现一致：现在这段注释写着"单调漂移"，若最终没做单调项，请把注释改掉（这是本轮被抓到的实际问题）。

### C-03 芭菲：契约字段补齐（与 A-01 对齐，勿抢改核心）

A-01 用 `k = b.r / BIRDS[b.type].r` 推缩放系数，对现有四只马娘已正确。但为让"缩放"成为显式契约（不依赖 `r` 的隐式比值，未来别的道具做缩小时更稳），建议 `parfait.onLaunch` 额外记一个字段：

```js
onLaunch(e) { e.tank = true; e.scaleK = 1.25; Body.scale(e.body, 1.25, 1.25); e.r *= 1.25; e.hitR *= 1.25; },
```

并让 A 的 `inheritBuffs` 优先读 `src.scaleK`：`const k = src.scaleK || src.r / BIRDS[src.type].r;`
**执行顺序**：C 只在自己的 def 里加 `scaleK`，核心那一行改动由 A 在 A-01 里一并做；两方都要在 `dev/CONTRACTS.md` §2 的 `registerItem` 字段表登记 `scaleK?:number`（谁先提交谁登记，另一方 rebase 时保留）。

### C-04 删除闹钟的幂等补偿循环

`feat-items-time.js:10-22`：核心已在 `restoreSnapshot` 内统一 `if(ent.dead)` 复活（v1.0.0 的 `48e2f97`），C 侧的 `alive` 收集 + 二次 `Composite.add` 已是空操作，删掉它和那段"接缝缺口补正"注释，只留一行"复活逻辑由核心 restoreSnapshot 统一负责"。
同时把注释里登记的缺口条目从 `dev/STATUS.md` 划掉的责任交给 A（C 不改 `dev/STATUS.md`）。

### C-05 测试从"不崩"升级到"有幅度"

现有 `tests/feat-items.cjs` 只验接缝存在与不崩，这是"效果看不见"没被闸门拦住的根本原因。要求：

1. 新增 `tests/feat-items-balance.cjs`：复用 `dev/logs/items-balance-probe.cjs` 的测量法（可直接 `require` 它或复制 `openField()/fly()` 两个 helper），断言四条硬指标（`firstLandGainPct ≥ 12`、`|meanDrift| ≥ 250`、`spread ≥ 600`、`predErr ≤ 80`）；
2. 保留并扩展 `tests/feat-items.cjs`：断言 `parfait` 后 `e.scaleK===1.25 && e.r===20`；`shoe` 后 `body.frictionAir < 0.0002`；`alarm` 在 `uses=0` 时点击不改 `G.phase`、不抛错；
3. 不得为通过测试而放宽上面四条阈值。

## 三、验收闸门

1. `node tests/run-all.cjs` 全绿（含新增的 `feat-items-balance.cjs`）
2. `node dev/logs/items-balance-probe.cjs` → **P2、P3 全部转 PASS，P4 保持 PASS**
3. 浏览器实测（发布态 main，`start_preview.bat`）：
   - 蹄铁：点 🐴 后立刻出现引导小字；拉弓时金色预测线清晰可见；发射后鸟带金色尾迹；同一发力度下落点明显比基线远一档
   - 炒面：点 🍜 发射，轨迹肉眼可见地"跑偏"并带方向性（不是对称抖动），落点与瞄准差一个猪位以上
   - 芭菲 + 内恰：分裂后三只都保持放大且伤害仍带霸体加成（A-01 合入后验）
4. 控制台零 error / 零 warning；`REG` 注册顺序未变（`feat-items-uma.js`、`feat-items-time.js` 仍在 `30-engine.js` 之前）

## 四、交付格式与纪律

- 工作区：沿用现有 `../AngryUma-wt/C`（feat/items 分支），新建 `git branch fix/items-01` 或直接提交到 `feat/items-01`
- 提交拆分：`fix(items): 蹄铁远投量级与预测线同步` / `fix(items): 炒面单调漂移蛇形暴走` / `chore(items): 删除闹钟幂等补偿` / `test(items): 道具平衡性阈值`
- 不推送、不打 tag；合并由 A 在收口时统一执行
- 严禁触碰 B 的 `src/feat-props*.js` 与 A 的核心文件；若发现必须改核心才能达成指标，把诉求写回本文件末尾"→ A 追加"段，等 A-01 的后续修订
