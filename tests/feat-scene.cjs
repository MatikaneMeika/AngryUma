/* ============================================================================
 * tests/feat-scene.cjs — 角色 B 场景玩法自测（World & Level Props）
 * ----------------------------------------------------------------------------
 * 依赖：角色 A 的 base 与被 boot 的多文件加载器 tests/harness.cjs（A 独占）。
 *   harness.boot() 返回一个已注入全局（LEVELS/G/createLevel/startLevel/step/
 *   processDamage/makeBlock/Bodies/Body/Composite/REG/... ）、且资源预载 microtask
 *   已 flush 的 vm 上下文。
 * base / harness 尚未落地时：打印 SKIP 并以 0 退出（不误判失败）。
 *
 * 覆盖：
 *   B-1/B-2 稳定性  ：世界2/3(index 8-15) 预沉降后跑 150 步 → 猪不死亡、位移<26、沉降后无 pendingBoom。
 *   B-2 连锁        ：三个相邻 carrot 块，破坏其一 → 依次引爆（全部碎裂、pendingBoom 被消化、发生爆炸）。
 *   B-3 区域        ：mud 区内动态体 frictionAir↑/restitution↓/速度↓；slopeUp force.y<0；slopeDown force.y>0。
 *   B-4 机关        ：tire onHit 后 Constraint 被移除且 cut=true；bowl onHit 激活后对附近体施加向心力。
 * ==========================================================================*/
'use strict';

let harness = null;
try { harness = require('./harness.cjs'); }
catch (e) {
  console.log('SKIP feat-scene: 未找到 tests/harness.cjs（角色 A 的 base 尚未落地）。B 文件为契约就绪版本，待 base 合入后即可运行。');
  process.exit(0);
}
if (!harness || typeof harness.boot !== 'function' || typeof harness.run !== 'function') {
  console.log('SKIP feat-scene: tests/harness.cjs 未导出 boot()/run()（契约未就绪）。');
  process.exit(0);
}

