/* ============================================================================
 * 21-levels-w2w3.js — 世界2/3 复合型建筑（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过 registerLevels(start,arr) 覆盖 LEVELS[8..15]，不改核心、不改数据文件。
 *   依赖接缝：registerLevels(8, [...])  →  核心：LEVELS[8+i]=arr[i]
 *   复用 20-data.js 既有格点 helper：P / P2 / Beam / Box / NP / KP
 *   梁长约定沿用现状：默认 Beam len=150 配 ±30~40 柱；宽梁用显式 len。
 * 结构原则：
 *   - index 8-11 → world:2（奇宝夜间主场），index 12-15 → world:3（特雷森游泳馆），world 字段与 THEMES 不变。
 *   - 后两世界普遍 3-4 层复合结构（双柱承梁 / 箱柱堆叠 / 国王猪居中上层 / 多塔）。
 *   - 若干顶层块改为 m:'carrot'（材质替换，几何/坐标不变 → 稳定性与原关卡等价；
 *     胡萝卜 hp 高于玻璃且预沉降期核心不调用 processDamage，故沉降期不会被压爆）。
 *   - pigs 序列保持与原关卡一致（沿用已验证的稳定落点，避免沉降位移）。
 * ==========================================================================*/
'use strict';

registerLevels(8, [
  /* ===== 世界 2 · 奇宝夜间主场（index 8-11）===== */
  // 8：三塔 + 中塔加高到 4 层，顶置胡萝卜箱
  { world: 2, w: 2300, focus: 1700, birds: ['bomb', 'red', 'bomb', 'chuck'],
    blocks: [
      Box(1250, 532.5, 55, 'stone'), Box(1250, 477.5, 55, 'stone'),
      Box(1320, 532.5, 55, 'stone'), Box(1320, 477.5, 55, 'stone'),
      Box(1285, 430, 40, 'carrot'),
      P(1560, 'stone'), P(1640, 'stone'), Beam(1600, 460, 'stone'),
      P2(1570, 405, 'stone'), P2(1630, 405, 'stone'), Beam(1600, 350, 'stone'),
      P2(1585, 295, 'stone'), P2(1615, 295, 'stone'), Beam(1600, 240, 'stone'),
      Box(1600, 208, 40, 'carrot'),
      P(1840, 'stone'), P(1960, 'stone'), Beam(1900, 460, 'stone'),
      P2(1850, 405, 'stone'), P2(1950, 405, 'stone'), Beam(1900, 350, 'stone'),
      Box(1770, 540, 40, 'glass')
    ],
    pigs: [NP(1180), NP(1500), NP(1600), KP(1900, 290)] },

  // 9：三层门 + 右塔 4 层，夹心胡萝卜箱
  { world: 2, w: 2400, focus: 1700, birds: ['red', 'blue', 'bomb', 'chuck', 'red'],
    blocks: [
      P(1210, 'stone'), P(1290, 'stone'), Beam(1250, 460, 'stone'),
      P2(1220, 405, 'wood'), P2(1280, 405, 'wood'), Beam(1250, 350, 'wood'),
      P(1440, 'glass'), P(1560, 'glass'), Beam(1500, 460, 'glass'),
      Box(1500, 430, 40, 'carrot'),
      P(1788, 'stone'), P(1912, 'stone'), Beam(1850, 460, 'stone'),
      P2(1795, 405, 'stone'), P2(1905, 405, 'stone'), Beam(1850, 350, 'stone'),
      P2(1815, 295, 'stone'), P2(1885, 295, 'stone'), Beam(1850, 240, 'stone')
    ],
    pigs: [NP(1250), NP(1380), NP(1500), NP(1620), KP(1850, 510), NP(1850, 204)] },

  // 10：双塔 4 层对称，左塔顶胡萝卜箱
  { world: 2, w: 2300, focus: 1650, birds: ['bomb', 'red', 'chuck', 'blue'],
    blocks: [
      P(1240, 'stone'), P(1360, 'stone'), Beam(1300, 460, 'stone'),
      P2(1250, 405, 'stone'), P2(1350, 405, 'stone'), Beam(1300, 350, 'stone'),
      Box(1300, 320, 40, 'carrot'),
      P(1640, 'stone'), P(1760, 'stone'), Beam(1700, 460, 'stone'),
      P2(1650, 405, 'wood'), P2(1750, 405, 'wood'), Beam(1700, 350, 'wood'),
      P2(1660, 295, 'stone'), P2(1740, 295, 'stone'), Beam(1700, 240, 'stone')
    ],
    pigs: [NP(1300), NP(1300, 424), NP(1300, 274), NP(1700), NP(1700, 424), NP(1700, 204)] },

  // 11：三门跨，左门顶 + 右门石顶，左顶换胡萝卜
  { world: 2, w: 2400, focus: 1680, birds: ['bomb', 'blue', 'chuck', 'red', 'bomb'],
    blocks: [
      P(1180, 'stone'), P(1300, 'stone'), Beam(1240, 460, 'stone'),
      Box(1240, 430, 40, 'carrot'),
      P(1520, 'stone'), P(1640, 'stone'), Beam(1580, 460, 'stone'),
      P2(1530, 405, 'stone'), P2(1630, 405, 'stone'), Beam(1580, 350, 'stone'),
      P(1880, 'glass'), P(2000, 'glass'), Beam(1940, 460, 'glass'),
      Box(1940, 430, 40, 'stone')
    ],
    pigs: [NP(1240), NP(1240, 384), KP(1580, 290), NP(1580), NP(1940), NP(1940, 384)] },

  /* ===== 世界 3 · 特雷森游泳馆（index 12-15）===== */
  // 12：左塔 2 层顶胡萝卜箱 + 右门玻璃箱顶（游泳馆入门关，加厚为复合结构）
  { world: 3, w: 1800, focus: 1350, birds: ['red', 'red', 'blue'],
    blocks: [
      P(1080, 'glass'), P(1200, 'glass'), Beam(1140, 460, 'glass'),
      P2(1090, 405, 'glass'), P2(1190, 405, 'glass'), Beam(1140, 350, 'glass'),
      Box(1140, 320, 40, 'carrot'),
      P(1420, 'wood'), P(1540, 'wood'), Beam(1480, 460, 'wood'), Box(1480, 430, 40, 'glass')
    ],
    pigs: [NP(1140, 274), NP(1480), NP(1480, 384)] },

  // 13：左塔 3 层 + 右门，左塔顶胡萝卜箱
  { world: 3, w: 2000, focus: 1480, birds: ['chuck', 'blue', 'chuck', 'red'],
    blocks: [
      P(1120, 'glass'), P(1240, 'glass'), Beam(1180, 460, 'glass'),
      P2(1130, 405, 'wood'), P2(1230, 405, 'wood'), Beam(1180, 350, 'wood'),
      Box(1180, 320, 40, 'carrot'),
      P(1480, 'wood'), P(1600, 'wood'), Beam(1540, 460, 'wood'),
      Box(1540, 430, 40, 'glass')
    ],
    pigs: [NP(1180), NP(1180, 424), NP(1180, 274), NP(1540), NP(1540, 384)] },

  // 14：左塔 3 层玻璃 + 右箱柱堆叠，左顶胡萝卜箱
  { world: 3, w: 2200, focus: 1580, birds: ['bomb', 'red', 'blue', 'chuck'],
    blocks: [
      P(1180, 'stone'), P(1300, 'stone'), Beam(1240, 460, 'stone'),
      P2(1190, 405, 'glass'), P2(1290, 405, 'glass'), Beam(1240, 350, 'glass'),
      Box(1240, 320, 40, 'carrot'),
      P(1560, 'glass'), P(1680, 'glass'), Beam(1620, 460, 'glass'),
      Box(1860, 532.5, 55, 'wood'), Box(1860, 477.5, 55, 'wood')
    ],
    pigs: [NP(1240), NP(1240, 424), NP(1240, 274), NP(1620), NP(1620, 424), NP(1860, 424)] },

  // 15：三塔（中/右 3-4 层）双国王猪，左门顶胡萝卜箱
  { world: 3, w: 2400, focus: 1700, birds: ['blue', 'bomb', 'chuck', 'red', 'blue'],
    blocks: [
      P(1200, 'stone'), P(1320, 'stone'), Beam(1260, 460, 'stone'),
      Box(1260, 430, 40, 'carrot'),
      P(1540, 'glass'), P(1660, 'glass'), Beam(1600, 460, 'glass'),
      P2(1550, 405, 'stone'), P2(1650, 405, 'stone'), Beam(1600, 350, 'stone'),
      P(1900, 'stone'), P(2020, 'stone'), Beam(1960, 460, 'stone'),
      P2(1910, 405, 'stone'), P2(2010, 405, 'stone'), Beam(1960, 350, 'stone')
    ],
    pigs: [NP(1260), NP(1260, 384), KP(1600, 290), NP(1600), NP(1600, 424), NP(1960), KP(1960, 290)] }
]);
