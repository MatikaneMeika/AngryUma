/* ============================================================================
 * feat-contraptions.js — 物理机关（角色 B：World & Level Props）
 * ----------------------------------------------------------------------------
 * 只通过注册接缝落地。依赖接缝契约（A-3）：
 *   registerPropType(type,{make,inZone?,applyStep?,draw,onHit?})
 *   make(cfg) 生成的刚体须设 body.gd={kind:'prop',prop}（核心 collisionStart 据此回调 onHit）。
 *   核心 step → applyStep(pr)；drawGame → draw(pr)（世界坐标）。
 * 依赖全局（运行时求值）：world, Composite, Body, Bodies, Constraint, G, ctx, TAU, rand
 * ==========================================================================*/
'use strict';

/* ---------- 轮胎秋千：绳索悬挂，被击中即断绳甩飞砸向结构 ---------- */
registerPropType('tire', {
  make(cfg) {
    const r = cfg.r || 22;
    const anchorX = cfg.anchorX != null ? cfg.anchorX : cfg.x;
    const anchorY = cfg.anchorY != null ? cfg.anchorY : (cfg.y - (cfg.length || 120));
    const length = cfg.length || (cfg.y - anchorY);
    // 轮胎：环形外观由 draw 呈现，物理用实心圆近似
    const body = Bodies.circle(cfg.x, cfg.y, r, { density: .0045, friction: .5, restitution: .35 });
    const constraint = Constraint.create({
      pointA: { x: anchorX, y: anchorY },
      bodyB: body,
      length: length,
      stiffness: .9,
      damping: .05
    });
    const prop = { type: 'tire', body, constraint, r, anchorX, anchorY, cut: false };
    body.gd = { kind: 'prop', prop };
    Composite.add(world, body);
    Composite.add(world, constraint);
    return prop;
  },
  // 命中即断绳（核心仅在 prop 与 bird/block/pig 有意义碰撞时回调 onHit）
  onHit(pr, body) {
    if (pr.cut) return;
    pr.cut = true;
    try { Composite.remove(world, pr.constraint); } catch (e) {}
    fx('puff', pr.body.position.x, pr.body.position.y, 4, { s: 6 });
  },
  draw(pr) {
    const b = pr.body, p = b.position;
    ctx.save();
    // 绳索（未断时悬挂）
    if (!pr.cut) {
      ctx.strokeStyle = 'rgba(60,45,30,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pr.anchorX, pr.anchorY); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = '#3a2f18';
      ctx.beginPath(); ctx.arc(pr.anchorX, pr.anchorY, 4, 0, TAU); ctx.fill();
    }
    // 轮胎：黑环 + 内孔，随 body.angle 旋转
    ctx.translate(p.x, p.y); ctx.rotate(b.angle);
    ctx.strokeStyle = '#1c1c1e'; ctx.lineWidth = pr.r * 0.62;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.7, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,120,130,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.7, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.arc(0, 0, pr.r * 0.36, 0, TAU); ctx.fill();
    // 胎纹
    ctx.strokeStyle = 'rgba(200,200,210,.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * pr.r * 0.45, Math.sin(a) * pr.r * 0.45);
      ctx.lineTo(Math.cos(a) * pr.r * 0.95, Math.sin(a) * pr.r * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }
});

/* ---------- 引力饭盆（"绝好调芭菲"场景彩蛋）：命中激活，限时吸入周围动态体 ---------- */
registerPropType('bowl', {
  make(cfg) {
    return {
      type: 'bowl', x: cfg.x, y: cfg.y, r: cfg.r || 150,
      active: false, until: 0,
      window: cfg.window || 180,            // 激活帧窗口（约 3s @60fps）
      strength: cfg.strength || 0.0016
    };
  },
  onHit(pr, body) {
    pr.active = true;
    pr.until = G.t + pr.window;
    fx('star', pr.x, pr.y - 14, 6, { s: 7 });
  },
  applyStep(pr) {
    if (!pr.active) return;
    if (G.t > pr.until) { pr.active = false; return; }
    const bodies = Composite.allBodies(world);
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.isStatic || b.isSensor) continue;
      const dx = pr.x - b.position.x, dy = (pr.y - 10) - b.position.y;
      const d = Math.hypot(dx, dy);
      if (d > pr.r || d < 1) continue;
      const f = (1 - d / pr.r) * pr.strength * b.mass;   // 越近吸力越强
      Body.applyForce(b, b.position, { x: dx / d * f, y: dy / d * f });
    }
  },
  draw(pr) {
    ctx.save();
    // 激活光晕
    if (pr.active) {
      const k = Math.max(0, (pr.until - G.t) / pr.window);
      ctx.fillStyle = 'rgba(255,220,120,' + (0.12 + 0.18 * k) + ')';
      ctx.beginPath(); ctx.arc(pr.x, pr.y - 10, pr.r * (0.6 + 0.4 * Math.sin(G.t * 0.15) * 0.5 + 0.2), 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,90,' + (0.5 * k + 0.2) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.stroke();
    }
    // 碗身
    ctx.fillStyle = '#c98b3a';
    ctx.beginPath();
    ctx.moveTo(pr.x - 34, pr.y - 6);
    ctx.quadraticCurveTo(pr.x, pr.y + 34, pr.x + 34, pr.y - 6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a4f18'; ctx.lineWidth = 3; ctx.stroke();
    // 碗口 + 芭菲球
    ctx.fillStyle = '#e8b56b';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y - 6, 34, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2d0';
    ctx.beginPath(); ctx.arc(pr.x - 12, pr.y - 16, 12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(pr.x + 8, pr.y - 18, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e0567a';
    ctx.beginPath(); ctx.arc(pr.x - 2, pr.y - 30, 6, 0, TAU); ctx.fill();   // 樱桃
    ctx.restore();
  }
});
