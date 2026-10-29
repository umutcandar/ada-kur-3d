import * as THREE from './lib/three.module.js';
const $=id=>document.getElementById(id);
const N=14, START0=3, START1=10; // owned start: 3..10 => 8x8
const now=()=>Date.now();
// ---------- DATA ----------
const KINDS={
 house:{n:'Ev',ic:'🏠',res:'coins',rate:3,max:6,unlock:1,cost:{wood:3,coins:10},time:3,names:['Çadır','Kulübe','Kır Evi','Ev','Villa','Konak']},
 farm:{n:'Çiftlik',ic:'🌾',res:'coins',rate:6,max:5,unlock:2,cost:{wood:8,stone:4,coins:30},time:15,names:['Tarla','Ambar','Silo Çiftliği','Büyük Çiftlik','Değirmen']},
 sawmill:{n:'Kereste',ic:'🪚',res:'wood',rate:2,max:5,unlock:3,cost:{wood:12,coins:45},time:20,names:['Kütük Yığını','Kereste Sundurması','Bıçkıhane','Büyük Bıçkıhane','Kereste Fabrikası']},
 quarry:{n:'Taş Ocağı',ic:'⛏️',res:'stone',rate:1.5,max:5,unlock:4,cost:{wood:20,coins:70},time:30,names:['Taş Yığını','Ocak','Taş Atölyesi','Vinçli Ocak','Taş Fabrikası']},
 shop:{n:'Dükkân',ic:'🏪',res:'coins',rate:20,max:5,unlock:5,cost:{wood:25,stone:20,coins:150},time:60,names:['Pazar Tezgâhı','Bakkal','Mağaza','Çarşı','Alışveriş Merkezi']},
};
const RIC={coins:'🪙',wood:'🪵',stone:'🪨',gems:'💎'};
const rateOf=(k,lv)=>KINDS[k].rate*Math.pow(2.3,lv-1)*(S.vip?1.5:1); // per minute
const xpNeed=l=>15*l*l;
const QUESTS=[
 {t:'5 odun topla',f:s=>s.st.wood,n:5,r:{coins:20}},
 {t:'2 çadır kur',f:s=>s.st.built_house||0,n:2,r:{coins:20}},
 {t:'Seviye 2 ev yap (birleştir)',f:s=>maxLv(s,'house'),n:2,r:{gems:5}},
 {t:'Binalardan 3 kez topla',f:s=>s.st.collect,n:3,r:{coins:40}},
 {t:'Seviye 3 ev yap',f:s=>maxLv(s,'house'),n:3,r:{gems:5,coins:30}},
 {t:'5 taş topla',f:s=>s.st.stone,n:5,r:{coins:30}},
 {t:'Bir çiftlik kur',f:s=>s.st.built_farm||0,n:1,r:{coins:60}},
 {t:'1 arazi satın al (kumsala dokun)',f:s=>s.st.land,n:1,r:{gems:5}},
 {t:'Kereste atölyesi kur',f:s=>s.st.built_sawmill||0,n:1,r:{coins:80}},
 {t:'Seviye 4 ev yap',f:s=>maxLv(s,'house'),n:4,r:{gems:10}},
 {t:'Toplam 100 odun topla',f:s=>s.st.wood,n:100,r:{coins:150}},
 {t:'Taş ocağı kur',f:s=>s.st.built_quarry||0,n:1,r:{coins:120}},
 {t:'Seviye 3 çiftlik yap',f:s=>maxLv(s,'farm'),n:3,r:{gems:10}},
 {t:'Seviye 5 villa yap',f:s=>maxLv(s,'house'),n:5,r:{gems:15}},
 {t:'Dükkân kur',f:s=>s.st.built_shop||0,n:1,r:{coins:300}},
 {t:'5 arazi satın al',f:s=>s.st.land,n:5,r:{gems:15}},
 {t:'Seviye 6 konak yap',f:s=>maxLv(s,'house'),n:6,r:{gems:30}},
 {t:'Seviye 5 dükkân yap',f:s=>maxLv(s,'shop'),n:5,r:{gems:50}},
];
function maxLv(s,k){let m=0;for(const key in s.g){const e=s.g[key];if(e.t==='b'&&e.k===k&&!e.end)m=Math.max(m,e.lv)}return m}
// ---------- STATE ----------
let S;
function fresh(){
 const s={v:1,coins:60,wood:0,stone:0,gems:20,energy:30,enT:now(),xp:0,lv:1,builders:1,vip:false,noads:false,starter:false,
  owned:{},g:{},q:0,tut:0,st:{wood:0,stone:0,collect:0,land:0},saved:now()};
 for(let i=START0;i<=START1;i++)for(let j=START0;j<=START1;j++)s.owned[i+','+j]=1;
 const trees=[[3,3],[4,3],[3,4],[10,3],[9,3],[10,4],[3,9],[3,10],[4,10],[10,10],[9,10],[5,4],[8,9],[6,3],[3,6],[10,7],[8,4]];
 const rocks=[[7,10],[10,8],[4,8],[9,6],[5,10],[10,5]];
 for(const[i,j]of trees)s.g[i+','+j]={t:'tree',rg:0};
 for(const[i,j]of rocks)s.g[i+','+j]={t:'rock',rg:0};
 return s;
}
function load(){try{const d=JSON.parse(localStorage.getItem('adakur3d'));if(d&&d.v===1)return d}catch(e){}return null}
function save(){S.saved=now();try{localStorage.setItem('adakur3d',JSON.stringify(S))}catch(e){}}
S=load()||fresh();
const isNew=!load();
// ---------- RENDERER ----------
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
{const cv=document.createElement('canvas');cv.width=2;cv.height=256;const x=cv.getContext('2d');const gr=x.createLinearGradient(0,0,0,256);
 gr.addColorStop(0,'#5fb4e8');gr.addColorStop(.55,'#bfe6f7');gr.addColorStop(1,'#fde9c8');x.fillStyle=gr;x.fillRect(0,0,2,256);
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;scene.background=t;}
scene.fog=new THREE.Fog(0xbfe6f7,32,70);
const camera=new THREE.PerspectiveCamera(36,1,0.1,200);
const hemi=new THREE.HemisphereLight(0xfff6e5,0x5f8f6a,1.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b8,2.4);sun.position.set(8,14,5);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});sun.shadow.bias=-0.0015;sun.shadow.normalBias=0.02;
scene.add(sun);scene.add(sun.target);
// ---------- HELPERS ----------
const MATS={};const mat=c=>MATS[c]||(MATS[c]=new THREE.MeshLambertMaterial({color:c}));
const G={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,10),cone:new THREE.ConeGeometry(.5,1,8),pyr:new THREE.ConeGeometry(.5,1,4).rotateY(Math.PI/4),
 ico:new THREE.IcosahedronGeometry(.5,0),dod:new THREE.DodecahedronGeometry(.5,0),sph:new THREE.SphereGeometry(.5,10,8)};
{const sh=new THREE.Shape();sh.moveTo(-.5,0);sh.lineTo(.5,0);sh.lineTo(0,1);sh.lineTo(-.5,0);G.prism=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false}).translate(0,0,-.5);}
function P(g,par,geo,c,sx,sy,sz,x,y,z,ry=0,rx=0,rz=0,sh=true){const m=new THREE.Mesh(G[geo],mat(c));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=sh;m.receiveShadow=true;par.add(m);return m}
const tw=(i,j)=>new THREE.Vector3(i-N/2+.5,0,j-N/2+.5);
const key=(i,j)=>i+','+j;
const E={outB:t=>1+2.7*Math.pow(t-1,3)+1.7*Math.pow(t-1,2),out:t=>1-Math.pow(1-t,3),el:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*2.094)+1};
const tweens=[];function tween(dur,fn,done){tweens.push({t0:performance.now(),dur,fn,done})}
// ---------- WORLD ----------
const water=new THREE.Mesh(new THREE.PlaneGeometry(90,90,45,45).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x3cb4dc,flatShading:true,transparent:true,opacity:.92}));
water.position.y=-.55;water.receiveShadow=true;scene.add(water);
const wpos=water.geometry.attributes.position;const wbase=Float32Array.from(wpos.array);
const MAXT=N*N;
const grassI=new THREE.InstancedMesh(G.box,new THREE.MeshLambertMaterial({color:0xffffff}),MAXT);grassI.receiveShadow=true;scene.add(grassI);
const dirtI=new THREE.InstancedMesh(G.box,mat(0x9a6b45),MAXT);scene.add(dirtI);
const sandI=new THREE.InstancedMesh(G.box,new THREE.MeshLambertMaterial({color:0xffffff}),MAXT);sandI.receiveShadow=true;scene.add(sandI);
const hlI=new THREE.InstancedMesh(new THREE.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x7dff8a,transparent:true,opacity:.45,depthWrite:false}),MAXT);hlI.count=0;scene.add(hlI);
const m4=new THREE.Matrix4(),col=new THREE.Color();
function isExp(i,j){if(S.owned[key(i,j)]||i<0||j<0||i>=N||j>=N)return false;return S.owned[key(i+1,j)]||S.owned[key(i-1,j)]||S.owned[key(i,j+1)]||S.owned[key(i,j-1)]}
function landPrice(){const n=Object.keys(S.owned).length-64;return Math.round(80*Math.pow(1.18,n))}
function buildGround(){let a=0,b=0;
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const p=tw(i,j);
  if(S.owned[key(i,j)]){m4.compose(new THREE.Vector3(p.x,-.2,p.z),new THREE.Quaternion(),new THREE.Vector3(1,.4,1));grassI.setMatrixAt(a,m4);
   col.set((i+j)%2?0x8fd16a:0x84c862);grassI.setColorAt(a,col);
   m4.compose(new THREE.Vector3(p.x,-.75,p.z),new THREE.Quaternion(),new THREE.Vector3(.98,.7,.98));dirtI.setMatrixAt(a,m4);a++;}
  else if(isExp(i,j)){m4.compose(new THREE.Vector3(p.x,-.42,p.z),new THREE.Quaternion(),new THREE.Vector3(.96,.3,.96));sandI.setMatrixAt(b,m4);col.set((i+j)%2?0xf3dca0:0xeed190);sandI.setColorAt(b,col);b++;}
 }
 grassI.count=dirtI.count=a;sandI.count=b;[grassI,dirtI,sandI].forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true});
}
// clouds & decor
const clouds=[];for(let k=0;k<6;k++){const g=new THREE.Group();for(let q=0;q<3;q++)P(g,g,'sph',0xffffff,1.6-q*.3,1-q*.15,1.2,q*.9-.9,0,(q%2)*.3,0,0,0,false);
 {const a=k/6*Math.PI*2-.6;g.position.set(Math.cos(a)*20,2.5+(k%3)*.8,Math.sin(a)*20-6)};scene.add(g);clouds.push(g)}
