'use strict';
/* ================= Matter 引擎 ================= */
const engine=Engine.create({positionIterations:8,velocityIterations:6,constraintIterations:4});
const world=engine.world;

/* ================= 全局游戏状态 ================= */
const cv=$('#cv'),ctx=cv.getContext('2d');
let cw=innerWidth,ch=innerHeight,dpr=1;
const G={state:'menu',level:0,phase:'boot',t:0,score:0,dispScore:0,worldW:1700,theme:0,
  queue:[],slingBird:null,flock:[],pigs:[],blocks:[],
  dots:[],particles:[],floaters:[],damageBuf:new Map(),
  hop:null,flightT:0,stillT:0,waitT:0,calmT:0,clearT:0,loseT:0,introT:0,introFrom:0,
  uiShown:false,winShown:false,everLaunched:false,userPanT:0,userZoom:1,shake:0,flash:0,
  slingSnap:0,slingRel:null,scene:null,
  props:[],pendingBoom:[],items:{},armedItem:null,snapshot:null,
  cam:{x:520,y:100,z:1}};
let levelDef=null;

/* ================= 场景装饰生成 ================= */
function createScenery(themeIdx,worldW){
  const S={clouds:[],hills:[],mid:[],tufts:[],stars:[],fireflies:[]};
  for(let i=0;i<6;i++)S.clouds.push({x:rand(-300,worldW),y:rand(-430,40),s:rand(.7,1.5),v:rand(.05,.18)});
  let x=-500;while(x<worldW+700){S.hills.push({x,r:rand(210,330),l:0});x+=rand(280,430)}
  x=-500;while(x<worldW+700){S.hills.push({x,r:rand(130,230),l:1});x+=rand(230,360)}
  const kind=THEMES[themeIdx].mid;
  x=rand(150,400);
  while(x<worldW-100){
    if(kind==='bush')S.mid.push({t:(Math.random()<.5?'bush':'tree'),x,s:rand(.8,1.3)});
    else if(kind==='cactus')S.mid.push({t:(Math.random()<.6?'cactus':'rock'),x,s:rand(.8,1.3)});
    else if(kind==='pool'){const pk=['lounger','palm','diving','buoy'];S.mid.push({t:pk[Math.floor(Math.random()*pk.length)],x,s:rand(.85,1.25)});}
    else S.mid.push({t:(Math.random()<.45?'castle':'rock'),x,s:rand(.8,1.2)});
    x+=rand(340,560);
  }
  x=-100;while(x<worldW+100){S.tufts.push({x,v:rand(.7,1.4)});x+=rand(80,170)}
  if(THEMES[themeIdx].night){
    for(let i=0;i<70;i++)S.stars.push({x:rand(-400,worldW+400),y:rand(-680,60),r:rand(.9,2.4),ph:rand(0,7),sp:rand(.02,.05)});
    for(let i=0;i<8;i++)S.fireflies.push({x:rand(200,worldW-100),y:rand(GROUND_Y-140,GROUND_Y-20),ph:rand(0,7)});
    S.torches=[{x:worldW*.55},{x:worldW*.72}];
  } else S.torches=[];
  G.scene=S;G.worldW=worldW;G.theme=themeIdx;
}

/* ================= 实体创建 ================= */
function makeBlock(bd){
  const def=matDef(bd.m);
  const body=Bodies.rectangle(bd.x,bd.y,bd.w,bd.h,{density:def.density,friction:.6,restitution:.05});
  const coef=Math.max(.5,(bd.w*bd.h)/4900);
  const ent={kind:'block',mat:bd.m,w:bd.w,h:bd.h,hp:def.hp*coef,maxHp:def.hp*coef,body,seed:rand(1,999),dead:false};
  if(REG.explosives[bd.m])ent.explosive=true;
  body.gd=ent;G.blocks.push(ent);Composite.add(world,body);
}
function makePig(pd){
  const king=pd.t==='k',g=king?PIG.king:PIG,r=g.r,hr=g.hit;
  // 身体略向上放 (hr-r)，让贴图底边（脚底）仍在原来的高度
  const body=Bodies.circle(pd.x,pd.y-(hr-r),hr,{density:g.density*(r/hr)*(r/hr),friction:.5,restitution:.15});
  const maxHp=g.hp||(king?130:36);
  const ent={kind:'pig',type:pd.t,r,hitR:hr,body,dead:false,hp:maxHp,maxHp,hurt:false,seed:rand(1,999),blinkSeed:rand(0,300)};
  body.gd=ent;G.pigs.push(ent);Composite.add(world,body);
}
function spawnBirdBody(type,x,y,vx,vy,rOverride){
  const d=BIRDS[type];
  const r=rOverride||d.r,hr=r*(d.hit/d.r);
  const body=Bodies.circle(x,y,hr,{density:d.density*(r/hr)*(r/hr),friction:.5,restitution:.35,frictionAir:.0008});
  Body.setVelocity(body,{x:vx,y:vy});Body.setAngularVelocity(body,.04);
  const ent={kind:'bird',type,body,r,hitR:hr,power:d.power,matMult:d.matMult,skillUsed:type==='red',fuse:-1,dead:false,dashT:0};
  body.gd=ent;G.flock.push(ent);Composite.add(world,body);return ent;
}
function removeBird(ent){if(ent.dead)return;ent.dead=true;try{Composite.remove(world,ent.body)}catch(e){}}
/* 派生实体继承道具增益（分裂/召唤等"由旧实体造新实体"的技能统一调用）
 * 新增一种增益字段，只需在这里加一行；尺寸缩放由调用方按 r 比例自行处理。 */
