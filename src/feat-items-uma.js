'use strict';
/* ================= 角色 C：马娘主题道具（feat-items-uma.js） =================
 * 契约依据：dev/CONTRACTS.md §2 registerItem(id,def)。只注册，不改核心。
 * 注意：本文件在 30-engine/40-render/50-ui-input 之前加载，回调内引用的核心符号
 * （G / REG / BIRDS / SLING / SLING_REST / GROUND_Y / Body / renderItemBar 等）
 * 在运行期（arm/发射/渲染广播时）才解析，故注册本身安全。
 */
(() => {
  /* ---------- C-1a 绝好调芭菲 🍨 ----------
   * arm 后下一次发射生效：霸体标记 tank=true（核心 applyHitRules 分支：伤害×2.2
   * 且无视材质衰减）+ 刚体放大 25%，"吃下芭菲进入绝好调，横冲直撞"。 */
  registerItem('parfait', {
    name: '绝好调芭菲', icon: '🍨', uses: 1,
    arm() { if ((G.items.parfait | 0) > 0) G.armedItem = 'parfait'; },
    onLaunch(e) {
      e.tank = true;
      Body.scale(e.body, 1.25, 1.25);
      e.r *= 1.25; e.hitR *= 1.25; // 贴图与放大后的刚体保持同步
    },
  });

  /* ---------- C-1b 决胜蹄铁 🧲 ----------
   * arm 后下一次发射：空气摩擦大幅降低，飞行更远更平直；
   * 瞄准时（armed 且已拉弓）画一条按蹄铁摩擦衰减积分的金色预测弹道。 */
  registerItem('shoe', {
    name: '决胜蹄铁', icon: '🐴', uses: 1,
    arm() { if ((G.items.shoe | 0) > 0) G.armedItem = 'shoe'; },
    onLaunch(e) { e.body.frictionAir = 0.00015; },
    onAimDraw() {
      if (G.armedItem !== 'shoe' || !G.slingBird || !G.slingBird.drag) return;
      const d = G.slingBird.drag;
      if (Math.hypot(d.x, d.y) < 16) return; // 拉弓太小不预览
      let x = SLING_REST.x + d.x, y = SLING_REST.y + d.y;
      let vx = -d.x * SLING.k, vy = -d.y * SLING.k;
      const pts = [];
      for (let i = 0; i < 420; i++) {
        vx *= 1 - 0.00015; vy = vy * (1 - 0.00015) + 0.27;
        x += vx; y += vy;
        if (y > GROUND_Y - 6 || x > G.worldW + 100) break;
        if (i % 5 === 0) pts.push({ x, y });
      }
      ctx.save();
      ctx.fillStyle = '#ffd23e'; ctx.shadowColor = 'rgba(255,170,20,.85)'; ctx.shadowBlur = 8;
      for (let i = 0; i < pts.length; i++) {
        ctx.globalAlpha = Math.max(0.2, 1 - i / pts.length);
        ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
  });
})();
