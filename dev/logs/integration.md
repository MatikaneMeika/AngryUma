# integration.md — 角色 A base 验收证据

环境：`node server.js` → `http://localhost:8081`（8080 被旧实例占用自动跳段），browser-use MCP 驱动。

## 1. 脚本链与资源加载（HEAD 探测，全部 200）

| 资源 | 状态 |
|---|---|
| cdnjs matter.min.js 0.19.0 | 200 |
| src/00-boot.js … src/50-ui-input.js（共 14 个本地脚本） | 全部 200 |
| media/**（8 项 png：pig/King ×normal/hurt + 4 技能图标） | 全部 200 |

重点覆盖旧坏态（内联 REG+引用缺失脚本的半迁移）会 404 的整条脚本链。

## 2. Console

- `list_console_messages`（types=error/warn/assert 与全量各一次）：**零消息**。

## 3. 交互链路（页内真实 pointer 事件 + 状态断言）

- 加载 → menu `#bPlay` → 选择屏（worldList/关卡卡渲染正常，L1 fresh 其余 locked）→ 点击进关。
- 进关：`intro→loading→aim` 完整（后台标签 rAF 挂起，经手动 `step()` pump 推进——非产品缺陷，系浏览器节能行为）。
- 拖射：pointerdown@SLING_REST → 10 步 pointermove 拉弓 → pointerup → `phase='flight'` → 安定后回 `'aim'`、`everLaunched=true`、score=5000、猪剩 2、flock=1。
- 切关：`startLevel(1)` → aim；接缝状态：`G.items={}`、`armedItem=null`、`props=0`、`pendingBoom=0`、`G.snapshot=true`（快照已采集）、`#itemBar` 保持 hidden（无道具注册时契约行为）。
- 画布 8×8 采样 64/64 非空白 → render 实际出图。

## 4. 截图

- `dev/logs/accept-01-load.png`：初始页原生截图（窗口可见时捕获）。
- 后续步骤原生截图因浏览器窗口被最小化（`visibilityState=hidden`，`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`）改为 DOM/状态断言 + canvas 采样留证；补拍需在验收后聚焦浏览器窗口。

## 5. 测试闸门

- `node tests/smoke.cjs`：PASS（断言零缩水 + 接缝断言）。
- `tests/feat-scene.cjs`（B 所有权）：harness 加载链路已通（boot() 双写法兼容落地后），残留失败为 B 关卡数据断言 `L11 未出现 3 层以上结构`，归 B 修，见 STATUS.md 缺口登记 #1。
