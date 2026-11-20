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
 const accent=palettes[ship][0],mid=palettes[ship][1];
 const rw=320,rh=560,frame=document.createElement("canvas");frame.width=rw;frame.height=rh;
 const g=frame.getContext("2d");g.imageSmoothingEnabled=false;
 const clamp01=v=>Math.max(0,Math.min(1,v));
 const ease=v=>{v=clamp01(v);return v*v*(3-2*v);};
 const approach=ease((t-.22)/.8),grab=ease((t-1.0)/.55),power=ease((t-1.72)/.7);
 const shake=power*(Math.sin(t*54)*2.2+Math.sin(t*31)*1.1);
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const poly=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 // Software-rendered voxel scene: each solid is built from discrete cubic voxels,
 // depth-sorted and projected in perspective, rather than faked with 2D extrusion.
 const voxels=[];
 const addVoxel=(x,y,z,color,s=.5)=>voxels.push({x,y,z,color,s});
 const addBox=(x,y,z,nx,ny,nz,color,s=.5,skip)=> {
  for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++)for(let iz=0;iz<nz;iz++){
   if(skip&&skip(ix,iy,iz))continue;
   addVoxel(x+ix*s,y+iy*s,z+iz*s,color,s);
  }
 };
 const project=(x,y,z)=>{const k=1.34-z*.039;return [160+x*k+shake,302-(y-6.2)*k-z*2.05];};
 const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,((n>>16)&255)*f)),gg=Math.max(0,Math.min(255,((n>>8)&255)*f)),b=Math.max(0,Math.min(255,(n&255)*f));return "rgb("+r+","+gg+","+b+")";};
 const voxel=(v)=>{
  const s=v.s,{x,y,z}=v,p=[project(x,y,z),project(x+s,y,z),project(x+s,y+s,z),project(x,y+s,z),
    project(x,y,z+s),project(x+s,y,z+s),project(x+s,y+s,z+s),project(x,y+s,z+s)];
  // Camera looks toward +Z: front, right and top faces are independently lit.
  poly([p[0],p[1],p[2],p[3]],shade(v.color,.72));
  poly([p[1],p[5],p[6],p[2]],shade(v.color,.48));
  poly([p[3],p[2],p[6],p[7]],shade(v.color,1.22));
 };
 const panel=(x,y,z,w,h,color)=>addBox(x,y,z,w,h,1,color,.5);
 const screen=(x,y,z,w,h,kind)=>{
  panel(x-.25,y-.25,z,w+.5,h+.5,"#536477");
  panel(x,y,z+.55,w,h,"#06111b");
  const colors=kind==="radar"?["#08e6a0","#35ffbf","#1b8c78"]:["#08c8f4","#3c9dff","#b3f4ff"];
  for(let iy=0;iy<h*2-2;iy++)for(let ix=0;ix<w*2-2;ix++){
   let on=kind==="radar"?(Math.abs(ix-(w-1))<1||Math.abs(iy-(h-1))<1||((ix*7+iy*11)%19<2)):
     ((ix*5+iy*3)%13<3||iy===1||iy===h*2-3);
   if(on)addBox(x+.35+ix*.5,y+.35+iy*.5,z+1.1,1,1,1,colors[(ix+iy)%colors.length],.22);
  }
  addBox(x+.4,y+.3,z+1.4,Math.max(1,w*.35),.22,1,kind==="radar"?"#18ffb0":"#f4cf54",.22);
 };
 // Dark canopy void and amber/cyan ambient reflections.
 const bg=g.createLinearGradient(0,0,0,rh);bg.addColorStop(0,"#03060c");bg.addColorStop(.48,"#0a1522");bg.addColorStop(1,"#02050b");g.fillStyle=bg;g.fillRect(0,0,rw,rh);
 const glow=g.createRadialGradient(160,215,8,160,215,260);glow.addColorStop(0,"rgba(18,102,132,.24)");glow.addColorStop(.55,"rgba(8,30,53,.12)");glow.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=glow;g.fillRect(0,0,rw,rh);
 // Canopy frame, side ribs and overhead arch are separate volumetric voxel beams.
 addBox(-12,9,13,24,1,1,"#263447");
 addBox(-12,9,14,1,7,1,"#34475b");addBox(11,9,14,1,7,1,"#34475b");
 addBox(-11,15,12,22,1,2,"#182638");
 for(let x=-10;x<=10;x+=2)addBox(x,15.5,13,1,.5,1,"#9a5826",.5);
 // Windshield panes: dark glass with a subtle amber/cobalt reflected horizon.
 const glass= g.createLinearGradient(0,105,0,260);glass.addColorStop(0,"#102b42");glass.addColorStop(.55,"#081827");glass.addColorStop(1,"#10101b");
 const a=project(-10,9.8,14),b=project(10,9.8,14),c=project(10,15,14),d=project(-10,15,14);
 poly([a,b,c,d],glass);
 for(let i=0;i<28;i++){const x=project(-9+(i%14)*1.35,10+(Math.floor(i/14))*2.2,14);rect(x[0],x[1],2,1,i%3?"#18364a":"#b36a32");}
 // Main instrument wall: deep armor shell, bevels and individually recessed displays.
 addBox(-11,3.5,11,22,5,2,"#172435");
 addBox(-10.5,4,10.5,21,4.5,1,"#334458");
 addBox(-10,4.2,10,20,4,1,"#080f19");
 screen(-9.2,5.4,10,3.1,2.25,"data");screen(-5.4,5.4,10,3.1,2.25,"radar");
 screen(2.3,5.4,10,3.1,2.25,"radar");screen(6.1,5.4,10,3.1,2.25,"data");
 // Center avionics stack, warning lamps and physical toggles.
 addBox(-1.5,4.1,9.5,3,4.1,2,"#526174");
 addBox(-1.1,4.5,9,2.2,3.3,1,"#101923");
 for(let row=0;row<5;row++)for(let col=0;col<3;col++)addBox(-.8+col*.75,7.2-row*.52,10.2,1,1,1,(row+col)%3?"#d84a2f":"#f5a33b",.32);
 for(let row=0;row<2;row++)for(let col=0;col<6;col++)addBox(-2.6+col*.88,3.9+row*.48,10,".5".length?1:1,1,1,(col+row)%2?"#ff4b28":"#e9a33b",.32);
 // Radar scopes and lower control banks.
 screen(-8.8,3.1,9.8,3,1.6,"radar");screen(5.8,3.1,9.8,3,1.6,"radar");
 addBox(-4.6,2.8,9.6,9.2,1.3,2,"#0b1420");
 for(let row=0;row<2;row++)for(let col=0;col<18;col++)addBox(-4.3+col*.5,3+row*.5,10.6,1,1,1,(col+row)%4===0?"#ff633c":(col%3===0?"#a7bdc8":"#536b7e"),.22);
 // Angled side consoles, chunky joysticks, guarded switches and cable channels.
 for(const side of [-1,1]){
  addBox(side*9.7-1,1.1,5,2,4,7,"#1b2c40");
  addBox(side*9.2-1,1.6,5.4,2,3,6,"#34495f");
  for(let i=0;i<6;i++)addBox(side*9.1-.5,2+i*.38,7+i*.12,1,1,1,i%2?"#0cc7e9":"#ffb43d",.3);
  addBox(side*10.2,2,6,1,2,1,"#e1b22f");
  addBox(side*10.2,2.2,6,1,1,2,"#ffcc48");
  addBox(side*8.7,1.2,8,1,1,2,"#91a8bb");
 }
 // Forward console between pilot and dashboard, built as stacked machined plates.
 addBox(-5,0,2,10,1,9,"#111c2a");
 addBox(-4.6,.5,2.5,9.2,.6,8,"#536477");
 addBox(-4.2,1.1,3,8.4,.5,7,"#182638");
 for(let col=0;col<8;col++)for(let row=0;row<5;row++)addBox(-3.8+col*.95,1.65+row*.08,4+row*.8,1,1,1,(col+row)%4===0?"#e5b95b":"#8ea3b5",.3);
 // Lever gate and animated throttle. It is a real voxel assembly with a moving shaft/grip.
 const leverZ=4.5,leverX=2.2,leverY=1.6+grab*.9;
 addBox(leverX-.8,1.2,leverZ,1.6,.5,2.2,"#d39a42");
 addBox(leverX-.5,1.7,leverZ+.5,1,.4,1.2,"#25394d");
 addBox(leverX-.16,leverY,leverZ+.8,.32,2.2, .32,"#b7c5cf",.32);
 addBox(leverX-.65,leverY+1.8,leverZ+.35,1.3,.65,1.3,"#101820",.32);
 addBox(leverX-.5,leverY+1.95,leverZ+.2,1,.25,1,"#d9e4eb",.25);
 // Pilot forearm and flight glove enter from the right, close around the throttle.
 const armX=4.7-approach*2.6,armY=2.4+grab*.55,armZ=2.1;
 addBox(armX,armY,armZ,2.2,1.2,3.5,"#263d56");
 addBox(armX+.3,armY+.3,armZ+.4,1.8,.8,2.8,"#71899f");
 addBox(armX-.25,armY+.65,armZ+2.5,1.5,1.1,1.8,"#a9bac9");
 addBox(armX-.1,armY+1.1,armZ+2.8,1.3,.55,1.5,"#d6e1e9");
 for(let finger=0;finger<4;finger++)addBox(armX-.05+finger*.34,armY+.8,armZ+3.8,.28,.55,1.25,"#d0dce6",.28);
 addBox(armX-.45,armY+.75,armZ+3.55,.4,.45,1.1,"#8299ae",.28);
 // Instrument legends and tiny warning labels are screen-space overlays for readability.
 g.save();g.globalAlpha=fade;
 for(let i=0;i<12;i++){const x=20+i*25;rect(x,18,7,4,i%3?"#ff7a35":"#ffcf55");rect(x+1,19,3,1,"#fff0b4");}
 g.fillStyle="#eaf6ff";g.font="bold 11px monospace";g.textAlign="center";g.fillText(["OVERDRIVE","PHASE SHIFT","EMP BURST"][ship],160,42);
 g.fillStyle=accent;g.font="bold 6px monospace";g.fillText("FLIGHT DECK // PILOT LINK",160,53);
 g.fillStyle="#d8e9f5";g.font="bold 7px monospace";g.fillText(power>.6?"THRUST CORE: ONLINE":"THRUST CORE: ARMING",160,540);
 rect(90,548,140,4,"#26394b");rect(90,548,140*ease(t/3),4,accent);
 g.restore();
 // Draw the voxel model in far-to-near order; all geometry is reprojected every frame.
 voxels.sort((a,b)=>b.z-a.z||a.y-b.y||a.x-b.x);
 g.save();g.globalAlpha=fade;for(const v of voxels)voxel(v);g.restore();
 // Activation lighting sweeps across the real 3D cockpit surfaces.
 if(power>0){g.save();g.globalAlpha=fade*power*.22;const pulse=g.createRadialGradient(160,300,4,160,300,210);pulse.addColorStop(0,accent);pulse.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=pulse;g.fillRect(0,70,rw,rh-70);g.restore();
  for(let i=0;i<24;i++){const x=(i*43+t*110)%rw,y=(i*67+t*150)%rh;rect(x,y,2+(i%3),2,"#e9ffff");}}
 ctx.save();ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.restore();
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
