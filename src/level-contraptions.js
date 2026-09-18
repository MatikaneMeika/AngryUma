/* ============================================================================
 * level-contraptions.js — 物理机关摆放（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过 registerProp(levelIdx, cfg) 把轮胎/饭盆摆到世界 2/3 关卡，不改核心。
 * 摆放原则：
 *   - tire 会生成动态刚体（Constraint 悬挂），坐标落在塔间"高空空隙"，
 *     静止悬挂于锚点正下方，150 步监控期内不接触任何 block/pig（不触发 onHit、不产生位移）；
 *   - bowl 不生成刚体，仅在命中激活后限时吸入动态体，摆在地面空场。
 * ==========================================================================*/
'use strict';

/* ---- 轮胎秋千（悬于塔间上空，击中后断绳甩砸结构）---- */
registerProp(8,  { type: 'tire', x: 1720, y: 240, anchorX: 1720, anchorY: 170, length: 70, r: 22 });
registerProp(9,  { type: 'tire', x: 1700, y: 225, anchorX: 1700, anchorY: 150, length: 75, r: 22 });
registerProp(11, { type: 'tire', x: 1400, y: 250, anchorX: 1400, anchorY: 180, length: 70, r: 22 });
registerProp(14, { type: 'tire', x: 1450, y: 240, anchorX: 1450, anchorY: 170, length: 70, r: 22 });

/* ---- 引力饭盆（地面空场，命中后限时聚拢碎块/猪再配合爆炸清场）---- */
registerProp(10, { type: 'bowl', x: 1480, y: 548, r: 150, window: 180, strength: 0.0016 });
registerProp(12, { type: 'bowl', x: 1780, y: 548, r: 150, window: 200, strength: 0.0018 });
