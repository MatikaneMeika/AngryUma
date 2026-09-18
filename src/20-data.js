'use strict';
/* ================= 常量定义 ================= */
const GROUND_Y=560;
const SLING={x:300,anchorY:445,lift:10,max:95,k:0.235};
/* 马娘在弹弓上的实际落点：正处于弹弓两个木叉连线之间 */
const SLING_REST={x:SLING.x,y:SLING.anchorY-SLING.lift};
const MATS={
  wood:{hp:90,density:.0022,fill:'#d29a5b',edge:'#8a5a2b',score:500},
  glass:{hp:45,density:.0016,fill:'rgba(176,226,248,.55)',edge:'rgba(110,175,208,.95)',score:500},
  stone:{hp:200,density:.0035,fill:'#b7b7b0',edge:'#76766e',score:500}
};
/* r=贴图美术半径（只影响绘制）；hit=碰撞体积半径（贴合贴图视觉轮廓，密度按半径平方反比折算，质量保持不变） */
const BIRDS={
  red:{r:22,hit:23,density:.0042,power:1,matMult:{wood:1,glass:1,stone:.8},name:'帝王'},
  chuck:{r:21,hit:23,density:.0042,power:1,matMult:{wood:3,glass:1,stone:.5},name:'米浴'},
  blue:{r:16,hit:18,density:.0038,power:.55,matMult:{wood:.6,glass:3,stone:.3},name:'内恰'},
  bomb:{r:25,hit:26,density:.0055,power:1.15,matMult:{wood:1.5,glass:1.2,stone:2.2},name:'波旁'}
};
/* 奇宝猪的贴图/碰撞体积（调整血量使碎裂坍塌积木可有效砸碎奇宝，彻底杜绝死活判定bug） */
const PIG={r:26,hit:29,density:.0022,hp:36,king:{r:50,hit:57,density:.002,hp:130}};
const THEMES=[
  {name:'特雷森草地',sky:['#79cdf4','#eaf8fd'],hillFar:'#c4e9b0',hillNear:'#a2d98b',ground:'#8a5a33',grass:'#6fbf44',grass2:'#57a835',cloud:'rgba(255,255,255,.92)',mid:'bush',sun:{x:.78,y:-210,r:56,c:'#ffdf6b',glow:'rgba(255,235,150,.28)'}},
  {name:'黄昏训练沙地',sky:['#f29a52','#ffe4ad'],hillFar:'#f0cd98',hillNear:'#e5b478',ground:'#c08345',grass:'#dca75f',grass2:'#c78c42',cloud:'rgba(255,240,215,.75)',mid:'cactus',sun:{x:.28,y:20,r:88,c:'#ff8a3d',glow:'rgba(255,150,70,.3)'}},
  {name:'奇宝夜间主场',sky:['#131c3d','#3d4d84'],hillFar:'#25315e',hillNear:'#1b2547',ground:'#3a2f28',grass:'#3f6d49',grass2:'#325840',cloud:'rgba(70,85,140,.4)',mid:'castle',sun:{x:.76,y:-190,r:64,c:'#f2e6c4',glow:'rgba(245,235,200,.2)'},night:true},
  {name:'特雷森游泳馆',sky:['#bfeefb','#f3feff'],hillFar:'#a9dfe8',hillNear:'#8fd0dd',ground:'#cdd6da',grass:'#4bbfd6',grass2:'#2ea3bd',cloud:'rgba(255,255,255,.7)',mid:'pool',sun:{x:.5,y:-230,r:70,c:'#ffffff',glow:'rgba(255,255,255,.35)'},pool:true}
];
/* 关卡搭建辅助：P=竖柱 Beam=横梁 Box=方块 NP/KP=普通奇宝猪/国王奇宝猪（全部奇宝均放置于建筑内视野完全可见位置） */
const P=(x,m)=>({x,y:515,w:20,h:90,m});
const P2=(x,y,m)=>({x,y,w:20,h:90,m});
const Beam=(x,y,m,len)=>({x,y,w:len||150,h:20,m});
const Box=(x,y,s,m)=>({x,y,w:s,h:s,m});
const NP=(x,y)=>({x,y:y===undefined?534:y,t:'n'});
const KP=(x,y)=>({x,y:y===undefined?510:y,t:'k'});
const LEVELS=[
 /* ===== 世界 0 · 特雷森草地 ===== */
 {world:0,w:1700,focus:1280,birds:['red','red','red'],
  blocks:[P(1000,'wood'),P(1120,'wood'),Beam(1060,460,'wood'),Box(1060,430,40,'wood'),
          P(1330,'wood'),P(1450,'wood'),Beam(1390,460,'wood'),Box(1390,430,40,'glass')],
  pigs:[NP(1060),NP(1390),NP(1390,384)]},
 {world:0,w:1900,focus:1450,birds:['red','chuck','red'],
  blocks:[P(1090,'glass'),P(1210,'glass'),Beam(1150,460,'wood'),Box(1150,430,40,'wood'),
          P(1490,'wood'),P(1610,'wood'),Beam(1550,460,'wood'),
          P2(1500,405,'glass'),P2(1600,405,'glass'),Beam(1550,350,'glass'),Box(1550,320,40,'wood')],
  pigs:[NP(1150),NP(1150,384),NP(1550),NP(1550,424)]},
 {world:0,w:1900,focus:1470,birds:['red','blue','chuck'],
  blocks:[P(1050,'wood'),P(1170,'wood'),Beam(1110,460,'wood'),Box(1110,430,40,'wood'),
          P(1400,'glass'),P(1520,'glass'),Beam(1460,460,'glass'),
          P2(1410,405,'wood'),P2(1510,405,'wood'),Beam(1460,350,'wood'),Box(1460,320,40,'glass')],
  pigs:[NP(1110),NP(1460),NP(1460,424),NP(1460,274)]},
 {world:0,w:2100,focus:1520,birds:['chuck','red','blue','red'],
  blocks:[P(1040,'wood'),P(1160,'wood'),Beam(1100,460,'wood'),Box(1100,430,40,'glass'),
          P(1400,'glass'),P(1520,'glass'),Beam(1460,460,'glass'),Box(1460,430,40,'wood'),
          P(1760,'wood'),P(1880,'wood'),Beam(1820,460,'wood')],
  pigs:[NP(1100),NP(1460),NP(1460,384),NP(1820),NP(1820,424)]},
 /* ===== 世界 1 · 黄昏训练沙地 ===== */
 {world:1,w:2000,focus:1500,birds:['chuck','red','chuck','red'],
  blocks:[P(1340,'stone'),P(1460,'stone'),Beam(1400,460,'stone'),
          P2(1350,405,'wood'),P2(1450,405,'wood'),Beam(1400,350,'wood'),
          Box(1700,532.5,55,'wood'),Box(1700,477.5,55,'wood'),
          P(1620,'glass'),P(1780,'glass'),Beam(1700,460,'glass',190)],
  pigs:[KP(1400,290),NP(1400),NP(1700,424),NP(1540)]},
 {world:1,w:2000,focus:1500,birds:['blue','red','blue','chuck'],
  blocks:[P(1140,'glass'),P(1260,'glass'),Beam(1200,460,'glass'),
          P2(1150,405,'glass'),P2(1250,405,'glass'),Beam(1200,350,'glass'),Box(1200,320,40,'glass'),
          P(1540,'wood'),P(1660,'wood'),Beam(1600,460,'wood'),
          P2(1550,405,'glass'),P2(1650,405,'glass'),Beam(1600,350,'glass'),
          P2(1570,295,'wood'),P2(1630,295,'wood'),Beam(1600,240,'wood')],
  pigs:[NP(1200),NP(1200,424),NP(1600),NP(1600,424),NP(1600,204)]},
 {world:1,w:2100,focus:1560,birds:['bomb','chuck','red','blue'],
  blocks:[P(1200,'stone'),P(1320,'stone'),Beam(1260,460,'stone'),P2(1210,405,'stone'),P2(1310,405,'stone'),Beam(1260,350,'stone'),
          P(1560,'stone'),P(1680,'stone'),Beam(1620,460,'stone'),Box(1620,430,40,'wood'),
          P(1860,'glass'),P(1960,'glass'),Beam(1910,460,'glass',180)],
  pigs:[KP(1260,290),NP(1260),NP(1620),NP(1620,384),NP(1910)]},
 {world:1,w:2200,focus:1600,birds:['chuck','chuck','red','bomb'],
  blocks:[Box(1180,532.5,55,'wood'),Box(1180,477.5,55,'wood'),
          P(1400,'stone'),P(1520,'stone'),Beam(1460,460,'stone'),P2(1410,405,'wood'),P2(1510,405,'wood'),Beam(1460,350,'wood'),Box(1460,320,40,'stone'),
          P(1760,'wood'),P(1880,'wood'),Beam(1820,460,'wood'),Box(1820,430,40,'wood')],
  pigs:[NP(1180,424),NP(1460),NP(1460,424),NP(1460,274),NP(1820),NP(1820,384)]},
 /* ===== 世界 2 · 奇宝夜间主场 ===== */
 {world:2,w:2300,focus:1700,birds:['bomb','red','bomb','chuck'],
  blocks:[Box(1250,532.5,55,'stone'),Box(1250,477.5,55,'stone'),Box(1320,532.5,55,'stone'),Box(1320,477.5,55,'stone'),Box(1285,430,40,'glass'),
          P(1560,'stone'),P(1640,'stone'),Beam(1600,460,'stone'),
          P2(1570,405,'stone'),P2(1630,405,'stone'),Beam(1600,350,'stone'),
          P(1840,'stone'),P(1960,'stone'),Beam(1900,460,'stone'),
          P2(1850,405,'stone'),P2(1950,405,'stone'),Beam(1900,350,'stone'),
          Box(1770,540,40,'glass')],
  pigs:[NP(1180),NP(1500),NP(1600),KP(1900,290)]},
 {world:2,w:2400,focus:1700,birds:['red','blue','bomb','chuck','red'],
  blocks:[P(1210,'stone'),P(1290,'stone'),Beam(1250,460,'stone'),
          P2(1220,405,'wood'),P2(1280,405,'wood'),Beam(1250,350,'wood'),
          P(1440,'glass'),P(1560,'glass'),Beam(1500,460,'glass'),Box(1500,430,40,'wood'),
          P(1788,'stone'),P(1912,'stone'),Beam(1850,460,'stone'),
          P2(1795,405,'stone'),P2(1905,405,'stone'),Beam(1850,350,'stone'),
          P2(1815,295,'stone'),P2(1885,295,'stone'),Beam(1850,240,'stone')],
  pigs:[NP(1250),NP(1380),NP(1500),NP(1620),KP(1850,510),NP(1850,204)]},
 {world:2,w:2300,focus:1650,birds:['bomb','red','chuck','blue'],
  blocks:[P(1240,'stone'),P(1360,'stone'),Beam(1300,460,'stone'),P2(1250,405,'stone'),P2(1350,405,'stone'),Beam(1300,350,'stone'),Box(1300,320,40,'glass'),
          P(1640,'stone'),P(1760,'stone'),Beam(1700,460,'stone'),
          P2(1650,405,'wood'),P2(1750,405,'wood'),Beam(1700,350,'wood'),
          P2(1660,295,'stone'),P2(1740,295,'stone'),Beam(1700,240,'stone')],
  pigs:[NP(1300),NP(1300,424),NP(1300,274),NP(1700),NP(1700,424),NP(1700,204)]},
 {world:2,w:2400,focus:1680,birds:['bomb','blue','chuck','red','bomb'],
  blocks:[P(1180,'stone'),P(1300,'stone'),Beam(1240,460,'stone'),Box(1240,430,40,'glass'),
          P(1520,'stone'),P(1640,'stone'),Beam(1580,460,'stone'),P2(1530,405,'stone'),P2(1630,405,'stone'),Beam(1580,350,'stone'),
          P(1880,'glass'),P(2000,'glass'),Beam(1940,460,'glass'),Box(1940,430,40,'stone')],
  pigs:[NP(1240),NP(1240,384),KP(1580,290),NP(1580),NP(1940),NP(1940,384)]},
 /* ===== 世界 3 · 特雷森游泳馆 ===== */
 {world:3,w:1800,focus:1350,birds:['red','red','blue'],
  blocks:[P(1080,'glass'),P(1200,'glass'),Beam(1140,460,'glass'),Box(1140,430,40,'wood'),
          P(1420,'wood'),P(1540,'wood'),Beam(1480,460,'wood')],
  pigs:[NP(1140),NP(1140,384),NP(1480),NP(1480,424)]},
 {world:3,w:2000,focus:1480,birds:['chuck','blue','chuck','red'],
  blocks:[P(1120,'glass'),P(1240,'glass'),Beam(1180,460,'glass'),P2(1130,405,'wood'),P2(1230,405,'wood'),Beam(1180,350,'wood'),Box(1180,320,40,'glass'),
          P(1480,'wood'),P(1600,'wood'),Beam(1540,460,'wood'),Box(1540,430,40,'glass')],
  pigs:[NP(1180),NP(1180,424),NP(1180,274),NP(1540),NP(1540,384)]},
 {world:3,w:2200,focus:1580,birds:['bomb','red','blue','chuck'],
  blocks:[P(1180,'stone'),P(1300,'stone'),Beam(1240,460,'stone'),P2(1190,405,'glass'),P2(1290,405,'glass'),Beam(1240,350,'glass'),Box(1240,320,40,'wood'),
          P(1560,'glass'),P(1680,'glass'),Beam(1620,460,'glass'),
          Box(1860,532.5,55,'wood'),Box(1860,477.5,55,'wood')],
  pigs:[NP(1240),NP(1240,424),NP(1240,274),NP(1620),NP(1620,424),NP(1860,424)]},
 {world:3,w:2400,focus:1700,birds:['blue','bomb','chuck','red','blue'],
  blocks:[P(1200,'stone'),P(1320,'stone'),Beam(1260,460,'stone'),Box(1260,430,40,'glass'),
          P(1540,'glass'),P(1660,'glass'),Beam(1600,460,'glass'),P2(1550,405,'stone'),P2(1650,405,'stone'),Beam(1600,350,'stone'),
          P(1900,'stone'),P(2020,'stone'),Beam(1960,460,'stone'),P2(1910,405,'stone'),P2(2010,405,'stone'),Beam(1960,350,'stone')],
  pigs:[NP(1260),NP(1260,384),KP(1600,290),NP(1600),NP(1600,424),NP(1960),KP(1960,290)]}
];
/* 关卡总数与主题数派生常量（供选关、结算、解锁逻辑动态使用，杜绝硬编码）。
 * 注册表接缝：registerLevels 扩关后调用 refreshCounts() 重新派生并补齐存档。 */
let NLEVELS, LAST, WORLDS, PER;
function refreshCounts(){
  NLEVELS=LEVELS.length;LAST=NLEVELS-1;WORLDS=THEMES.length;PER=Math.round(NLEVELS/WORLDS);
  /* 兼容旧存档：把 stars 补齐到当前关卡总数，并夹紧已解锁上限 */
  while(save.stars.length<NLEVELS)save.stars.push(0);
  save.stars.length=NLEVELS;
  save.unlocked=clamp(save.unlocked,1,NLEVELS);
  if(UNLOCK_ALL)save.unlocked=NLEVELS; // 全解锁开关：旧存档进度为 3 之类也要覆盖
}
refreshCounts();