// ---------- MODELS ----------
const windows=(g,w,h,d,y,c=0x9fd8ff)=>{for(const s of[-1,1])P(g,g,'box',c,.12,.12,.02,s*w*.25,y,d/2+.01,0,0,0,false);};
function mkHouse(g,lv){
 if(lv===1){P(g,g,'pyr',0xf0a04b,.72,.62,.72,0,.31,0);P(g,g,'box',0x6b3e1f,.16,.24,.02,0,.12,.255);return}
 if(lv===2){P(g,g,'box',0xb27a4a,.6,.38,.55,0,.19,0);P(g,g,'prism',0x8a5a2b,.74,.32,.66,0,.38,0);P(g,g,'box',0x5a3418,.14,.22,.02,0,.11,.28);return}
 if(lv===3){P(g,g,'box',0xf6e7c6,.68,.46,.58,0,.23,0);P(g,g,'prism',0xd9534f,.82,.38,.7,0,.46,0);P(g,g,'box',0x8b5a3c,.1,.3,.1,.22,.68,-.1);
  P(g,g,'box',0x7a4a2a,.14,.24,.02,0,.12,.3);windows(g,.68,.46,.58,.3);P(g,g,'sph',0x5cb85c,.2,.18,.2,-.32,.09,.3);return}
 if(lv===4){P(g,g,'box',0xe9eef8,.72,.82,.62,0,.41,0);P(g,g,'prism',0xc0392b,.86,.4,.74,0,.82,0);P(g,g,'box',0x6c4a2a,.14,.24,.02,0,.12,.32);
  windows(g,.72,.82,.62,.32);windows(g,.72,.82,.62,.62);P(g,g,'box',0xffffff,.78,.05,.68,0,.5,0);P(g,g,'sph',0x5cb85c,.22,.2,.22,.36,.1,.34);return}
 if(lv===5){P(g,g,'box',0xfdf6e9,.62,.86,.6,-.1,.43,-.05);P(g,g,'pyr',0x3b6fd1,.95,.42,.9,-.1,1.07,-.05);P(g,g,'box',0xfdf6e9,.36,.5,.4,.26,.25,.12);
  P(g,g,'prism',0x3b6fd1,.44,.22,.48,.26,.5,.12);windows(g,.62,.8,.6,.35);windows(g,.62,.8,.6,.68);P(g,g,'box',0x39c0f0,.3,.03,.18,-.2,.02,.36,0,0,0,false);
  P(g,g,'box',0x6c4a2a,.12,.22,.02,.26,.11,.33);return}
 P(g,g,'box',0xfff1d2,.74,1.25,.62,0,.62,-.05);P(g,g,'pyr',0x7b3fa0,1.05,.5,.9,0,1.5,-.05);
 for(const s of[-1,1]){P(g,g,'cyl',0xfff1d2,.24,1.5,.24,s*.38,.75,.26);P(g,g,'cone',0xf1c40f,.32,.42,.32,s*.38,1.71,.26)}
 windows(g,.74,1.2,.62,.38);windows(g,.74,1.2,.62,.75);windows(g,.74,1.2,.62,1.05);P(g,g,'box',0xf1c40f,.8,.05,.68,0,1.25,-.05);P(g,g,'box',0x6c3a1a,.16,.3,.02,0,.15,.27);
}
function mkFarm(g,lv){
 P(g,g,'box',0x8b5e34,.86,.06,.86,0,.03,0,0,0,0,false);
 const rows=Math.min(lv+2,5);for(let r=0;r<rows;r++)P(g,g,'box',lv>=3?0xf2c94c:0x6cc24a,.12,.12,.7,-.33+r*.17*(lv>=2?.5:1),.1,lv>=2?.05:0);
 if(lv>=2){const s=lv>=4?1.2:1;P(g,g,'box',0xc0392b,.36*s,.32*s,.4*s,.2,.16*s,-.1);P(g,g,'prism',0x7f2a20,.44*s,.2*s,.46*s,.2,.32*s,-.1);P(g,g,'box',0xffffff,.14,.18,.02,.2,.09,.1*s);}
 if(lv>=3)P(g,g,'cyl',0xdfe6ea,.2,.7,.2,.38,.35,.3),P(g,g,'cone',0x95a5a6,.24,.18,.24,.38,.79,.3);
 if(lv>=5){P(g,g,'cone',0xf6e7c6,.34,1,.34,-.25,.5,-.25);const b=new THREE.Group();b.position.set(-.25,.85,-.07);b.userData.spin=1;g.add(b);
  for(let k=0;k<4;k++){const m=P(g,b,'box',0xfafafa,.06,.55,.02,0,0,0,0,0,k*Math.PI/2);m.geometry=G.box;m.position.set(Math.sin(k*Math.PI/2)*.27,Math.cos(k*Math.PI/2)*.27,0)}}
}
function logs(g,n,x,z){for(let k=0;k<n;k++)P(g,g,'cyl',0x9c6b3e,.13,.5,.13,x+(k%3)*.14-.14,.07+Math.floor(k/3)*.12,z,0,0,Math.PI/2)}
function mkSaw(g,lv){
 if(lv===1){logs(g,5,0,0);P(g,g,'cyl',0xb98a5a,.3,.12,.3,.25,.06,.25);return}
 const s=.8+lv*.1;P(g,g,'box',0xa0703f,.6*s,.4*s+(lv>=4?.3:0),.5*s,-.05,(.2*s+(lv>=4?.15:0)),-.1);
 P(g,g,'prism',0x5d3a1a,.72*s,.28,.62*s,-.05,.4*s+(lv>=4?.3:0),-.1);
 P(g,g,'cyl',0xcfd8dc,.3,.03,.3,.3,.3,.25,0,Math.PI/2);logs(g,lv+1,-.1,.33);
 if(lv>=3)P(g,g,'cyl',0x7f8c8d,.12,.5,.12,-.3,.8*s,-.25);
 if(lv>=5){const w=new THREE.Group();w.position.set(.42,.3,-.1);w.userData.spin=1;g.add(w);P(g,w,'cyl',0x6d4c2a,.5,.08,.5,0,0,0,0,0,Math.PI/2)}
}
function mkQuarry(g,lv){
 const n=2+lv;for(let k=0;k<n;k++){const a=k*2.3;P(g,g,'dod',k%2?0x9aa3a8:0x7f8a90,.3+.04*lv,.25+.03*lv,.3,Math.cos(a)*.25,.12,Math.sin(a)*.25,a)}
 if(lv>=2)P(g,g,'box',0x6d4c2a,.25,.12,.18,.3,.1,.3),P(g,g,'cyl',0x333333,.08,.04,.08,.22,.04,.4,0,0,Math.PI/2);
 if(lv>=3)P(g,g,'box',0xbdc3c7,.4,.4,.35,-.2,.2,-.2),P(g,g,'pyr',0x34495e,.6,.25,.5,-.2,.52,-.2);
 if(lv>=4)P(g,g,'box',0xf1c40f,.06,1.1,.06,.3,.55,-.3),P(g,g,'box',0xf1c40f,.6,.06,.06,.1,1.08,-.3);
 if(lv>=5)P(g,g,'cyl',0x95a5a6,.25,.6,.25,.3,.3,.05);
}
function mkShop(g,lv){
 if(lv===1){P(g,g,'box',0xc8955c,.6,.3,.35,0,.15,0);for(let k=0;k<4;k++)P(g,g,'box',k%2?0xffffff:0xe74c3c,.16,.04,.5,-.24+k*.16,.6,.05,0,.25);
  for(const s of[-1,1])P(g,g,'cyl',0x6d4c2a,.04,.6,.04,s*.28,.3,-.15);P(g,g,'sph',0xf39c12,.12,.12,.12,-.1,.34,0);P(g,g,'sph',0x27ae60,.12,.12,.12,.1,.34,0);return}
 const fl=lv-1,h=.35*fl+.1;P(g,g,'box',lv>=5?0xf7f1ff:0xffe0b3,.78,h,.6,0,h/2,-.05);P(g,g,'box',0x2c3e50,.82,.06,.64,0,h+.03,-.05);
 for(let k=0;k<5;k++)P(g,g,'box',k%2?0xffffff:(lv>=4?0x8e44ad:0x27ae60),.16,.04,.22,-.32+k*.16,.3,.33,0,.4);
 P(g,g,'box',0x9fd8ff,.5,.18,.02,0,.12,.26);for(let f=1;f<fl;f++)windows(g,.78,h,.6,.15+f*.35);
 P(g,g,'box',0xf1c40f,.4,.12,.03,0,h+.15,.2);if(lv>=5)P(g,g,'cyl',0xf1c40f,.3,.1,.3,0,h+.1,-.05);
}
const MK={house:mkHouse,farm:mkFarm,sawmill:mkSaw,quarry:mkQuarry,shop:mkShop};
function mkTree(g,v){P(g,g,'cyl',0x8b5a2b,.12,.4,.12,0,.2,0);const c=v%2?0x3fa34d:0x4cb85a;P(g,g,'cone',c,.62,.6,.62,0,.6,0);P(g,g,'cone',c,.46,.5,.46,0,.9,0);}
function mkStump(g){P(g,g,'cyl',0x8b5a2b,.16,.1,.16,0,.05,0);P(g,g,'sph',0x6cc24a,.12,.1,.12,.1,.03,.1)}
function mkRock(g,v){P(g,g,'dod',0x9aa3a8,.55,.42,.5,0,.18,0,v);P(g,g,'dod',0x868f95,.3,.26,.3,.22,.12,.18,v*2)}
function mkPebble(g){P(g,g,'dod',0x9aa3a8,.16,.08,.16,0,.04,0)}
function mkScaf(g){P(g,g,'box',0xd9c39a,.7,.06,.7,0,.03,0);for(const a of[-1,1])for(const b of[-1,1])P(g,g,'cyl',0xc08a4a,.05,.7,.05,a*.3,.35,b*.3);P(g,g,'box',0xf4d03f,.62,.04,.04,0,.6,.3);P(g,g,'box',0xe67e22,.3,.3,.3,0,.15,0)}
// sprite textures
const texC={};function emojiTex(e,bg){const k=e+bg;if(texC[k])return texC[k];const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 if(bg){x.fillStyle=bg;x.beginPath();x.arc(64,64,56,0,7);x.fill();x.lineWidth=8;x.strokeStyle='#ffffff';x.stroke()}
 x.font=(bg&&e.length<3&&/\d/.test(e)?'bold 70px':'72px')+' system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(e,64,70);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return texC[k]=t}
function sprite(e,bg,s){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(e,bg),depthTest:false}));sp.scale.set(s,s,1);sp.renderOrder=10;return sp}
// ---------- ENTITY MESHES ----------
const meshes=new Map();
function sig(e){return e.t==='b'?`b${e.k}${e.lv}${e.end?1:0}`:e.t+(e.rg?'0':'1')}
function syncAll(){const seen=new Set();for(const k in S.g){seen.add(k);syncOne(k)}for(const[k,m]of meshes)if(!seen.has(k)){scene.remove(m.g);meshes.delete(k)}}
function syncOne(k){const e=S.g[k];let m=meshes.get(k);if(!e){if(m){scene.remove(m.g);meshes.delete(k)}return}
 const s=sig(e);if(m&&m.sig===s)return;if(m)scene.remove(m.g);
 const g=new THREE.Group();const[i,j]=k.split(',').map(Number);g.position.copy(tw(i,j));const v=(i*7+j*3)%5;
 if(e.t==='tree')e.rg?mkStump(g):mkTree(g,v);else if(e.t==='rock')e.rg?mkPebble(g):mkRock(g,v);
 else if(e.end)mkScaf(g);else{MK[e.k](g,e.lv);const b=sprite(String(e.lv),['','#7f8c8d','#27ae60','#2e86de','#8e44ad','#e67e22','#e74c3c'][e.lv],.3);b.position.set(.38,.15,.38);b.material.depthTest=true;g.add(b);
  const bub=sprite(RIC[KINDS[e.k].res],'#ffffffee',.42);bub.material.map=emojiTex(RIC[KINDS[e.k].res],'#fff8e1');bub.position.y=1.6;bub.visible=false;g.add(bub);g.userData.bub=bub}
 if(e.t!=='b')g.rotation.y=v*1.3;
 scene.add(g);meshes.set(k,{g,sig:s});return g}
