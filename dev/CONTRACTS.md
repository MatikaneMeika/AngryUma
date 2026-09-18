# CONTRACTS.md — 冻结契约（角色 A 维护，签名变更须回炉评审）

基线 tag：`checkpoint/pre-refactor`（拆分前单文件态）→ `base`（本文件描述的模块化态）。

## 1. 脚本链顺序（加载顺序即契约）

壳 `index.html` 按下列顺序引入 14 个 **classic script**（非 ES module，保证 `file://` 直开）：

```
src/00-boot.js          'use strict'/Matter 守卫/工具/预载/存档/音效（Matter 解构含 Constraint）
src/10-registry.js      REG 注册表与注册函数（A 独占）
src/20-data.js          常量/THEMES/LEVELS/派生常量(NLEVELS,LAST,PER)+refreshCounts()/save
src/21-levels-w2w3.js   [B 空桩] 世界2/3 关卡数据（registerLevels 注入）
src/feat-carrot.js      [B] carrot 材质+皮肤+爆炸连锁（注册接入）
src/feat-zones.js       [B] mud/slopeUp/slopeDown 区域（registerPropType）
src/level-zones.js      [B] 区域机关关卡装配（registerProp）
src/feat-contraptions.js[B] tire/bowl 机关（registerPropType）
src/level-contraptions.js[B] 机关关卡装配（registerProp）
src/feat-items-uma.js   [C 空桩] 马娘道具（registerItem）
src/feat-items-time.js  [C 空桩] 时间系道具（registerItem + takeSnapshot/restoreSnapshot）
src/30-engine.js        引擎/G/实体/伤害/技能/关卡流程/粒子/step/相机
src/40-render.js        全部 draw*/render
src/50-ui-input.js      输入/UI/启动/renderItemBar()
```

规则：B/C 文件**只准调用注册函数**，不得修改任何 A 独占文件；核心不得 `import`/引用 B/C 文件内符号（只经 `REG.*` 查表）。

## 2. REG 注册表接缝（签名冻结）

```js
const REG = {extraMats:{}, skins:{}, explosives:{}, propTypes:{}, propPatches:{}, items:{}, afterCreate:[]};

function matDef(m)                       // 读材质：REG.extraMats[m] || MATS[m]（内置优先兜底）
function regMat(name, def)               // def = {hp,density,fill,edge,score}
function regSkin(mat, fn)                // fn(ent)，drawBlock 画完底框后调用
function registerExplosive(mat, h)       // h = {onDetonate(x,y)}；destroyBlock 后进 G.pendingBoom 连锁
function registerPropType(t, h)          // h = {make,inZone,applyStep,draw,onHit}
function registerProp(idx, cfg)          // 关卡下标 → propPatches[idx] 收集，createLevel 装配
function registerItem(id, def)           // def = {name,icon,uses,enabled,arm,onLaunch,onFlightStep,onAimDraw}
function registerLevels(start, arr)      // 写 LEVELS 后调用 refreshCounts()（扩展点，见 §3）
```

### 核心调用点语义（均为"无注册时行为与 base 严格一致"的通用钩子）

| 位置 | 钩子 | 无注册时 |
|---|---|---|
| `makeBlock` | `matDef(bd.m)` 取 density/hp；`REG.explosives[bd.m]` → `ent.explosive=true` | 与基线同值 |
| `destroyBlock` | `addScore(matDef(ent.mat).score,p)`；explosive → `G.pendingBoom.push({x,y,h})` | 不 push |
| `processDamage` | 有界连锁 `guard<10`：换桶排空 damageBuf → 排空 pendingBoom（`explode` + `h.onDetonate`） | 单次循环，等价基线 |
| `applyHitRules` | `eb.kind==='prop'` 直接 return（机关不走伤害）；`ea.tank` 时 dmg ×2.2 且忽略 matMult（芭菲霸体） | 不进分支 |
| `collisionStart` | 任一 body 为 prop → `REG.propTypes[type].onHit(prop, otherBody, rel)`（**扩展：附带第三参 rel 相对速度**，不写第三参的旧 handler 兼容） | 不触发 |
| `createLevel` | 复位 `G.props/pendingBoom/armedItem/snapshot` → 装配 `propPatches[i]`（`T.make(cfg)`，刚体须 `body.gd={kind:'prop',prop}`）→ `G.items` 按各注册 `uses` 重置 → 预沉降+血量复位后 `G.snapshot=takeSnapshot()` → `REG.afterCreate` 逐个 `fn(i)` → `renderItemBar()` | 空转 |
| `step()` | Engine.update 后逐 prop `applyStep(pr)`；flight 分支逐 item `onFlightStep()` | 空数组空转 |
| `launch()` | `spawnBirdBody` 后若 `G.armedItem`：`it.onLaunch(ent)`、`G.items[id]--`（钳 0）、`G.armedItem=null`、`renderItemBar()` | 不触发 |
| `drawBlock` | 底框 `matDef(ent.mat).fill/edge`；结尾 `REG.skins[ent.mat]?.(ent)` | 同基线 |
| `drawGame` | 逐 prop `T.draw(pr)`；aim 阶段逐 item `onAimDraw()` | 空转 |
| `renderItemBar`（50-ui） | 据 `REG.items`+`G.items` 渲染 `#itemBar` 按钮/`.cnt` 角标/`.armed` 态，点击 `def.arm()`（left>0 且 enabled!==false）；`REG.items` 为空时 `#itemBar` 保持 hidden | 隐藏 |

