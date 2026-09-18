# 任务书 A — 平台与整合角色（Platform & Integration）

> 本角色是并行的**硬前置**与**最终收口者**。产出 `base` 基座（模块化 + 注册表接缝）后，角色 B、C 才能在自己的 worktree 分支上无冲突并行。所有会话用绝对路径 git：`D:\gongju\Git\cmd\git.exe`。

## 0. 一句话目标
把单文件 `index.html` 重构为 `src/` 有序 classic 脚本模块 + 一套"注册表接缝"，让功能角色只注册不改核心；建 git/worktree；最后按序合并 B、C 并做证据驱动的审查与多设备验收。

## 1. 独占文件（只有本角色可改）
- `index.html`（重构为壳）、`src/00-boot.js`、`src/10-registry.js`、`src/20-data.js`、`src/30-engine.js`、`src/40-render.js`、`src/50-ui-input.js`
- `server.js`、`package.json`、`tests/harness.cjs`、`tests/smoke.cjs`
- `dev/CONTRACTS.md`、`dev/OWNERSHIP.md`、`dev/STATUS.md`、`dev/CHANGELOG.md`、`dev/INTEGRATION-CHECKLIST.md`
- 各 `src/feat-*.js` / `src/21-levels-w2w3.js` / `src/level-*.js` 的**空桩**（只含头部注释与占位，注册逻辑交给 B/C 填）

## 2. 工作项

### A-1 建立 git 基线与工作树
- `git init`，设 `user.name/email`；先把**当前可运行的 16 关版本**作为 `checkpoint/pre-refactor` 提交（回滚锚点）。
- 完成 A-2..A-5 且 `node tests/smoke.cjs` 全绿后提交并打轻量 tag `base`。
- 建工作树（放仓库同级、不被静态服务 serve）：
  - `git worktree add ../AngryUma-wt/B -b feat/world`
  - `git worktree add ../AngryUma-wt/C -b feat/items`
  - 本角色留在 `main`。

### A-2 单文件 → src 模块（行为完全不变）
按下列顺序在壳里用普通 `<script src>` 引入（非 ES module，保证 `file://` 与多设备在线均可运行）：
`00-boot → 10-registry → 20-data → 21-levels-w2w3(桩) → feat-carrot(桩) → feat-zones(桩) → level-zones(桩) → feat-contraptions(桩) → level-contraptions(桩) → feat-items-uma(桩) → feat-items-time(桩) → 30-engine → 40-render → 50-ui-input`。
切片边界（对应现 index.html 行号）：
- `00-boot.js`：L179-275（`'use strict'`、Matter 缺失守卫、工具函数、**在 Matter 解构处加 `Constraint`**、资源预载、SAVE+`save.stars` 解析、`AU`+`sfx`+`sfxT`）。
- `10-registry.js`：新增（见 A-3 契约），置于数据/引擎之前，仅依赖不存在的全局，注册函数在运行时调用。
- `20-data.js`：L277-343（`GROUND_Y`/`SLING`/`MATS`/`BIRDS`/`PIG`/`THEMES`/几何 helper/`LEVELS` 世界0-1 与现有 16 关全量）+ L402-407（派生常量与 `save` 补齐）。
- `30-engine.js`：L409-836（world/G/createScenery/`makeBlock`/`makePig`/`spawnBirdBody`/伤害系统/`explode`/技能/`createLevel`/`showWin`/粒子/`step`/相机）。
- `40-render.js`：L917-1349（所有 `draw*`/`render`）。
- `50-ui-input.js`：L1351-1565（输入、UI 屏切换、`renderSelect`/徽章、`updateHint`、按钮绑定、启动 loop、`?lv=`）。
- 壳 `index.html`：保留 `<head>`/`<style>`（L1-103）与 HUD 标记（L105-176），删除内联大 `<script>`，改为上面的 script 链；HUD 内新增 `<div id="itemBar" class="hidden"></div>` 容器；`<style>` 内补 `.itemBtn`/`.cnt`/`.armed` 基础样式。
- 红线：**纯搬运**，不改任何逻辑/常量；拆分后 `node tests/smoke.cjs` 必须仍全绿、浏览器表现与拆分前一致。