// ---------- CAMERA ----------
const cam={target:new THREE.Vector3(.9,0,.9),dist:20,az:Math.PI/4,pol:0.95,shake:0};
function updCam(){const off=new THREE.Vector3(Math.sin(cam.pol)*Math.sin(cam.az),Math.cos(cam.pol),Math.sin(cam.pol)*Math.cos(cam.az)).multiplyScalar(cam.dist);
 camera.position.copy(cam.target).add(off);if(cam.shake>0){camera.position.x+=(Math.random()-.5)*cam.shake;camera.position.y+=(Math.random()-.5)*cam.shake;cam.shake*=.88;if(cam.shake<.01)cam.shake=0}
 camera.lookAt(cam.target)}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();cam.dist=Math.min(Math.max(cam.dist,minD()),maxD())}
const minD=()=>9,maxD=()=>camera.aspect<.7?30:22;
addEventListener('resize',resize);
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function ground(x,y){const v=new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(v,camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(plane,p)?p:null}
function tileAt(x,y){const p=ground(x,y);if(!p)return null;const i=Math.floor(p.x+N/2),j=Math.floor(p.z+N/2);if(i<0||j<0||i>=N||j>=N)return null;return[i,j]}
function scr(v){const p=v.clone().project(camera);return{x:(p.x+1)/2*innerWidth,y:(1-p.y)/2*innerHeight}}
// ---------- AUDIO ----------
let AC;function ac(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,type='sine',v=.15,f2,delay=0){const a=AC;if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
 g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d)}
