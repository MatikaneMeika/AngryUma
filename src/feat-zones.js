/* ============================================================================
 * feat-zones.js — 区域机关（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过注册接缝落地，不改核心。依赖接缝契约（A-3）：
 *   registerPropType(type, {make,inZone,applyStep,draw,onHit?})
 *   核心调用点：
 *     createLevel → G.props.push(REG.propTypes[cfg.type].make(cfg))
 *     step()（Engine.update 后、processDamage 前）→ applyStep(pr)
 *     drawGame → draw(pr)（世界坐标，camera transform 已生效）
 *   make(cfg) 返回的 prop 必须带 pr.type，核心据此回查 propTypes。
 * 依赖全局（运行时求值，加载本文件时尚未定义亦无妨）：
 *   world, Composite, Body, G, ctx, TAU, sr, rand, clamp, lerp
 * ==========================================================================*/
'use strict';

/* 区内是否含该动态体（矩形/半径判定） */
function zoneRect(pr, body) {
  const p = body.position;
  return p.x > pr.x - pr.w / 2 && p.x < pr.x + pr.w / 2 &&
         p.y > pr.y - pr.h / 2 && p.y < pr.y + pr.h / 2;
}
function zoneCircle(pr, body) {
  const p = body.position;
  return Math.hypot(p.x - pr.x, p.y - pr.y) < pr.r;
}
/* 遍历世界中所有动态体（跳过静态地面/静态指示物） */
function eachDynamic(fn) {
  const bodies = Composite.allBodies(world);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.isStatic || b.isSensor) continue;
    fn(b);
  }
}

/* ---------- 泥泞水洼（赛马娘名梗"苦手泥"）：显著降弹性/加大空气阻力 ---------- */
registerPropType('mud', {
  make(cfg) { return { type: 'mud', x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h || 46, seed: cfg.seed || (rand(1, 999) | 0) }; },
  inZone(pr, body) { return zoneRect(pr, body); },
  applyStep(pr) {
    eachDynamic(b => {
      if (!zoneRect(pr, b)) return;
      b.restitution = Math.min(b.restitution, 0.1);
      b.frictionAir = Math.max(b.frictionAir, 0.09);
      // 陷进泥里：即时衰减速度
      Body.setVelocity(b, { x: b.velocity.x * 0.7, y: b.velocity.y * 0.7 });
    });
  },
  draw(pr) {
    const rn = sr(pr.seed);
    ctx.save();
    // 外圈湿润边缘
    ctx.fillStyle = 'rgba(74,52,30,.55)';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y, pr.w / 2 + 6, pr.h / 2 + 5, 0, 0, TAU); ctx.fill();
    // 泥水主体
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y, pr.w / 2, pr.h / 2, 0, 0, TAU); ctx.fill();
    // 高光水面
    ctx.fillStyle = 'rgba(120,90,55,.5)';
    ctx.beginPath(); ctx.ellipse(pr.x - pr.w * 0.12, pr.y - pr.h * 0.15, pr.w * 0.28, pr.h * 0.3, 0, 0, TAU); ctx.fill();
    // 飞溅泥点
    ctx.fillStyle = '#4a3520';
    for (let i = 0; i < 6; i++) {
      const a = rn() * TAU, rr = pr.w * 0.5 * (0.7 + rn() * 0.5);
      ctx.beginPath(); ctx.arc(pr.x + Math.cos(a) * rr, pr.y + Math.sin(a) * rr * 0.4, 2 + rn() * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
});

/* ---------- 冰面：区内降摩擦，滑过 ---------- */
registerPropType('ice', {
  make(cfg) { return { type: 'ice', x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h || 40 }; },
  inZone(pr, body) { return zoneRect(pr, body); },
  applyStep(pr) {
    eachDynamic(b => {
      if (!zoneRect(pr, b)) return;
      b.friction = Math.min(b.friction, 0.02);
      b.frictionAir = Math.min(b.frictionAir, 0.001);
    });
  },
  draw(pr) {
    ctx.save();
    const grd = ctx.createLinearGradient(pr.x, pr.y - pr.h / 2, pr.x, pr.y + pr.h / 2);
    grd.addColorStop(0, 'rgba(200,240,255,.75)');
    grd.addColorStop(1, 'rgba(150,210,235,.55)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y, pr.w / 2, pr.h / 2, 0, 0, TAU); ctx.fill();
    // 冰裂纹高光
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(pr.x + i * pr.w * 0.2 - 6, pr.y - pr.h * 0.2);
      ctx.lineTo(pr.x + i * pr.w * 0.2 + 8, pr.y + pr.h * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
});

/* ---------- 上托重力牌：区内持续给向上/沿坡方向的力 ---------- */
registerPropType('slopeUp', {
  make(cfg) { return { type: 'slopeUp', x: cfg.x, y: cfg.y, w: cfg.w || 90, h: cfg.h || 90, dir: cfg.dir || 0 }; },
  inZone(pr, body) { return zoneRect(pr, body); },
  applyStep(pr) {
    eachDynamic(b => {
      if (!zoneRect(pr, b)) return;
      const m = b.mass * 0.0011;
      Body.applyForce(b, b.position, { x: pr.dir * m * 0.5, y: -m });   // 净向上托举
    });
  },
  draw(pr) { drawSlopeSign(pr, -1); }
});

/* ---------- 下砸重力牌：区内持续给向下/沿坡方向的力 ---------- */
registerPropType('slopeDown', {
  make(cfg) { return { type: 'slopeDown', x: cfg.x, y: cfg.y, w: cfg.w || 90, h: cfg.h || 90, dir: cfg.dir || 0 }; },
  inZone(pr, body) { return zoneRect(pr, body); },
  applyStep(pr) {
    eachDynamic(b => {
      if (!zoneRect(pr, b)) return;
      const m = b.mass * 0.0011;
      Body.applyForce(b, b.position, { x: pr.dir * m * 0.5, y: m });     // 加速下压
    });
  },
  draw(pr) { drawSlopeSign(pr, 1); }
});

/* 坡牌外观：立柱 + 箭头面板（纯指示，不承重、不生成受力刚体） */
function drawSlopeSign(pr, dir) {
  const baseY = pr.y + pr.h / 2;
  ctx.save();
  ctx.lineJoin = 'round';
  // 立柱
  ctx.fillStyle = '#6b6b62';
  ctx.fillRect(pr.x - 5, pr.y, 10, baseY - pr.y);
  ctx.fillStyle = '#4a4a44';
  ctx.fillRect(pr.x - 14, baseY - 8, 28, 8);
  // 面板
  const pw = Math.max(64, pr.w), ph = 52;
  const px = pr.x, py = pr.y - ph * 0.15;
  ctx.fillStyle = '#f2c14e';
  ctx.strokeStyle = '#3a2f18'; ctx.lineWidth = 4;
  rrPath(px - pw / 2, py - ph / 2, pw, ph, 8);
  ctx.fill(); ctx.stroke();
  // 箭头（上托↑ / 下砸↓，dir 参数决定）
  ctx.strokeStyle = '#3a2f18'; ctx.fillStyle = '#3a2f18';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  const ay = dir < 0 ? 1 : -1;   // 画面上箭头方向：上托→箭头朝上
  ctx.beginPath();
  ctx.moveTo(px, py + ay * 14);
  ctx.lineTo(px, py - ay * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px, py - ay * 18);
  ctx.lineTo(px - 9, py - ay * 6);
  ctx.lineTo(px + 9, py - ay * 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* 本地圆角矩形路径（不依赖核心私有 rr，避免命名冲突） */
function rrPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