### A-3 注册表接缝（写入 `10-registry.js`，并把签名冻结进 `dev/CONTRACTS.md`）
```
const REG={extraMats:{},skins:{},explosives:{},propTypes:{},propPatches:{},items:{},afterCreate:[]};
function matDef(m){return REG.extraMats[m]||MATS[m];}          // 所有 MATS[x] 调用点改用 matDef(x)
function regMat(name,def){REG.extraMats[name]=def;}
function regSkin(mat,fn){REG.skins[mat]=fn;}                    // drawBlock 画完底框后调 fn(ent)
function registerExplosive(mat,h){REG.explosives[mat]=h;}       // h.onDetonate(x,y)
function registerPropType(t,h){REG.propTypes[t]=h;}             // {make,inZone,applyStep,draw,onHit}
function registerProp(idx,cfg){(REG.propPatches[idx] ||= []).push(...[].concat(cfg));}
function registerItem(id,def){REG.items[id]=def;}               // {uses,icon,arm,onLaunch,onFlightStep,onAimDraw}
function registerLevels(start,arr){for(let i=0;i<arr.length;i++)LEVELS[start+i]=arr[i];}
```
核心在既有代码里**新增通用调用点**（不含任何具体玩法）：
- `G`（30-engine）新增：`props:[],pendingBoom:[],items:{},armedItem:null,snapshot:null`。
- `makeBlock`：`const def=matDef(bd.m);` 用其 density/hp/fill/edge/score；若 `REG.explosives[bd.m]` 则 `ent.explosive=true`。
- `destroyBlock`：碎裂外观照旧；`addScore(matDef(ent.mat).score,p)`；若 `ent.explosive` 则 `G.pendingBoom.push({x,y,h:REG.explosives[ent.mat]})`。
- `processDamage`：改为**有界连锁循环**（`guard<10`）：先排空 `damageBuf`（换桶法），再排空 `pendingBoom` → 对每条 `explode(x,y); if(h&&h.onDetonate)h.onDetonate(x,y);`（`explode` 新伤害进新桶，下一轮处理）。base 无爆炸物时行为与现状一致。
- `createLevel`：复位 `G.props/pendingBoom/armedItem`；解析 `REG.propPatches[i]` → `G.props.push(REG.propTypes[cfg.type].make(cfg))`；`makeProp` 若产生刚体需 `body.gd={kind:'prop',prop}`；复位 `G.items` 为各注册道具的 `uses`；预沉降+复位血量后采集 `G.snapshot`；末尾遍历 `REG.afterCreate`。
- `step()`：`Engine.update` 后、`processDamage` 前，`for(const pr of G.props)REG.propTypes[pr.type].applyStep?.(pr)`；flight 分支内 `for(const id in REG.items)REG.items[id].onFlightStep?.()`。
- `collisionStart`：命中 `other.gd?.kind==='prop'` → `REG.propTypes[gd.prop.type].onHit?.(gd.prop, otherBody)`。
- `launch()`：`spawnBirdBody` 后若 `G.armedItem` → `REG.items[G.armedItem].onLaunch?.(ent)`，`G.items[G.armedItem]--`，`G.armedItem=null`。
- `applyHitRules`：`ea.tank` 时对 block/pig `dmg*=2.2` 且忽略 `matMult` 衰减（供芭菲用）。
- `drawBlock`：底框用 `matDef(ent.mat).fill/edge`；结尾 `REG.skins[ent.mat]?.(ent)`。
- `drawGame`：`for(const pr of G.props)REG.propTypes[pr.type].draw?.(pr);`；aim 阶段 `for(const id in REG.items)REG.items[id].onAimDraw?.()`。
- `renderItemBar()`（50-ui-input）：据 `REG.items`+`G.items` 渲染按钮/次数角标/激活态，点击调 `item.arm()`（`enabled` 且次数>0）；`createLevel`/状态变化后刷新。
- `restoreSnapshot()`（30-engine）：把 `G.snapshot` 写回各 body 的 pos/angle/vel/av 与 ent 的 hp/dead，重建已死 block/pig，清 `G.flock`、复原 `G.queue/score/phase='aim'`。

