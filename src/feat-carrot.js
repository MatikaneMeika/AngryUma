/* ============================================================================
 * feat-carrot.js — 炸裂胡萝卜箱（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过角色 A 冻结的注册接缝落地，不改任何核心文件。
 * 依赖接缝契约（见 dev/CONTRACTS.md · A-3）：
 *   regMat(name, def)                     注册新材质
 *   registerExplosive(mat, {onDetonate})  注册爆炸物（destroyBlock→pendingBoom→processDamage 连锁由核心提供）
 *   regSkin(mat, fn(ent))                 drawBlock 画完底框后回调；ctx 已 translate 到块中心并 rotate，可用 ent.w / ent.h
 * 运行前提：A 的 base 已提供上述全局。base 未落地时本文件不参与浏览器加载。
 * ==========================================================================*/
'use strict';

/* 高血量材质：避免预沉降期被上层结构压爆（hp:60 相对 wood:90/glass:45 居中偏低，
 * 但配合关卡摆放位置控制，确保 25 步沉降稳定后再受击才引爆）。 */
regMat('carrot', { hp: 60, density: .0024, fill: '#e08a2e', edge: '#a85f16', score: 600 });

/* 引爆回调：核心 explode 已含冲量与伤害，这里补强"喷胡萝卜碎屑"的视觉与音效。 */
registerExplosive('carrot', {
  onDetonate(x, y) {
    fx('shard', x, y, 8, { col: '#e08a2e', s: rand(6, 12) });   // 橙色胡萝卜碎屑
    fx('shard', x, y, 4, { col: '#5fa832', s: rand(4, 8) });    // 绿色缨叶碎屑
    fx('smoke', x, y, 6, { s: 10 });
  }
});

/* 贴图皮肤：在核心画好的橙色底框上，叠加胡萝卜质感斜纹 + 顶部绿叶 + 引信。 */
regSkin('carrot', function (ent) {
  const w = ent.w, h = ent.h;
  ctx.save();
  ctx.lineCap = 'round';

  // 斜向橙色纹理条纹（比底色更深一点，做胡萝卜棱线）
  ctx.strokeStyle = 'rgba(168,95,22,.55)';
  ctx.lineWidth = 2;
  const step = Math.max(8, w / 4);
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6); ctx.clip();
  for (let x = -w / 2 - h; x < w / 2 + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, -h / 2);
    ctx.lineTo(x + h, h / 2);
    ctx.stroke();
  }
  ctx.restore();

  // 顶部绿色缨叶（三片小扇形）
  const leafY = -h / 2 + 2;
  ctx.fillStyle = '#5fa832';
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * (w * 0.16), leafY);
    ctx.rotate(i * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.10, w * 0.06, h * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // 引信 + 火星（暗示"一点就炸"）
  ctx.strokeStyle = '#4a3520';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 + 2);
  ctx.quadraticCurveTo(w * 0.16, -h / 2 - h * 0.12, w * 0.05, -h / 2 - h * 0.20);
  ctx.stroke();
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.arc(w * 0.05, -h / 2 - h * 0.20, 2.4, 0, TAU);
  ctx.fill();

  ctx.restore();
});
