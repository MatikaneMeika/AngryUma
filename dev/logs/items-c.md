# 角色 C 验收证据 — 玩家道具系统

> 分支：`feat/items`（worktree `../AngryUma-wt/C`，base tag `aeda50f`）
> 独占文件：`src/feat-items-uma.js`、`src/feat-items-time.js`、`tests/feat-items.cjs`
> 全程仅经 `registerItem` 接缝落地，未改动任何 A/B 独占文件。

## 1. 自动化测试（TDD）

RED → GREEN 全程遵循 test-driven-development：先写 `tests/feat-items.cjs` 观察其"干净失败"
（13 项断言全部以 FAILS 形式报告"未注册/uses≠1"，无崩溃），再逐道具实现转绿。

```
$ node tests/feat-items.cjs
PASS feat-items: 注册×4 / 芭菲tank消耗 / 蹄铁frictionAir+aimDraw / 闹钟SL读档 / 炒面轨迹扰动

$ node tests/smoke.cjs
PASS: syntax, 8 assets, 16 levels (stable with new hitboxes), ... slingshot rest lifted.
```

覆盖断言（对应任务书 C-3）：
- 注册：`REG.items` 恰为 `alarm,parfait,shoe,yaki`，各 `uses===1` 且有 `arm()`。
- 芭菲：`arm()+launch()` → `armedItem` 归 null、`items.parfait===0`、`ent.tank===true`、刚体 `circleRadius>r`（×1.25）、初速不变。
- 蹄铁：`ent.body.frictionAir(0.00015) < 0.0008`、`items.shoe===0`；aim 阶段含 drag 的 `render()`（触发 `onAimDraw`）不抛错。
- 闹钟 SL：扰动积木 + `killPig` 后 `arm()` → 次数归 0、`armedItem` 恒 null（即时型）、积木回快照位（±0.51）、猪复活满血、队列回滚、120 步后回 `aim`、次数用尽再按不崩溃。
- 炒面：`yaki` 发射后飞行 40 步，轨迹相对基线横向偏离 > 2px、`items.yaki===0`。

## 2. 浏览器实测（server.js @ http://localhost:8082 + browser-use）

`list_console_messages(types=[error,warn])` → **无控制台消息（零报错）**。

| 道具 | 实测返回 | 结论 |
|---|---|---|
| 芭菲 🍨 | `{armed:'parfait', tank:true, rScale:1.25, afterArmed:null, parfaitLeft:0, btnDisabled:true}` | 霸体+放大+一次性消耗 ✅ |
| 蹄铁 🐴 | `{armed:'shoe', frictionAir:0.00015, reduced:true, shoeLeft:0, aimDrawErr:null}` | 降摩擦+预测弹道无异常 ✅ |
| 闹钟 ⏰ | `{killedBefore:true, alarmLeft:0, armedAfter:null, blockRestored:true, pigRevived:true, pigFullHp:true, phaseAfter:'aim', reArmErr:null}` | 一键读档回发射前 ✅ |
| 炒面 🍜 | `{maxDev:56.91, deviates:true, yakiLeft:0}` | 飞行随机横向暴走 ✅ |

道具栏截图：`#itemBar` 出现 4 个按钮，图标 🍨🐴⏰🍜 + 红色次数角标 "1"；消耗后归 0 且按钮 disabled。

证据截图（同目录）：
- `items-c-parfait-tank.png` — 芭菲放大坦克鸟飞行中 + 道具栏 4 按钮。
- `items-c-shoe-predict.png` — 蹄铁 armed 拉弓态，瞄准时预测弹道。
- `items-c-shoe-aim.png` — 蹄铁瞄准覆盖层。

## 3. 接缝缺口登记（见 STATUS.md "接缝缺口登记区"）

核心 `restoreSnapshot()` 仅在快照内记录为 `dead` 的实体上执行 `ent.dead=false; Composite.add`；
对"采集快照时活着、随后被击杀"的实体（闹钟 SL 的典型回滚场景）不会翻转 `ent.dead`、不会重新
`Composite.add`。C 侧在 `alarm.arm()` 内以公开句柄（`G.snapshot.ents` / `Composite` / `world`）
于调用 `restoreSnapshot()` 后补齐复活，未改动核心。若 A 愿在核心 `restoreSnapshot` 内统一处理
（对快照中 `!dead` 的实体强制复活），C 侧的补偿循环可安全移除（幂等，不冲突）。