function inheritBuffs(src,dst){
  if(src.tank)dst.tank=true;                                        // 绝好调芭菲：霸体（applyHitRules 读 ea.tank）
  if(src.chaos)dst.chaos=src.chaos;                                  // 黄金船炒面：暴走标记（onFlightStep 按实体筛选）
  if(src.shoe)dst.shoe=src.shoe;                                     // 决胜蹄铁：远投标记
  if(src.body.frictionAir!==0.0008)dst.body.frictionAir=src.body.frictionAir; // 蹄铁低摩擦
}

/* ================= 伤害系统 ================= */
function pushDamage(ent,dmg){const cur=G.damageBuf.get(ent)||0;if(dmg>cur)G.damageBuf.set(ent,dmg)}
function applyHitRules(A,B,rel){
  const ea=A.gd,eb=B.gd;if(!eb)return;let dmg=0;
  if(eb.kind==='prop')return; // 机关不走伤害系统，经 onHit 接缝处理
  if(ea&&ea.kind==='bird'){
    if(ea.tank){ /* 绝好调芭菲霸体：对积木/奇宝伤害 ×2.2 且忽略材质衰减（供道具接缝使用） */
      if(eb.kind==='pig')dmg=rel*6.5*ea.power*2.2;
      else if(eb.kind==='block')dmg=rel*3.5*ea.power*2.2;
    }else{
      if(eb.kind==='pig')dmg=rel*6.5*ea.power;
      else if(eb.kind==='block')dmg=rel*3.5*ea.power*(ea.matMult[eb.mat]||1);
    }
    if(ea.type==='bomb'&&ea.fuse<0&&rel>3)ea.fuse=66;
  }else if(ea&&ea.kind==='block'){
    const m=Math.sqrt(ea.body.mass);
    if(eb.kind==='pig')dmg=rel*3.8*m;
    else if(eb.kind==='block')dmg=rel*1.4*m;
    else dmg=rel*1.1*m; // 撞地
  }else if(ea&&ea.kind==='pig'){
    if(eb.kind==='block')dmg=rel*2.5*Math.sqrt(ea.body.mass);
  }else{ // A 是地面等静态物
    if(eb.kind==='block')dmg=rel*1.1*Math.sqrt(eb.body.mass);
    else if(eb.kind==='pig')dmg=rel>2.5?rel*3.2:0; // 落地跌落伤害
  }
  if(dmg>4)pushDamage(eb,dmg);
}
Events.on(engine,'collisionStart',e=>{
  for(const pair of e.pairs){
    const A=pair.bodyA,B=pair.bodyB;
    const rel=Math.hypot(A.velocity.x-B.velocity.x,A.velocity.y-B.velocity.y);
    /* 机关碰撞接缝：轻接触也通知 onHit(prop, otherBody, rel)；base 无机关时行为不变 */
    if(A.gd&&A.gd.kind==='prop')REG.propTypes[A.gd.prop.type]?.onHit?.(A.gd.prop,B,rel);
    if(B.gd&&B.gd.kind==='prop')REG.propTypes[B.gd.prop.type]?.onHit?.(B.gd.prop,A,rel);
    if(rel<1.5)continue;
    applyHitRules(A,B,rel);applyHitRules(B,A,rel);
    if(rel>3.5){
      const ma=A.gd&&A.gd.mat,mb=B.gd&&B.gd.mat;
      if(ma==='glass'||mb==='glass')sfxT('thudG');
      else if(ma==='stone'||mb==='stone')sfxT('thudS');
      else if(ma==='wood'||mb==='wood')sfxT('thudW');
      else if((A.gd&&A.gd.kind==='pig')||(B.gd&&B.gd.kind==='pig'))sfxT('pigHit');
      else sfxT('thudW');
    }
  }
});
Events.on(engine,'collisionActive',e=>{
  for(const pair of e.pairs){
    const A=pair.bodyA,B=pair.bodyB;
    const ea=A.gd,eb=B.gd;
    let pig=null,other=null;
    if(ea&&ea.kind==='pig'){pig=ea;other=B}
    else if(eb&&eb.kind==='pig'){pig=eb;other=A}
    if(pig&&!pig.dead&&other&&other.gd&&other.gd.kind==='block'){
      // 只有重物积木压在奇宝上方时，才算重力挤压伤害，避免站在积木上的奇宝掉血
      if(other.position.y < pig.body.position.y - pig.r * 0.4){
        pushDamage(pig,0.6);
      }
    }
  }
});
function processDamage(){
  /* 有界连锁（guard<10）：先排空换桶后的伤害桶，再排空爆炸物队列；
   * explode/连锁产生的新伤害进入新桶，由下一轮处理。
   * base 无 pendingBoom 时与原实现行为完全一致。 */
  let guard=0;
  while((G.damageBuf.size||G.pendingBoom.length)&&guard<10){
    guard++;
    if(G.damageBuf.size){
      const buf=G.damageBuf;G.damageBuf=new Map();
      for(const[ent,dmg]of buf){
        if(ent.dead)continue;
        ent.hp-=dmg;
        const p=ent.body.position;
        if(ent.kind==='block'){
          if(ent.hp<=0)destroyBlock(ent);
          else{fx('puff',p.x,p.y,2,{s:5});}
        }else if(ent.kind==='pig'){
          if(ent.hp<=0)killPig(ent);
          else{ent.hurt=ent.hp<ent.maxHp*.55;fx('star',p.x,p.y-ent.r,2,{s:5});sfx('pigHit');}
        }
      }
    }
    if(G.pendingBoom.length){
      const booms=G.pendingBoom.splice(0);
      for(const b of booms){explode(b.x,b.y);if(b.h&&b.h.onDetonate)b.h.onDetonate(b.x,b.y);}
    }
  }
}
function destroyBlock(ent){
  ent.dead=true;try{Composite.remove(world,ent.body)}catch(e){}
  const p=ent.body.position;
  fx('shard',p.x,p.y,10,{col:matDef(ent.mat).edge,s:rand(6,13)});
  addScore(matDef(ent.mat).score,p);sfx(ent.mat==='glass'?'brkG':ent.mat==='stone'?'brkS':'brkW');
  if(ent.explosive&&REG.explosives[ent.mat])G.pendingBoom.push({x:p.x,y:p.y,h:REG.explosives[ent.mat]});
}
function allPigsDead(){return G.pigs.length>0&&G.pigs.every(q=>q.dead)}
function updatePigCount(){
  const alive=G.pigs.filter(p=>!p.dead).length;
  const el=$('#pigCount');
  if(el){
    el.textContent=alive;
    el.style.color=alive===0?'#3c9622':'#5a3a14';
  }
}
function killPig(ent){
  if(ent.dead)return;
  ent.dead=true;try{Composite.remove(world,ent.body)}catch(e){}
  const p=ent.body.position,king=ent.type==='k';
  fx('smoke',p.x,p.y,king?9:6,{s:king?16:10});
  fx('star',p.x,p.y-10,king?5:4,{s:7});
  if(king)fx('shard',p.x,p.y-ent.r,6,{col:'#f2c34a',s:9});
  addScore(king?10000:5000,p);sfx('pigDie');
  updatePigCount();
  if(allPigsDead())beginClear();
}
/* 被击飞出场地（镜头永远看不到也打不到）的猪直接算阵亡，避免卡关 */
function cullOutOfBounds(){
  const x0=-140,x1=G.worldW+140;
  for(const ent of G.pigs){
    if(ent.dead)continue;
    const p=ent.body.position;
    if(p.x<x0||p.x>x1||p.y>GROUND_Y+120)killPig(ent);
  }
}