function noise(d,v=.2){const a=AC;if(!a)return;const b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);
 const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;s.buffer=b;g.gain.value=v;s.connect(f).connect(g).connect(a.destination);s.start()}
const SFX={chop:()=>{noise(.12,.25);tone(180,.1,'square',.06,90)},rock:()=>{noise(.15,.3);tone(120,.12,'triangle',.1,60)},
 coin:()=>{tone(988,.08,'square',.05);tone(1319,.15,'square',.05,null,.07)},build:()=>{tone(300,.08,'triangle',.12);tone(400,.1,'triangle',.12,null,.1);noise(.08,.15)},
 merge:lv=>{[523,659,784,1047,1319].slice(0,2+Math.min(lv,3)).forEach((f,i)=>tone(f*(1+lv*.05),.18,'triangle',.12,null,i*.07));},
 pop:()=>tone(600,.08,'sine',.12,1200),err:()=>tone(200,.15,'sawtooth',.06,140),lvl:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.25,'square',.06,null,i*.1))};
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
// ---------- PARTICLES ----------
const parts=[];const pg=new THREE.BoxGeometry(.08,.08,.08);
function burst(pos,c,n=10,sp=2.5){for(let k=0;k<n;k++){const m=new THREE.Mesh(pg,mat(c));m.position.copy(pos);scene.add(m);
 parts.push({m,v:new THREE.Vector3((Math.random()-.5)*sp,Math.random()*sp+1.5,(Math.random()-.5)*sp),life:.8+Math.random()*.4})}}
// ---------- UI ----------
const fmt=n=>{n=Math.floor(n);return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'B':String(n)};
function floatTxt(x,y,t,c='#fff'){const d=document.createElement('div');d.className='float';d.textContent=t;d.style.left=x+'px';d.style.top=y+'px';d.style.color=c;$('fx').appendChild(d);setTimeout(()=>d.remove(),1000)}
const HUDEL={coins:'pCoin',wood:'pWood',stone:'pStone',gems:'pGem'};
function fly(res,x,y,n=5){const r=$(HUDEL[res]).getBoundingClientRect();for(let k=0;k<n;k++){const d=document.createElement('div');d.className='fly';d.textContent=RIC[res];
 d.style.left=x+(Math.random()-.5)*40+'px';d.style.top=y+(Math.random()-.5)*40+'px';$('fx').appendChild(d);
 setTimeout(()=>{d.style.left=r.left+18+'px';d.style.top=r.top+14+'px';d.style.transform='translate(-50%,-50%) scale(.6)'},30+k*45);
 setTimeout(()=>{d.remove();$(HUDEL[res]).animate([{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:180})},720+k*45)}}
let toastT;function toast(t){const d=$('toast');d.textContent=t;d.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>d.style.opacity=0,2000)}
function modal(html,acts){$('mbox').innerHTML=html+'<div class="acts"></div>';const a=$('mbox').querySelector('.acts');
 for(const[t,cls,fn]of acts){const b=document.createElement('button');b.className='btn '+(cls||'');b.innerHTML=t;b.onclick=()=>{closeModal();fn&&fn()};a.appendChild(b)}$('modal').classList.add('on')}
function closeModal(){$('modal').classList.remove('on')}
function confirmBuy(title,desc,price,fn){modal(`<h2>${title}</h2><p>${desc}</p><div class="demo">🧪 DEMO: Gerçek ödeme alınmaz, kartından para çekilmez. Bu buton yalnızca satın almanın nasıl hissettireceğini gösterir.</div>`,[['Vazgeç','x'],[`Satın al · ${price}`,'g',fn]])}
function spendGems(n,what,fn){if(S.gems<n){modal(`<h2>Elmas yetmiyor</h2><p>${what} için ${n}💎 gerekiyor, sende ${S.gems}💎 var.</p>`,[['Kapat','x'],['Mağazaya git','g',()=>openShop()]]);return}
 modal(`<h2>${what}</h2><p>${n} 💎 harcansın mı?</p>`,[['Vazgeç','x'],[`${n} 💎 harca`,'g',()=>{S.gems-=n;fn();ui()}]])}
function hasCost(c){for(const r in c)if(S[r]<c[r])return false;return true}
function costStr(c){return Object.entries(c).map(([r,v])=>`${RIC[r]}${v}`).join(' ')}
function give(r,sx,sy){for(const k in r){S[k]+=r[k];if(sx!=null)fly(k,sx,sy,4)}if(r.xp)addXp(0)}
function addXp(n){S.xp+=n;while(S.xp>=xpNeed(S.lv)){S.xp-=xpNeed(S.lv);S.lv++;SFX.lvl();vib([30,40,30]);
 const un=Object.entries(KINDS).filter(([k,v])=>v.unlock===S.lv).map(([k,v])=>v.ic+' '+v.n);
 S.gems+=3;S.energy=Math.max(S.energy,maxEn());
 if(S.tut<5){toast(`⭐ Seviye ${S.lv}! +3💎`);return}setTimeout(()=>modal(`<div style="font-size:54px">⭐</div><h2>Seviye ${S.lv}!</h2><p>+3 💎 ve enerji doldu.${un.length?'<br>Yeni bina açıldı: <b>'+un.join(', ')+'</b>':''}</p>`,[['Harika!','']]),400)}}
