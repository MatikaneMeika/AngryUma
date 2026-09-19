'use strict';
/* ============================================================================
 * tests/feat-platform.cjs — 角色 A 平台整合自测（v1.0.1 缺陷修复回归）
 * ----------------------------------------------------------------------------
 * 依据：dev/FIX-PLAN-A-01.md。覆盖 A-01/A-02/A-04/A-05/A-06 五项的可测面：
 *   A-01 分裂继承母体缩放：芭菲放大后的内恰，分裂子体半径应为 13×母体比例
 *   A-02 分裂继承道具增益：tank（霸体）等字段经核心 inheritBuffs 传递到子体
 *   回归  无道具时分裂子体仍为原版 13（老手感零变化）
 *   A-04 道具消耗即时反馈：launch 后产生带图标与名称的飘字，计数 -1，armedItem 清空
 *   A-06 默认解锁全部关卡：save.unlocked === NLEVELS，且"新解锁"高亮不误挂
 *   A-05 道具栏避让画面：壳 CSS 源码级断言（贴底 + 提示条让位 + 窄视口降级）
 * 说明：本文件只测核心与壳（A 所有权）；道具手感阈值归 C，由 dev/logs/items-balance-probe.cjs 把关。
 * ==========================================================================*/
const harness = require('./harness.cjs');

