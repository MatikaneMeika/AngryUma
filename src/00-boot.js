'use strict';
if(!window.Matter){
  const d=document.createElement('div');d.id='err';d.textContent='物理引擎加载失败，请检查网络后刷新页面。';document.body.appendChild(d);
  throw new Error('Matter.js missing');
}
/* ================= 基础工具 ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const dist=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
const TAU=Math.PI*2;
function sr(seed){let s=seed*7919+13;return()=>{s=(s*9301+49297)%233280;return s/233280}}
const {Engine,Bodies,Body,Composite,Constraint,Events}=Matter;

/* ================= 资源预加载管理器 ================= */
const ASSET_SOURCES={
  birds:{
    red:'media/birds/initial.png',     // 东海帝王
    chuck:'media/birds/accelerate.png',// 米浴
    blue:'media/birds/split.png',      // 优秀素质 (内恰)
    bomb:'media/birds/boom.png'        // 美浦波旁
  },
  pigs:{
    pig_normal:'media/pigs/pig_normal.png', // 菱钻奇宝
    pig_hurt:'media/pigs/pig_hurt.png',
    King_normal:'media/pigs/King_normal.png',
    King_hurt:'media/pigs/King_hurt.png'
  }
};
const IMAGES={birds:{},pigs:{}};
function preloadAssets(){
  for(const[k,src]of Object.entries(ASSET_SOURCES.birds)){
    const img=new Image();img.src=src;IMAGES.birds[k]=img;
  }
  for(const[k,src]of Object.entries(ASSET_SOURCES.pigs)){
    const img=new Image();img.src=src;IMAGES.pigs[k]=img;
  }
}
preloadAssets();

/* ================= 存档 ================= */
const SAVE_KEY='ab_html_save_v1';
let save;
try{save=JSON.parse(localStorage.getItem(SAVE_KEY))||{}}catch(e){save={}}
save.stars=Array.isArray(save.stars)?save.stars:[0,0,0,0,0,0];
save.unlocked=save.unlocked||1;
save.sound=save.sound!==false;
save.seenSkill=save.seenSkill||{};
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}

/* ================= 音效（Web Audio 合成） ================= */
const AU={ctx:null,master:null,noiseBuf:null,last:{},
  init(){if(this.ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.5;
    try{const comp=this.ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=24;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.25;this.master.connect(comp);comp.connect(this.ctx.destination);}
    catch(e){this.master.connect(this.ctx.destination);}
    const n=this.ctx.sampleRate,b=this.ctx.createBuffer(1,n,n),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.noiseBuf=b;},
  resume(){this.init();if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();},
  on(){return save.sound},
  tone(f0,f1,dur,type,vol,dl){if(!this.on()||!this.ctx)return;const t=this.ctx.currentTime+(dl||0);
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(f1,1),t+dur);
    g.gain.setValueAtTime(vol||.3,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.03);},
  noise(dur,vol,ft,f0,f1,dl){if(!this.on()||!this.ctx)return;const t=this.ctx.currentTime+(dl||0);
    const s=this.ctx.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;
    const f=this.ctx.createBiquadFilter();f.type=ft||'lowpass';f.frequency.setValueAtTime(f0||800,t);
    if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(f1,20),t+dur);
    const g=this.ctx.createGain();g.gain.setValueAtTime(vol||.3,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur+.03);}
};
function sfx(name,arg){if(!AU.on()||!AU.ctx)return;const now=performance.now();if(AU.last[name]&&now-AU.last[name]<75)return;AU.last[name]=now;
  const d=(f)=>f*(1+(Math.random()-.5)*.08); // ±4% 音高随机化，避免机关枪式重复感
  switch(name){
    case'click':AU.tone(d(900),d(480),.07,'square',.14);break;
    case'stretch':AU.tone(d(140+arg*2),d(150+arg*2.2),.045,'square',.05);break;
    case'launch':AU.noise(.24,.24,'highpass',500,2800);AU.tone(d(260),d(920),.22,'sine',.2);AU.tone(d(520),d(1200),.14,'triangle',.08,.02);break;
    case'hop':AU.tone(d(420),d(800),.1,'sine',.16);break;
    case'skill':AU.tone(d(500),d(1550),.26,'sawtooth',.14);AU.noise(.22,.14,'bandpass',1200,2600);break;
    case'split':for(let i=0;i<3;i++)AU.tone(d(560+i*170),d(820+i*170),.06,'square',.13,i*.05);break;
    case'boom':AU.noise(.85,.85,'lowpass',1200,70);AU.tone(150,28,.72,'sine',.6);AU.tone(80,20,.5,'triangle',.4);AU.noise(.28,.32,'highpass',2200,500);break;
    case'thudW':AU.tone(d(150),d(66),.12,'sine',.3);AU.noise(.09,.16,'lowpass',520,180);break;
    case'thudG':AU.tone(d(2100),d(1500),.06,'triangle',.12);AU.tone(d(2760),d(2100),.05,'triangle',.08,.03);break;
    case'thudS':AU.tone(d(92),d(42),.16,'sine',.38);AU.noise(.05,.12,'highpass',1800,900);break;
    case'brkW':AU.noise(.24,.34,'lowpass',820,240);AU.tone(d(180),d(70),.14,'triangle',.14);break;
    case'brkG':AU.noise(.3,.3,'highpass',2600,1300);AU.tone(d(3200),d(1500),.14,'triangle',.12);AU.tone(d(4100),d(2200),.08,'sine',.06,.03);break;
    case'brkS':AU.noise(.36,.44,'lowpass',380,110);AU.tone(d(72),d(36),.32,'sine',.34);break;
    case'pigHit':AU.tone(d(300),d(175),.12,'sawtooth',.11);break;
    case'pigDie':AU.tone(d(640),d(90),.3,'square',.18);AU.noise(.14,.18,'bandpass',1400,650);AU.tone(d(320),d(120),.16,'triangle',.1,.02);break;
    case'star':AU.tone(880,1380,.16,'triangle',.2);AU.tone(1320,1760,.14,'sine',.1,.05);break;
    case'win':[523,659,784,1046,1318].forEach((f,i)=>{AU.tone(f,f,.2,'triangle',.2,i*.12);AU.tone(f*2,f*2,.12,'sine',.05,i*.12);});break;
    case'lose':AU.tone(330,300,.28,'sawtooth',.13);AU.tone(240,150,.5,'sawtooth',.12,.26);AU.tone(120,80,.6,'sine',.1,.26);break;
    case'pop':AU.tone(d(520),d(200),.09,'sine',.11);break;
  }}
function sfxT(name){const n=performance.now();if(AU.last._g&&n-AU.last._g<80)return;AU.last._g=n;sfx(name);}