const maxEn=()=>30+(S.vip?20:0),EN_T=45000;
function ui(){$('coins').textContent=fmt(S.coins);$('wood').textContent=fmt(S.wood);$('stone').textContent=fmt(S.stone);$('gems').textContent=fmt(S.gems);
 $('en').textContent=S.energy+'/'+maxEn();const rem=S.energy>=maxEn()?'':Math.ceil((EN_T-(now()-S.enT))/1000)+'sn';$('ent').textContent=rem;
 $('lvn').textContent=S.lv;$('lvl').style.setProperty('--p',(S.xp/xpNeed(S.lv)*100)+'%');
 const q=QUESTS[S.q];if(!q){$('quest').innerHTML='🏆 Tüm görevler tamam!';return}
 const v=Math.min(q.f(S),q.n),done=v>=q.n;const h=`<div>📋 ${q.t}</div><div class="bar"><i style="width:${v/q.n*100}%"></i></div><div style="display:flex;justify-content:space-between;margin-top:3px;font-size:12px;color:#7a6a4a"><span>${v}/${q.n}</span><span>Ödül: ${costStr(q.r)}</span></div>${done?'<button class="btn o" id="qclaim">Ödülü al</button>':''}`;
 if($('quest').dataset.h!==h){$('quest').innerHTML=h;$('quest').dataset.h=h;if(done){$('qclaim').onclick=claimQuest;}}$('qdot').style.display=done?'block':'none'}
function claimQuest(){const q=QUESTS[S.q];if(!q||q.f(S)<q.n)return;const r=$('qclaim').getBoundingClientRect();give(q.r,r.left+r.width/2,r.top);addXp(5);SFX.coin();S.q++;ui();save()}
// ---------- GAME ACTIONS ----------
let placing=null;
function freeTiles(){const out=[];for(const k in S.owned)if(!S.g[k])out.push(k.split(',').map(Number));return out}
function startPlace(kind){const kd=KINDS[kind];if(S.lv<kd.unlock){toast(`Seviye ${kd.unlock}'de açılır`);return}
 if(!hasCost(kd.cost)){SFX.err();toast('Yetersiz kaynak: '+costStr(kd.cost));return}
 const busy=Object.values(S.g).filter(e=>e.end).length;if(busy>=S.builders){SFX.err();modal(`<h2>İnşaatçılar meşgul</h2><p>Şu an ${S.builders} inşaatçın da çalışıyor. Bitmesini bekleyebilir ya da mağazadan ek inşaatçı alabilirsin.</p>`,[['Tamam','x'],['Mağaza','g',()=>openShop()]]);return}
 const ft=freeTiles();if(!ft.length){toast('Boş arazi yok! Kumsala dokunup arazi satın al ya da birleştir.');return}
 placing=kind;closeSheet();hlI.count=0;ft.forEach((t,n)=>{const p=tw(...t);m4.makeTranslation(p.x,.02,p.z);hlI.setMatrixAt(n,m4)});hlI.count=ft.length;hlI.instanceMatrix.needsUpdate=true;
 toast('Yeşil bir kareye dokun');}
function endPlace(){placing=null;hlI.count=0}
function place(i,j){const kd=KINDS[placing],k=key(i,j);if(!S.owned[k]||S.g[k]){toast('Buraya kurulamaz');return}
 for(const r in kd.cost)S[r]-=kd.cost[r];const t=(S.tut<5?2:kd.time)*1000;S.g[k]={t:'b',k:placing,lv:1,stored:0,end:now()+t};
 endPlace();const g=syncOne(k);popAnim(g,.6);SFX.build();vib(20);burst(tw(i,j).setY(.2),0xd9c39a,8,1.5);addXp(3);ui();save()}
function popAnim(g,amt=.5){if(!g)return;tween(550,t=>{const e=E.el(t);const s=1+(1-e)*amt*(t<.15?-1:1);g.scale.set(1/Math.sqrt(Math.abs(s)),s,1/Math.sqrt(Math.abs(s)))},()=>g.scale.set(1,1,1))}
function shake(g){const r0=g.rotation.z;tween(300,t=>{g.rotation.z=Math.sin(t*Math.PI*5)*.15*(1-t)},()=>g.rotation.z=r0)}
function harvest(k,e){if(S.energy<=0){SFX.err();modal('<h2>⚡ Enerjin bitti</h2><p>Enerji her 45 saniyede 1 dolar. Beklemek istemezsen:</p>',[['Bekle','x'],['📺 Reklam izle (+10)','o',()=>watchAd(()=>{S.energy+=10;ui()})],['Doldur · 10💎','g',()=>{if(S.gems>=10){S.gems-=10;S.energy=maxEn();ui()}else openShop()}]]);return}
 if(S.energy>=maxEn())S.enT=now();S.energy--;
 const[i,j]=k.split(',').map(Number);const p=tw(i,j);const m=meshes.get(k);const tree=e.t==='tree';
 const amt=tree?3+Math.floor(S.lv/3):2+Math.floor(S.lv/4);const res=tree?'wood':'stone';
 if(m)shake(m.g);tree?SFX.chop():SFX.rock();vib(15);burst(p.clone().setY(.5),tree?0x4cb85a:0x9aa3a8,12);
 setTimeout(()=>{S[res]+=amt;S.st[res]+=amt;e.rg=now()+(tree?45000:70000);syncOne(k);const g=meshes.get(k).g;g.scale.setScalar(.01);tween(300,t=>g.scale.setScalar(E.outB(t)));
  const s=scr(p.clone().setY(1));floatTxt(s.x,s.y,`+${amt} ${RIC[res]}`);fly(res,s.x,s.y,3);addXp(1);ui();save();tutCheck()},260)}
function collect(k,e){const amt=Math.floor(e.stored);if(amt<1)return false;const res=KINDS[e.k].res;S[res]+=amt;if(res!=='coins')S.st[res]+=amt;e.stored-=amt;S.st.collect++;
 const p=tw(...k.split(',').map(Number)).setY(1.3);const s=scr(p);floatTxt(s.x,s.y,`+${fmt(amt)} ${RIC[res]}`,'#ffe066');fly(res,s.x,s.y,Math.min(8,3+e.lv));SFX.coin();vib(10);addXp(1);
 const m=meshes.get(k);if(m)popAnim(m.g,.15);ui();save();tutCheck();return true}
function merge(from,to){const a=S.g[from],b=S.g[to];delete S.g[from];b.lv++;b.stored+=a.stored;syncOne(from);const g=syncOne(to);
 const p=tw(...to.split(',').map(Number));popAnim(g,.7);burst(p.clone().setY(.6),0xffd84a,14+b.lv*3,3);burst(p.clone().setY(.6),0xffffff,8,2.5);
 SFX.merge(b.lv);vib(b.lv>=4?[40,30,60]:30);if(b.lv>=4)cam.shake=.15+b.lv*.04;
 const s=scr(p.clone().setY(1.4));floatTxt(s.x,s.y,`${KINDS[b.k].names[b.lv-1]}! Sv${b.lv}`,'#ffe066');addXp(8*b.lv);
 S.st['merge']=(S.st.merge||0)+1;ui();save();tutCheck();
 if(b.lv===KINDS[b.k].max)toast(`🎉 ${KINDS[b.k].names[b.lv-1]} – en üst seviye!`)}
