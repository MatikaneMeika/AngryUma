'use strict';
/* ================= 角色 C：时空类道具（feat-items-time.js） =================
 * 契约依据：dev/CONTRACTS.md §2 registerItem / takeSnapshot / restoreSnapshot。
 * 只注册，不改核心；核心符号（G / restoreSnapshot / Body / fx 等）均在运行期回调里取用。
 */
(() => {
  /* ---------- C-2a 闹钟 SL ⏰ ----------
   * 即时型：arm() 直接 restoreSnapshot() 回到本关发射前（预沉降+血量复位后的快照），
   * 不占用 G.armedItem；次数用尽再按不生效、不崩溃。
   * 接缝缺口补正（已登记 STATUS.md）：核心 restoreSnapshot 仅在"快照内记录为 dead"
   * 时复活实体；对"快照时活着、存档后被杀"的实体不会翻转 ent.dead。C 侧在调用前后
   * 自行核对补齐，不改核心。 */
  registerItem('alarm', {
    name: '闹钟 SL', icon: '⏰', uses: 1,
    arm() {
      if ((G.items.alarm | 0) <= 0 || !G.snapshot) return;
      const alive = G.snapshot.ents.filter(e => !e.dead).map(e => e.ent);
      G.items.alarm = Math.max(0, G.items.alarm - 1); // 先扣数：restoreSnapshot 内 renderItemBar 显示剩余
      restoreSnapshot();
      for (const ent of alive) {
        if (ent.dead) { ent.dead = false; try { Composite.add(world, ent.body); } catch (e) { } }
      }
    },
  });

  /* ---------- C-2b 黄金船炒面 🍜 ----------
   * arm 后下一次发射给该鸟打 chaos 标记；飞行中每步施加随机横向脉冲
   * （"黄金船式不可控暴走"）并点缀碎屑粒子；鸟离场/飞行结束后标记随实体自然消亡。 */
  let yakiT = 0;
  registerItem('yaki', {
    name: '黄金船炒面', icon: '🍜', uses: 1,
    arm() { if ((G.items.yaki | 0) > 0) G.armedItem = 'yaki'; },
    onLaunch(e) { e.chaos = 1; yakiT = 0; },
    onFlightStep() {
      const e = G.flock.find(x => !x.dead && x.chaos);
      if (!e) return;
      yakiT++;
      const b = e.body;
      // 单调漂移 + 高频抖动：保证轨迹相对基线产生可测横向偏离，观感上是暴走
      const pulse = (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.22);
      Body.setVelocity(b, { x: b.velocity.x + pulse, y: b.velocity.y });
      if (yakiT % 4 === 0) fx('smoke', b.position.x, b.position.y, 1, { s: 4, col: '#d8b25e' });
    },
  });
})();
