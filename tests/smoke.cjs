const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const drawCalls=[];
const context=new Proxy({}, {get:(_,key)=>key==='drawImage'?((image)=>drawCalls.push(image.src)):key==='createLinearGradient'?(()=>({addColorStop(){}})):(()=>{}),set:()=>true});
const elements=new Map();
function element(){return {style:{},dataset:{},textContent:'',innerHTML:'',classList:{add(){},remove(){}},addEventListener(){},appendChild(){},remove(){},querySelectorAll(){return [element(),element(),element()]},getContext(){return context}}}
const sandbox={console,Math,Map,Set,Promise,performance,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
 Matter:require('../vendor/matter.min.js'),localStorage:{getItem(){return null},setItem(){}},
 document:{querySelector(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,body:element(),addEventListener(){}},
 Image:class {set src(value){assert.ok(fs.existsSync(path.join(root,value)),value);this._src=value;queueMicrotask(()=>this.onload())}get src(){return this._src}},
 requestAnimationFrame(){},setTimeout(){},addEventListener(){}};
sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(script,sandbox);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 vm.runInContext(`
 if(Object.values(SPRITES).some(s=>!s.image))throw Error('Missing sprite');
 for(let i=0;i<6;i++){
   startLevel(i);
   for(let j=0;j<120;j++)step();
   if(G.phase!=='aim')throw Error('Level '+i+' did not reach aim: '+G.phase);
   render();
 }
 for(const type of ['red','chuck','blue','bomb'])drawBird(type,100,100,0,21,{});
 for(const type of ['n','k'])for(const hurt of [false,true])drawPig({type,hurt,r:26,body:{position:{x:200,y:200},angle:.4}});
 for(const [level,type]of [[1,'chuck'],[3,'blue'],[4,'bomb']]){
   startLevel(level);G.phase='flight';G.flock=[];
   spawnBirdBody(type,600,300,12,-4);triggerSkill();
   if(type==='blue'&&G.flock.filter(e=>!e.dead).length!==3)throw Error('Split failed');
   if(type==='chuck'&&G.flock[0].body.velocity.x<=12)throw Error('Dash failed');
   if(type==='bomb'&&!G.flock[0].dead)throw Error('Explosion failed');
 }
 `,sandbox);
 for(const src of ['initial','accelerate','split','boom'])assert.ok(drawCalls.includes('media/birds/'+src+'.png'));
 for(const src of ['pig_normal','pig_hurt','King_normal','King_hurt'])assert.ok(drawCalls.includes('media/pigs/'+src+'.png'));
 assert.ok(!script.includes('function drawEye('));
 assert.ok(html.trimEnd().endsWith('</html>'));
 console.log('PASS: syntax, 8 assets, 6 levels, 8 drawImage variants, 3 active skills.');
})().catch(error=>{console.error(error);process.exitCode=1});