### A-4 测试基座（多文件加载）
- `tests/harness.cjs`：读壳 `index.html` 抓 `<script src="...">` 顺序，按序读文件拼接为一段脚本，在 `vm` sandbox（沿用现 smoke 的 document/Image/Matter/localStorage 桩）执行，返回 sandbox 供断言；暴露 `boot()` 与常见句柄。
- `tests/smoke.cjs`：改用 harness；保留全部既有断言（尤其 `for(i<LEVELS.length)` 每关 150 步稳定性、猪不死亡/位移<26、资源 8 项、通关→下一关）；关卡数动态。
- `package.json`：`test` 脚本 = 依次 `node tests/smoke.cjs` + 每个 `node tests/feat-*.cjs`（B/C 各加自己的 feat 测试文件）。

### A-5 服务与文档
- `server.js`：确认静态路由覆盖 `src/*.js` 与 `media/**`（否则补 MIME/目录）。
- 写 `dev/CONTRACTS.md`（A-3 签名冻结）、`dev/OWNERSHIP.md`（下表）、`dev/STATUS.md`（账本，含"接缝缺口"登记区）、`dev/INTEGRATION-CHECKLIST.md`。

## 3. 文件所有权矩阵（写入 OWNERSHIP.md）
| 文件 | 所有者 |
|---|---|
| index.html, src/00-50, server.js, package.json, tests/harness.cjs, tests/smoke.cjs, dev/(CONTRACTS/OWNERSHIP/STATUS/CHANGELOG/CHECKLIST) | A |
| src/21-levels-w2w3.js, feat-carrot.js, feat-zones.js, level-zones.js, feat-contraptions.js, level-contraptions.js, tests/feat-scene.cjs | B |
| src/feat-items-uma.js, src/feat-items-time.js, tests/feat-items.cjs | C |

## 4. 最终审查与合并（收口阶段）
- 合并顺序：`main(base)` → B → C；文件不相交，多为自动合并，重点核对跨模块：`G.props` 结构、`G.items` 复位、`armedItem` 一次性消耗、`processDamage` 连锁唯一实现（归 A）。
- 集成回归：`npm test`（smoke + feat-scene + feat-items）全绿；`node server.js` 后浏览器多分辨率/多设备抽查：4 世界主题与复合建筑稳定性、胡萝卜连锁、水洼/坡牌/轮胎/饭盆、4 道具各一次、`list_console_messages` 零报错；证据贴 `dev/logs/integration.md`。
- 逐角色 code review（证据驱动，先复现再改）；把可安全在核心补的缺口补上，破坏性契约变更须回炉评审。
- 产出 `dev/CHANGELOG.md`（功能落点/关卡清单/玩法说明）、更新根 `README.md`；合并回 `main` 并打发布 tag；`git worktree remove` 清理。

## 5. 验收标准（DoD）
- 重构后 `node tests/smoke.cjs` 全绿且浏览器表现与拆分前一致（tag `base`）。
- 注册表接缝齐备、B/C 仅凭注册即可落地、无需改核心。
- 两 worktree 建好、CONTRACTS/OWNERSHIP/STATUS/清单就位、任务书已下发。

## 6. 红线/禁区
- 不引入外部资源/新依赖；绘制与音效保持程序化/合成；`save` 结构向后兼容。
- 本角色不实现 B/C 的具体玩法体，只提供空桩与接缝。
- 拆分是纯搬运，任何行为差异都视为缺陷。
