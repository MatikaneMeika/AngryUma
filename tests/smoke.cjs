const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cutFn=(src,name)=>{const i=src.indexOf(name);return i<0?'':src.slice(i,src.indexOf('\n}',i)+2)};
const drawCalls=[];
const context=new Proxy({}, {get:(_,key)=>key==='drawImage'?((image)=>drawCalls.push(image.src)):key==='createLinearGradient'?(()=>({addColorStop(){}})):(()=>{}),set:()=>true});
const listeners=new Map();
const elements=new Map();
function element(id){
  return {style:{},dataset:{},textContent:'',innerHTML:'',
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},contains(c){return this._s.has(c)}},
    addEventListener(type,fn){listeners.set(id+'|'+type,fn)},appendChild(){},remove(){},
    querySelectorAll(){return [element(),element(),element()]},getContext(){return context},
    getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}},
    setPointerCapture(){},dispatchEvent(){return true}};
}
const sandbox={console,Math,Map,Set,Promise,performance,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
 Matter:require('../vendor/matter.min.js'),localStorage:{getItem(){return null},setItem(){}},
 document:{querySelector(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement:element,body:element('#body'),addEventListener(){}},
 Image:class {set src(value){assert.ok(fs.existsSync(path.join(root,value)),value);this._src=value;this.complete=true;this.naturalWidth=512;this.naturalHeight=512;queueMicrotask(()=>{if(typeof this.onload==='function')this.onload()})}get src(){return this._src}},
 requestAnimationFrame(){},setTimeout(){},addEventListener(){},__listeners:listeners};
sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(script,sandbox);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 vm.runInContext(`
 const fire=(type,x,y,id)=>{const fn=__listeners.get('#cv|'+type);if(!fn)throw Error('missing listener '+type);fn({clientX:x,clientY:y,pointerId:id,preventDefault(){}})};
 const w2s=(wx,wy)=>({x:(wx-G.cam.x)*G.cam.z+cw/2,y:(wy-G.cam.y)*G.cam.z+ch/2});
 const dragOff=(px,py)=>{const d=(G.slingBird&&G.slingBird.drag)||{x:0,y:0},m=toWorld(px,py);return Math.hypot(SLING_REST.x+d.x-m.x,SLING_REST.y+d.y-m.y)};
 for(const k of ['birds','pigs'])if(Object.values(IMAGES[k]).some(s=>!s.src))throw Error('Missing sprite');
 if(SLING_REST.y>=SLING.anchorY)throw Error('Sling rest point must sit above the anchor');
 for(let i=0;i<LEVELS.length;i++){
   const defs=LEVELS[i].pigs.map(p=>({x:p.x,y:p.y}));
   startLevel(i);
   for(let j=0;j<150;j++)step();
   if(G.phase!=='aim')throw Error('Level '+i+' did not reach aim: '+G.phase);
   for(let j=0;j<G.pigs.length;j++){
     const p=G.pigs[j],d=defs[j];
     if(p.dead)throw Error('Level '+i+' pig '+j+' died during setup (hitbox overlap)');
     const ox=p.body.position.x-d.x,oy=p.body.position.y-d.y;
     if(Math.abs(ox)>26||Math.abs(oy)>26)throw Error('Level '+i+' pig '+j+' unstable: '+ox.toFixed(1)+','+oy.toFixed(1));
     if(!(p.hitR>p.r))throw Error('Level '+i+' pig '+j+' hitbox was not enlarged');
   }
   render();
 }
 for(const type of ['red','chuck','blue','bomb']){
   const e=spawnBirdBody(type,600,300,4,0);
   if(!(e.hitR>e.r))throw Error('Bird '+type+' hitbox was not enlarged');
   removeBird(e);
 }
 G.flock=[];
 for(const type of ['red','chuck','blue','bomb'])drawBird(type,100,100,0,21,{});
 for(const type of ['n','k'])for(const hurt of [false,true])drawPig({type,hurt,r:26,body:{position:{x:200,y:200},angle:.4}});
 for(const pair of [[1,'chuck'],[3,'blue'],[4,'bomb']]){
   startLevel(pair[0]);G.phase='flight';G.flock=[];
   spawnBirdBody(pair[1],600,300,12,-4);triggerSkill();
   if(pair[1]==='blue'&&G.flock.filter(e=>!e.dead).length!==3)throw Error('Split failed');
   if(pair[1]==='chuck'&&G.flock[0].body.velocity.x<=12)throw Error('Dash failed');
   if(pair[1]==='bomb'&&!G.flock[0].dead)throw Error('Explosion failed');
 }
 startLevel(0);
 for(let i=0;i<160;i++)step();
 G.phase='flight';
 for(const p of G.pigs)pushDamage(p,1e6);
 processDamage();
 if(G.phase!=='cleared')throw Error('Clear not triggered on last pig: '+G.phase);
 for(let i=0;i<140;i++)step();
 if(G.phase!=='ui'||!G.uiShown)throw Error('Win panel missing: '+G.phase);
 if(document.querySelector('#win').classList.contains('hidden'))throw Error('Win panel stays hidden');
 __listeners.get('#bNext|click')();
 if(G.level!==1||G.state!=='playing')throw Error('Next level did not start: '+G.level);
 for(let i=0;i<200;i++)step();
 if(G.phase!=='aim')throw Error('Next level not playable: '+G.phase);
 startLevel(2);
 for(let i=0;i<160;i++)step();
 const stray=G.pigs[0];
 for(const p of G.pigs)if(p!==stray)pushDamage(p,1e6);
 processDamage();
 if(G.phase==='cleared')throw Error('Cleared while a pig is still alive');
 Body.setPosition(stray.body,{x:-900,y:520});
 step();
 if(!stray.dead)throw Error('Out-of-bounds pig not culled');
 if(G.phase!=='cleared')throw Error('Out-of-bounds pig did not clear the level: '+G.phase);
 startLevel(0);
 for(let i=0;i<200;i++)step();
 G.queue=[];
 const a=w2s(SLING_REST.x,SLING_REST.y);
 fire('pointerdown',a.x,a.y,1);
 fire('pointermove',a.x-70,a.y+55,1);
 if(ptr.mode!=='sling')throw Error('Grab failed: '+ptr.mode);
 let maxOff=0;
 for(let i=0;i<60;i++){step();const off=dragOff(a.x-70,a.y+55);if(off>maxOff)maxOff=off}
 if(maxOff>0.5)throw Error('Drag does not follow pointer: '+maxOff);
 fire('pointermove',a.x,a.y,1);fire('pointerup',a.x,a.y,1);
 if(G.phase!=='aim'||!G.slingBird)throw Error('Tap should not launch: '+G.phase);
 fire('pointerdown',a.x+300,a.y-130,2);
 fire('pointermove',a.x+380,a.y-80,2);
 fire('pointerup',a.x+380,a.y-80,2);
 step();
 const b=w2s(SLING_REST.x,SLING_REST.y);
 fire('pointerdown',b.x,b.y,3);
 fire('pointermove',b.x-70,b.y+55,3);
 if(ptr.mode!=='sling')throw Error('Grab after pan failed: '+ptr.mode);
 const cam0={x:G.cam.x,y:G.cam.y};
 maxOff=0;
 for(let i=0;i<120;i++){step();const off=dragOff(b.x-70,b.y+55);if(off>maxOff)maxOff=off}
 if(maxOff>0.5)throw Error('Uma drifts from pointer after pan: '+maxOff);
 if(Math.hypot(G.cam.x-cam0.x,G.cam.y-cam0.y)>0.5)throw Error('Camera moved while dragging');
 fire('pointermove',b.x,b.y,3);fire('pointerup',b.x,b.y,3);
  // 按在马娘身上拖拽必须以触碰位置为基准平滑拉动，不得出现突变偏置与误发射
  startLevel(0);
  for(let i=0;i<200;i++)step();
  G.queue=[];
  for(const hit of [{dx:0,dy:-22,label:'head'},{dx:0,dy:14,label:'body'},{dx:-18,dy:-14,label:'left-up'}]){
    const p=w2s(SLING_REST.x+hit.dx,SLING_REST.y+hit.dy);
    fire('pointerdown',p.x,p.y,7);
    fire('pointermove',p.x-50,p.y+30,7);
    const dg=G.slingBird.drag;
    if(Math.abs(dg.x+50)>0.5||Math.abs(dg.y-30)>0.5)throw Error('Relative drag mismatch on '+hit.label+': '+dg.x+','+dg.y);
    fire('pointermove',p.x,p.y,7);
    fire('pointerup',p.x,p.y,7);
    if(G.phase!=='aim'||!G.slingBird)throw Error('Tap on '+hit.label+' fired the uma accidentally: '+G.phase);
  }
 // 真实拖拽后必须发射
 const t=w2s(SLING_REST.x,SLING_REST.y);
 fire('pointerdown',t.x,t.y,8);
 fire('pointermove',t.x-70,t.y+50,8);
 if(Math.abs(G.slingBird.drag.y-50)>0.01||Math.abs(G.slingBird.drag.x+70)>0.01)throw Error('Drag target mismatch: '+G.slingBird.drag.x.toFixed(1)+','+G.slingBird.drag.y.toFixed(1));
 fire('pointerup',t.x-70,t.y+50,8);
 if(G.phase!=='flight')throw Error('Real drag did not launch: '+G.phase);
 startLevel(0);
 for(let i=0;i<160;i++)step();
 G.phase='losing';G.loseT=0;G.uiShown=false;
 for(let i=0;i<70;i++)step();
 if(G.phase!=='ui'||G.winShown)throw Error('Lose panel did not appear: '+G.phase);
 if(document.querySelector('#lose').classList.contains('hidden'))throw Error('Lose panel stays hidden');
 for(const p of G.pigs)pushDamage(p,1e6);
 processDamage();
 for(let i=0;i<150;i++)step();
 if(!G.winShown)throw Error('Clearing all pigs did not turn the lose panel into a win');
 if(G.phase!=='ui')throw Error('Expected win ui phase: '+G.phase);
 if(!document.querySelector('#lose').classList.contains('hidden'))throw Error('Lose panel is still visible after winning');
 if(document.querySelector('#win').classList.contains('hidden'))throw Error('Win panel missing after clear');
 `,sandbox);
 for(const src of ['initial','accelerate','split','boom'])assert.ok(drawCalls.includes('media/birds/'+src+'.png'));
 for(const src of ['pig_normal','pig_hurt','King_normal','King_hurt'])assert.ok(drawCalls.includes('media/pigs/'+src+'.png'));
 assert.ok(!script.includes('function drawEye('));
 assert.ok(!script.includes('function slingWood('),'old slingshot drawing should be removed');
 const front=cutFn(script,'function drawSlingFront');
 assert.ok(front&&!front.includes('slingLimb'),'front layer must not draw wood over the uma');
 const back=cutFn(script,'function drawSlingBack');
 assert.ok(back.includes('SLING_TIP.l')&&back.includes('SLING_TIP.r'),'both forks must be drawn behind the uma');
 assert.ok(html.trimEnd().endsWith('</html>'));
 const levelCount=(script.match(/\{world:/g)||[]).length;
 console.log('PASS: syntax, 8 assets, '+levelCount+' levels (stable with new hitboxes), 8 drawImage variants, 3 skills, clear->next level (incl. out-of-bounds pig & lose-panel override), drag follows pointer (no grab offset), camera locked, no accidental tap-launch, slingshot rest lifted.');
})().catch(error=>{console.error(error);process.exitCode=1});