(async () => {
  const sb = harness.boot();
  await harness.tick();

  const out = harness.run(sb, `(function(){
    const R = {};

    /* 清场关卡：只留地面，排除建筑/机关干扰 */
    function openField(){
      createLevel(0);
      G.state = 'playing';
      for(const x of [...G.blocks]) try{Composite.remove(world,x.body)}catch(e){}
      for(const x of [...G.pigs])   try{Composite.remove(world,x.body)}catch(e){}
      for(const x of [...G.props])  try{Composite.remove(world,x.body)}catch(e){}
      G.blocks=[]; G.pigs=[]; G.props=[]; G.flock=[]; G.particles=[]; G.floaters=[];
      G.phase = 'flight';
    }
    /* 分裂一只 blue，可选先灌入道具增益 */
    function splitOnce(item){
      openField();
      const mom = spawnBirdBody('blue', SLING_REST.x, SLING_REST.y, 15, -15);
      if(item) REG.items[item].onLaunch(mom);
      const par = { r: mom.r, hitR: mom.hitR, cr: mom.body.circleRadius, tank: !!mom.tank };
      mom.skillUsed = false;
      triggerSkill();
      const kids = G.flock.filter(x => !x.dead);
      return {
        parent: par,
        kidCount: kids.length,
        kidR: kids.map(k => +k.r.toFixed(3)),
        kidHitR: kids.map(k => +k.hitR.toFixed(3)),
        kidCR: kids.map(k => +k.body.circleRadius.toFixed(3)),
        kidTank: kids.map(k => !!k.tank),
        kidFa: kids.map(k => k.body.frictionAir),
        expectR: +(13 * (par.r / BIRDS.blue.r)).toFixed(3)
      };
    }

    /* ---------- A-01 / A-02 ---------- */
    R.scaled = splitOnce('parfait');
    R.plain  = splitOnce(null);

    /* ---------- A-04 道具消耗即时反馈 ---------- */
    openField();
    G.phase = 'aim';
    G.queue = ['blue'];
    G.slingBird = { type:'blue', x:SLING_REST.x, y:SLING_REST.y, drag:null };
    G.items.parfait = 1;
    G.armedItem = 'parfait';
    const f0 = G.floaters.length;
    launch({ x: SLING_REST.x, y: SLING_REST.y }, 15, -15);
    const fl = G.floaters.slice(f0);
    R.consume = {
      newFloaters: fl.length,
      text: fl.map(f => f.txt).join('|'),
      left: G.items.parfait,
      armed: G.armedItem
    };

    /* ---------- A-06 默认解锁全部关卡 ---------- */
    R.unlock = {
      flag: (typeof UNLOCK_ALL !== 'undefined') ? UNLOCK_ALL : '(未定义)',
      unlocked: save.unlocked,
      NLEVELS: NLEVELS
    };

    /* ---------- A-07 闹钟 SL 只回退最近一发（快照锚点=每次 launch 前；快照前已毁实体不得复活） ---------- */
    createLevel(8);                       // birds: ['bomb','red','bomb','chuck']
    G.state = 'playing';
    for(const x of [...G.props]) try{Composite.remove(world,x.body)}catch(e){}
    G.props=[];                           // 去机关干扰，保留建筑/猪
    for(let j=0;j<200;j++) step();        // 进入 aim
    /* 模拟"上一发战果"：碎一个独立落地玻璃块 + 杀一头猪 → 这些处于快照时的 dead 态，回溯后必须保持 */
    destroyBlock(G.blocks.find(b=>!b.dead && b.mat==='glass'));
    killPig(G.pigs.find(p=>!p.dead && p.type!=='k'));
    const anchor={score:G.score, blocksDead:G.blocks.filter(b=>b.dead).length, pigsAlive:G.pigs.filter(p=>!p.dead).length};
    /* 第 2 发：发射（30 步短程不撞任何建筑）→ 击杀另一头猪 → 回收上膛 */
    const shot2=G.slingBird&&G.slingBird.type;
    launch({ x: SLING_REST.x, y: SLING_REST.y }, 13, -9);
    for(let j=0;j<30;j++) step();
    for(const e of [...G.flock]) try{Composite.remove(world,e.body)}catch(_){}
    G.flock=[]; G.phase='aim';
    killPig(G.pigs.find(p=>!p.dead && p.type!=='k'));  // 本发战果：回溯后应复活
    loadNextBird();
    for(let j=0;j<90 && !G.slingBird;j++) step();
    G.items.alarm = 1;
    REG.items.alarm.arm();                // 按时钟：只撤销第 2 发
    for(let j=0;j<200;j++) step();        // 沉降观察期：不得有二次坍塌计分
    R.alarm = {
      shot2, anchor,
      score: G.score,
      sling: G.slingBird && G.slingBird.type,
      blocksDead: G.blocks.filter(b=>b.dead).length,
      pigsAlive: G.pigs.filter(p=>!p.dead).length,
      left: G.queue.length + (G.slingBird ? 1 : 0),
      alarmCnt: G.items.alarm
    };

    /* ---------- 常量回读（便于人工核对断言基准） ---------- */
    R.consts = { blue_r: BIRDS.blue.r, blue_hit: BIRDS.blue.hit, kid_base: 13,
                 bird_frictionAir: 0.0008, GROUND_Y: GROUND_Y, SLING_REST: SLING_REST };
    return JSON.stringify(R);
  })()`);

  const R = JSON.parse(out);
  const A = require('node:assert/strict');

  /* A-01：子体半径 = 13 × 母体缩放系数（芭菲 = 1.25 → 16.25） */
  A.equal(R.scaled.kidCount, 3, 'A-01 分裂应产出 3 只子体');
  A.ok(R.scaled.parent.r === 20 && R.scaled.parent.cr === 22.5,
    'A-01 前置：芭菲应把母体 r 16→20、circleRadius→22.5，实测 ' + JSON.stringify(R.scaled.parent));
  A.ok(R.scaled.kidR.every(r => Math.abs(r - R.scaled.expectR) < 0.01),
    'A-01 分裂子体应继承母体缩放（期望 r=' + R.scaled.expectR + '），实测 ' + JSON.stringify(R.scaled.kidR));
  A.ok(R.scaled.kidCR.every(c => Math.abs(c - R.scaled.expectR * (R.scaled.parent.hitR / R.scaled.parent.r)) < 0.05),
    'A-01 分裂子体刚体半径应随 r 同步放大，实测 circleRadius ' + JSON.stringify(R.scaled.kidCR));

  /* A-02：霸体等道具增益继承 */
  A.ok(R.scaled.kidTank.every(Boolean),
    'A-02 子体应继承 tank 霸体标记，实测 ' + JSON.stringify(R.scaled.kidTank));

  /* 回归：无道具时保持原版 13，老手感零变化 */
  A.ok(R.plain.kidR.every(r => r === 13),
    '回归 无道具分裂子体必须仍为原版 13，实测 ' + JSON.stringify(R.plain.kidR));
  A.ok(R.plain.kidTank.every(t => t === false),
    '回归 无道具分裂不应带 tank，实测 ' + JSON.stringify(R.plain.kidTank));

  /* A-04：消耗即时反馈 */
  A.ok(R.consume.newFloaters >= 1, 'A-04 发射消耗道具后应产生飘字反馈，实测 ' + R.consume.newFloaters);
  A.ok(/🍨/.test(R.consume.text) && /芭菲/.test(R.consume.text),
    'A-04 飘字应包含道具图标与名称，实测 "' + R.consume.text + '"');
  A.equal(R.consume.left, 0, 'A-04 消耗后计数应归零');
  A.equal(R.consume.armed, null, 'A-04 消耗后 armedItem 应清空');

  /* A-07：闹钟只重置最近一发，不是整关从 0 开始；快照前战果不得被反悔 */
  A.ok(R.alarm && R.alarm.shot2 === 'bomb',
    'A-07 前置：第 2 发应为 bomb，实测 ' + JSON.stringify(R.alarm && R.alarm.shot2));
  A.equal(R.alarm.score, R.alarm.anchor.score,
    'A-07 回溯后分数应精确停在锚点 ' + R.alarm.anchor.score + '（整关重置=0，二次坍塌>锚点），实测 ' + R.alarm.score);
  A.equal(R.alarm.sling, R.alarm.shot2,
    'A-07 被撤销那一发应回到弹弓（' + R.alarm.shot2 + '），实测 ' + R.alarm.sling);
  A.equal(R.alarm.left, 4,
    'A-07 回溯后剩余鸟总数应为 4（被撤销一发归还），实测 ' + R.alarm.left);
  A.equal(R.alarm.blocksDead, R.alarm.anchor.blocksDead,
    'A-07 快照前已碎的块必须保持碎裂态（不得空中重建），实测 dead=' + R.alarm.blocksDead + ' 期望 ' + R.alarm.anchor.blocksDead);
  A.equal(R.alarm.pigsAlive, R.alarm.anchor.pigsAlive,
    'A-07 快照前已杀的猪保持死亡、本发击杀的猪应复活，实测存活 ' + R.alarm.pigsAlive + ' 期望 ' + R.alarm.anchor.pigsAlive);
  A.equal(R.alarm.alarmCnt, 0, 'A-07 闹钟自身次数应正常扣到 0');

  /* A-06：默认全解锁 */
  A.equal(R.unlock.flag, true, 'A-06 应定义 UNLOCK_ALL 开关且为 true，实测 ' + R.unlock.flag);
  A.equal(R.unlock.unlocked, R.unlock.NLEVELS,
    'A-06 save.unlocked 应等于关卡总数 ' + R.unlock.NLEVELS + '，实测 ' + R.unlock.unlocked);
  A.ok(/!UNLOCK_ALL/.test(sb.__source),
    'A-06 选关页"新解锁"高亮条件应排除全解锁场景（&& !UNLOCK_ALL）');

  /* A-05：壳 CSS 源码级断言（DOM 样式在 vm 桩里不生效，只能查源码） */
  const css = harness.__html || sb.__html;
  A.ok(/#itemBar\{[^}]*bottom:calc\(14px/.test(css),
    'A-05 #itemBar 应贴底下移为 bottom:calc(14px + safe-area)');
  A.ok(/\.itemBtn\{[^}]*width:48px[^}]*height:48px/.test(css),
    'A-05 .itemBtn 应缩小为 48×48 以减少遮挡');
  A.ok(/#hint\{[^}]*bottom:calc\(70px/.test(css),
    'A-05 #hint 应上移到道具栏之上（bottom:calc(70px ...)）');
  A.ok(/@media\s*\(max-height:620px\)/.test(css),
    'A-05 应包含窄视口（max-height:620px）降级规则');

  console.log('PASS feat-platform: 分裂继承母体缩放(16.25) · 子体继承霸体 · 无道具仍为原版13 · 道具消耗飘字 · 默认全解锁 · 道具栏贴底避让');
})().catch(err => {
  console.error('FAIL feat-platform:', (err && err.stack) || err);
  process.exitCode = 1;
});
