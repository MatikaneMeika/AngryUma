'use strict';
/* ================= 道具效果量化探针（角色 A 所有，非 src 资产） =================
 * 用途：把"道具看不出效果"这类主观反馈转成可复现的数值闸门。
 * 运行：node dev/logs/items-balance-probe.cjs     （在仓库根或任意目录均可）
 * 原理：用 tests/harness.cjs 的 vm sandbox 装载真实脚本链，清场后复刻核心 step()
 *       的 flight 分支调用序（Engine.update + REG.items[*].onFlightStep），
 *       对每个道具做纯弹道测量，避免建筑干扰。
 * P1 芭菲放大 → 内恰分裂子体尺寸/霸体继承
 * P2 蹄铁摩擦降低 → 射程增益
 * P3 炒面 chaos → 落点漂移与散度（30 次采样）
 * P4 蹄铁预测弹道积分 vs 真实物理落点误差
 */
const path = require('node:path');
const harness = require(path.join(__dirname, '..', '..', 'tests', 'harness.cjs'));

(async () => {
  const sb = harness.boot();
  await harness.tick();

  const out = harness.run(sb, `(function(){
    const R = {};
    const K = SLING.k;

    /* 清场关卡：只保留地面，排除建筑与机关干扰，测纯弹道 */
    function openField(){
      createLevel(0);
      G.state = 'playing';
      for(const x of [...G.blocks]) try{Composite.remove(world,x.body)}catch(e){}
      for(const x of [...G.pigs])   try{Composite.remove(world,x.body)}catch(e){}
      for(const x of [...G.props])  try{Composite.remove(world,x.body)}catch(e){}
      G.blocks=[]; G.pigs=[]; G.props=[]; G.flock=[]; G.particles=[];
      G.phase='flight';
    }

    /* 飞一次：返回首落地 x、触地步数、含滚动的最大 x */
    function fly(vx, vy, opts){
      opts = opts || {};
      openField();
      const e = spawnBirdBody('blue', SLING_REST.x, SLING_REST.y, vx, vy);
      if(opts.item) REG.items[opts.item].onLaunch(e);
      let landX = null, landT = null, maxX = 0;
      for(let t=0;t<900;t++){
        Engine.update(engine, 1000/60);
        if(opts.callItems) for(const id in REG.items){ const it=REG.items[id]; if(it.onFlightStep) it.onFlightStep(); }
        const p = e.body.position;
        if(p.x > maxX) maxX = p.x;
        if(landX===null && p.y >= GROUND_Y - e.hitR){ landX = p.x; landT = t; }
        if(landX!==null && t > landT + 90) break;
      }
      return { r:e.r, hitR:e.hitR, tank:!!e.tank, landX:Math.round(landX), landT,
               rollMaxX:Math.round(maxX), dist:Math.round(landX - SLING_REST.x) };
    }

    const V = { vx: 15, vy: -15 };   /* 典型 45° 满弓 */
    const mean = arr => arr.reduce((s,v)=>s+v,0)/arr.length;

    /* ---------- P1 芭菲放大 → 分裂继承 ---------- */
    openField();
    const mom = spawnBirdBody('blue', SLING_REST.x, SLING_REST.y, V.vx, V.vy);
    const before = { r: mom.r, hitR: mom.hitR, cr: mom.body.circleRadius };
    REG.items.parfait.onLaunch(mom);
    const scaled = { r: mom.r, hitR: mom.hitR, cr: mom.body.circleRadius, tank: !!mom.tank };
    mom.skillUsed = false;
    triggerSkill();
    const kids = G.flock.filter(x=>!x.dead).map(x=>({ r:x.r, hitR:x.hitR, cr:x.body.circleRadius,
             tank:!!x.tank, chaos:!!x.chaos, fa:x.body.frictionAir }));
    const expectR = +(13 * (scaled.r / BIRDS.blue.r)).toFixed(3);   /* 基准 13 保持原版手感，只叠加母体缩放 */
    R.P1 = { before, scaled, kidCount: kids.length, kid0: kids[0], kidsR: kids.map(k=>k.r),
             expectKidR: expectR,
             sizeInherited: kids.length===3 && kids.every(k=>Math.abs(k.r-expectR)<0.01),
             tankInherited: kids.length===3 && kids.every(k=>k.tank===true) };

    /* ---------- P2 蹄铁射程增益 ---------- */
    const base = fly(V.vx, V.vy, {});
    const shoe = fly(V.vx, V.vy, { item:'shoe' });
    R.P2 = { base, shoe, firstLandGainPx: shoe.landX - base.landX,
             firstLandGainPct: +((shoe.landX - base.landX)/base.dist*100).toFixed(2),
             rollGainPx: shoe.rollMaxX - base.rollMaxX,
             rollGainPct: +((shoe.rollMaxX - base.rollMaxX)/base.rollMaxX*100).toFixed(2) };

    /* ---------- P3 炒面漂移与散度 ---------- */
    const ys = [];
    for(let i=0;i<30;i++) ys.push(fly(V.vx, V.vy, { item:'yaki', callItems:true }).landX);
    ys.sort((a,b)=>a-b);
    const yMean = mean(ys), sd = Math.sqrt(mean(ys.map(v=>(v-yMean)*(v-yMean))));
    R.P3 = { baseLandX: base.landX,
             withoutFlightStep: fly(V.vx, V.vy, { item:'yaki' }).landX,
             median: ys[Math.floor(ys.length/2)], p25: ys[Math.floor(ys.length*0.25)], p75: ys[Math.floor(ys.length*0.75)],
             min: ys[0], max: ys[ys.length-1],
             meanDriftPx: Math.round(yMean - base.landX), sdPx: Math.round(sd), spreadPx: ys[ys.length-1]-ys[0] };

    /* ---------- P4 蹄铁预测弹道 vs 真实 ---------- */
    openField();
    const d = { x: -64, y: -64 };
    let px = SLING_REST.x + d.x, py = SLING_REST.y + d.y;
    let pvx = -d.x*K, pvy = -d.y*K, predLandX = null;
    for(let i=0;i<600;i++){
      pvx *= 1-0.00015; pvy = pvy*(1-0.00015) + 0.27;
      px += pvx; py += pvy;
      if(py >= GROUND_Y - 13){ predLandX = px; break; }
    }
    const real = fly(-d.x*K, -d.y*K, { item:'shoe' });
    R.P4 = { predictedLandX: predLandX===null?null:Math.round(predLandX), realLandX: real.landX,
             errPx: predLandX===null?null:Math.round(Math.abs(real.landX-predLandX)) };

    R.consts = { gPerStep: +(engine.gravity.y*engine.gravity.scale*Math.pow(1000/60,2)).toFixed(4),
                 SLING_k: K, blue_r: BIRDS.blue.r, blue_hit: BIRDS.blue.hit,
                 bird_frictionAir: 0.0008, GROUND_Y, SLING_REST, level0_w: LEVELS[0].w };
    return JSON.stringify(R, null, 1);
  })()`);

  console.log(out);

  /* 数值闸门：修复达成后应为 PASS；当前 main(v1.0.0) 预期 FAIL，用于回归对照 */
  const r = JSON.parse(out);
  const gate = [];
  gate.push(['P1 分裂继承母体半径', r.P1.sizeInherited]);
  gate.push(['P1 分裂继承霸体 tank', r.P1.tankInherited]);
  gate.push(['P2 蹄铁首落地增益 ≥ 12%', r.P2.firstLandGainPct >= 12]);
  gate.push(['P3 炒面平均漂移 ≥ 250px（有方向性）', Math.abs(r.P3.meanDriftPx) >= 250]);
  gate.push(['P3 炒面散度 ≥ 600px', r.P3.spreadPx >= 600]);
  gate.push(['P4 预测线误差 ≤ 80px', r.P4.errPx !== null && r.P4.errPx <= 80]);
  console.log('\n===== 平衡性闸门 =====');
  for (const [name, ok] of gate) console.log((ok ? 'PASS  ' : 'FAIL  ') + name);
  const failed = gate.filter(g => !g[1]).length;
  console.log(failed ? `\n${failed} 项未达标` : '\nALL BALANCE GATES PASSED');
  process.exitCode = failed ? 1 : 0;
})();
