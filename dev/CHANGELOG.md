# CHANGELOG.md — 功能落点 / 关卡清单 / 玩法说明

发布 tag：`v1.0.0`（main = base + B(feat/world) + C(feat-items) + 核心收口）。

## 架构（角色 A · base `aeda50f`）

- 单文件 `index.html`（1569 行内联脚本）拆为 **壳 + 14 个有序 classic script**（`file://` 直开不回归）；纯搬运，零行为差异（smoke 断言零缩水 + CodeReview 基线 diff 证实）。
- `src/10-registry.js` REG 注册表接缝 ×17 调用点：材质/皮肤/爆炸物/机关类型/机关装配/道具/扩关/afterCreate（签名冻结于 CONTRACTS.md）。
- 测试基座 `tests/harness.cjs`（vm 拼接加载，boot() 双写法兼容）+ `tests/run-all.cjs`（自动发现 `feat-*.cjs`）；`npm test` = smoke + feat-scene + feat-items。
- 收口补缝：`restoreSnapshot()` 统一复活判定（`r.dead`→`ent.dead`，见 STATUS 缺口 #6，C 登记）。

## 世界与机关（角色 B · feat/world）

| 落点 | 文件 | 玩法 |
|---|---|---|
| 胡萝卜箱 | `src/feat-carrot.js` | `regMat`+`regSkin`+`registerExplosive`：受击/邻近爆碎后入 `pendingBoom` 有界连锁引爆（guard<10 换桶排空） |
| 区域机关 | `src/feat-zones.js` + `src/level-zones.js` | mud（黏滞：frictionAir↑/restitution↓）、ice（打滑）、slopeUp/slopeDown（爬升/俯冲力）——经 `registerPropType`/`registerProp` 装配 |
| 物理机关 | `src/feat-contraptions.js` + `src/level-contraptions.js` | tire 断绳甩飞（onHit 移除 Constraint）、bowl 引力饭盆（onHit 激活向心力聚拢） |
| 世界 2/3 重构 | `src/21-levels-w2w3.js` | `registerLevels` 覆盖 LEVELS[8..15]：3 层以上复合建筑，预沉降稳定不塌 |

自测：`tests/feat-scene.cjs`（稳定性/连锁/区域/机关）✅ 绿。

## 玩家道具（角色 C · feat-items）

| 道具 | 文件 | 效果（`registerItem` 注册，各 1 次/关） |
|---|---|---|
| 绝好调芭菲 🍮 | `src/feat-items-uma.js` | 发射后霸体：伤害 ×2.2 忽略材质衰减，刚体半径 ×1.25（核心 `ea.tank` 分支） |
| 决胜蹄铁 🐴 | `src/feat-items-uma.js` | frictionAir 0.0008→0.00015 远投滑翔；瞄准阶段绘制预测弹道（`onAimDraw`） |
| 闹钟 SL 读档 ⏰ | `src/feat-items-time.js` | 即时回滚 `restoreSnapshot()`：积木复位、猪复活满血、队列回卷回瞄准态 |
| 黄金船炒面 🍝 | `src/feat-items-time.js` | 飞行期随机横向暴走扰动（`onFlightStep`） |

道具栏 `#itemBar`：图标+次数角标+激活态，发射一次性消耗并禁用。
自测：`tests/feat-items.cjs`（TDD 13 项）✅ 绿；浏览器实测零报错（`dev/logs/items-c.md` + 3 截图）。

## 关卡清单（共 16 关 · 4 世界主题）

- 世界 0 特雷森草地 L1–4 · 世界 1 黄昏沙地 L5–8（保持基线）· 世界 2 L9–12 与世界 3 L13–16 = B 重构的 3 层以上复合建筑 + 胡萝卜/区域/轮胎/饭盆机关关卡。
- 存档向后兼容：`refreshCounts()` 自动补齐 `save.stars` 槽位并夹紧 `unlocked`。