function buyLand(i,j){const pr=landPrice();modal(`<h2>🏝️ Arazi satın al</h2><p>Bu kumsal karesini adana kat: <b>${pr} 🪙</b></p>`,[['Vazgeç','x'],[`Satın al · ${pr}🪙`,'',()=>{
 if(S.coins<pr){SFX.err();toast('Yeterli altın yok');return}S.coins-=pr;S.owned[key(i,j)]=1;S.st.land++;const r=Math.random();if(r<.35)S.g[key(i,j)]={t:'tree',rg:0};else if(r<.5)S.g[key(i,j)]={t:'rock',rg:0};
 buildGround();syncAll();const p=tw(i,j);burst(p.clone().setY(.2),0x8fd16a,14);SFX.build();addXp(5);ui();save()}]])}
function watchAd(fn){$('ad').classList.add('on');let n=3;$('adt').textContent='Reklam oynatılıyor… '+n;const iv=setInterval(()=>{n--;$('adt').textContent='Reklam oynatılıyor… '+n;if(n<=0){clearInterval(iv);$('ad').classList.remove('on');fn();SFX.coin()}},1000)}
function tap(i,j){const k=key(i,j);ac();
 if(placing){place(i,j);return}
 if(isExp(i,j)){if(S.tut<5){toast('Önce eğitimi bitir');return}buyLand(i,j);return}
 const e=S.g[k];if(!e)return;
 if(e.t!=='b'){if(e.rg){toast(`${e.t==='tree'?'Ağaç':'Kaya'} yeniden büyüyor: ${Math.ceil((e.rg-now())/1000)}sn`);return}harvest(k,e);return}
 if(e.end){const rem=Math.ceil((e.end-now())/1000);const c=Math.max(1,Math.ceil(rem/20));spendGems(c,`İnşaatı hemen bitir (${rem}sn kaldı)`,()=>{e.end=now();});return}
 if(!collect(k,e)){const kd=KINDS[e.k];toast(`${kd.names[e.lv-1]} · Sv${e.lv} · ${fmt(rateOf(e.k,e.lv))} ${RIC[kd.res]}/dk${e.lv<kd.max?' — aynısını üstüne sürükle!':''}`);const m=meshes.get(k);if(m)popAnim(m.g,.12)}}
// ---------- INPUT ----------
const ptrs=new Map();let drag=null,gest=null;
canvas.addEventListener('pointerdown',ev=>{canvas.setPointerCapture(ev.pointerId);ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY,sx:ev.clientX,sy:ev.clientY});ac();
 if(ptrs.size===1){const t=tileAt(ev.clientX,ev.clientY);gest={moved:false,t,cand:null};if(t&&!placing){const k=key(...t),e=S.g[k];if(e&&e.t==='b'&&!e.end)gest.cand=k}}
 else{gest&&(gest.moved=true);if(drag)cancelDrag()}});
canvas.addEventListener('pointermove',ev=>{const p=ptrs.get(ev.pointerId);if(!p)return;const px=p.x,py=p.y;p.x=ev.clientX;p.y=ev.clientY;
 if(ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const pd=Math.hypot((a===p?px:a.x)-(b===p?px:b.x),(a===p?py:a.y)-(b===p?py:b.y));
  if(pd>0)cam.dist=Math.min(maxD(),Math.max(minD(),cam.dist*pd/d));panBy(px,py,p.x,p.y,.5);return}
 if(!gest)return;if(!gest.moved&&Math.hypot(p.x-p.sx,p.y-p.sy)>8){gest.moved=true;if(gest.cand)startDrag(gest.cand)}
 if(drag)moveDrag(p.x,p.y);else if(gest.moved)panBy(px,py,p.x,p.y,1)});
function up(ev){const p=ptrs.get(ev.pointerId);ptrs.delete(ev.pointerId);if(!p)return;
 if(drag){endDrag(p.x,p.y);gest=null;return}if(gest&&!gest.moved&&ptrs.size===0&&gest.t)tap(...gest.t);if(ptrs.size===0)gest=null}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
canvas.addEventListener('wheel',ev=>{ev.preventDefault();cam.dist=Math.min(maxD(),Math.max(minD(),cam.dist*(1+ev.deltaY*.001)))},{passive:false});
function panBy(x0,y0,x1,y1,f){const a=ground(x0,y0),b=ground(x1,y1);if(!a||!b)return;cam.target.addScaledVector(a.sub(b),f);const L=N/2;cam.target.x=Math.max(-L,Math.min(L,cam.target.x));cam.target.z=Math.max(-L,Math.min(L,cam.target.z))}
const ring=new THREE.Mesh(new THREE.RingGeometry(.42,.5,4,1,Math.PI/4).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false}));ring.renderOrder=5;ring.visible=false;scene.add(ring);
function startDrag(k){const m=meshes.get(k);if(!m)return;drag={k,g:m.g,home:m.g.position.clone(),over:null};SFX.pop();vib(8);tween(150,t=>m.g.position.y=E.out(t)*.6);}
function moveDrag(x,y){const p=ground(x,y);if(!p)return;drag.g.position.x=p.x;drag.g.position.z=p.z;const t=tileAt(x,y);ring.visible=false;drag.over=null;if(!t)return;const k=key(...t);if(k===drag.k)return;
 const e=S.g[k],a=S.g[drag.k];const pp=tw(...t);ring.position.set(pp.x,.03,pp.z);ring.visible=true;
 if(e&&e.t==='b'&&!e.end&&e.k===a.k&&e.lv===a.lv&&a.lv<KINDS[a.k].max){ring.material.color.set(0x3fff6a);drag.over=k;ring.scale.setScalar(1.1+Math.sin(performance.now()/90)*.08)}
 else if(!e&&S.owned[k]){ring.material.color.set(0xffffff);drag.over=k;ring.scale.setScalar(1)}else{ring.material.color.set(0xff5555);ring.scale.setScalar(1)}}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;ring.visible=false;const s=d.g.position.clone();tween(220,t=>{d.g.position.lerpVectors(s,d.home,E.out(t))})}
function endDrag(){const d=drag;ring.visible=false;if(!d.over){cancelDrag();return}drag=null;const e=S.g[d.over],a=S.g[d.k];
 if(e){scene.remove(d.g);meshes.delete(d.k);merge(d.k,d.over)}
 else{S.g[d.over]=a;delete S.g[d.k];meshes.delete(d.k);meshes.set(d.over,{g:d.g,sig:sig(a)});const s=d.g.position.clone(),h=tw(...d.over.split(',').map(Number));tween(160,t=>d.g.position.lerpVectors(s,h,E.out(t)));SFX.pop();save()}}
// ---------- SHEETS ----------
function closeSheet(){$('sheet').classList.remove('on')}
function sheet(html){$('sheet').innerHTML=html;$('sheet').classList.add('on');$('sheet').querySelector('.close').onclick=closeSheet}
function openBuild(){sheet(`<h3>🔨 İnşa Et <button class="btn x close">✕</button></h3><div style="font-size:12px;font-weight:700;color:#7a6a4a;margin:-4px 0 10px">Aynı tür ve seviyedeki iki binayı üst üste sürükle → bir üst seviye! İnşaatçı: ${S.builders}</div><div class="grid">${
 Object.entries(KINDS).map(([k,v])=>{const lock=S.lv<v.unlock,ok=hasCost(v.cost);return `<div class="card ${lock?'lock':ok?'':'dis'}" data-k="${k}"><div class="ic">${lock?'🔒':v.ic}</div><div class="nm">${v.names[0]}</div><div class="cost">${lock?'Seviye '+v.unlock:costStr(v.cost)}</div><div style="font-size:11px;color:#2a9d5c">${fmt(v.rate)}${RIC[v.res]}/dk · ⏱${v.time}sn</div></div>`}).join('')}</div>`);
 $('sheet').querySelectorAll('.card').forEach(c=>c.onclick=()=>{startPlace(c.dataset.k);tutCheck()})}
