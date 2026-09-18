# 角色 A 修改计划 01 —— 道具接缝可感知性 · 技能继承 · HUD 布局 · 关卡解锁

- 里程碑：**v1.0.1**（v1.0.0 = `48e2f97`，已推送；本计划为其上的缺陷修复与体验修正）
- 负责人：角色 A（平台与整合）
- 所有权边界：**只改 `src/00-boot.js`、`src/20-data.js`、`src/30-engine.js`、`src/40-render.js`、`src/50-ui-input.js`、`index.html`、`dev/*`**；
  禁止修改 `src/feat-*.js`（那是 B/C 的工作区，相关诉求见 `dev/FIX-PLAN-C-01.md`）
- 取证与闸门：`node dev/logs/items-balance-probe.cjs`（v1.0.0 现状：**4 FAIL / 2 PASS**，见下表）

## 一、诊断取证（main = ec1ae48 实测，非推测）

| 编号 | 用户反馈 | 实测证据 | 根因位置 |
| --- | --- | --- | --- |
| A-01 | 内恰吃芭菲放大后，分裂子体还是原版大小 | 母体 `r 16→20`、`hitR 18→22.5`、`circleRadius 22.5`；分裂后 3 只子体 `r=13 / hitR=14.625` | `src/30-engine.js:227` 分裂处硬编码半径 `13` |
| A-02 | 分裂后"其他效果"也没了 | 子体 `tank=false`、`frictionAir=0.0008`（母体若带道具增益全部丢失） | 同上：`spawnBirdBody` 造新实体后无增益回灌 |
| A-03 | 蹄铁看不出远投 | 首落地仅 **+75px（+4.6%）**，含滚动总距 +223px（+8.7%）；基线射程 1620px | 增益量级过小（属 C 的参数），**但核心缺少"已生效"反馈** |
| A-04 | 道具消耗后玩家以为没生效 | `launch()` 里 `onLaunch` 之后立即 `G.armedItem=null`，除计数 `-1` 外无任何飘字/音效/图标态变化 | `src/30-engine.js:292-299` |
| A-05 | 道具栏缩小窗口时挡住画面 | `#itemBar{bottom:calc(84px+safe)}` + 按钮 56px ⇒ 占用视口底部 **84~140px** 带；窗口变小（相机 zoom-out）时正压地面与待发射队列（`queuePos x=200,y=560`） | `index.html:104-105` |
| A-06 | 需要默认解锁全部关卡 | `save.unlocked=save.unlocked\|\|1`；选关页 `unlocked = idx < save.unlocked` | `src/00-boot.js:47`、`src/20-data.js:135`、`src/50-ui-input.js:122` |

补充结论（不用改）：蹄铁预测弹道积分与真实物理落点误差仅 **4px**，说明 `onAimDraw` 的积分模型正确，问题在"触发条件苛刻 + 无引导"（转 C-01）。

## 二、修改项与实施细节

### A-01 + A-02 分裂继承母体尺寸与道具增益（核心，最高优先级）

`src/30-engine.js` `triggerSkill()` 的 `blue` 分支（当前 222-230 行）改为：

```js
}else if(b.type==='blue'){ // 内恰分裂成三只
  const p=b.body.position,v=b.body.velocity,sp=Math.hypot(v.x,v.y);
  const k=b.r/BIRDS.blue.r;                 // 母体当前相对基线的缩放系数（芭菲=1.25，无道具=1）
  removeBird(b);fx('puff',p.x,p.y,4,{s:7});
  for(let i=-1;i<=1;i++){
    const a=Math.atan2(v.y,v.x)+i*.17;
    const e=spawnBirdBody('blue',p.x+i*4*k,p.y+i*22*k,Math.cos(a)*sp,Math.sin(a)*sp,13*k);
    e.skillUsed=true;
    inheritBuffs(b,e);                      // 尺寸之外的道具增益一并继承
  }
  sfx('split');
}
```

并在 `spawnBirdBody` 附近新增核心 helper（供一切"由旧实体派生新实体"的技能复用，含未来 B 的召唤类机关）：

```js
/* 派生实体继承道具增益：新增增益字段只需在这里加一行 */
function inheritBuffs(src,dst){
  if(src.tank)dst.tank=true;               // 芭菲霸体：applyHitRules 读 ea.tank
  if(src.chaos)dst.chaos=src.chaos;        // 炒面暴走标记：onFlightStep 按实体筛选
  if(src.body.frictionAir!==0.0008)dst.body.frictionAir=src.body.frictionAir; // 蹄铁低摩擦
}
```