### G 新增字段（30-engine，供 B/C 只读/按语义使用）

```js
props:[],        // createLevel 装配的机关实例
pendingBoom:[],  // 待引爆队列 {x,y,h}，processDamage 排空
items:{},        // 道具 id → 剩余次数（createLevel 按注册 uses 重置）
armedItem:null,  // 已激活待发射消耗的道具备 id
snapshot:null,   // createLevel 预沉降后的世界快照
```

### 快照接缝（时间系道具用，30-engine）

- `takeSnapshot()`：记录 block/pig 的 pos/angle/vel/av/hp/dead + `queue/score`。
- `restoreSnapshot()`：回滚上述状态、复活实体、清 flock/dots/floaters/pendingBoom；
  **收口统一（v1.0.0）**：复活判定为 `if(ent.dead)`——快照时已死、或快照后本次被杀的 block/pig 一律 `ent.dead=false` 并 `Composite.add` 加回 world（C 登记的缺口 #6 已进核心，feat-items-time 的补偿循环成为幂等空操作，C 可在后续提交删除）；
  **扩展语义**：末尾若有剩余鸟则 `phase='loading'→loadNextBird()`（重新装填回到瞄准态），否则进 `waitClear`。C 按此语义使用，勿依赖 phase 恒为 `'aim'`。

## 3. 派生常量与存档（20-data）

- `NLEVELS/LAST/WORLDS/PER` 为 `let`，统一由 `refreshCounts()` 派生；`registerLevels` 扩关后自动调用。
- `refreshCounts()` 同时补齐 `save.stars` 新关卡槽位并把 `save.unlocked` 夹紧到 `[1, NLEVELS]` —— **save 结构向后兼容是红线**。

## 4. 关卡数据契约（LEVELS[i]）

`{world, name?, pigs:[{x,y,s?}], blocks:[{x,y,w,h,m}], slingshot?...}`；`m` 为材质名（内置 `wood/glass/stone` 或 `regMat` 注册名）。B 扩关用 `registerLevels(16, [...])`。

## 5. 测试基座契约（tests/）

- `tests/harness.cjs`（A 独占）导出 `{ROOT, concatSource, makeSandbox, boot, tick, run, cutFn}`。
- **`boot()` 返回 vm.createContext 后的 context 本身**，并挂 `sandbox` 自引用——兼容 `const ctx = boot(); vm.runInContext(code, ctx)` 与 `const { sandbox } = boot(); harness.run(sandbox, code)` 两种写法；元信息挂于 context：`__source`（拼接源码）、`__html`、`__srcs`、`__listeners`、`__drawCalls`、`__elements`。断言前需 `await harness.tick()`（资源 Image.onload 走 microtask）。
- B/C 的 feat 测试**自持文件** `tests/feat-<名>.cjs`，独立可 `node` 运行、退出码 0/1；harness 未就绪时打印 SKIP 并 exit 0。
- `npm test` = `node tests/run-all.cjs`：smoke + 按文件名序自动发现的全部 `tests/feat-*.cjs`，任一红即失败。`npm run test:smoke` 单跑 A 闸门。

## 6. 全局红线

- 零外部依赖（vendor/matter.min.js 与 CDN 之外不加任何资源）；绘制/音效保持程序化合成。
- 拆分对基线是**纯搬运**：任何行为差异视为缺陷；A 不为 B/C 实现玩法体。
- classic script 顶层 `const/let` 共享同一全局作用域：B/C 文件内符号须避免与核心及彼此重名（建议 feat 前缀私有 IIFE 或独特命名）。
