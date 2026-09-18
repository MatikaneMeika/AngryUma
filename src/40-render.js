'use strict';
/* ================= 渲染 ================= */
function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function star5(x,y,R,rot){ctx.beginPath();for(let i=0;i<5;i++){const a=rot+i*TAU/5-Math.PI/2,b=a+TAU/10;
  ctx.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R);ctx.lineTo(x+Math.cos(b)*R*.45,y+Math.sin(b)*R*.45)}ctx.closePath()}

function drawSky(th){
  const g=ctx.createLinearGradient(0,0,0,ch);
  g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);
}
function drawHillsLayer(th,layer,par){
  ctx.save();ctx.translate(G.cam.x*(1-par),0);
  ctx.fillStyle=layer===0?th.hillFar:th.hillNear;
  ctx.beginPath();
  const hills=G.scene.hills.filter(h=>h.l===layer);
  if(hills.length>0){
    ctx.moveTo(-5000,GROUND_Y+200);
    ctx.lineTo(hills[0].x-hills[0].r,GROUND_Y+30);
    for(const h of hills){
      ctx.arc(h.x,GROUND_Y+30,h.r,Math.PI,0,false);
    }
    ctx.lineTo(G.worldW+5000,GROUND_Y+30);
    ctx.lineTo(G.worldW+5000,GROUND_Y+200);
    ctx.lineTo(-5000,GROUND_Y+200);
  }
  ctx.closePath();ctx.fill();
  ctx.fillStyle=layer===0?'rgba(255,255,255,.12)':'rgba(255,255,255,.16)';
  for(const h of hills){ctx.beginPath();ctx.arc(h.x,GROUND_Y+30,h.r,Math.PI*1.15,Math.PI*1.85,false);
    ctx.arc(h.x,GROUND_Y+30+h.r*.14,h.r*.82,Math.PI*1.85,Math.PI*1.15,true);ctx.closePath();ctx.fill();}
  ctx.restore();
}
function drawCelestial(th){
  ctx.save();ctx.translate(G.cam.x*.92,0);
  const s=th.sun;const pulse=1+Math.sin(G.t*.018)*.06;
  ctx.fillStyle=s.glow;ctx.beginPath();ctx.arc(G.worldW*s.x,s.y,s.r*1.8*pulse,0,TAU);ctx.fill();
  ctx.fillStyle=s.c2||s.c;ctx.beginPath();ctx.arc(G.worldW*s.x,s.y,s.r,0,TAU);ctx.fill();
  if(th.night){
    ctx.fillStyle=th.sky[0];ctx.beginPath();ctx.arc(G.worldW*s.x-s.r*.38,s.y-s.r*.22,s.r*.86,0,TAU);ctx.fill();}
  ctx.restore();
}
function drawStars(){
  ctx.save();ctx.translate(G.cam.x*.95,0);
  for(const s of G.scene.stars){
    ctx.globalAlpha=.4+.6*Math.abs(Math.sin(G.t*s.sp+s.ph));
    ctx.fillStyle='#f5efa8';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
}
function drawMidLayer(th,par){
  ctx.save();ctx.translate(G.cam.x*(1-par),0);
  for(const m of G.scene.mid){
    ctx.save();ctx.translate(m.x,GROUND_Y+4);ctx.scale(m.s,m.s);
    if(m.t==='tree'||m.t==='bush'||m.t==='palm')ctx.rotate(Math.sin(G.t*.02+m.x*.03)*.03);
    if(m.t==='bush'){ctx.fillStyle='#54974a';
      ctx.beginPath();ctx.arc(-22,-14,20,0,TAU);ctx.arc(20,-12,22,0,TAU);ctx.arc(0,-26,24,0,TAU);ctx.fill();
      ctx.fillStyle='#6fb45f';ctx.beginPath();ctx.arc(-6,-32,11,0,TAU);ctx.fill();}
    else if(m.t==='tree'){ctx.fillStyle='#7a4a26';ctx.fillRect(-6,-58,12,60);
      ctx.fillStyle='#4f9c3e';ctx.beginPath();ctx.arc(-20,-70,22,0,TAU);ctx.arc(22,-66,20,0,TAU);ctx.arc(0,-90,26,0,TAU);ctx.fill();
      ctx.fillStyle='#66b353';ctx.beginPath();ctx.arc(-8,-96,12,0,TAU);ctx.fill();}
    else if(m.t==='cactus'){ctx.fillStyle='#4e8f4a';
      rr(-11,-86,22,88,10);ctx.fill();rr(-34,-58,14,34,7);ctx.fill();rr(-34,-58,30,13,6);ctx.fill();
      rr(20,-46,14,28,7);ctx.fill();rr(6,-46,28,13,6);ctx.fill();
      ctx.fillStyle='#6fae68';rr(-6,-84,5,70,3);ctx.fill();}
    else if(m.t==='rock'){ctx.fillStyle=th.night?'#2c3866':'#b0a184';
      ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(-16,-24);ctx.lineTo(8,-30);ctx.lineTo(28,-8);ctx.lineTo(30,0);ctx.closePath();ctx.fill();
      ctx.fillStyle=th.night?'#39477d':'#c8b795';ctx.beginPath();ctx.moveTo(-16,-24);ctx.lineTo(8,-30);ctx.lineTo(10,-14);ctx.closePath();ctx.fill();}
    else if(m.t==='castle'){ctx.fillStyle=th.hillFar;
      ctx.fillRect(-52,-96,104,98);ctx.fillRect(-70,-140,30,142);ctx.fillRect(42,-126,28,128);
      for(let i=0;i<4;i++)ctx.fillRect(-48+i*26,-110,14,16);
      ctx.beginPath();ctx.moveTo(-70,-140);ctx.lineTo(-55,-168);ctx.lineTo(-40,-140);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f0df9a';ctx.fillRect(-8,-70,10,16);ctx.fillRect(16,-56,8,12);}
    else if(m.t==='lounger'){ctx.strokeStyle='#c98b3a';ctx.lineWidth=4;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(-30,-14);ctx.lineTo(20,-14);ctx.moveTo(-24,-14);ctx.lineTo(-24,2);ctx.moveTo(16,-14);ctx.lineTo(16,2);ctx.stroke();
      ctx.fillStyle='#f2b23e';rr(-32,-24,52,12,5);ctx.fill();
      ctx.fillStyle='#e79c2c';ctx.save();ctx.translate(-30,-18);ctx.rotate(-.6);rr(-22,-6,26,11,5);ctx.fill();ctx.restore();}
    else if(m.t==='palm'){ctx.fillStyle='#b07a3c';ctx.fillRect(-5,-40,10,42);
      ctx.fillStyle='#8a5a2a';ctx.fillRect(-16,-2,32,6);
      ctx.fillStyle='#3fae5a';for(let i=0;i<6;i++){const a=-Math.PI/2+(i-2.5)*.5;ctx.save();ctx.translate(0,-40);ctx.rotate(a);ctx.beginPath();ctx.ellipse(24,0,26,7,0,0,TAU);ctx.fill();ctx.restore();}
      ctx.fillStyle='#57c472';ctx.beginPath();ctx.arc(0,-42,7,0,TAU);ctx.fill();}
    else if(m.t==='diving'){ctx.fillStyle='#9fb3bb';ctx.fillRect(-6,-70,12,70);
      ctx.fillStyle='#d7e6ec';rr(-58,-80,80,12,4);ctx.fill();
      ctx.fillStyle='#3a90a8';rr(-58,-80,80,4,2);ctx.fill();}
    else if(m.t==='buoy'){for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#ff7a5c':'#f4f4f4';ctx.beginPath();ctx.arc(-30+i*12,-8,7,0,TAU);ctx.fill();}
      ctx.strokeStyle='#c9d4d8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-38,-8);ctx.lineTo(42,-8);ctx.stroke();}
    ctx.restore();
  }
  ctx.restore();
}
function drawClouds(th){
  ctx.save();ctx.translate(G.cam.x*.8,0);ctx.fillStyle=th.cloud;
  for(const c of G.scene.clouds){const s=c.s;
    ctx.beginPath();ctx.arc(c.x,c.y,30*s,0,TAU);ctx.arc(c.x+40*s,c.y+8*s,24*s,0,TAU);
    ctx.arc(c.x-42*s,c.y+10*s,26*s,0,TAU);ctx.arc(c.x+6*s,c.y+16*s,34*s,0,TAU);ctx.fill();}
  ctx.restore();
}
function drawGround(th){
  ctx.fillStyle=th.ground;ctx.fillRect(-5000,GROUND_Y,G.worldW+10000,2500);
  if(th.pool){
    /* 游泳馆：池畔甲板瓷砖缝 + 顶部水面与随时间波动的焦散高光 */
    ctx.fillStyle=th.grass;ctx.fillRect(-5000,GROUND_Y,G.worldW+10000,34);
    ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;
    for(let x=-5000;x<G.worldW+5000;x+=64){ctx.beginPath();ctx.moveTo(x,GROUND_Y);ctx.lineTo(x,GROUND_Y+34);ctx.stroke();}
    const rn=sr(4242);
    for(let x=-5000;x<G.worldW+5000;x+=64){for(let k=0;k<2;k++){const px=x+rn()*64,py=GROUND_Y+40+rn()*160;
      ctx.fillStyle='rgba(255,255,255,.05)';ctx.beginPath();ctx.ellipse(px,py,10,4,0,0,TAU);ctx.fill();}}
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2.5;
    for(let x=-5000;x<G.worldW+5000;x+=120){ctx.beginPath();
      for(let i=0;i<=6;i++){const wx=x+i*20,wy=GROUND_Y+8+Math.sin(G.t*.05+ (x+i*20)*.05 + x*.01)*4;i?ctx.lineTo(wx,wy):ctx.moveTo(wx,wy);}ctx.stroke();}
    ctx.strokeStyle='rgba(46,163,189,.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-5000,GROUND_Y+34);ctx.lineTo(G.worldW+5000,GROUND_Y+34);ctx.stroke();
    return;
  }
  ctx.fillStyle=th.grass;ctx.fillRect(-5000,GROUND_Y,G.worldW+10000,26);
  ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(-5000,GROUND_Y,G.worldW+10000,4);
  ctx.fillStyle=th.grass2;
  for(let x=-5000;x<G.worldW+5000;x+=52){ctx.beginPath();ctx.arc(x,GROUND_Y+26,26,0,Math.PI);ctx.fill()}
  const rg=sr(777);
  for(let x=-5000;x<G.worldW+5000;x+=30){const px=x+rg()*22,py=GROUND_Y+40+rg()*70;
    ctx.fillStyle='rgba(0,0,0,.06)';ctx.beginPath();ctx.arc(px,py,2+rg()*2,0,TAU);ctx.fill();}
  for(const t of G.scene.tufts){
    const sway=Math.sin(G.t*.02+t.x*.05)*3*t.v;
    ctx.strokeStyle=th.grass2;ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(t.x,GROUND_Y+2);ctx.quadraticCurveTo(t.x-6*t.v,GROUND_Y-12*t.v,t.x-9*t.v+sway,GROUND_Y-20*t.v);
    ctx.moveTo(t.x,GROUND_Y+2);ctx.quadraticCurveTo(t.x+2,GROUND_Y-14*t.v,t.x+1+sway,GROUND_Y-24*t.v);
    ctx.moveTo(t.x,GROUND_Y+2);ctx.quadraticCurveTo(t.x+7*t.v,GROUND_Y-10*t.v,t.x+11*t.v+sway,GROUND_Y-18*t.v);
    ctx.stroke();
  }
  if(th.night){
    for(const f of G.scene.fireflies){
      ctx.globalAlpha=.3+.5*Math.abs(Math.sin(G.t*.03+f.ph));
      ctx.fillStyle='#ffe98a';ctx.beginPath();
      ctx.arc(f.x+Math.sin(G.t*.01+f.ph)*26,f.y+Math.cos(G.t*.013+f.ph)*14,2.6,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    for(const t of G.scene.torches){
      ctx.fillStyle='#5a3a1a';ctx.fillRect(t.x-4,GROUND_Y-92,8,92);
      const fl=Math.sin(G.t*.25+t.x);
      ctx.fillStyle='rgba(255,170,60,.1)';ctx.beginPath();ctx.arc(t.x,GROUND_Y-98,52+fl*5,0,TAU);ctx.fill();
      ctx.fillStyle='#ff9a3d';ctx.beginPath();ctx.arc(t.x,GROUND_Y-98,10+fl*2,0,TAU);ctx.fill();
      ctx.fillStyle='#ffd76e';ctx.beginPath();ctx.arc(t.x,GROUND_Y-95,5.5+fl*1.4,0,TAU);ctx.fill();
    }
  }
}

/* ---------- 角色贴图绘制 ---------- */
function drawBird(type,x,y,ang,r,opt){
  opt=opt||{};
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(ang);
  const img=IMAGES.birds[type];
  if(img&&img.complete&&img.naturalWidth>0){
    const size=r*2.55;
    ctx.drawImage(img,-size/2,-size/2-r*0.16,size,size);
  }else{
    ctx.fillStyle=birdColor(type);
    ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  }
  // 美浦波旁超负荷引信火花
  if(opt.fuse){
    const fx0=0,fy0=-r*1.38,ph=Math.sin(G.t*.8);
    ctx.fillStyle='#ffd76e';star5(fx0,fy0,r*.35+ph*r*.08,G.t*.3);ctx.fill();
    ctx.fillStyle='#fff';star5(fx0,fy0,r*.16,G.t*.3);ctx.fill();
  }
  ctx.restore();
}

function drawPig(ent){
  const b=ent.body,r=ent.r,hurt=ent.hurt,king=ent.type==='k';
  const lift=ent.hitR-ent.r; // 碰撞体比贴图大，绘制时把贴图落回原位（脚底仍贴地面）
  const moving=Math.hypot(b.velocity?b.velocity.x:0,b.velocity?b.velocity.y:0)>1.2;
  const bob=moving?0:Math.sin(G.t*.06+(ent.seed||0))*1.8; // 待机时轻微呼吸浮动
  ctx.save();
  ctx.translate(b.position.x,b.position.y);
  ctx.rotate(b.angle);
  const key=king?(hurt?'King_hurt':'King_normal'):(hurt?'pig_hurt':'pig_normal');
  const img=IMAGES.pigs[key];
  if(img&&img.complete&&img.naturalWidth>0){
    if(king){
      // 国王奇宝猪: bounds=(376, 34, w=569, h=565)
      const dw=r*2.52,dh=dw*(565/569);
      ctx.drawImage(img,376,34,569,565,-dw*0.49,-dh*0.58+lift+bob,dw,dh);
    }else{
      // 普通奇宝猪: bounds=(376, 158, w=569, h=441)
      const dw=r*2.52,dh=dw*(441/569);
      ctx.drawImage(img,376,158,569,441,-dw*0.49,-dh*0.52+lift+bob,dw,dh);
    }
  }else{
    ctx.fillStyle=hurt?'#e89f9f':'#f5a7a7';
    ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
    ctx.strokeStyle='#b86b6b';ctx.lineWidth=2;ctx.stroke();
  }
  ctx.restore();
}

function drawBlock(ent){
  const b=ent.body,m=matDef(ent.mat);
  ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);
  const w=ent.w,h=ent.h;
  ctx.fillStyle=m.fill;ctx.strokeStyle=m.edge;ctx.lineWidth=2.5;
  rr(-w/2,-h/2,w,h,Math.min(5,w/4,h/4));ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-w/2+4,-h/2+3);ctx.lineTo(w/2-4,-h/2+3);ctx.stroke();
  // 材质纹理
  if(ent.mat==='wood'){
    ctx.strokeStyle='rgba(122,77,38,.45)';ctx.lineWidth=2;
    const horiz=w>=h;
    for(let i=1;i<=2;i++){const t=i/3;ctx.beginPath();
      if(horiz){ctx.moveTo(-w/2+5,-h/2+h*t);ctx.lineTo(w/2-5,-h/2+h*t)}
      else{ctx.moveTo(-w/2+w*t,-h/2+5);ctx.lineTo(-w/2+w*t,h/2-5)}ctx.stroke()}
  }else if(ent.mat==='glass'){
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-w*.3,-h*.34);ctx.lineTo(-w*.1,-h*.1);ctx.stroke();
    ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.16,-h*.34);ctx.lineTo(w*.14,h*.02);ctx.stroke();
  }else{
    const rn=sr(ent.seed);ctx.fillStyle='rgba(90,90,84,.3)';
    for(let i=0;i<3;i++){ctx.beginPath();
      ctx.ellipse((rn()-.5)*w*.7,(rn()-.5)*h*.7,Math.min(5,w*.12),Math.min(4,h*.12),rn()*3,0,TAU);ctx.fill()}
  }
  // 裂纹
  const ratio=ent.hp/ent.maxHp;
  if(ratio<.7){
    const rn=sr(ent.seed+7);
    ctx.strokeStyle=ent.mat==='glass'?'rgba(255,255,255,.85)':'rgba(30,20,10,.45)';ctx.lineWidth=1.8;ctx.lineCap='round';
    const n=ratio<.35?2:1;
    for(let c=0;c<n;c++){
      let cx=(rn()-.5)*w*.6,cy=(rn()-.5)*h*.6;
      ctx.beginPath();ctx.moveTo(cx,cy);
      for(let s2=0;s2<3;s2++){cx+=(rn()-.5)*w*.5;cy+=(rn()-.5)*h*.5;ctx.lineTo(clamp(cx,-w/2,w/2),clamp(cy,-h/2,h/2))}
      ctx.stroke();
    }
  }
  if(REG.skins[ent.mat])REG.skins[ent.mat](ent); // 材质皮肤接缝：画完底框后回调
  ctx.restore();
}

/* ---------- 弹弓 ---------- */
/* 木叉顶端两个绑皮筋的位置（左右各一，马娘正好落在中间的口袋里） */
const SLING_TIP={l:{x:SLING_REST.x-32,y:SLING_REST.y},r:{x:SLING_REST.x+32,y:SLING_REST.y}};
const SLING_KNEE=GROUND_Y-56-SLING.lift;
function slingLimb(x1,y1,x2,y2,w){
  ctx.lineCap='round';
  ctx.strokeStyle='#5a3416';ctx.lineWidth=w+4;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.strokeStyle='#8a5a2b';ctx.lineWidth=w;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.strokeStyle='rgba(255,246,225,.22)';ctx.lineWidth=Math.max(2,w*.26);
  ctx.beginPath();ctx.moveTo(x1-w*.24,y1);ctx.lineTo(x2-w*.24,y2);ctx.stroke();
}
function bandPoint(){
  if(G.slingBird){
    if(G.slingBird.drag){
      const d=G.slingBird.drag;
      return{x:SLING_REST.x+d.x,y:SLING_REST.y+d.y,taut:true};
    }
    // 马娘静坐在弹弓上时，皮兜紧密包裹马娘身后，皮筋两端连接不脱节下坠
    return{x:SLING_REST.x,y:SLING_REST.y+2,taut:true};
  }
  if(G.slingSnap>0&&G.slingRel){
    return{x:lerp(SLING_REST.x,G.slingRel.x,G.slingSnap*.45),y:lerp(SLING_REST.y,G.slingRel.y,G.slingSnap*.45),taut:true};
  }
  return null;
}
/* 后层：木架（立柱 + 左右叉）与后侧皮筋、皮兜，全部画在马娘后面 */
function drawSlingBack(){
  slingLimb(SLING.x,GROUND_Y+16,SLING.x,SLING_KNEE,24);
  slingLimb(SLING.x-2,SLING_KNEE+6,SLING_TIP.l.x,SLING_TIP.l.y,15);
  slingLimb(SLING.x+2,SLING_KNEE+6,SLING_TIP.r.x,SLING_TIP.r.y,15);
  const bp=bandPoint();
  if(bp){
    ctx.strokeStyle='#3b2214';ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(SLING_TIP.l.x,SLING_TIP.l.y);ctx.lineTo(bp.x-2,bp.y+2);ctx.stroke();
    ctx.save();
    ctx.translate(bp.x,bp.y+3);ctx.rotate(Math.atan2(SLING_REST.y-bp.y,SLING_REST.x-bp.x)+Math.PI/2);
    ctx.fillStyle='#4a2a18';rr(-15,-14,30,28,7);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.22)';rr(-15,-14,30,9,6);ctx.fill();
    ctx.restore();
  }else{
    // 空载时的皮兜（自然垂在两个叉中间）
    ctx.save();ctx.translate(SLING_REST.x,SLING_REST.y+30);
    ctx.fillStyle='#4a2a18';rr(-14,-13,28,26,7);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.22)';rr(-14,-13,28,8,6);ctx.fill();
    ctx.restore();
  }
}
/* 前层：只画前侧皮筋，避免木叉/皮筋挡住马娘 */
function drawSlingFront(){
  const bp=bandPoint();
  ctx.lineCap='round';
  if(bp){
    ctx.strokeStyle='#2b160c';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(SLING_TIP.r.x,SLING_TIP.r.y);ctx.lineTo(bp.x+2,bp.y+2);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(SLING_TIP.r.x,SLING_TIP.r.y);ctx.lineTo(bp.x+2,bp.y+2);ctx.stroke();
  }else{
    ctx.strokeStyle='#2b160c';ctx.lineWidth=5.5;
    ctx.beginPath();ctx.moveTo(SLING_TIP.l.x,SLING_TIP.l.y);
    ctx.quadraticCurveTo(SLING_REST.x,SLING_REST.y+40,SLING_TIP.r.x,SLING_TIP.r.y);ctx.stroke();
  }
}