/* ================= 爆炸 / 技能 ================= */
function explode(x,y){
  G.shake=16;G.flash=.4;sfx('boom');
  fx('ring',x,y,2,{s:20});fx('smoke',x,y,12,{s:14});fx('spark',x,y,18,{s:1});
  const R=175;
  for(const bd of Composite.allBodies(world)){
    if(bd.isStatic)continue;
    const dx=bd.position.x-x,dy=bd.position.y-y,d=Math.hypot(dx,dy);
    if(d>R)continue;
    const f=1-d/R,inv=d>1?1/d:0;
    Body.setVelocity(bd,{x:bd.velocity.x+dx*inv*f*13,y:bd.velocity.y+dy*inv*f*13-2*f});
    const e=bd.gd;if(!e)continue;
    if(e.kind==='pig')pushDamage(e,f*320);
    else if(e.kind==='block')pushDamage(e,f*300);
  }
}
function triggerSkill(){
  if(G.phase!=='flight')return;
  const b=G.flock.find(e=>!e.dead&&!e.skillUsed);
  if(!b)return;
  b.skillUsed=true;markSkillSeen(b.type);
  if(b.type==='chuck'){ // 米浴加速冲刺
    const v=b.body.velocity,sp=Math.hypot(v.x,v.y)||.1;
    const k=Math.min(34,sp*2.3+6)/sp;
    Body.setVelocity(b.body,{x:v.x*k,y:v.y*k});
    b.dashT=22;fx('ring',b.body.position.x,b.body.position.y,1,{s:14});sfx('skill');
  }else if(b.type==='blue'){ // 内恰分裂成三只
    const p=b.body.position,v=b.body.velocity,sp=Math.hypot(v.x,v.y);
    const k=b.scaleK||b.r/BIRDS.blue.r; // 母体当前缩放系数：吃芭菲=1.25，无道具=1（子体基准 13 保持原版手感）
    removeBird(b);fx('puff',p.x,p.y,4,{s:7});
    for(let i=-1;i<=1;i++){
      const a=Math.atan2(v.y,v.x)+i*.17;
      const e=spawnBirdBody('blue',p.x+i*4*k,p.y+i*22*k,Math.cos(a)*sp,Math.sin(a)*sp,13*k);
      e.skillUsed=true;
      inheritBuffs(b,e); // 霸体/暴走/远投等增益随母体传下去
    }
    sfx('split');
  }else if(b.type==='bomb'){ // 波旁超负荷引爆
    const p={x:b.body.position.x,y:b.body.position.y};
    removeBird(b);explode(p.x,p.y);
  }
  updateHint();
}
function markSkillSeen(t){if(!save.seenSkill[t]){save.seenSkill[t]=1;persist()}}