function openQuests(){sheet(`<h3>📋 Görevler <button class="btn x close">✕</button></h3>${QUESTS.slice(Math.max(0,S.q-2),S.q+4).map((q,n)=>{const idx=Math.max(0,S.q-2)+n,done=idx<S.q;const v=Math.min(q.f(S),q.n);
 return `<div class="card" style="text-align:left;margin-bottom:8px;display:flex;gap:10px;align-items:center"><div class="ic" style="font-size:24px">${done?'✅':idx===S.q?'⭐':'⬜'}</div><div style="flex:1"><div class="nm">${q.t}</div><div class="cost">${done?'Tamamlandı':v+'/'+q.n} · Ödül ${costStr(q.r)}</div></div></div>`}).join('')}
 <div class="sec">Oyuncu seviyesi ${S.lv} · XP ${S.xp}/${xpNeed(S.lv)}</div>`)}
const SHOP=[
 {id:'starter',ic:'🎁',n:'Başlangıç Paketi',d:'100💎 + 500🪙 + 100🪵 + 1 inşaatçı (tek sefer)',p:'₺49,99',once:1,f:()=>{S.gems+=100;S.coins+=500;S.wood+=100;S.builders++}},
 {id:'g1',ic:'💎',n:'Bir Avuç Elmas',d:'80 💎',p:'₺29,99',f:()=>S.gems+=80},
 {id:'g2',ic:'💰',n:'Elmas Kesesi',d:'500 💎',p:'₺149,99',f:()=>S.gems+=500},
 {id:'g3',ic:'🏆',n:'Elmas Sandığı',d:'1200 💎',p:'₺299,99',f:()=>S.gems+=1200},
 {id:'vip',ic:'👑',n:'VIP Üyelik (aylık)',d:'Tüm üretim x1.5, +20 maksimum enerji',p:'₺99,99/ay',once:1,f:()=>{S.vip=true}},
 {id:'noads',ic:'🚫',n:'Reklamsız',d:'Ödüllü reklamları izlemeden ödülünü al',p:'₺79,99',once:1,f:()=>{S.noads=true}},
];
const GEMSHOP=[
 {ic:'⚡',n:'Enerjiyi doldur',d:'Enerji hemen dolar',c:10,f:()=>S.energy=maxEn()},
 {ic:'👷',n:'Ek inşaatçı',d:'Aynı anda bir bina daha kur',c:60,f:()=>S.builders++},
 {ic:'🌲',n:'Doğayı yenile',d:'Tüm ağaç ve kayalar hemen büyür',c:5,f:()=>{for(const k in S.g)if(S.g[k].rg)S.g[k].rg=1}},
 {ic:'⏩',n:'Tüm inşaatları bitir',d:'Kalan süreye göre: her 20sn = 1💎',c:null,f:()=>{for(const k in S.g)if(S.g[k].end)S.g[k].end=now()}},
];
function constrCost(){let s=0;for(const k in S.g)if(S.g[k].end)s+=Math.max(1,Math.ceil((S.g[k].end-now())/20000));return s}
function openShop(){sheet(`<h3>🛒 Mağaza <button class="btn x close">✕</button></h3><div class="demo">🧪 Demo mağaza — gerçek ödeme yok. Fiyatlar örnek amaçlıdır.</div><div class="shop">
 <div class="card"><span class="ic">📺</span><div><div class="nm">Ödüllü reklam</div><div class="cost">İzle: +10 ⚡ enerji</div></div><button class="btn o" data-ad>İzle</button></div>
 <div class="sec">Elmasla</div>${GEMSHOP.map((g,n)=>{const c=g.c??constrCost();return `<div class="card"><span class="ic">${g.ic}</span><div><div class="nm">${g.n}</div><div class="cost">${g.d}</div></div><button class="btn g" data-gs="${n}" ${c?'':'disabled'}>${c?c+' 💎':'—'}</button></div>`}).join('')}
 <div class="sec">Paketler</div>${SHOP.map(s=>{const own=s.once&&S['buy_'+s.id];return `<div class="card"><span class="ic">${s.ic}</span><div><div class="nm">${s.n}${s.id==='starter'?'<span class="tag">EN İYİ</span>':''}</div><div class="cost">${s.d}</div></div><button class="btn" data-s="${s.id}" ${own?'disabled':''}>${own?'Alındı':s.p}</button></div>`}).join('')}</div>`);
 const sh=$('sheet');sh.querySelector('[data-ad]').onclick=()=>{const g=()=>{S.energy+=10;ui();openShop()};S.noads?g():watchAd(g)};
 sh.querySelectorAll('[data-gs]').forEach(b=>b.onclick=()=>{const g=GEMSHOP[+b.dataset.gs];const c=g.c??constrCost();spendGems(c,g.n,()=>{g.f();SFX.coin();openShop()})});
 sh.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const s=SHOP.find(x=>x.id===b.dataset.s);confirmBuy(s.ic+' '+s.n,s.d,s.p,()=>{s.f();if(s.once)S['buy_'+s.id]=1;SFX.lvl();vib([20,30,20]);ui();save();openShop();toast('Demo satın alma tamamlandı ✓')})})}
$('bBuild').onclick=()=>{ac();openBuild();tutCheck()};$('bQuest').onclick=()=>{ac();openQuests()};$('bShop').onclick=()=>{ac();openShop()};$('pGem').onclick=()=>openShop();$('pEn').onclick=()=>openShop();
// ---------- TUTORIAL ----------
const hand=$('hand'),tip=$('tip');let tutTarget=null,tutDrag=null;
function nearest(pred){let best=null,bd=1e9;for(const k in S.g){const e=S.g[k];if(!pred(e,k))continue;const[i,j]=k.split(',').map(Number);const d=Math.hypot(i-6.5,j-6.5);if(d<bd){bd=d;best=k}}return best}
function tutCheck(){if(S.tut>=5){hand.style.display=tip.style.display='none';return}
 const tents=Object.entries(S.g).filter(([k,e])=>e.t==='b'&&e.k==='house');
 if(S.tut===0&&S.wood>=6)S.tut=1;
 if(S.tut===1&&tents.length>=2)S.tut=2;
 if(S.tut===2&&tents.some(([k,e])=>e.lv>=2)){S.tut=3;const h=tents.find(([k,e])=>e.lv>=2)[1];h.stored=Math.max(h.stored,25)}
 if(S.tut===3&&S.st.collect>=1){S.tut=5;hand.style.display=tip.style.display='none';setTimeout(()=>modal('<div style="font-size:54px">🏝️</div><h2>Harika gidiyorsun!</h2><p>Artık adan senin. Kaynak topla, bina kur, aynılarını birleştirip büyüt. Kumsallara dokunarak adanı genişlet. Görevler sana yol gösterecek!</p>',[['Başla!','']]),500);save()}}
