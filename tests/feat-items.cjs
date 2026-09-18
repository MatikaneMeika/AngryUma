'use strict';
/* ================= tests/feat-items.cjs — 角色 C 道具自测（独占文件） =================
 * 契约依据：dev/CONTRACTS.md §2（registerItem/G.items/armedItem/restoreSnapshot/tank/onAimDraw）。
 * 覆盖任务书 C-3：注册 / 一次性消耗 / 闹钟 SL 读档 / 炒面飞行扰动。
 * 独立可 node 运行；harness 未就绪时打印 SKIP 并 exit 0。
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const harness = require('./harness.cjs');

if (!fs.existsSync(path.join(__dirname, 'harness.cjs'))) { console.log('SKIP: harness 未就绪'); process.exit(0); }

const FAILS = [];
const ok = (cond, msg) => { if (!cond) FAILS.push(msg); };

(async () => {
  const ctx = harness.boot();
  ctx.ok = ok; // 把宿主断言收集器挂进 vm context
  await harness.tick();

  /* ---- 1. 注册：四道具齐备，uses 均为 1 ---- */
  harness.run(ctx, `
    ok(Object.keys(REG.items).sort().join(',')==='alarm,parfait,shoe,yaki',
      'REG.items 应恰为 alarm,parfait,shoe,yaki，实际: '+Object.keys(REG.items).join(','));
    for(const id of ['parfait','shoe','alarm','yaki']){
      const def=REG.items[id]||{};
      ok(def.uses===1, id+' 应注册且 uses===1');
      ok(typeof def.arm==='function', id+' 应有 arm()');
    }
  `);

  /* ---- 2. 芭菲：arm+launch 一次性消耗，tank 置位且刚体放大 ---- */
  harness.run(ctx, `
    if(!REG.items.parfait){ ok(false,'parfait 未注册，用例跳过'); } else {
    startLevel(0);
    for(let i=0;i<200;i++)step();
    ok(G.phase==='aim'&&G.slingBird, '芭菲用例前置：应进入 aim 且有 slingBird，实际 '+G.phase);
    ok(G.items.parfait===1, 'createLevel 后 G.items.parfait 应为 1，实际 '+G.items.parfait);
    REG.items.parfait.arm();
    ok(G.armedItem==='parfait', "arm() 后 G.armedItem 应为 'parfait'，实际 "+G.armedItem);
    const r0=G.flock.length;
    launch({x:SLING_REST.x,y:SLING_REST.y},14,-6);
    const ent=G.flock[G.flock.length-1];
    ok(G.flock.length===r0+1,'launch 应生成新鸟');
    ok(G.armedItem===null,'发射后 armedItem 应归 null');
    ok(G.items.parfait===0,'发射后 parfait 次数应扣为 0，实际 '+G.items.parfait);
    ok(ent.tank===true,'发射鸟应带 tank=true');
    ok(ent.body.circleRadius>ent.r,'tank 刚体应被 Body.scale 放大：'+ent.body.circleRadius+'>'+ent.r);
    ok(ent.body.velocity.x===14&&ent.body.velocity.y===-6,'launch 初速不应被芭菲改变');
    }
  `);

  /* ---- 3. 蹄铁：arm+launch 降 frictionAir；onAimDraw 可安全执行 ---- */
  harness.run(ctx, `
    if(!REG.items.shoe){ ok(false,'shoe 未注册，用例跳过'); } else {
    startLevel(0);
    for(let i=0;i<200;i++)step();
    const baseFA=G.slingBird?BIRDS[G.slingBird.type].density:0; // 仅取值防未用告警
    REG.items.shoe.arm();
    ok(G.armedItem==='shoe',"arm() 后 armedItem 应为 'shoe'");
    const faStd=0.0008; // spawnBirdBody 默认 frictionAir
    launch({x:SLING_REST.x,y:SLING_REST.y},14,-6);
    const ent=G.flock[G.flock.length-1];
    ok(ent.body.frictionAir<faStd,'shoe 应降低 frictionAir：'+ent.body.frictionAir+'<'+faStd);
    ok(G.items.shoe===0,'shoe 次数应归 0');
    /* onAimDraw 在 aim 阶段经 render 广播不应抛错 */
    startLevel(0);
    for(let i=0;i<200;i++)step();
    REG.items.shoe.arm();
    render();
    G.slingBird.drag={x:-70,y:55};
    render();
    ok(true,'aim 覆盖层渲染通过');
    }
  `);

  /* ---- 4. 闹钟 SL：即时读档，位置/血量/复活队列回滚，次数 -1 ---- */
  harness.run(ctx, `
    if(!REG.items.alarm){ ok(false,'alarm 未注册，用例跳过'); } else {
    startLevel(0);
    for(let i=0;i<200;i++)step();           // 到达 aim（快照仍为 createLevel 采集态）
    const p0=G.blocks[0].body.position;
    const rec={x:p0.x,y:p0.y};
    Body.setPosition(G.blocks[0].body,{x:p0.x+80,y:p0.y-60});
    G.pigs[0].hp=1;                          // 打残第一只猪
    killPig(G.pigs[0]);                      // 直接击杀，读档应复活
    ok(G.pigs[0].dead===true,'扰动前置：猪应先被击杀');
    const queueBefore=G.snapshot.queue.length;
    REG.items.alarm.arm();
    ok(G.items.alarm===0,'alarm.arm() 后次数应归 0，实际 '+G.items.alarm);
    ok(G.armedItem===null,'alarm 是即时型，不应占用 armedItem');
    const p1=G.blocks[0].body.position;
    ok(Math.abs(p1.x-rec.x)<0.51&&Math.abs(p1.y-rec.y)<0.51,'积木应回到快照位：'+p1.x.toFixed(2)+','+p1.y.toFixed(2)+' vs '+rec.x.toFixed(2)+','+rec.y.toFixed(2));
    ok(G.pigs[0].dead===false,'猪应被复活');
    ok(G.pigs[0].hp===G.pigs[0].maxHp,'复活血量应满：'+G.pigs[0].hp);
    for(let i=0;i<120;i++)step();
    ok(G.phase==='aim','读档装填后应回到 aim，实际 '+G.phase);
    ok(G.queue.length+(G.slingBird?1:0)===queueBefore,'装填完成后至 队列+弹弓 应恢复为快照长度 '+queueBefore+'，实际 '+(G.queue.length+(G.slingBird?1:0)));
    REG.items.alarm.arm();                   // 次数已尽再按：不得崩溃、不得再生效
    ok(G.items.alarm===0,'alarm 次数用尽后保持 0');
    }
  `);

  /* ---- 5. 炒面：飞行中随机横向脉冲，轨迹相对基线偏离 ---- */
  harness.run(ctx, `
    if(!REG.items.yaki){ ok(false,'yaki 未注册，用例跳过'); } else {
    function flyTrack(armed){
      startLevel(0);
      for(let i=0;i<200;i++)step();
      if(armed)REG.items.yaki.arm();
      launch({x:SLING_REST.x,y:SLING_REST.y},14,-6);
      const xs=[];
      for(let i=0;i<30;i++){step();const lead=G.flock.find(e=>!e.dead);xs.push(lead?lead.body.position.x:null)}
      return xs;
    }
    const base=flyTrack(false);
    const chaos=flyTrack(true);
    let maxDev=0;
    for(let i=0;i<base.length;i++){
      if(base[i]===null||chaos[i]===null)continue;
      maxDev=Math.max(maxDev,Math.abs(base[i]-chaos[i]));
    }
    ok(G.items.yaki===0,'yaki 发射后次数应归 0');
    ok(maxDev>2,'炒面应使轨迹横向偏离基线(>2px)，实际 maxDev='+maxDev.toFixed(2));
    }
  `);

  if (FAILS.length) {
    console.error('FAIL: ' + FAILS.length + ' 项断言未通过');
    for (const f of FAILS) console.error('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log('PASS feat-items: 注册×4 / 芭菲tank消耗 / 蹄铁frictionAir+aimDraw / 闹钟SL读档 / 炒面轨迹扰动');
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