/* ================= 关卡流程 ================= */
function createLevel(i){
  G.level=i;levelDef=LEVELS[i];
  Composite.clear(world,false);
  const L=levelDef;
  Composite.add(world,Bodies.rectangle(L.w/2,GROUND_Y+150,L.w+1600,300,{isStatic:true,friction:.8}));
  G.blocks=[];G.pigs=[];G.flock=[];G.dots=[];G.particles=[];G.floaters=[];G.damageBuf.clear();
  /* 注册表复位与装配（无任何注册时 G.props 为空，行为与基线一致） */
  G.props=[];G.pendingBoom=[];G.armedItem=null;G.snapshot=null;
  for(const cfg of (REG.propPatches[i]||[])){
    const T=REG.propTypes[cfg.type];
    if(T&&T.make)G.props.push(T.make(cfg));
    else console.warn('未注册的机关类型:',cfg.type);
  }
  G.items={};for(const id in REG.items)G.items[id]=(REG.items[id].uses!=null?REG.items[id].uses:1);
  for(const b of L.blocks)makeBlock(b);
  for(const p of L.pigs)makePig(p);
  updatePigCount();
  G.queue=[...L.birds];G.slingBird=null;G.hop=null;
  G.score=0;G.dispScore=0;G.uiShown=false;G.winShown=false;G.slingSnap=0;G.shake=0;G.flash=0;
  createScenery(L.world,L.w);
  for(let k=0;k<25;k++)Engine.update(engine,1000/60); // 预沉降稳定结构
  G.damageBuf.clear();for(const p of G.pigs){p.hp=p.maxHp;p.hurt=false}
  G.snapshot=takeSnapshot(); // 预沉降+血量复位完成后采集快照（时间系道具经接缝取用）
  // 开场镜头扫视
  G.cam.z=camZoom();
  const aim=getAimTarget();
  const vw=cw/G.cam.z;
  const isLandscape=cw>=ch;
  if(isLandscape && vw >= ((L.focus + 160) - (SLING.x - 140))){
    G.introFrom = aim.tx;
  } else {
    G.introFrom = clamp(L.focus, vw/2, Math.max(vw/2, L.w-vw/2));
  }
  G.cam.x=G.introFrom;G.cam.y=aim.ty;
  G.phase='intro';G.introT=0;G.userPanT=0;G.everLaunched=false;
  $('#scoreNum').textContent='0';
  showTag(`第 ${i+1} 关 · ${THEMES[L.world].name}`);
  updateHint();
  for(const fn of REG.afterCreate)fn(i);
  renderItemBar();
}
function loadNextBird(){
  if(!G.queue.length)return;
  const type=G.queue.shift();
  G.hop={type,t:0,fx:200,fy:GROUND_Y-BIRDS[type].r};
  G.phase='loading';sfx('hop');
}
function launch(p,vx,vy){
  G.snapshot=takeSnapshot(); // 每发起飞前刷新回溯锚点：时间系道具（闹钟）只撤销最近一发，而非整关重来
  const type=G.slingBird.type;G.slingBird=null;
  G.dots=[];G.stillT=0;G.flightT=0;G.phase='flight';G.everLaunched=true;
  G.slingRel={x:p.x,y:p.y};G.slingSnap=1;
  const ent=spawnBirdBody(type,p.x,p.y,vx,vy);
  /* 已激活道具一次性消耗：onLaunch(刚发射的鸟实体)，扣次数并刷新月具栏 */
  if(G.armedItem&&REG.items[G.armedItem]){
    const it=REG.items[G.armedItem];
    if(it.onLaunch)it.onLaunch(ent);
    G.items[G.armedItem]=Math.max(0,(G.items[G.armedItem]||0)-1);
    if(!it.quiet){ // 统一消耗反馈：让玩家看得见"这一发用了什么"；def.quiet=true 可关闭
      G.floaters.push({x:ent.body.position.x,y:ent.body.position.y-46,txt:(it.icon||'')+' '+(it.label||it.name||G.armedItem),t:0});
      sfx('skill');
    }
    G.armedItem=null;
    renderItemBar();
  }
  sfx('launch');fx('puff',p.x,p.y,3,{s:5});fx('smoke',p.x,p.y+4,3,{s:6});
  updateHint();
}
function endFlight(){
  for(const e of G.flock)if(!e.dead){
    const px=e.body.position.x,py=e.body.position.y;
    fx('feather',px,py,6,{col:birdColor(e.type)});
    fx('puff',px,py,3,{s:6});
    sfx('pop');removeBird(e);
  }
  G.phase='waitClear';G.waitT=0;G.calmT=0;
}
function beginClear(){
  if(G.winShown||G.phase==='cleared')return;
  // 无论之前是否已经触发了失败判定或弹出了失败UI，只要奇宝全部被击败，立即关闭失败面板并进入通关胜利！
  $('#lose').classList.add('hidden');
  G.phase='cleared';G.clearT=0;
}
function addScore(n,pos){G.score+=n;G.floaters.push({x:pos.x,y:pos.y-34,txt:'+'+n,t:0});}