function tutFrame(){tutDrag=null;tutTarget=null;if(S.tut>=5||$('modal').classList.contains('on')){hand.style.display=tip.style.display='none';return}
 let txt='',pos=null;const sheetOn=$('sheet').classList.contains('on');
 if(S.tut===0){const k=nearest(e=>e.t==='tree'&&!e.rg);txt=`🌲 Ağaçlara dokunup odun topla (${S.wood}/6)`;if(k)pos=scr(tw(...k.split(',').map(Number)).setY(.6))}
 else if(S.tut===1){const busy=Object.values(S.g).some(e=>e.end);
  if(placing){txt='Yeşil kareye dokunarak çadırı yerleştir';const k='6,6';const t=S.g[k]?freeTiles().sort((a,b)=>Math.hypot(a[0]-6.5,a[1]-6.5)-Math.hypot(b[0]-6.5,b[1]-6.5))[0]:[6,6];pos=scr(tw(...t))}
  else if(busy){txt='İnşaat sürüyor…';}
  else if(S.wood<3){txt='Bir ağaç daha kes';const k=nearest(e=>e.t==='tree'&&!e.rg);if(k)pos=scr(tw(...k.split(',').map(Number)).setY(.6))}
  else if(sheetOn){txt='⛺ Çadırı seç';const c=$('sheet').querySelector('[data-k=house]');if(c){const r=c.getBoundingClientRect();pos={x:r.left+r.width/2,y:r.top+r.height/2}}}
  else{txt='🔨 İnşa Et\'e dokun ve 2 çadır kur';const r=$('bBuild').getBoundingClientRect();pos={x:r.left+r.width/2,y:r.top+10}}}
 else if(S.tut===2){const ts=Object.entries(S.g).filter(([k,e])=>e.t==='b'&&e.k==='house'&&e.lv===1);
  if(ts.some(([k,e])=>e.end)||ts.length<2){txt='İnşaat sürüyor…'}else{txt='✨ Bir çadırı diğerinin üstüne sürükle → birleştir!';
   const a=scr(tw(...ts[0][0].split(',').map(Number)).setY(.4)),b=scr(tw(...ts[1][0].split(',').map(Number)).setY(.4));const t=(performance.now()%1600)/1600;const e=E.out(Math.min(1,t*1.4));pos={x:a.x+(b.x-a.x)*e,y:a.y+(b.y-a.y)*e};tutDrag=1}}
 else if(S.tut===3){const k=nearest(e=>e.t==='b'&&e.lv>=2);txt='🪙 Binanın üstündeki baloncuğa dokun, altını topla';if(k)pos=scr(tw(...k.split(',').map(Number)).setY(.9))}
 if(sheetOn&&S.tut!==1){pos=null}
 tip.style.display=txt?'block':'none';tip.textContent=txt;if(pos){hand.style.display='block';hand.style.left=pos.x+'px';hand.style.top=pos.y+'px';hand.classList.toggle('bob',!tutDrag)}else hand.style.display='none';
 tip.style.bottom=sheetOn?'auto':'120px';tip.style.top=sheetOn?'170px':'auto'}
// ---------- LOOP ----------
let last=performance.now(),acc=0,uiAcc=0,lblMap=new Map();
function tick(dt){const t=now();
 while(S.energy<maxEn()&&t-S.enT>=EN_T){S.energy++;S.enT+=EN_T}if(S.energy>=maxEn()&&t-S.enT>EN_T)S.enT=t;
 for(const k in S.g){const e=S.g[k];
  if(e.rg&&t>=e.rg){e.rg=0;syncOne(k);const g=meshes.get(k).g;g.scale.setScalar(.01);tween(500,q=>g.scale.setScalar(E.outB(q)))}
  if(e.t==='b'){if(e.end&&t>=e.end){e.end=0;const g=syncOne(k);popAnim(g,.6);SFX.build();const p=tw(...k.split(',').map(Number));burst(p.clone().setY(.4),0xffd84a,10);tutCheck()}
   else if(!e.end){const r=rateOf(e.k,e.lv);e.stored=Math.min(r*120,e.stored+r*dt/60)}}}}
function labels(){const seen=new Set();for(const k in S.g){const e=S.g[k];if(e.t==='b'&&e.end){seen.add(k);let d=lblMap.get(k);if(!d){d=document.createElement('div');d.className='lbl';$('fx').appendChild(d);lblMap.set(k,d)}
  const s=scr(tw(...k.split(',').map(Number)).setY(1));d.style.left=s.x+'px';d.style.top=s.y+'px';d.textContent='⏱ '+Math.max(0,Math.ceil((e.end-now())/1000))+'sn'}}
 for(const[k,d]of lblMap)if(!seen.has(k)){d.remove();lblMap.delete(k)}}
function frame(){const tn=performance.now(),dt=Math.min(.1,(tn-last)/1000);last=tn;const T=tn/1000;
 for(let n=tweens.length-1;n>=0;n--){const w=tweens[n];const t=Math.min(1,(tn-w.t0)/w.dur);w.fn(t);if(t>=1){tweens.splice(n,1);w.done&&w.done()}}
 for(let n=parts.length-1;n>=0;n--){const p=parts[n];p.life-=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*5;p.m.scale.setScalar(Math.max(.01,p.life));if(p.life<=0){scene.remove(p.m);parts.splice(n,1)}}
 const a=wpos.array;for(let n=0;n<a.length;n+=3){const x=wbase[n],z=wbase[n+2];a[n+1]=Math.sin(x*.5+T*1.3)*.12+Math.cos(z*.6+T)*.1}wpos.needsUpdate=true;water.geometry.computeVertexNormals();
 clouds.forEach((c,n)=>{c.position.y+=Math.sin(T+n)*dt*.1});
 for(const[k,m]of meshes){const e=S.g[k];if(!e)continue;const b=m.g.userData.bub;
  if(b){const r=rateOf(e.k,e.lv);b.visible=e.stored>=Math.max(1,r*.25)&&!(drag&&drag.k===k);b.position.y=1.15+e.lv*.12+Math.sin(T*3+k.length)*.06}
  m.g.traverse(o=>{if(o.userData.spin)o.rotation.z+=dt*2})}
 acc+=dt;if(acc>.25){tick(acc);acc=0}uiAcc+=dt;if(uiAcc>.5){ui();uiAcc=0}
 updCam();renderer.render(scene,camera);labels();tutFrame();requestAnimationFrame(frame)}
// ---------- START ----------
resize();buildGround();syncAll();ui();
{const off=(now()-S.saved)/1000;if(!isNew&&off>60){let gain={coins:0,wood:0,stone:0};const m=Math.min(off,4*3600)/60;
 for(const k in S.g){const e=S.g[k];if(e.t==='b'&&!e.end)gain[KINDS[e.k].res]+=rateOf(e.k,e.lv)*m*.5}
 for(const r in gain)gain[r]=Math.floor(gain[r]);
 if(gain.coins+gain.wood+gain.stone>0){const g=costStr(Object.fromEntries(Object.entries(gain).filter(([r,v])=>v>0)));
  setTimeout(()=>modal(`<div style="font-size:50px">🌙</div><h2>Tekrar hoş geldin!</h2><p>Sen yokken adan çalıştı (${Math.floor(off/60)} dk):<br><b style="font-size:20px">${g}</b></p>`,[['Al','',()=>{give(gain,innerWidth/2,innerHeight/2);ui();save()}],['📺 x2 Al (reklam)','o',()=>{const f=()=>{for(const r in gain)gain[r]*=2;give(gain,innerWidth/2,innerHeight/2);ui();save()};S.noads?f():watchAd(f)}]]),600)}}}
$('loading').remove();
tutCheck();requestAnimationFrame(frame);setInterval(save,5000);addEventListener('visibilitychange',()=>document.hidden&&save());
$('modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')closeModal()});
window.__g={S,tap,merge,syncAll,buildGround,cam,save,openShop,openBuild,KINDS,tw,scr,ui,meshes,setS:s=>{S=s;buildGround();syncAll();ui()}};