要点：
1. 子体基准 **13 必须保留**（`checkpoint/pre-refactor` 原版即传 13，是"三只较小内恰"的有意设计），只叠加母体比例 `k`，无道具时数值完全不变 ⇒ 老手感零回归。
2. 间距 `i*4 / i*22` 同步乘 `k`，否则放大后三只挤成一团。
3. `spawnBirdBody` 已按 `r` 自动推 `hitR = r*(d.hit/d.r)` 与密度修正，传 `13*k` 即可，**不要**再手工 `Body.scale`。
4. `G.props` 的 `applyStep` 与 `REG.propPatches` 不受影响；不要在此处调用任何 `REG.items` 回调（保持核心不反向依赖道具实现）。

### A-04 道具消耗即时反馈（新增核心广播接缝）

`launch()` 中 292-299 行的消耗块补一条统一反馈，让"用了哪个道具"看得见：

```js
if(G.armedItem&&REG.items[G.armedItem]){
  const it=REG.items[G.armedItem];
  if(it.onLaunch)it.onLaunch(ent);
  G.items[G.armedItem]=Math.max(0,(G.items[G.armedItem]||0)-1);
  /* 核心统一反馈：飘字 + 音效，道具方无需各自实现；def.quiet=true 可关闭 */
  if(!it.quiet){
    G.floaters.push({x:ent.body.position.x,y:ent.body.position.y-46,txt:it.icon+' '+(it.label||it.name||G.armedItem),t:0});
    sfx('skill');
  }
  G.armedItem=null;
  renderItemBar();
}
```

同步在 `dev/CONTRACTS.md` §2 `registerItem` 字段表登记可选字段 `label?:string`、`quiet?:boolean`，并在 `dev/CHECKLIST.md` 增加验收项："发射后屏幕出现 `图标 名称` 飘字，月具栏计数 -1"。

### A-05 道具栏下移避让画面

`index.html` 三处联动（道具栏贴底、提示条上移到道具栏之上，遮挡带从 84~140px 降到 14~62px）：

```css
#itemBar{position:absolute;bottom:calc(14px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:none}
.itemBtn{... width:48px;height:48px;border-radius:12px;font-size:22px;border-width:2px;box-shadow:0 2px 0 #6d4419,...}
#hint{... bottom:calc(70px + env(safe-area-inset-bottom));font-size:17px;padding:7px 20px}
```

追加窄视口降级（窗口高度小 = 相机 zoom-out 最严重、最容易压画面的场景）：

```css
@media (max-height:620px){
  #itemBar{bottom:calc(8px + env(safe-area-inset-bottom))}
  .itemBtn{width:42px;height:42px;font-size:19px}
  #hint{bottom:calc(56px + env(safe-area-inset-bottom))}
}
```

约束：`.itemBtn .cnt` 徽标位置随按钮缩小保持 `right:-7px;top:-7px` 不越界；`pointer-events` 仍为容器 `none` + 按钮 `auto`（勿改成容器可点，否则会吞掉拖拽）。

### A-06 默认解锁全部关卡

用显式开关实现，避免"写死魔法数"且方便日后关闭：

- `src/00-boot.js:47` → `const UNLOCK_ALL=true; save.unlocked=save.unlocked||(UNLOCK_ALL?999:1);`
- `src/20-data.js:135` clamp 之后追加 `if(UNLOCK_ALL)save.unlocked=NLEVELS;`（`NLEVELS` 在 131 行才可用，顺序正确）
- 副作用处理：`src/50-ui-input.js:124` 的 `fresh`（"新解锁"高亮）条件是 `idx===save.unlocked-1`，全解锁时会让最后一关常驻高亮 ⇒ 改为 `unlocked&&idx===save.unlocked-1&&!UNLOCK_ALL`

注意并在计划交付说明里写明：`persist()` 会把 `unlocked=NLEVELS` 落盘，日后把 `UNLOCK_ALL` 改回 `false` 时**已写入的存档仍是全解锁**（需要清 localStorage 才恢复进度）；这是预期行为，不改存档 key。

## 三、验收闸门（全部满足才算完成）

