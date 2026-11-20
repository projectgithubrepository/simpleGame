import {clamp,intersects,nextSpawnInterval,calculateScore} from "./game-core.js";
const $=s=>document.querySelector(s),canvas=$("#game"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
const specialScene=$("#special-scene");
const scoreEl=$("#score"),bestEl=$("#best-score"),coinsEl=$("#coins"),statusEl=$("#status"),overlay=$("#overlay"),titleEl=$("#overlay-title"),copyEl=$("#overlay-copy"),eyebrowEl=$("#overlay-eyebrow"),playButton=$("#play-button"),soundButton=$("#sound-button"),shipPicker=$("#ship-picker"),powerupStatus=$("#powerup-status"),specialButton=$("#special-button"),specialHelp=$("#special-help");
const names=["Viper","Phantom","Titan"],palettes=[["#50f6ed","#167d9b","#ff4e9b"],["#c5a6ff","#6246bd","#ffe17a"],["#ffb45c","#a83f32","#fff0d0"]];
let ship=Math.max(0,Math.min(2,Number(localStorage.getItem("neon-dodge-ship"))||0));
let coins=Math.max(0,Number(localStorage.getItem("neon-dodge-coins"))||0),best=Number(localStorage.getItem("neon-dodge-best"))||0;
const player={x:W/2-18,y:H-92,w:36,h:42,speed:330,tilt:0,shield:false,thrustDir:0,thrustPulse:0};
let obstacles=[],pickups=[],particles=[],running=false,elapsed=0,spawn=0,coinTimer=.8,powerTimer=5,slow=0,last=0,pointer=0,sound=false,audio=null,specialCooldown=0,specialTimer=0,specialCinematic=0,specialCinematicAge=0;
const keys=new Set();bestEl.textContent=best;coinsEl.textContent=coins;
// Pixel-art assets are authored on a 32x32 logical canvas and enlarged with
// nearest-neighbour sampling. The layered extrusion gives each sprite a solid edge.
function pixelCanvas(){const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d");g.imageSmoothingEnabled=false;return [c,g];}
function pxPoly(g,pts,color){g.fillStyle=color;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
function makeShip(index){
 const [c,g]=pixelCanvas(),[glow,mid,hot]=palettes[index];
 const hull=index===0?[[16,1],[19,8],[28,16],[25,21],[22,20],[21,28],[16,25],[11,28],[10,20],[7,21],[4,16],[13,8]]:
 index===1?[[16,1],[21,6],[26,14],[25,24],[16,28],[7,24],[6,14],[11,6]]:
 [[16,1],[20,7],[30,13],[27,22],[22,21],[21,30],[11,30],[10,21],[5,22],[2,13],[12,7]];
 // Deep shadow silhouette and hard-edged alloy facets.
 pxPoly(g,hull,"#080e1d");pxPoly(g,hull.map(([x,y])=>[x,y-1]),mid);
 pxPoly(g,[[16,3],[19,9],[25,15],[21,18],[18,16],[16,10],[14,16],[11,18],[7,15],[13,9]],glow);
 pxPoly(g,[[16,5],[19,12],[16,22],[13,12]],"#d9f8ff");
 pxPoly(g,[[15,7],[16,6],[17,12],[16,17],[15,12]],"#ffffff");
 // Wing armor, panel cuts and colored edge pixels.
 pxPoly(g,[[6,15],[12,12],[13,19],[9,22],[5,19]],hot);
 pxPoly(g,[[26,15],[20,12],[19,19],[23,22],[27,19]],hot);
 pxPoly(g,[[7,16],[11,14],[10,18],[7,19]],"#f5d7a4");
 pxPoly(g,[[25,16],[21,14],[22,18],[25,19]],"#f5d7a4");
 g.fillStyle="#101d32";g.fillRect(14,18,4,5);g.fillStyle="#8ffcff";g.fillRect(15,11,2,7);
 g.fillStyle="#f4ffff";g.fillRect(12,20,2,1);g.fillRect(18,20,2,1);
 // Engine housings and hot pixel exhaust.
 g.fillStyle="#0a1324";g.fillRect(11,24,4,5);g.fillRect(17,24,4,5);
 g.fillStyle="#ff7a36";g.fillRect(12,25,2,5);g.fillRect(18,25,2,5);
 g.fillStyle="#fff2b0";g.fillRect(12,26,1,3);g.fillRect(18,26,1,3);
 // Tiny rivets and edge highlights make the silhouette read at phone size.
 g.fillStyle="#eaffff";g.fillRect(8,17,1,1);g.fillRect(23,17,1,1);g.fillRect(16,3,1,2);
 g.fillStyle="#263d5d";g.fillRect(10,22,2,1);g.fillRect(20,22,2,1);
 return c;
}
function makeRock(){
 const [c,g]=pixelCanvas();
 const body=[[10,2],[22,3],[29,10],[27,22],[21,29],[8,27],[2,19],[4,8]];
 pxPoly(g,body,"#080e1b");pxPoly(g,body.map(([x,y])=>[x,y-1]),"#536987");
 pxPoly(g,[[6,8],[12,4],[21,5],[24,10],[15,14],[5,14]],"#c4d3e7");
 pxPoly(g,[[5,15],[15,14],[19,20],[13,27],[6,23]],"#758ba9");
 pxPoly(g,[[16,14],[25,10],[27,21],[20,27],[14,23]],"#273a58");
 pxPoly(g,[[8,8],[12,6],[14,10],[10,12]],"#f2f6ff");
 g.fillStyle="#18253d";g.fillRect(8,16,5,4);g.fillRect(18,15,5,5);
 g.fillStyle="#9eafc9";g.fillRect(5,20,5,2);g.fillRect(21,8,4,2);
 g.fillStyle="#dce8f7";g.fillRect(14,4,5,1);g.fillRect(25,13,2,3);
 g.fillStyle="#111c30";g.fillRect(12,24,4,2);
 return c;
}
function makeMine(){
 const [c,g]=pixelCanvas();
 g.fillStyle="#160b22";g.fillRect(11,2,10,28);g.fillRect(2,11,28,10);
 g.fillStyle="#9e286c";g.fillRect(13,1,6,30);g.fillRect(1,13,30,6);
 g.fillStyle="#ff78ba";g.fillRect(14,3,4,26);g.fillRect(3,14,26,4);
 g.fillStyle="#ffe3f2";g.fillRect(14,5,2,8);g.fillRect(5,14,8,2);
 g.fillStyle="#40143d";g.fillRect(13,13,6,6);g.fillStyle="#fff1f8";g.fillRect(14,14,3,3);
 g.fillStyle="#ffb3d8";g.fillRect(9,9,2,2);g.fillRect(21,9,2,2);g.fillRect(9,21,2,2);g.fillRect(21,21,2,2);
 return c;
}
function stackSprite(img){
 const c=document.createElement("canvas");c.width=c.height=96;const g=c.getContext("2d");g.imageSmoothingEnabled=false;
 // Offset copies form a visible dark sidewall, not a blurred glow.
 for(let z=10;z>=1;z--){g.globalAlpha=.18+z*.035;g.drawImage(img,18+z*.65,18-z*.35,60,60);}
 g.globalAlpha=1;g.drawImage(img,18,18,60,60);return c;
}
const volumes=new WeakMap();
const ships=names.map((_,i)=>makeShip(i)),rock=makeRock(),mine=makeMine();
[...ships,rock,mine].forEach(img=>volumes.set(img,stackSprite(img)));
function makeBackdrop(){
 const b=document.createElement("canvas");b.width=120;b.height=160;const g=b.getContext("2d");g.imageSmoothingEnabled=false;
 g.fillStyle="#050a18";g.fillRect(0,0,120,160);
 // Pixel clusters form distant nebulae; restrained values keep hazards readable.
 const cloud=(cx,cy,rx,ry,color,step)=>{g.fillStyle=color;for(let y=-ry;y<=ry;y+=step)for(let x=-rx;x<=rx;x+=step){const n=Math.sin((x+cx)*.31)*Math.cos((y+cy)*.27);if((x*x/(rx*rx)+y*y/(ry*ry))<.78+n*.13)g.fillRect(cx+x,cy+y,step,step);}};
 cloud(24,38,31,25,"#101a39",4);cloud(91,87,35,28,"#17102f",4);cloud(58,132,27,17,"#0c1c36",3);
 let seed=913;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<155;i++){const x=Math.floor(rnd()*120),y=Math.floor(rnd()*160),v=rnd();g.fillStyle=v>.91?"#b9f8ff":v>.65?"#577da9":"#26385f";g.fillRect(x,y,v>.94?2:1,v>.94?2:1);}
 g.fillStyle="#1d3155";for(let y=0;y<160;y+=20)g.fillRect(0,y,120,1);
 return b;
}
const backdrop=makeBackdrop();

function drawStack(img,x,y,size,angle=0){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.imageSmoothingEnabled=false;ctx.drawImage(volumes.get(img)||img,-size*.62,-size*.62,size*1.24,size*1.24);ctx.imageSmoothingEnabled=true;ctx.restore();}
function picker(){shipPicker.innerHTML=names.map((n,i)=>'<button type="button" data-ship="'+i+'" class="'+(ship===i?"selected":"")+'" aria-pressed="'+(ship===i)+'" '+(running?"disabled":"")+'>'+n+'</button>').join("");shipPicker.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{if(running)return;ship=Number(b.dataset.ship);localStorage.setItem("neon-dodge-ship",String(ship));picker();draw();
updateSpecialButton();powerupStatus.textContent="Nave selecionada: "+names[ship]+". A escolha fica bloqueada ao iniciar.";}));shipPicker.classList.toggle("locked",running);}
picker();
function beep(f=440,d=.07){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
function updateSpecialButton(){if(!specialButton)return;specialButton.disabled=!running||specialCooldown>0;specialButton.textContent=!running?"ESPECIAL":specialCooldown>0?"ESPECIAL · "+Math.ceil(specialCooldown)+"s":"ATIVAR ESPECIAL";if(specialHelp){const tips=["OVERDRIVE: acelera 48% por 2,2s.","FASE: atravessa destroços por 1,25s.","PULSO EMP: destroços 50% mais lentos por 3,2s."];specialHelp.textContent=tips[ship]+" Recarga: 18s.";}}
function activateSpecial(){if(!running||specialCooldown>0)return;specialCooldown=18;specialTimer=0;specialCinematic=3;specialCinematicAge=0;if(ship===0){specialTimer=2.2;powerupStatus.textContent="VIPER — OVERDRIVE: velocidade +48% por 2,2 segundos.";}else if(ship===1){specialTimer=1.25;powerupStatus.textContent="PHANTOM — FASE: atravessa destroços por 1,25 segundo.";}else{slow=Math.max(slow,3.2);powerupStatus.textContent="TITAN — PULSO EMP: destroços 50% mais lentos por 3,2 segundos.";}updateSpecialButton();beep(980,.12);}
function reset(){obstacles=[];pickups=[];particles=[];elapsed=0;spawn=0;coinTimer=.5;powerTimer=5;slow=0;specialCooldown=0;specialTimer=0;specialCinematic=0;specialCinematicAge=0;specialScene?.classList.remove("active");player.x=W/2-player.w/2;player.tilt=0;player.shield=false;player.thrustDir=0;player.thrustPulse=0;powerupStatus.textContent="MOEDA: +5 moedas. ESCUDO: absorve uma colisão. LENTIDÃO: destroços 50% mais lentos por 5s.";updateSpecialButton();}
function start(){reset();running=true;picker();updateSpecialButton();last=performance.now();overlay.classList.add("hidden");statusEl.textContent="JOGANDO";requestAnimationFrame(loop);beep(620);}
function finish(){running=false;specialCinematic=0;specialScene?.classList.remove("active");updateSpecialButton();const s=calculateScore(elapsed);if(s>best){best=s;localStorage.setItem("neon-dodge-best",String(best));bestEl.textContent=best;}statusEl.textContent="FIM";picker();eyebrowEl.textContent="FIM DE JOGO";titleEl.innerHTML="GAME<br><span>OVER</span>";copyEl.textContent="Pontos: "+s+". Recorde: "+best+". Moedas acumuladas: "+coins+".";playButton.innerHTML="JOGAR NOVAMENTE <span>→</span>";overlay.classList.remove("hidden");}
function spawnObstacle(){const z=30+Math.random()*22;obstacles.push({x:Math.random()*(W-z),y:-42,w:z,h:z,v:180+Math.min(190,elapsed*4)+Math.random()*45,type:Math.random()<.35?"mine":"rock",angle:Math.random()*6,spin:Math.random()<.38?(Math.random()<.5?-1:1)*(1.1+Math.random()*1.5):0});}
function spawnCoin(){pickups.push({x:28+Math.random()*(W-56),y:-24,r:15,v:190,type:"coin",phase:0});}
function spawnPower(){const type=Math.random()<.58?"shield":"slow";pickups.push({x:32+Math.random()*(W-64),y:-28,r:17,v:165,type,phase:0});}
function burst(x,y,color="#ffd45a"){for(let i=0;i<18;i++)particles.push({x,y,vx:(Math.random()-.5)*250,vy:(Math.random()-.5)*250,life:.55,color});}
function collect(p){if(p.type==="coin"){coins+=5;localStorage.setItem("neon-dodge-coins",String(coins));coinsEl.textContent=coins;powerupStatus.textContent="MOEDA COLETADA: +5. Saldo total: "+coins+"." ;burst(p.x,p.y);}else if(p.type==="shield"){player.shield=true;powerupStatus.textContent="ESCUDO ATIVO: o próximo impacto será bloqueado. O anel azul mostra que está ligado.";}else{slow=5;powerupStatus.textContent="LENTIDÃO ATIVA: destroços 50% mais lentos por 5 segundos.";}beep(820);}
function update(dt){
 elapsed+=dt;specialCooldown=Math.max(0,specialCooldown-dt);specialTimer=Math.max(0,specialTimer-dt);specialCinematic=Math.max(0,specialCinematic-dt);if(specialCinematic<=0)specialScene?.classList.remove("active");specialCinematicAge+=dt;updateSpecialButton();
 const k=(keys.has("ArrowRight")||keys.has("d")||keys.has("D")?1:0)-(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")?1:0),dir=k||pointer;
 player.x=clamp(player.x+dir*player.speed*(ship===0&&specialTimer>0?1.48:1)*dt,8,W-player.w-8);
 player.thrustDir=dir;player.thrustPulse+=dt*(dir?22:8);
 // Tilt follows input briefly and returns to level; it never accumulates into a full spin.
 player.tilt+=(dir*.24-player.tilt)*Math.min(1,dt*11);
 slow=Math.max(0,slow-dt);
 spawn+=dt*1000;if(spawn>=nextSpawnInterval(calculateScore(elapsed))){spawn=0;spawnObstacle();}
 coinTimer-=dt;if(coinTimer<=0){spawnCoin();coinTimer=1.75;}
 powerTimer-=dt;if(powerTimer<=0){spawnPower();powerTimer=8.5;}
 obstacles.forEach(o=>{o.y+=o.v*dt*(slow>0?.5:1);o.angle+=o.spin*dt;});obstacles=obstacles.filter(o=>o.y<H+55);
 pickups.forEach(p=>{p.y+=p.v*dt;p.phase+=dt*3;});pickups=pickups.filter(p=>p.y<H+35);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
 const hit={x:player.x+7,y:player.y+8,width:player.w-14,height:player.h-16};
 for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];if(intersects(hit,{x:o.x+4,y:o.y+4,width:o.w-8,height:o.h-8})){if(ship===1&&specialTimer>0){obstacles.splice(i,1);burst(player.x+18,player.y+20,"#b8a0ff");}else if(player.shield){player.shield=false;obstacles.splice(i,1);burst(player.x+18,player.y+20,"#50f6ed");powerupStatus.textContent="ESCUDO USADO: impacto bloqueado. O próximo destroço pode encerrar a partida.";}else{burst(player.x+18,player.y+20,"#ff4e9b");finish();return;}}}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];if(Math.hypot(p.x-(player.x+18),p.y-(player.y+21))<p.r+19){collect(p);pickups.splice(i,1);}}
 scoreEl.textContent=calculateScore(elapsed);
}
function drawThruster(){if(!player.thrustDir)return;const movingRight=player.thrustDir>0,flame=13+Math.sin(player.thrustPulse)*7;ctx.save();ctx.translate(player.x+18,player.y+21);ctx.rotate(player.tilt);const edge=movingRight?-18:18,tip=edge+(movingRight?-flame:flame);ctx.shadowColor="#ff8a35";ctx.shadowBlur=24;const grad=ctx.createLinearGradient(edge,0,tip,0);grad.addColorStop(0,"#fffbd0");grad.addColorStop(.35,"#ffbd48");grad.addColorStop(1,"#ff3d35");ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(edge,-6);ctx.quadraticCurveTo((edge+tip)/2,-12,tip,0);ctx.quadraticCurveTo((edge+tip)/2,12,edge,6);ctx.closePath();ctx.fill();ctx.fillStyle="#fff";ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(edge,-2);ctx.lineTo(tip*.82,0);ctx.lineTo(edge,2);ctx.closePath();ctx.fill();ctx.restore();}
function drawShip(){ctx.save();ctx.translate(player.x+18,player.y+21);ctx.rotate(player.tilt);if(ship===1&&specialTimer>0){ctx.globalAlpha=.48;ctx.strokeStyle="#c5a6ff";ctx.lineWidth=3;ctx.shadowBlur=20;ctx.shadowColor="#c5a6ff";ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}if(player.shield){ctx.strokeStyle="#50f6ed";ctx.lineWidth=3;ctx.shadowBlur=18;ctx.shadowColor="#50f6ed";ctx.beginPath();ctx.arc(0,0,33,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#50f6ed22";ctx.fill();ctx.shadowBlur=0;}drawStack(ships[ship],0,0,57);ctx.restore();drawThruster();}
function drawSpecialCinematic(){
 if(specialCinematic<=0)return;
 const t=3-specialCinematic,fade=Math.min(1,t/.16,specialCinematic/.22);
 const accent=palettes[ship][0],mid=palettes[ship][1],hot=palettes[ship][2];
 const rw=480,rh=640,frame=document.createElement("canvas");frame.width=rw;frame.height=rh;
 const g=frame.getContext("2d");g.imageSmoothingEnabled=false;
 const clamp01=v=>Math.max(0,Math.min(1,v));
 const ease=v=>{v=clamp01(v);return v*v*(3-2*v);};
 const approach=ease((t-.18)/.82),grab=ease((t-.9)/.62),power=ease((t-1.65)/.72);
 const shake=power*(Math.sin(t*48)*1.15+Math.sin(t*27)*.65);
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const poly=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 const profiles=[
  {name:"VIPER // OVERDRIVE",w:10.5,wall:"#172c3b",armor:"#31566a",trim:"#50f6ed",seat:"#122c39",display:"cyan",style:0},
  {name:"PHANTOM // PHASE SHIFT",w:11.5,wall:"#211d38",armor:"#453765",trim:"#c5a6ff",seat:"#211b39",display:"violet",style:1},
  {name:"TITAN // EMP BURST",w:13,wall:"#30271f",armor:"#65503a",trim:"#ffb45c",seat:"#30271f",display:"amber",style:2}
 ];
 const p=profiles[ship],voxels=[];
 const addBox=(x,y,z,w,h,d,color,s=.42,skip)=>{
  const nx=Math.max(1,Math.ceil(w/s)),ny=Math.max(1,Math.ceil(h/s)),nz=Math.max(1,Math.ceil(d/s));
  for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++)for(let iz=0;iz<nz;iz++){
   if(skip&&skip(ix,iy,iz,nx,ny,nz))continue;
   voxels.push({x:x+ix*s,y:y+iy*s,z:z+iz*s,sx:Math.min(s,w-ix*s),sy:Math.min(s,h-iy*s),sz:Math.min(s,d-iz*s),color});
  }
 };
 const project=(x,y,z)=>{
  const depth=z+10,scale=270/depth;
  return [240+x*scale+shake,354-(y-5.2)*scale];
 };
 const shade=(hex,f)=>{
  const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,((n>>16)&255)*f)),gg=Math.max(0,Math.min(255,((n>>8)&255)*f)),b=Math.max(0,Math.min(255,(n&255)*f));
  return "rgb("+r+","+gg+","+b+")";
 };
 const face=(pts,color)=>poly(pts,color);
 const drawVoxel=v=>{
  const {x,y,z,sx,sy,sz,color}=v;
  const a=project(x,y,z),b=project(x+sx,y,z),c=project(x+sx,y+sy,z),d=project(x,y+sy,z);
  const e=project(x,y,z+sz),f=project(x+sx,y,z+sz),h=project(x+sx,y+sy,z+sz),i=project(x,y+sy,z+sz);
  face([a,b,c,d],shade(color,.55));
  face([b,f,h,c],shade(color,.38));
  face([d,c,h,i],shade(color,1.34));
  face([a,d,i,project(x,y+sy,z+sz)],shade(color,.78));
 };
 const plate=(x,y,z,w,h,color)=>addBox(x,y,z,w,h,.42,color,.28);
 const screen=(x,y,z,w,h,kind,index)=>{
  addBox(x-.22,y-.22,z,w+.44,h+.44,.52,p.armor,.28);
  addBox(x,y,z+.5,w,h,.12,"#030a12",.22);
  const base=kind==="radar"?"#20f0b2":kind==="violet"?"#c7a2ff":"#55dfff";
  const grad=g.createLinearGradient(0,0,0,90);grad.addColorStop(0,kind==="radar"?"#103b37":"#142c43");grad.addColorStop(1,"#06101c");
  // Screen glass is a continuous inset surface; fine vector traces sit on top of the voxel bezel.
  const a=project(x,y,z+.66),b=project(x+w,y,z+.66),c=project(x+w,y+h,z+.66),d=project(x,y+h,z+.66);
  poly([a,b,c,d],grad);
  const sx=project(x+.12,y+.14,z+.7),ex=project(x+w-.12,y+h-.14,z+.7);
  g.save();g.beginPath();g.moveTo(...a);g.lineTo(...b);g.lineTo(...c);g.lineTo(...d);g.closePath();g.clip();
  g.strokeStyle=base;g.globalAlpha=.8;g.lineWidth=1.4;
  for(let k=0;k<5;k++){g.beginPath();g.moveTo(sx[0],sx[1]+k*4);g.lineTo(ex[0],sx[1]+k*4);g.stroke();}
  g.globalAlpha=.5;g.beginPath();g.arc((a[0]+b[0])/2,(a[1]+d[1])/2,Math.min(w,h)*4,0,Math.PI*2);g.stroke();
  g.globalAlpha=1;g.fillStyle=base;for(let k=0;k<8;k++)g.fillRect(a[0]+5+k*5,a[1]+5+(k%3)*4,2,2);
  g.restore();
  addBox(x+.18,y+.12,z+.8,.45,.08,.08,hot,.12);
 };
 // Cockpit atmosphere: deep space through armored glass, with real light falloff.
 const bg=g.createLinearGradient(0,0,0,rh);bg.addColorStop(0,"#02040a");bg.addColorStop(.42,"#0a1725");bg.addColorStop(1,"#03060d");g.fillStyle=bg;g.fillRect(0,0,rw,rh);
 const outside=g.createRadialGradient(240,210,5,240,210,290);outside.addColorStop(0,ship===1?"rgba(111,74,180,.30)":ship===2?"rgba(180,105,42,.28)":"rgba(30,139,164,.28)");outside.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=outside;g.fillRect(0,0,rw,rh);
 // Distant stars and planet horizon visible only through the canopy opening.
 let seed=ship*913+271;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let k=0;k<105;k++){const x=rnd()*rw,y=rnd()*300;rect(x,y,rnd()>.9?2:1,rnd()>.9?2:1,rnd()>.5?"#8db8d5":"#425d7b");}
 g.save();g.globalAlpha=.32;g.fillStyle=ship===1?"#7053a0":ship===2?"#b06c38":"#236b83";g.beginPath();g.ellipse(240,232,150,52,0,0,Math.PI*2);g.fill();g.restore();
 // The pilot seat and floor connect the foreground to the dashboard: no detached props.
 addBox(-p.w*.58,-.3,1,p.w*1.16,.55,12,"#080e17",.38);
 addBox(-p.w*.48,.1,1.4,p.w*.96,.38,10,p.wall,.38);
 addBox(-4.2,.35,1.8,8.4,5.8,2.1,p.seat,.38);
 addBox(-3.65,1.0,1.25,7.3,4.8,.65,p.armor,.32);
 addBox(-3.1,1.5,.95,6.2,3.9,.28,"#111c2b",.25);
 for(let x=-3.3;x<=3.3;x+=.55)addBox(x,.15,1.2,.12,.2,1.2,p.trim,.12);
 // Side hulls rise from the floor and curve inward toward the canopy, framing the pilot.
 for(const side of [-1,1]){
  addBox(side*(p.w*.48),.2,2,1.05,7.3,12,p.wall,.38);
  addBox(side*(p.w*.43),.6,2.3,.34,6.4,10.8,p.armor,.3);
  addBox(side*(p.w*.39),6.6,9,.72,.7,4.5,p.trim,.28);
  addBox(side*(p.w*.49),7.35,12,.75,.6,3.2,"#0a111b",.28);
  for(let k=0;k<7;k++)addBox(side*(p.w*.43),1.1+k*.78,3.1+k*.8,.42,.12,1.25,k%2?mid:p.trim,.16);
  // Side console is physically seated on the side hull, with bevels and inset hardware.
  addBox(side*(p.w*.34)-1.0,1.1,4.1,2.0,.8,6.2,p.wall,.32);
  addBox(side*(p.w*.34)-.83,1.83,4.45,1.66,.18,5.55,p.armor,.24);
  for(let k=0;k<5;k++){
   addBox(side*(p.w*.34)-.66,2.02,4.8+k*.88,.32,.18,.34,k%2?hot:p.trim,.16);
   addBox(side*(p.w*.34)-.1,2.02,4.8+k*.88,.22,.12,.22,"#d8e2e8",.11);
  }
  addBox(side*(p.w*.34)-.25,2.05,8.95,.55,.42,.55,"#0a111b",.18);
 }
 // Canopy frame, thick seals and overhead ribs form one continuous cabin shell.
 addBox(-p.w*.53,7.45,12.8,p.w*1.06,.65,1.1,"#101b2a",.32);
 addBox(-p.w*.46,8.0,13.1,p.w*.92,.42,.65,p.armor,.28);
 for(let side of [-1,1])addBox(side*(p.w*.49),5.5,13.0,.72,3.0,.8,p.armor,.3);
 for(let k=0;k<5;k++)addBox(-p.w*.43+k*p.w*.215,7.85,13.2,.16,.42,.5,p.trim,.12);
 const glassA=project(-p.w*.43,4.5,13.55),glassB=project(p.w*.43,4.5,13.55),glassC=project(p.w*.43,7.7,13.55),glassD=project(-p.w*.43,7.7,13.55);
 const glass=g.createLinearGradient(0,130,0,330);glass.addColorStop(0,"rgba(30,76,106,.28)");glass.addColorStop(.55,"rgba(9,24,40,.12)");glass.addColorStop(1,"rgba(30,75,95,.34)");
 poly([glassA,glassB,glassC,glassD],glass);
 g.save();g.globalAlpha=.18;g.strokeStyle="#bcecff";g.lineWidth=3;g.beginPath();g.moveTo(...glassD);g.lineTo(...glassA);g.stroke();g.restore();
 // Dashboard is a continuous armored bulkhead, with recessed screens, not floating tiles.
 const dashW=p.w*1.72;
 addBox(-dashW/2,3.15,10.4,dashW,3.8,1.55,p.wall,.32);
 addBox(-dashW/2+.35,3.42,10.0,dashW-.7,3.25,.42,p.armor,.28);
 addBox(-dashW/2+.6,3.72,9.72,dashW-1.2,2.72,.25,"#080f18",.22);
 // Each ship gets a different dashboard architecture and display arrangement.
 if(ship===0){
  // Viper: slim swept instrument wings, paired cyan tactical displays.
  addBox(-10,5.8,9.6,4.1,.42,.9,p.trim,.24);addBox(5.9,5.8,9.6,4.1,.42,.9,p.trim,.24);
  screen(-8.8,4.45,9.55,3.2,1.85,"cyan",0);screen(-4.9,4.55,9.55,3.0,1.65,"radar",1);
  screen(1.9,4.55,9.55,3.0,1.65,"radar",2);screen(5.6,4.45,9.55,3.2,1.85,"cyan",3);
  addBox(-1.25,3.5,9.4,2.5,2.4,.8,"#102a38",.25);
 }else if(ship===1){
  // Phantom: hooded central visor, asymmetric violet holographic glass and angular armor.
  addBox(-9.5,6.2,9.2,19,.55,1.4,"#100e20",.3);
  addBox(-8.8,6.0,9.0,17.6,.22,.5,p.trim,.2);
  screen(-8.5,4.35,9.5,4.2,2.0,"violet",0);screen(-3.4,4.1,9.5,6.8,2.35,"radar",1);screen(4.4,4.35,9.5,4.0,2.0,"violet",2);
  addBox(-1.4,3.35,9.35,2.8,2.75,.8,"#211936",.24);
 }else{
  // Titan: broad reinforced bulkhead, six rugged displays and a raised command spine.
  addBox(-11.2,6.0,9.0,22.4,.85,1.6,"#17130f",.36);
  screen(-10,4.35,9.5,3.0,1.8,"amber",0);screen(-6.4,4.35,9.5,3.0,1.8,"radar",1);
  screen(-2.8,4.35,9.5,2.7,1.8,"amber",2);screen(.5,4.35,9.5,2.7,1.8,"radar",3);
  screen(3.8,4.35,9.5,3.0,1.8,"amber",4);screen(7.4,4.35,9.5,3.0,1.8,"radar",5);
  addBox(-1.1,3.3,9.1,2.2,2.8,1.1,"#54402b",.3);
 }
 // Lower switch banks are bolted into the dashboard lip.
 addBox(-8.2,3.25,8.8,16.4,.52,1.4,"#090f18",.3);
 for(let k=0;k<24;k++){
  const x=-7.8+k*.68;
  addBox(x,3.42,8.55,.26,.18,.36,k%4===0?hot:k%3===0?p.trim:"#718294",.12);
 }
 // Forward center console rises continuously from the cockpit floor to the dash.
 addBox(-5.4,.45,4.4,10.8,1.0,5.5,p.wall,.36);
 addBox(-5.0,1.15,4.65,10.0,.32,4.9,p.armor,.28);
 addBox(-4.6,1.38,4.95,9.2,.12,4.25,"#080f18",.2);
 for(let row=0;row<3;row++)for(let col=0;col<14;col++)addBox(-4.25+col*.65,1.55,5.25+row*1.1,.28,.12,.48,(col+row)%5===0?hot:p.trim,.12);
 // Throttle housing is bolted to the center console; the shaft pivots from its socket.
 const lx=ship===2?2.45:1.95, lz=5.15,leverAngle=grab*.52;
 addBox(lx-1.05,1.45,lz-.85,2.1,.5,1.8,"#090f18",.28);
 addBox(lx-.82,1.88,lz-.58,1.64,.24,1.25,p.armor,.22);
 const pivot=project(lx,2.0,lz),tip=project(lx+Math.sin(leverAngle)*.45,4.05-grab*.35,lz-.22);
 g.save();g.lineCap="round";g.strokeStyle="#101821";g.lineWidth=15;g.beginPath();g.moveTo(...pivot);g.lineTo(...tip);g.stroke();
 g.strokeStyle="#aab9c6";g.lineWidth=7;g.beginPath();g.moveTo(...pivot);g.lineTo(...tip);g.stroke();
 g.strokeStyle=p.trim;g.lineWidth=2;g.beginPath();g.moveTo(...pivot);g.lineTo(...tip);g.stroke();
 g.fillStyle="#080d15";g.beginPath();g.ellipse(tip[0],tip[1],13,17,-.25,0,Math.PI*2);g.fill();
 g.fillStyle=mid;g.beginPath();g.ellipse(tip[0]-2,tip[1]-3,9,12,-.25,0,Math.PI*2);g.fill();
 g.restore();
 // Pilot arm grows naturally out of the right-side sleeve; glove reaches and wraps the grip.
 const armStart=project(p.w*.39,2.0,2.5),armMid=project(p.w*.27-approach*1.3,2.45+grab*.25,4.0),hand=project(lx+.15,3.75-grab*.55,lz-.55);
 g.save();g.lineCap="round";g.lineJoin="round";
 g.strokeStyle="#080e17";g.lineWidth=58;g.beginPath();g.moveTo(...armStart);g.lineTo(...armMid);g.lineTo(...hand);g.stroke();
 g.strokeStyle=ship===2?"#746047":ship===1?"#51466f":"#49657a";g.lineWidth=48;g.beginPath();g.moveTo(...armStart);g.lineTo(...armMid);g.lineTo(...hand);g.stroke();
 g.strokeStyle=ship===2?"#b28a55":ship===1?"#9280b8":"#91a9bc";g.lineWidth=25;g.beginPath();g.moveTo(armMid[0]-3,armMid[1]-4);g.lineTo(hand[0]-3,hand[1]-4);g.stroke();
 g.fillStyle=ship===2?"#493827":ship===1?"#322a4b":"#304b60";g.beginPath();g.ellipse(hand[0],hand[1],25,19,-.4,0,Math.PI*2);g.fill();
 g.fillStyle=ship===2?"#a77b49":ship===1?"#8e7bb4":"#8da7bb";
 for(let k=0;k<4;k++){g.beginPath();g.roundRect(hand[0]-12+k*7,hand[1]-7+Math.abs(1.5-k)*2,8,22,4);g.fill();}
 g.fillStyle="#d4e0e8";g.beginPath();g.ellipse(hand[0]-5,hand[1]-13,9,5,-.5,0,Math.PI*2);g.fill();
 g.restore();
 // Mechanical seams, recessed fasteners and edge highlights bind the voxel volumes together.
 voxels.sort((a,b)=>b.z-a.z||a.y-b.y||a.x-b.x);
 g.save();g.globalAlpha=fade;for(const v of voxels)drawVoxel(v);g.restore();
 // Fine material detailing and light reflections are screen-space shading on the solid forms.
 g.save();g.globalAlpha=fade;
 const vignette=g.createRadialGradient(240,330,120,240,330,390);vignette.addColorStop(.45,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(0,0,0,.78)");g.fillStyle=vignette;g.fillRect(0,0,rw,rh);
 const sweep=g.createLinearGradient(0,0,rw,rh);sweep.addColorStop(0,"rgba(255,255,255,0)");sweep.addColorStop(.46,ship===1?"rgba(191,155,255,.12)":ship===2?"rgba(255,177,99,.12)":"rgba(103,239,255,.12)");sweep.addColorStop(.52,"rgba(255,255,255,0)");g.fillStyle=sweep;g.fillRect(0,0,rw,rh);
 for(let k=0;k<18;k++){const x=28+k*24;rect(x,18,7,4,k%3?hot:p.trim);rect(x+1,19,3,1,"#fff0cf");}
 g.fillStyle="#f0f6ff";g.font="bold 14px monospace";g.textAlign="center";g.fillText(p.name,240,42);
 g.fillStyle=p.trim;g.font="bold 9px monospace";g.fillText(ship===0?"FLIGHT COMPUTER // TURBINE LINK":ship===1?"STEALTH SYSTEM // PHASE ARRAY":"HEAVY ARMOR // EMP REACTOR",240,57);
 g.fillStyle="#e7edf4";g.font="bold 10px monospace";g.fillText(power>.6?"SYSTEM OVERRIDE: ACTIVE":"PILOT AUTHENTICATION",240,610);
 rect(110,620,260,5,"#26394b");rect(110,620,260*ease(t/3),5,p.trim);
 g.restore();
 if(power>0){g.save();g.globalAlpha=fade*power*.24;const pulse=g.createRadialGradient(240,360,8,240,360,280);pulse.addColorStop(0,p.trim);pulse.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=pulse;g.fillRect(0,0,rw,rh);g.restore();
  for(let k=0;k<22;k++){const x=(k*67+t*145)%rw,y=(k*83+t*190)%rh;rect(x,y,2+(k%3),2,"#f1ffff");}}
 ctx.save();ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,0,0,rw,rh,0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.restore();
}
function draw(){ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=false;ctx.drawImage(backdrop,0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.strokeStyle="#1b2945";ctx.globalAlpha=.28;ctx.lineWidth=1;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}ctx.globalAlpha=1;
 obstacles.forEach(o=>{ctx.shadowBlur=13;ctx.shadowColor=o.type==="mine"?"#ff4e9b":"#9ba8cc";drawStack(o.type==="mine"?mine:rock,o.x+o.w/2,o.y+o.h/2,o.w,o.spin?o.angle:0);});ctx.shadowBlur=0;
 pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);if(p.type==="coin"){ctx.rotate(Math.sin(p.phase)*.12);ctx.shadowBlur=20;ctx.shadowColor="#ffd45a";ctx.fillStyle="#ffd45a";ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff5bd";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#80500b";ctx.font="bold 17px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("$",0,1);}else{const color=p.type==="shield"?"#50f6ed":"#b8a0ff";ctx.strokeStyle=color;ctx.fillStyle=color+"22";ctx.lineWidth=4;ctx.shadowBlur=15;ctx.shadowColor=color;ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.type==="shield"?"S":"L",0,1);}ctx.restore();});
 drawShip();particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*1.8);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);});ctx.globalAlpha=1;if(specialCinematic>0)drawSpecialCinematic();
}
function loop(t){if(!running)return;const dt=Math.min((t-last)/1000,.035);last=t;if(specialCinematic>0){specialCinematic=Math.max(0,specialCinematic-dt);specialCinematicAge+=dt;if(specialCinematic<=0)specialScene?.classList.remove("active");draw();if(running)requestAnimationFrame(loop);return;}update(dt);draw();if(running)requestAnimationFrame(loop);}
function hold(el,d){const down=e=>{e.preventDefault();pointer=d;},up=()=>{if(pointer===d)pointer=0;};el.addEventListener("pointerdown",down);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("pointerleave",up);}
hold($("#left-button"),-1);hold($("#right-button"),1);
document.addEventListener("contextmenu",e=>e.preventDefault());document.addEventListener("selectstart",e=>e.preventDefault());document.addEventListener("copy",e=>e.preventDefault());
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();if(e.code==="Space"){activateSpecial();return;}keys.add(e.key);});window.addEventListener("keyup",e=>keys.delete(e.key));window.addEventListener("blur",()=>{keys.clear();pointer=0;});
playButton.addEventListener("click",start);specialButton.addEventListener("click",activateSpecial);soundButton.addEventListener("click",()=>{sound=!sound;soundButton.textContent=sound?"♫":"♪";beep(500);});
canvas.addEventListener("pointerdown",e=>{if(!running)return;const r=canvas.getBoundingClientRect();pointer=(e.clientX-r.left)/r.width*W<player.x+18?-1:1;});canvas.addEventListener("pointerup",()=>pointer=0);canvas.addEventListener("pointercancel",()=>pointer=0);
draw();
