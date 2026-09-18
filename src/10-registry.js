'use strict';
/* ================= 注册表接缝（REG）——角色 A 独占 ================= */
/* 功能角色（B/C）只通过本文件导出的函数接入核心，不修改任何核心模块。
 * 签名已冻结于 dev/CONTRACTS.md；加载顺序位于 20-data 之前，
 * 但函数体内引用的 MATS/LEVELS/refreshCounts 仅在运行时求值，安全。
 */
const REG = {
  extraMats: {},    // 材质名 → {hp,density,fill,edge,score}
  skins: {},        // 材质名 → fn(ent)，drawBlock 画完底框后调用
  explosives: {},   // 材质名 → {onDetonate(x,y)}，destroyBlock 后进入 pendingBoom 连锁
  propTypes: {},    // 机关类型 → {make,inZone,applyStep,draw,onHit}
  propPatches: {},  // 关卡下标 → [cfg,...]（registerProp 收集，createLevel 装配）
  items: {},        // 道具 id → {name,icon,uses,enabled,arm,onLaunch,onFlightStep,onAimDraw}
  afterCreate: []   // createLevel 末尾回调 fn(levelIdx)
};

/* 所有核心对材质属性的读取统一走 matDef（内置 MATS 优先兜底） */
function matDef(m) { return REG.extraMats[m] || MATS[m]; }
function regMat(name, def) { REG.extraMats[name] = def; }
function regSkin(mat, fn) { REG.skins[mat] = fn; }
function registerExplosive(mat, h) { REG.explosives[mat] = h; }
function registerPropType(t, h) { REG.propTypes[t] = h; }
function registerProp(idx, cfg) { (REG.propPatches[idx] ||= []).push(...[].concat(cfg)); }
function registerItem(id, def) { REG.items[id] = def; }
/* 扩关后必须重新派生 NLEVELS/LAST/PER 并补齐存档（refreshCounts 由 20-data 提供） */
function registerLevels(start, arr) {
  for (let i = 0; i < arr.length; i++) LEVELS[start + i] = arr[i];
  if (typeof refreshCounts === 'function') refreshCounts();
}