1. `node tests/run-all.cjs` → 全绿（现有 3 份 + 不因本计划回归）
2. `node dev/logs/items-balance-probe.cjs` → **P1 两条由 FAIL 转 PASS**（`kidsR = [16.25,16.25,16.25]`、`tankInherited=true`）；P2/P3 若 C 未合入则允许 FAIL，需在交付说明注明
3. 无道具回归：`kidsR` 必须仍为 `[13,13,13]`（探针里 `openField()` 后不调 `onLaunch` 补一例，或在 `tests/feat-platform.cjs` 加断言）
4. 浏览器实测（`start_preview.bat` → main 分支 worktree）：
   - 选关页 16 关全部可点、无锁图标
   - L1 用内恰：点 🍨 → 拉弓发射 → 点击触发分裂 → 三只子体肉眼可见比原版大，且屏幕出现 `🍨 绝好调芭菲` 飘字
   - 把窗口拖到约 900×560：道具栏贴底、不压弹弓与待发射队列，提示条在道具栏之上不重叠
5. 控制台零 error / 零 warning

## 四、交付格式与纪律

- 在独立 worktree 上开工：`git worktree add ../AngryUma-wt/A1 -b fix/items-01 main`（不得占用主工作区，那是 B 的现场）
- 提交拆分：`fix(engine): 分裂继承母体缩放与道具增益` / `fix(ui): 道具栏贴底避让画面` / `feat(save): 默认解锁全部关卡` / `docs: CONTRACTS+CHECKLIST`
- commit message 保持单行短小（环境钩子限制），不推送、不打 tag（由收口时统一决定 v1.0.1）
- 与 C 的并行约定：A-01/A-02 的 `inheritBuffs` 是本计划与 `dev/FIX-PLAN-C-01.md` 的**唯一共享前置**；C 不得自行改 `30-engine.js` 来绕开它

## 五、执行结果（A 段已完成）

TDD 路径：先写 `tests/feat-platform.cjs` 取红灯（`期望 r=16.25，实测 [13,13,13]`），再实施，转绿。

| 项 | 实施 | 实测证据 |
| --- | --- | --- |
| A-01 | `triggerSkill` blue 分支改为 `13*k`（`k = b.scaleK \|\| b.r/BIRDS.blue.r`），间距同步 ×k | 浏览器：母 `r20/cr22.5` → 三子体 **`r=16.25 / hitR=18.28 / circleRadius=18.28`** |
| A-02 | 新增核心 `inheritBuffs(src,dst)`（`tank`/`chaos`/`shoe`/非默认 `frictionAir`） | 浏览器：三子体 `tank=true`；探针 P1 两条 FAIL → **PASS** |
| A-04 | `launch()` 消耗块统一飘字 `图标+label/name` + `sfx('skill')`，`def.quiet` 可关 | 测试：`newFloaters≥1`、文案含 `🍨 芭菲`、计数归零、`armedItem=null` |
| A-05 | `#itemBar bottom 84→14px`、`.itemBtn 56→48px`、`#hint 24→70px` 让位、新增 `@media (max-height:620px)` 降级 | 浏览器：道具栏 `btnW=48`、**距底 14px**（遮挡带由 84~140px 降到 14~62px）、`hintOverlapsBar=false` |
| A-06 | `00-boot` 新增 `UNLOCK_ALL`、`refreshCounts` 强制覆盖旧存档进度、选关页 `fresh` 条件加 `&&!UNLOCK_ALL` | 浏览器：`tileCount=16 / locked=0 / fresh=0 / 最后格=16`、`save.unlocked=16=NLEVELS` |

闸门：`node tests/run-all.cjs` → **ALL TESTS PASSED (4)**（smoke、feat-items、feat-platform、feat-scene，既有测试零回归）；
`node dev/logs/items-balance-probe.cjs` → P1 两条转 PASS，**P2（蹄铁 ≥12%）、P3（炒面漂移 ≥250px）仍 FAIL，属 C-01/C-02 未完成**，符合本计划预期分工。
浏览器 console 零 error / 零 game-side warning（唯一 warn 由探针自身 `getImageData` 触发）。

两点如实登记：
1. **横向居中无法在本环境取证**：预览窗口 hidden 且 `innerWidth=1`，`transform:translateX(-50%)` 的道具栏 `left` 为负值属测量环境所致而非缺陷；纵向遮挡带（本次修的目标）测量有效。
2. **选关网格疑点经实测否定**：曾疑 `PER=Math.round(NLEVELS/WORLDS)` 只给 15 格，实测 `THEMES.length=4 ⇒ WORLDS=4, PER=4 ⇒ 16 格、missingIdx=[]`，**无缺陷**，不改。

契约同步：`dev/CONTRACTS.md` §1 文件表未变；§2 `registerItem` 增补可选字段 `label`/`quiet`/`scaleK`；§3 接缝表 `launch()` 行为更新并新增 `triggerSkill` 继承行。