/* ---------- 游戏世界绘制 ---------- */
function queuePos(i){return{x:200-i*58,y:GROUND_Y}}
function drawGame(){
  // 历史轨迹：渐隐速度线带 + 圆点
  if(G.dots.length){
    ctx.lineCap='round';
    for(let i=1;i<G.dots.length;i++){
      const a=G.dots[i-1],b=G.dots[i],t=i/G.dots.length;
      ctx.strokeStyle=`rgba(255,255,255,${.12+.5*t})`;ctx.lineWidth=1+3*t;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    for(let i=0;i<G.dots.length;i++){const d=G.dots[i],t=i/G.dots.length;
      ctx.globalAlpha=.35+.55*t;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(d.x,d.y,2.4+2.6*t,0,TAU);ctx.fill();}
    ctx.globalAlpha=1;
  }
  for(const b of G.blocks)if(!b.dead)drawBlock(b);
  for(const p of G.pigs)if(!p.dead)drawPig(p);
  for(const pr of G.props){const T=REG.propTypes[pr.type];if(T&&T.draw)T.draw(pr)} // 机关绘制接缝
  drawSlingBack();
  // 飞行中的马娘
  for(const e of G.flock)if(!e.dead){
    const b=e.body;
    drawBird(e.type,b.position.x,b.position.y,b.angle,e.r,{fuse:e.type==='bomb'&&e.fuse>=0});
  }
  // 弹弓上的马娘
  if(G.slingBird){
    const sb=G.slingBird;
    let x=SLING_REST.x,y=SLING_REST.y,ang=Math.sin(G.t*.05)*.05;
    if(sb.drag){
      x=SLING_REST.x+sb.drag.x;y=SLING_REST.y+sb.drag.y;
      ang=Math.atan2(SLING_REST.y-y,SLING_REST.x-x);
    }
    drawBird(sb.type,x,y,ang,BIRDS[sb.type].r);
  }
  drawSlingFront();
  // 等待队列中的马娘
  for(let i=0;i<G.queue.length;i++){
    const t=G.queue[i],p=queuePos(i),bob=Math.sin(G.t*.07+i*1.8)*3;
    drawBird(t,p.x,p.y-BIRDS[t].r-bob,0,BIRDS[t].r);
  }
  // 装填跳跃动画
  if(G.hop){
    const hp=G.hop,t=Math.min(1,hp.t);
    const x=lerp(hp.fx,SLING_REST.x,t),y=lerp(hp.fy,SLING_REST.y,t)-Math.sin(t*Math.PI)*95;
    drawBird(hp.type,x,y,0,BIRDS[hp.type].r);
  }
  drawParticlesWorld();
  // 分数浮字
  for(const f of G.floaters){
    ctx.globalAlpha=1-f.t/1.1;
    ctx.font=`${28}px 'ZCOOL KuaiLe',sans-serif`;ctx.textAlign='center';
    ctx.lineWidth=5;ctx.strokeStyle='rgba(40,25,5,.9)';ctx.strokeText(f.txt,f.x,f.y-f.t*55);
    ctx.fillStyle='#fff';ctx.fillText(f.txt,f.x,f.y-f.t*55);
    ctx.globalAlpha=1;
  }
  // 第一关教学手势
  if(G.state==='playing'&&G.level===0&&G.phase==='aim'&&!G.everLaunched&&!G.slingBird?.drag){
    const t=(G.t%110)/110,e=t<.5?t*2:(1-t)*2,ee=e*e*(3-2*e);
    const hx=SLING_REST.x-8-ee*72,hy=SLING_REST.y+6+ee*52;
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2.5;ctx.setLineDash([7,7]);
    ctx.beginPath();ctx.moveTo(SLING_REST.x-4,SLING_REST.y+4);ctx.lineTo(SLING_REST.x-76,SLING_REST.y+56);ctx.stroke();ctx.setLineDash([]);
    ctx.globalAlpha=.9;
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(hx,hy,20,0,TAU);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hx,hy,11,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(60,40,20,.5)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#f7a521';ctx.beginPath();ctx.arc(hx,hy,4.5,0,TAU);ctx.fill();
    ctx.globalAlpha=1;
  }
  /* 道具瞄准阶段覆盖层（预测线等）——注册表接缝 */
  if(G.phase==='aim')for(const id in REG.items){const it=REG.items[id];if(it.onAimDraw)it.onAimDraw()}
}
function drawParticlesWorld(){
  for(const p of G.particles){
    const k=p.t/p.life,al=1-k;
    if(p.kind==='shard'){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=al;
      ctx.fillStyle=p.col;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.7);ctx.restore();
    }else if(p.kind==='smoke'){
      ctx.globalAlpha=.4*al;ctx.fillStyle='#d8d2c4';
      ctx.beginPath();ctx.arc(p.x,p.y,p.s*(1+k*1.6),0,TAU);ctx.fill();ctx.globalAlpha=1;
    }else if(p.kind==='spark'){
      ctx.globalAlpha=al;ctx.strokeStyle='#ffd76e';ctx.lineWidth=2.5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*2.2,p.y-p.vy*2.2);ctx.stroke();ctx.globalAlpha=1;
    }else if(p.kind==='feather'){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot+Math.sin(p.t*5)*.6);ctx.globalAlpha=al;
      ctx.fillStyle=p.col;ctx.beginPath();ctx.ellipse(0,0,p.s*.8,p.s*.35,0,0,TAU);ctx.fill();ctx.restore();
    }else if(p.kind==='star'){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=al;
      ctx.fillStyle='#ffd53e';star5(0,0,p.s*(1-k*.4),0);ctx.fill();ctx.restore();
    }else if(p.kind==='ring'){
      ctx.globalAlpha=al;ctx.strokeStyle='rgba(255,235,180,.9)';ctx.lineWidth=4*al+1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.s+k*160,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    }else{
      ctx.globalAlpha=.6*al;ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(p.x,p.y,p.s*(1+k),0,TAU);ctx.fill();ctx.globalAlpha=1;
    }
  }
}
function drawMenuScene(){
  drawSlingBack();
  drawBird('red',SLING_REST.x,SLING_REST.y,0,24);
  drawSlingFront();
  const q=['chuck','blue','bomb'];
  for(let i=0;i<q.length;i++){
    const bob=Math.sin(G.t*.06+i*1.7)*3;
    drawBird(q[i],165-i*60,GROUND_Y-BIRDS[q[i]].r-bob,0,BIRDS[q[i]].r);
  }
  drawParticlesWorld();
}
function render(){
  const th=THEMES[G.state==='menu'||G.state==='select'?0:G.theme];
  drawSky(th);
  if(th.night)drawStars();
  drawCelestial(th);
  ctx.save();
  const sx=G.shake>0.4?rand(-G.shake,G.shake):0,sy=G.shake>0.4?rand(-G.shake,G.shake):0;
  ctx.translate(cw/2,ch/2);ctx.scale(G.cam.z,G.cam.z);ctx.translate(-G.cam.x+sx,-G.cam.y+sy);
  drawClouds(th);
  drawHillsLayer(th,0,.12);
  drawHillsLayer(th,1,.28);
  drawMidLayer(th,.5);
  drawGround(th);
  if(G.state==='menu'||G.state==='select')drawMenuScene();
  else if(G.state==='playing'||G.state==='paused')drawGame();
  ctx.restore();
  if(G.flash>0){ctx.fillStyle=`rgba(255,250,235,${G.flash})`;ctx.fillRect(0,0,cw,ch)}
  // HUD 分数滚动
  if(G.state==='playing'){
    G.dispScore+=(G.score-G.dispScore)*.18;
    if(Math.abs(G.score-G.dispScore)<1)G.dispScore=G.score;
    const el=$('#scoreNum'),v=Math.round(G.dispScore);
    if(el.textContent!=String(v))el.textContent=v;
  }
}