/* ============ 快照与回溯（核心通用能力，时间系道具经接缝调用） ============ */
function takeSnapshot(){
  const ents=[];
  for(const ent of [...G.blocks,...G.pigs]){
    const b=ent.body;
    ents.push({ent,x:b.position.x,y:b.position.y,angle:b.angle,vx:b.velocity.x,vy:b.velocity.y,av:b.angularVelocity,hp:ent.hp,dead:ent.dead,hurt:!!ent.hurt});
  }
  return {ents,queue:(G.slingBird?[G.slingBird.type,...G.queue]:[...G.queue]),score:G.score}; // 手中鸟计入队列：回溯后该发重新上膛
}
function restoreSnapshot(){
  if(!G.snapshot)return;
  const S=G.snapshot;
  for(const e of G.flock){try{Composite.remove(world,e.body)}catch(err){}}
  G.flock=[];
  for(const r of S.ents){
    const ent=r.ent,b=ent.body;
    /* 快照时已毁（上一发的战果）：保持销毁态，不得空中重建引发二次坍塌 */
    if(r.dead){if(!ent.dead){ent.dead=true;try{Composite.remove(world,b)}catch(err){}}continue;}
    if(ent.dead){ent.dead=false;Composite.add(world,b)} // 快照后本发被杀/被碎：复活并归位
    Body.setPosition(b,{x:r.x,y:r.y});
    Body.setAngle(b,r.angle);
    Body.setVelocity(b,{x:r.vx,y:r.vy});
    Body.setAngularVelocity(b,r.av);
    ent.hp=r.hp;if('hurt' in ent)ent.hurt=r.hurt;
  }
  G.queue=S.queue.slice();G.score=S.score;
  G.dots=[];G.floaters=[];G.damageBuf=new Map();G.pendingBoom=[];
  G.slingBird=null;G.hop=null;G.slingSnap=0;G.slingRel=null;
  G.uiShown=false;G.winShown=false;G.everLaunched=false;G.userPanT=0;
  G.dispScore=G.score;
  updatePigCount();renderItemBar();
  if(G.queue.length){G.phase='loading';loadNextBird()} // 重新装填，回到瞄准态
  else{G.phase='waitClear';G.waitT=0;G.calmT=0}
}

