/* ============================================================================
 * level-zones.js — 区域机关摆放（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过 registerProp(levelIdx, cfg) 把水洼/冰面/坡牌挂到指定关卡，不改核心。
 *   registerProp(idx,cfg) → 核心 createLevel 内 REG.propTypes[cfg.type].make(cfg)
 * 摆放原则（保护 smoke/B-5 的稳定性断言：猪不死亡、位移 < 26）：
 *   - 区域机关不生成刚体，仅在 applyStep 对区内动态体生效；
 *   - 坐标一律落在"空场/空隙"，不覆盖任何静止的 block/pig 落点，
 *     使预沉降 + 150 步监控期内没有静止体长期滞留受力区而被推移。
 * ==========================================================================*/
'use strict';

/* ---- 泥泞水洼（世界 2 主场梗）---- */
registerProp(8,  { type: 'mud', x: 1440, y: 548, w: 70,  h: 34 });
registerProp(10, { type: 'mud', x: 1180, y: 548, w: 100, h: 36 });
registerProp(13, { type: 'mud', x: 1340, y: 548, w: 110, h: 36 });
registerProp(15, { type: 'mud', x: 1420, y: 548, w: 120, h: 38 });

/* ---- 冰面（世界 3 游泳馆周边）---- */
registerProp(12, { type: 'ice', x: 1300, y: 548, w: 150, h: 34 });
registerProp(14, { type: 'ice', x: 1760, y: 548, w: 120, h: 34 });

/* ---- 上托重力牌（空场中段，托起/偏转飞行马娘）---- */
registerProp(9,  { type: 'slopeUp',   x: 1080, y: 440, w: 100, h: 120, dir: 1 });
registerProp(13, { type: 'slopeUp',   x: 1780, y: 440, w: 100, h: 120, dir: -1 });

/* ---- 下砸重力牌（塔间空隙，加速下压配合砸穿）---- */
registerProp(11, { type: 'slopeDown', x: 1760, y: 330, w: 90,  h: 110, dir: 1 });
registerProp(15, { type: 'slopeDown', x: 1780, y: 330, w: 90,  h: 110, dir: -1 });
