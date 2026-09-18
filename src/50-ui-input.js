'use strict';
/* ================= 输入 ================= */
function toWorld(px,py){
  const rect=cv.getBoundingClientRect();
  const rx=px-rect.left,ry=py-rect.top;
  return{
    x:(rx-cw/2)/G.cam.z+G.cam.x,
    y:(ry-ch/2)/G.cam.z+G.cam.y
  };
}
let ptr={down:false,id:-1,mode:'',lx:0,ly:0,sx:0,sy:0,t0:0,lastStretch:0};
cv.addEventListener('pointerdown',e=>{
  AU.resume();
  if(G.state!=='playing')return;
  if(G.phase==='intro'){
    G.introT=99;
    const aim=getAimTarget();
    G.cam.x=aim.tx;G.cam.y=aim.ty;
    return;
  }
  if(ptr.down)return;
  const w=toWorld(e.clientX,e.clientY);
  ptr={down:true,id:e.pointerId,mode:'pan',lx:e.clientX,ly:e.clientY,sx:e.clientX,sy:e.clientY,t0:performance.now(),lastStretch:0,w0:{x:w.x,y:w.y}};
  // 如果马娘还在跳跃就位过程中，点击弹弓区域立即让马娘就位准备拉弓
  if(G.phase==='loading'&&G.hop&&dist(w.x,w.y,SLING_REST.x,SLING_REST.y)<150){
    G.slingBird={type:G.hop.type,x:SLING_REST.x,y:SLING_REST.y,drag:{x:0,y:0}};
    G.hop=null;G.phase='aim';updateHint();
  }
  if(G.phase==='aim'&&G.slingBird&&dist(w.x,w.y,SLING_REST.x,SLING_REST.y)<150){
    ptr.mode='sling';
    G.slingBird.drag={x:0,y:0};
  }
  try{cv.setPointerCapture(e.pointerId)}catch(err){}
});
cv.addEventListener('pointermove',e=>{
  if(!ptr.down||e.pointerId!==ptr.id)return;
  if(ptr.mode==='sling'&&G.slingBird){
    const w=toWorld(e.clientX,e.clientY);
    // 相对拉弓位移：严格基于触碰原点计算拉伸量，彻底消除点击时马娘突变下坠和位置偏移
    let dx=w.x-ptr.w0.x,dy=w.y-ptr.w0.y;
    if(dx>15)dx=15; // 限制向前推弹弓
    const d=Math.hypot(dx,dy);
    if(d>SLING.max){dx*=SLING.max/d;dy*=SLING.max/d}
    G.slingBird.drag={x:dx,y:dy};
    const st=Math.hypot(dx,dy);
    if(Math.abs(st-ptr.lastStretch)>12){ptr.lastStretch=st;sfx('stretch',st)}
  }else{
    const dx=(e.clientX-ptr.lx)/G.cam.z,dy=(e.clientY-ptr.ly)/G.cam.z;
    G.cam.x-=dx;G.cam.y-=dy;G.userPanT=75; // 约 1.2 秒后平滑复位
    clampCam();
  }
  ptr.lx=e.clientX;ptr.ly=e.clientY;
});
function pointerEnd(e){
  if(!ptr.down||e.pointerId!==ptr.id)return;
  const wasSling=ptr.mode==='sling';
  ptr.down=false;ptr.mode='';
  if(wasSling&&G.slingBird){
    // 取消判定：指针实际位移与拉弓距离都太小就当作"点了一下"，平滑还原，避免误发射
    const d=G.slingBird.drag?Math.hypot(G.slingBird.drag.x,G.slingBird.drag.y):0;
    if(d<16){
      G.slingBird.drag=null;
    }else{
      const p={x:SLING_REST.x+G.slingBird.drag.x,y:SLING_REST.y+G.slingBird.drag.y};
      launch(p,-G.slingBird.drag.x*SLING.k,-G.slingBird.drag.y*SLING.k);
    }
  }else{
    // 轻点释放技能
    const dt=performance.now()-ptr.t0;
    const mv=dist(e.clientX,e.clientY,ptr.sx,ptr.sy);
    if(G.phase==='flight'&&dt<320&&mv<12)triggerSkill();
    // 平移视口结束后立刻让镜头归位，避免镜头缓慢平移把马娘从手底下带走
    G.userPanT=0;
  }
}
cv.addEventListener('pointerup',pointerEnd);
cv.addEventListener('pointercancel',pointerEnd);
cv.addEventListener('wheel',e=>{
  e.preventDefault();
  G.userZoom=clamp(G.userZoom*(e.deltaY>0?.92:1.08),.75,1.5);
  clampCam();
},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerdown',()=>AU.resume(),{once:true});

/* ================= UI ================= */
const ICONS={
  pause:'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  replay:'<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/></svg>',
  sndOn:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1c2.9.9 5 3.5 5 6.7s-2.1 5.8-5 6.7v2.1c4-1 7-4.6 7-8.8s-3-7.8-7-8.8z"/></svg>',
  sndOff:'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm18.5 3l2-2-1.4-1.4-2 2-2-2L16.7 10l2 2-2 2 1.4 1.4 2-2 2 2 1.4-1.4-2-2z"/></svg>',
  next:'<svg viewBox="0 0 24 24"><path d="M6 5l7 7-7 7zM13 5l7 7-7 7z"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M18 5l-7 7 7 7zM11 5l-7 7 7 7z"/></svg>'
};
const WORLD_BADGES=[
 `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#bfe9fa"/><circle cx="58" cy="18" r="11" fill="#ffdf6b"/><ellipse cx="24" cy="22" rx="13" ry="7" fill="#fff"/><ellipse cx="70" cy="40" rx="10" ry="6" fill="#fff"/><path d="M0 52 Q20 40 40 52 T80 52 V80 H0z" fill="#8fd06e"/><path d="M0 62 Q20 52 40 62 T80 62 V80 H0z" fill="#6fbf44"/></svg>`,
 `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#ffd9a0"/><circle cx="40" cy="34" r="15" fill="#ff8a3d"/><path d="M0 50 Q20 38 40 50 T80 50 V80 H0z" fill="#e5b478"/><path d="M0 62 Q20 52 40 62 T80 62 V80 H0z" fill="#d9a45f"/><rect x="16" y="34" width="6" height="18" rx="3" fill="#4e8f4a"/><rect x="8" y="38" width="6" height="10" rx="3" fill="#4e8f4a"/></svg>`,
 `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#1b2547"/><circle cx="58" cy="20" r="10" fill="#f2e6c4"/><circle cx="53" cy="17" r="8.5" fill="#1b2547"/><circle cx="18" cy="14" r="1.6" fill="#f5efa8"/><circle cx="30" cy="26" r="1.3" fill="#f5efa8"/><circle cx="68" cy="40" r="1.5" fill="#f5efa8"/><path d="M0 58 L0 46 14 46 14 38 22 38 22 46 40 46 40 40 48 40 48 46 62 46 62 36 70 36 70 46 80 46 80 58z" fill="#2a3562"/><rect width="80" height="22" y="58" fill="#232f5c"/><rect x="26" y="49" width="5" height="7" fill="#f0df9a"/></svg>`,
 `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#cdeefb"/><rect x="6" y="30" width="68" height="44" rx="6" fill="#4bbfd6"/><path d="M6 44 Q23 38 40 44 T74 44 V70 H6z" fill="#2ea3bd"/><path d="M6 54 Q23 48 40 54 T74 54 V70 H6z" fill="#5fd0e4" opacity=".7"/><rect x="6" y="30" width="68" height="6" fill="#f4f4f4"/><g fill="#ff7a5c"><circle cx="20" cy="33" r="3"/><circle cx="40" cy="33" r="3"/><circle cx="60" cy="33" r="3"/></g><circle cx="60" cy="16" r="9" fill="#ffdf6b"/></svg>`];
const STAR_PATH='M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8-6.1-3.6-6.1 3.6 1.5-6.8L2.2 8.9l6.9-.6z';
function hidePanels(){['#pause','#win','#lose'].forEach(s=>$(s).classList.add('hidden'))}
function setSoundIcons(){const h=save.sound?ICONS.sndOn:ICONS.sndOff;$('#bSoundMenu').innerHTML=h;$('#bSoundP').innerHTML=h}
function toggleSound(){save.sound=!save.sound;persist();setSoundIcons();sfx('click')}
function showMenu(){
  G.state='menu';hidePanels();
  $('#menu').classList.remove('hidden');$('#select').classList.add('hidden');$('#hud').classList.add('hidden');
  createScenery(0,1900);
}
function showSelect(){
  G.state='select';hidePanels();
  $('#menu').classList.add('hidden');$('#select').classList.remove('hidden');$('#hud').classList.add('hidden');
  createScenery(0,1900);renderSelect();
}
function renderSelect(){
  const list=$('#worldList');list.innerHTML='';
  const meta=[{n:'特雷森草地',s:'初次遭遇摸鱼奇宝'},{n:'黄昏训练沙地',s:'奇宝国王现身沙丘'},{n:'奇宝夜间主场',s:'决战之夜，灯火通明'},{n:'特雷森游泳馆',s:'碧水之畔，终局对决'}];
  for(let w=0;w<WORLDS;w++){
    const row=document.createElement('div');row.className='wrow w'+w;
    let lv='';
    for(let k=0;k<PER;k++){
      const idx=w*PER+k,unlocked=idx<save.unlocked,st=save.stars[idx];
      const stars=[0,1,2].map(i=>`<svg viewBox="0 0 24 24" class="${i<st?'on':''}"><path d="${STAR_PATH}"/></svg>`).join('');
      lv+=`<div class="lvl ${unlocked?'':'locked'} ${idx===save.unlocked-1&&unlocked?'fresh':''}" data-lv="${idx}">
        <div class="circ">${unlocked?idx+1:'<svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H5v12h14V10h-2V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>'}</div>
        <div class="st">${stars}</div></div>`;
    }
    row.innerHTML=`<div class="wbadge">${WORLD_BADGES[w]}</div>
      <div class="winfo"><b>${meta[w].n}</b><span>${meta[w].s}</span></div><div class="lvls">${lv}</div>`;
    list.appendChild(row);
  }
  list.querySelectorAll('.lvl:not(.locked)').forEach(el=>{
    el.addEventListener('click',()=>{sfx('click');startLevel(+el.dataset.lv)});
  });
}
/* ================= 道具栏（注册表驱动，REG.items 为空时保持隐藏） ================= */
function renderItemBar(){
  const bar=$('#itemBar');if(!bar)return;
  const ids=Object.keys(REG.items);
  if(!ids.length){bar.classList.add('hidden');bar.innerHTML='';return}
  bar.classList.remove('hidden');bar.innerHTML='';
  for(const id of ids){
    const def=REG.items[id],left=G.items[id]|0;
    const btn=document.createElement('button');
    btn.className='itemBtn'+(G.armedItem===id?' armed':'');
    btn.dataset.item=id;
    btn.title=def.name||id;
    btn.innerHTML=(def.icon||'')+'<span class="cnt">'+left+'</span>';
    const usable=left>0&&def.enabled!==false;
    if(!usable)btn.disabled=true;
    btn.addEventListener('click',()=>{
      if(left>0&&def.enabled!==false&&def.arm){sfx('click');def.arm();renderItemBar()}
    });
    bar.appendChild(btn);
  }
}
function startLevel(i){
  hidePanels();
  $('#menu').classList.add('hidden');$('#select').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  G.state='playing';
  createLevel(i);
}
function restartLevel(){sfx('click');hidePanels();$('#hud').classList.remove('hidden');G.state='playing';createLevel(G.level)}
function showTag(txt){const t=$('#tag');t.textContent=txt;t.classList.remove('go');void t.offsetWidth;t.classList.add('go')}
function updateHint(){
  const h=$('#hint');let msg='';
  if(G.state==='playing'){
    if(G.level===0&&!G.everLaunched&&G.phase==='aim')msg='拖住马娘向后拉，松手发射！';
    else{
      const t=G.slingBird?G.slingBird.type:(G.flock.find(e=>!e.dead&&!e.skillUsed)||{}).type;
      if(t&&t!=='red'&&!save.seenSkill[t]){
        msg=t==='chuck'?'米浴：点击屏幕加速冲刺！':t==='blue'?'内恰：点击屏幕分裂成三只！':'波旁：点击屏幕启动超负荷引爆！';
      }
    }
  }
  if(msg){h.textContent=msg;h.classList.add('on')}else h.classList.remove('on');
}
/* 按钮绑定 */
const on=(sel,fn)=>{const el=document.querySelector(sel);if(el)el.addEventListener('click',fn);else console.warn('缺少元素:',sel)};
on('#bPlay',()=>{sfx('click');showSelect()});
on('#bBackMenu',()=>{sfx('click');showMenu()});
on('#bPause',()=>{sfx('click');if(G.state==='playing'){G.state='paused';hidePanels();$('#pause').classList.remove('hidden')}});
on('#bResume',()=>{sfx('click');G.state='playing';hidePanels()});
on('#bRetry',()=>{if(G.state==='playing'||G.state==='paused')restartLevel()});
on('#bRetryP',()=>restartLevel());
on('#bWinRetry',()=>restartLevel());
on('#bLoseRetry',()=>restartLevel());
on('#bSelectP',()=>{sfx('click');showSelect()});
on('#bWinMenu',()=>{sfx('click');showSelect()});
on('#bLoseMenu',()=>{sfx('click');showSelect()});
on('#bNext',()=>{sfx('click');if(G.level<LAST)startLevel(G.level+1);else showSelect()});
on('#bSoundMenu',toggleSound);
on('#bSoundP',toggleSound);
/* 图标注入 */
$('#bPause').innerHTML=ICONS.pause;$('#bRetry').innerHTML=ICONS.replay;
$('#bBackMenu').innerHTML=ICONS.back;$('#bWinMenu').innerHTML=ICONS.home;
$('#bWinRetry').innerHTML=ICONS.replay;$('#bLoseMenu').innerHTML=ICONS.home;
setSoundIcons();

/* ================= 启动 ================= */
function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);
  cw=innerWidth;ch=innerHeight;
  cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
  cv.style.width=cw+'px';
  cv.style.height=ch+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',()=>{
  resize();
  G.cam.z=camZoom();
  const aim=getAimTarget();
  if(G.phase==='aim'||G.phase==='loading'||G.phase==='intro')G.cam.y=aim.ty;
  clampCam();
});
resize();
createScenery(0,1900);
G.cam.z=camZoom();
const aim0=getAimTarget();
G.cam.x=SLING.x+(cw/G.cam.z)*.18;
G.cam.y=aim0.ty;
clampCam();
let last=performance.now(),acc=0;
function loop(t){
  acc+=Math.min(t-last,60);last=t;
  let n=0;
  while(acc>=1000/60&&n<3){step();acc-=1000/60;n++}
  if(n===3)acc=0;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
try{
  const params=new URLSearchParams(window.location.search);
  if(params.has('lv'))startLevel(parseInt(params.get('lv'))||0);
}catch(e){}
