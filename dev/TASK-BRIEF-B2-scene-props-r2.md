# 任务书 B2 — 场景道具前置 + 前期建筑复杂度修正（World Props Rev.2）

> 下发对象：角色 B（场景与关卡）。基线：`main`@262fae3（四闸门全绿：smoke / feat-items / feat-platform / feat-scene，2026-09-19 复验）。
> 动机：现状场景机关全部集中在 index 8-15（第 9 关起），第 1-8 关零道具；且 LEVELS[2..7] 仍是拆分前的 1-2 层简单结构，与 B-1 交付的世界 2/3 复杂度断层。本任务书为**修正性增补**，不推翻 B-1~B-4 已完成内容。

## 0. 依赖前置（开工前确认）

- 基于 `main` 拉新分支：`git switch -c feat/world-r2 main`（主工作区若仍停在已合入的 `feat/world`，可直接切；旧分支不动、不 push）。
- 开工前 `node tests/run-all.cjs` 确认四闸门绿；收口标准同样是四闸门绿（`smoke.cjs` 零缩水不许破坏）。
- 接缝沿用 `dev/CONTRACTS.md` 冻结集合：`registerLevels / registerProp`（本任务不需要新接缝；缺口照旧走 `dev/STATUS.md` 登记，不自行改核心）。
- 独占文件与任务书 B §1 相同：`src/21-levels-w2w3.js`、`src/level-zones.js`、`src/level-contraptions.js`、`tests/feat-scene.cjs` 等 B 所有权文件。**不改** `20-data.js`（世界 0/1 原始数据保留为 fallback，只做覆盖）。

## 1. D-1 场景道具从第 3 关（index 2）起梯度覆盖

摆放落点写进 `level-zones.js` / `level-contraptions.js`，遵守其头部"空场原则"（区域不覆盖静止 block/pig 落点，避免 150 步监控期推移误报）：

| 关卡 idx | 机关 | 意图 |
|---|---|---|
| 2 | `slopeUp` ×1 | 首次登场只给一个机制：空场中段托起/偏转飞行马娘 |
| 3 | `mud` ×1 | 落点区降弹性教学（世界 0 收尾） |
| 4 | `ice` ×1 | 进入世界 1 引入低摩擦 |
| 5 | `slopeDown` ×1 | 与 idx2 上托牌形成对称认知 |
| 6 | `tire` ×1 | 世界 1 首个物理机关（断绳甩飞） |
| 7 | `mud` + `slopeUp` 各 ×1 | 世界 1 收尾双机制，衔接世界 2 |

- `bowl`（引力饭盆）**不上探**到 index ≤7：它是限时聚拢+爆炸配合的复合机制，保留给中后期，避免前期认知过载。
- index 8-15 现状已每关 ≥2 机关，**不强制加密度**；如 D-2 改结构导致原落点被覆盖，允许微调坐标（数量不减少于现状）。
- 完成判据：`for(idx=2..15)` 每关 `REG` 内 props 数 ≥1，idx ≤7 每关机关类型数 ≤2。

## 2. D-2 建筑复杂度提升：覆盖 LEVELS[2..7]

在 `21-levels-w2w3.js` 内追加 `registerLevels(2, [...6 项...])`（文件头注释同步改为"覆盖 LEVELS[2..15]"；文件名不动，避免动 `index.html` 脚本链）：

- **逐关最低目标**（结构原则与 B-1 一致：复用 `P/P2/Beam/Box/NP/KP` 与梁长约定，不另造坐标体系）：
  - idx 2、3（世界 0）：由现状 2 层提到 **3 层**复合（双柱承梁 + 二层箱柱堆叠 / 顶梁置块）；
  - idx 4（世界 0）：三门跨改**两门跨 + 一塔 3 层**，出现一次跨塔长梁；
  - idx 5（世界 1）：现状已有 3 层，加密为**双塔 3-4 层**（左门顶 + 右塔 4 层，国王猪居中上层可用 `KP`）；
  - idx 6、7（世界 1）：提到 **4 层**（三塔或门+双塔，其中一塔顶 `Box(…,40,'carrot')`——胡萝卜箱自 idx 6 起进入玩家视野，替代现状只有世界 2/3 才有的断层）。
- `world` 字段保持 0/0/1/1/1/1 不变（`THEMES` 不动）；`birds`、`pigs` 序列**逐关保持与原关一致**（沿用已验证猪落点，避免沉降位移；结构调整不得把猪悬空或埋进新块）。
- 结构必须经得起预沉降：feat-scene 稳定性断言扩到 idx 2-7（见 D-3）。

## 3. D-3 自测扩展（`tests/feat-scene.cjs`）

1. **覆盖断言**：`boot()` 后遍历 idx 2-15，断言每关注册 props ≥1；idx 2-7 按 D-1 表格逐关对型断言。
2. **稳定性**：对 idx 2-7 每关 `createLevel(i)` 跑 150 步——猪不死亡、位移 < 26、沉降期无 carrot 爆炸（同 B-5 标准）。
3. **既有关断言不缩水**：世界 2/3 稳定性、carrot 连锁、mud/slope、tire 断绳、bowl 引力原样保留。
4. `node tests/run-all.cjs` 四闸门全绿为提交前提。

## 4. 提交与协作约定

- 只在 `feat/world-r2` 工作；提交信息：`feat(world): 第3关起场景道具梯度覆盖`、`feat(world): LEVELS[2..7] 复合建筑加密`、`test(world): feat-scene 扩展 idx2-7 断言`，小步多次。
- **不 push**（远端只走 main，由规划/审查角色收口）；自测绿后在 `dev/STATUS.md` 追加 "B2 ready" 行，等待合并评审。
- 与 C 的文件零交集；如发现需要核心配合（目前判断不需要），走 STATUS 缺口登记。

## 5. 验收标准（DoD）

- [ ] 第 3 关起每关至少 1 个场景机关，浏览器实测：idx2 上托牌、idx3 泥洼、idx6 轮胎肉眼可见、控制台零报错。
- [ ] idx 2-7 出现 3-4 层复合建筑，难度曲线：世界 0（3 层）< 世界 1（3-4 层）< 世界 2/3（3-5 层，已交付）。
- [ ] `node tests/feat-scene.cjs` 新增断言全绿，`node tests/smoke.cjs` 与其余闸门仍绿。
- [ ] 全程仅通过 `registerLevels/registerProp` 接缝落地，未触碰 A/C 所有权文件与 `20-data.js`。