/* ================= 胜负结算 ================= */
function showWin(){
  G.phase='ui';G.uiShown=true;G.winShown=true;
  const alive=G.flock.filter(e=>!e.dead).length;
  const left=G.queue.length+(G.slingBird?1:0)+alive;
  const bonus=left*10000,total=G.score+bonus;
  const stars=left>=2?3:left===1?2:1;
  save.stars[G.level]=Math.max(save.stars[G.level],stars);
  if(G.level<LAST)save.unlocked=Math.max(save.unlocked,G.level+2);
  persist();
  const svgs=$('#starsRow').querySelectorAll('svg');
  svgs.forEach(s=>{s.classList.remove('on');s.style.animationDelay=''});
  for(let i=0;i<stars;i++){svgs[i].classList.add('on');svgs[i].style.animationDelay=(0.35+i*0.4)+'s';setTimeout(()=>sfx('star'),350+i*400)}
  $('#bonusLine').textContent=`剩余马娘 × ${left}　奖励 +${bonus}`;
  $('#bonusLine').classList.remove('on');
  const ad=$('#allDone');
  if(G.level===LAST){ad.classList.remove('hidden');ad.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8-6.1-3.6-6.1 3.6 1.5-6.8L2.2 8.9l6.9-.6z"/></svg>恭喜你通关了全部关卡！<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8-6.1-3.6-6.1 3.6 1.5-6.8L2.2 8.9l6.9-.6z"/></svg>';}
  else ad.classList.add('hidden');
  $('#bNext').textContent=G.level<LAST?'下一关':'返回选关';
  hidePanels();$('#win').classList.remove('hidden');$('#hud').classList.remove('hidden');
  const el=$('#winScore'),t0=performance.now();
  (function roll(){const p=Math.min(1,(performance.now()-t0)/900);
    el.textContent=Math.round(total*(1-Math.pow(1-p,3)));
    if(p<1)requestAnimationFrame(roll);else $('#bonusLine').classList.add('on');})();
  sfx('win');
}
const LOSE_TIPS=[
  '奇宝还在悠闲地摸鱼，再试一次吧！',
  '别灰心，换个角度让马娘们再次出击！',
  '不同马娘有不同特技，善用米浴冲刺和波旁引爆！',
  '瞄准结构的支柱支撑点，一击全倒！'
];
function showLose(){
  // 必须确保所有猪都还活着才允许判定失败！如果所有猪已死，立即判赢
  if(allPigsDead()){beginClear();return}
  if(G.winShown||G.phase==='cleared')return;
  G.phase='ui';G.uiShown=true;
  $('#loseTip').textContent=LOSE_TIPS[Math.floor(Math.random()*LOSE_TIPS.length)];
  hidePanels();$('#lose').classList.remove('hidden');$('#hud').classList.remove('hidden');
  sfx('lose');
}

/* ================= 粒子 ================= */
function fx(kind,x,y,n,opt){
  for(let i=0;i<n;i++){
    if(G.particles.length>380)G.particles.shift();
    const o=opt||{};
    const p={kind,x,y,t:0,life:1,s:o.s||6,col:o.col||'#fff',rot:rand(0,TAU),vr:rand(-.2,.2)};
    if(kind==='shard'){p.vx=rand(-4,4);p.vy=rand(-6,1);p.g=.35;p.life=1.1}
    else if(kind==='smoke'){p.vx=rand(-1,1);p.vy=rand(-1.6,-.4);p.g=0;p.life=1.2}
    else if(kind==='spark'){p.vx=rand(-8,8);p.vy=rand(-8,4);p.g=.15;p.life=.55}
    else if(kind==='feather'){p.vx=rand(-1.5,1.5);p.vy=rand(-2,.5);p.g=.045;p.life=1.6}
    else if(kind==='star'){p.vx=rand(-3,3);p.vy=rand(-6,-2);p.g=.16;p.life=1}
    else if(kind==='ring'){p.vx=0;p.vy=0;p.g=0;p.life=.5}
    else{p.vx=rand(-2,2);p.vy=rand(-2.5,.5);p.g=.05;p.life=.7} // puff
    G.particles.push(p);
  }
}
function updateParticles(){
  for(const p of G.particles){p.t+=1/60;p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
    if(p.kind==='feather')p.x+=Math.sin(p.t*6+p.rot)*.4;}
  G.particles=G.particles.filter(p=>p.t<p.life);
  for(const f of G.floaters)f.t+=1/60;
  G.floaters=G.floaters.filter(f=>f.t<1.1);
}
function birdColor(t){
  return t==='red'?'#a34e36':t==='chuck'?'#44384a':t==='blue'?'#c14b3d':'#ba554b';
}

/* ================= 每帧逻辑 ================= */
function step(){
  G.t++;
  if(G.scene)for(const c of G.scene.clouds){c.x+=c.v;if(c.x>G.worldW+500)c.x=-500}
  if(G.state!=='playing'){updateParticles();return}
  Engine.update(engine,1000/60);
  for(const pr of G.props){const T=REG.propTypes[pr.type];if(T&&T.applyStep)T.applyStep(pr)}
  // 飞行阶段
  if(G.phase==='flight'){
    for(const id in REG.items){const it=REG.items[id];if(it.onFlightStep)it.onFlightStep()}
    G.flightT+=1/60;
    const lead=G.flock.find(e=>!e.dead);
    if(lead&&G.t%3===0&&G.dots.length<110)G.dots.push({x:lead.body.position.x,y:lead.body.position.y});
    for(const e of G.flock){
      if(e.dead)continue;
      if(e.fuse>0){
        e.fuse--;
        const fp=e.body.position;
        fx('spark',fp.x+Math.cos(e.body.angle-1.5)*e.r*1.3,fp.y+Math.sin(e.body.angle-1.5)*e.r*1.3,1,{s:1});
        if(e.fuse===0){const p={x:e.body.position.x,y:e.body.position.y};removeBird(e);explode(p.x,p.y)}
      }
      if(e.dashT>0){e.dashT--;fx('spark',e.body.position.x,e.body.position.y,2,{s:1})}
      const pos=e.body.position;
      if(pos.x<-160||pos.x>G.worldW+260||pos.y>1300)removeBird(e);
    }
    let moving=false;
    for(const e of G.flock)if(!e.dead&&Math.hypot(e.body.velocity.x,e.body.velocity.y)>.4){moving=true;break}
    if(moving)G.stillT=0;else G.stillT++;
    if(!G.flock.some(e=>!e.dead)||G.stillT>95||G.flightT>8)endFlight();
  }
  processDamage();
  // 通关保险：清理被击飞出场的猪，并在猪全部阵亡时无条件进入结算
  cullOutOfBounds();
  if(allPigsDead()&&!G.winShown)beginClear();
  // 装填跳跃
  if(G.phase==='loading'&&G.hop){
    G.hop.t+=1/60*1.9;
    if(G.hop.t>=1){G.slingBird={type:G.hop.type,x:SLING_REST.x,y:SLING_REST.y,drag:null};G.hop=null;G.phase='aim';updateHint()}
  }
  // 等待世界安定
  if(G.phase==='waitClear'){
    G.waitT+=1/60;
    let calm=true;
    for(const bd of Composite.allBodies(world)){if(bd.isStatic)continue;
      if(Math.hypot(bd.velocity.x,bd.velocity.y)>.6){calm=false;break}}
    for(const p of G.pigs){
      if(!p.dead&&Math.hypot(p.body.velocity.x,p.body.velocity.y)>.25){calm=false;break}
    }
    if(calm)G.calmT+=1/60;else G.calmT=0;
    if(G.calmT>1.2||G.waitT>4.5){
      if(allPigsDead())beginClear();
      else if(G.queue.length>0)loadNextBird();
      else{G.phase='losing';G.loseT=0}
    }
  }
  if(G.phase==='intro'){
    G.introT+=1/60;
    if(G.introT>=1.25){G.phase='loading';loadNextBird()}
  }
  if(G.phase==='cleared'){G.clearT+=1/60;if(G.clearT>1.4&&!G.winShown)showWin()}
  if(G.phase==='losing'){G.loseT+=1/60;if(G.loseT>0.8&&!G.uiShown)showLose()}
  updateParticles();
  updateCamera();
  if(G.slingSnap>0)G.slingSnap=Math.max(0,G.slingSnap-.06);
  if(G.flash>0)G.flash=Math.max(0,G.flash-.03);
  if(G.shake>0)G.shake*=.88;
}

/* ================= 相机系统 ================= */
function camZoom(){
  const isLandscape = cw >= ch;
  let baseZ;
  if(isLandscape){
    // 横屏模式：优先把弹弓到核心目标城堡收纳在视野中
    const focusX = (levelDef && levelDef.focus) || 1350;
    const battleW = Math.max(1280, focusX - (SLING.x - 140) + 140);
    const zW = cw / battleW;
    const zH = ch / 720;
    baseZ = Math.min(zW, zH);
    baseZ = clamp(baseZ, 0.45, 1.5);
  }else{
    // 竖屏模式：手机与平板竖屏适配
    const zH = ch / 820;
    const zW = cw / 680;
    baseZ = clamp(Math.min(zW, zH), 0.45, 1.2);
  }
  return baseZ * G.userZoom;
}

function getAimTarget(){
  const z = G.cam.z;
  const vw = cw / z, vh = ch / z;
  const focusX = (levelDef && levelDef.focus) || 1350;
  const leftBound = SLING.x - 140;
  const rightBound = focusX + 160;
  const span = rightBound - leftBound;

  let tx;
  if(cw >= ch && vw >= span){
    // 宽屏视野充裕：把弹弓和城堡居中对齐
    tx = (leftBound + rightBound) / 2;
  }else{
    // 视野较窄：弹弓在屏幕左侧 25% 处
    tx = SLING.x + 0.25 * vw;
  }
  // 核心关键：地面永远锚定在屏幕从顶部向下的 78% 黄金分割线，给弹弓、马娘和草坪留足空间！
  const ty = GROUND_Y - vh * 0.28;
  return {tx, ty};
}

function clampCam(){
  const z = G.cam.z, vw = cw / z, vh = ch / z;
  const maxW = (levelDef && levelDef.w) || G.worldW || 1900;
  G.cam.x = maxW < vw ? maxW / 2 : clamp(G.cam.x, vw / 2, maxW - vw / 2);
  // Y 边界锁定：确保地面绝不会脱离屏幕底部，也不会飘到天上
  const aim = getAimTarget();
  const minCamY = aim.ty - 350; // 允许跟随高抛抛物线向上移动
  const maxCamY = GROUND_Y - vh * 0.12; // 镜头最低时，地面依然在屏幕 62% 处
  G.cam.y = clamp(G.cam.y, minCamY, maxCamY);
}

function updateCamera(){
  G.cam.z = camZoom();
  // 拖拽弹弓期间锁死镜头：镜头一平移，世界坐标不变的马娘就会从手指/鼠标下滑走
  if(G.state==='playing'&&ptr.down&&ptr.mode==='sling'&&G.slingBird)return;
  const vw = cw / G.cam.z, vh = ch / G.cam.z;
  const aim = getAimTarget();

  if(G.state==='menu'||G.state==='select'){
    G.cam.x = lerp(G.cam.x, SLING.x + vw * 0.18, 0.08);
    G.cam.y = lerp(G.cam.y, aim.ty, 0.08);
    clampCam();
    return;
  }

  let tx = aim.tx, ty = aim.ty;

  if(G.phase==='intro'){
    const p = Math.min(1, G.introT / 1.25);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    G.cam.x = lerp(G.introFrom, aim.tx, e);
    G.cam.y = aim.ty;
    clampCam();
    return;
  }

  if(G.phase==='flight'){
    const lead = G.flock.find(e => !e.dead);
    if(lead){
      const vx = lead.body.velocity.x;
      tx = lead.body.position.x + clamp(vx * 12, -40, vw * 0.25);
      // 升空时适当抬高视野展现优美弧线，但保底绝不丢失地面
      ty = clamp(lead.body.position.y - vh * 0.1, aim.ty - 260, aim.ty);
    }
  }

  if(G.userPanT > 0){
    G.userPanT--;
  }else{
    // 瞄准/装填阶段直接归位，不缓慢平移，避免镜头回位把马娘从手底下"拖走"
    const k=(G.phase==='aim'||G.phase==='loading')?1:.08;
    G.cam.x = lerp(G.cam.x, tx, k);
    G.cam.y = lerp(G.cam.y, ty, k);
  }
  clampCam();
}