(async () => {
  const ctx = harness.boot();   // boot() 返回已 contextify 的 vm 上下文（feat-* 约定）
  await harness.tick();         // 等待资源 Image.onload microtask

  harness.run(ctx, `
    const fail=(m)=>{throw Error(m)};
    const hyp=(x,y)=>Math.hypot(x,y);

    /* ---------- B-1/B-2 稳定性：世界2/3 全部关卡 ---------- */
    for(let i=8;i<16;i++){
      const defs=LEVELS[i].pigs.map(p=>({x:p.x,y:p.y}));
      G.state='playing'; createLevel(i);
      for(let j=0;j<150;j++) step();
      if(G.phase!=='aim') fail('L'+i+' 未回到 aim: '+G.phase);
      for(let j=0;j<G.pigs.length;j++){
        const p=G.pigs[j],d=defs[j];
        if(p.dead) fail('L'+i+' 猪'+j+' 沉降期死亡');
        const ox=p.body.position.x-d.x, oy=p.body.position.y-d.y;
        if(Math.abs(ox)>26||Math.abs(oy)>26) fail('L'+i+' 猪'+j+' 不稳定: '+ox.toFixed(1)+','+oy.toFixed(1));
      }
      if(G.pendingBoom.length) fail('L'+i+' 沉降后仍有未消化 pendingBoom: '+G.pendingBoom.length);
      // 复合结构：最高块明显高于第一层梁(460)，即至少存在 350/320/240 第二层及以上
      let minY=1e9; for(const b of G.blocks) if(!b.dead) minY=Math.min(minY,b.body.position.y);
      if(!(minY<400)) fail('L'+i+' 未见 2 层以上复合结构 (topY='+minY.toFixed(0)+')');
      // 每关都至少放置一个胡萝卜块（B-1 材质替换策略）
      if(!G.blocks.some(b=>b.mat==='carrot')) fail('L'+i+' 未摆放胡萝卜块');
    }

    /* ---------- B-2 连锁：造三个相邻 carrot 块，破坏其一 ---------- */
    G.state='playing'; createLevel(0); for(let j=0;j<30;j++) step();
    G.phase='flight';
    const before=G.blocks.length;
    makeBlock({x:900,y:300,w:40,h:40,m:'carrot'});
    makeBlock({x:944,y:300,w:40,h:40,m:'carrot'});
    makeBlock({x:988,y:300,w:40,h:40,m:'carrot'});
    const carrots=G.blocks.filter(b=>b.mat==='carrot'&&b.explosive);
    if(carrots.length<3) fail('未成功生成 3 个爆炸胡萝卜块: '+carrots.length);
    G.shake=0;
    pushDamage(carrots[0],1e6);
    processDamage();
    const aliveCarrot=G.blocks.filter(b=>b.mat==='carrot'&&!b.dead).length;
    if(G.shake<=0) fail('连锁未触发爆炸（G.shake 未升高）');
    if(G.pendingBoom.length) fail('连锁后 pendingBoom 未消化: '+G.pendingBoom.length);
    if(aliveCarrot>0) fail('相邻胡萝卜未连锁引爆，剩余 '+aliveCarrot+' 个');

    /* ---------- B-3 区域：mud ---------- */
    G.state='playing'; createLevel(8); for(let j=0;j<10;j++) step();
    const mud=G.props.find(p=>p.type==='mud');
    if(!mud) fail('L8 未挂 mud 区域');
    (function(){
      const b=Bodies.circle(mud.x,mud.y,18,{frictionAir:0.001,restitution:0.6,density:0.004});
      Body.setVelocity(b,{x:9,y:0}); Composite.add(world,b);
      REG.propTypes.mud.applyStep(mud);
      if(!(b.frictionAir>=0.09)) fail('mud 未提高 frictionAir: '+b.frictionAir);
      if(!(b.restitution<=0.1)) fail('mud 未降低 restitution: '+b.restitution);
      if(!(Math.hypot(b.velocity.x,b.velocity.y)<9)) fail('mud 未即时衰减速度');
      Composite.remove(world,b);
    })();

    /* slopeUp / slopeDown 受力方向 */
    (function(){
      const up=G.props.find(p=>p.type==='slopeUp');
      if(up){
        const b=Bodies.circle(up.x,up.y,16,{density:0.004}); Composite.add(world,b);
        REG.propTypes.slopeUp.applyStep(up);
        if(!(b.force.y<0)) fail('slopeUp 未产生向上力: '+b.force.y);
        Composite.remove(world,b);
      }
    })();
    G.state='playing'; createLevel(11); for(let j=0;j<10;j++) step();
    (function(){
      const dn=G.props.find(p=>p.type==='slopeDown');
      if(!dn) fail('L11 未挂 slopeDown');
      const b=Bodies.circle(dn.x,dn.y,16,{density:0.004}); Composite.add(world,b);
      REG.propTypes.slopeDown.applyStep(dn);
      if(!(b.force.y>0)) fail('slopeDown 未产生向下力: '+b.force.y);
      Composite.remove(world,b);
    })();

    /* ---------- B-4 机关：tire 断绳 ---------- */
    G.state='playing'; createLevel(8); for(let j=0;j<10;j++) step();
    (function(){
      const tire=G.props.find(p=>p.type==='tire');
      if(!tire) fail('L8 未挂 tire 机关');
      if(tire.body.gd?.kind!=='prop') fail('tire body 未标记 prop');
      const consBefore=Composite.allConstraints(world).filter(c=>c===tire.constraint).length;
      if(consBefore!==1) fail('tire 悬挂 Constraint 未加入世界');
      // 伪造一次来自马娘的命中
      const fake=Bodies.circle(tire.body.position.x,tire.body.position.y,20,{density:0.004});
      fake.gd={kind:'bird',type:'red'};
      Composite.add(world,fake);
      REG.propTypes.tire.onHit(tire,fake);
      const consAfter=Composite.allConstraints(world).filter(c=>c===tire.constraint).length;
      if(consAfter!==0) fail('tire 命中后 Constraint 未被移除');
      if(!tire.cut) fail('tire cut 标记未置位');
      Composite.remove(world,fake);
    })();

    /* ---------- B-4 机关：bowl 引力 ---------- */
    G.state='playing'; createLevel(10); for(let j=0;j<10;j++) step();
    (function(){
      const bowl=G.props.find(p=>p.type==='bowl');
      if(!bowl) fail('L10 未挂 bowl 机关');
      if(bowl.active) fail('bowl 初始不应激活');
      const b=Bodies.circle(bowl.x+bowl.r*0.6,bowl.y,16,{density:0.004}); Composite.add(world,b);
      REG.propTypes.bowl.onHit(bowl,{gd:{kind:'bird',type:'red'}});
      if(!bowl.active) fail('bowl 命中后未激活');
      b.force={x:0,y:0};
      REG.propTypes.bowl.applyStep(bowl);
      if(!(b.force.x<0)) fail('bowl 未把右侧体吸向盆心: '+b.force.x);
      // 超时后自动失活
      G.t=bowl.until+5;
      REG.propTypes.bowl.applyStep(bowl);
      if(bowl.active) fail('bowl 超出窗口后未失活');
      Composite.remove(world,b);
    })();
  `);

  console.log('PASS feat-scene: 世界2/3 稳定(3+层) · 胡萝卜连锁引爆 · mud/slope 区域生效 · tire 断绳 · bowl 引力聚拢');
})().catch(err => { console.error('FAIL feat-scene:', err && err.stack || err); process.exitCode = 1; });
