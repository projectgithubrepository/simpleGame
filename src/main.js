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
const cockpitImage=new Image();
cockpitImage.decoding="async";
cockpitImage.src="./assets/cockpit-frames.webp";
function drawSpecialCinematic(){
 if(specialCinematic<=0)return;
 const t=3-specialCinematic,fade=Math.min(1,t/.18,specialCinematic/.2);
 const frameIndex=Math.min(5,Math.floor(Math.min(.999,t/3)*6));
 const sx=(frameIndex%3)*100,sy=Math.floor(frameIndex/3)*100;
 ctx.save();
 ctx.globalAlpha=fade;
 ctx.fillStyle="#03050a";ctx.fillRect(0,0,W,H);
 if(cockpitImage.complete&&cockpitImage.naturalWidth){
  // Subtle offset slices give the photographic cockpit a shallow SpriteStack edge.
  for(let layer=4;layer>=1;layer--){
   ctx.globalAlpha=fade*.055;
   ctx.drawImage(cockpitImage,sx,sy,100,100,layer*.8,80+layer*1.1,480,480);
  }
  ctx.globalAlpha=fade;
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(cockpitImage,sx,sy,100,100,0,80,480,480);
 }
 // Space traffic and star streaks stay clipped to the two canopy windows.
 const clipWindows=()=>{
  ctx.beginPath();
  ctx.moveTo(0,160);ctx.lineTo(0,118);ctx.lineTo(105,82);ctx.lineTo(210,105);ctx.lineTo(230,206);ctx.lineTo(0,270);
  ctx.moveTo(480,160);ctx.lineTo(480,118);ctx.lineTo(375,82);ctx.lineTo(270,105);ctx.lineTo(250,206);ctx.lineTo(480,270);
  ctx.clip();
 };
 ctx.save();clipWindows();
 const colors=["#8feaff","#ffb45c","#d5e8ff","#50f6ed"];
 for(let i=0;i<46;i++){
  const seed=i*127.1+19.7;
  const x=((seed*13.37+t*(24+(i%5)*19))%(W+80))-40;
  const y=94+((seed*7.13)%(160));
  const z=.45+(i%4)*.38;
  ctx.globalAlpha=fade*(.25+(i%5)*.11);
  ctx.strokeStyle=colors[i%4];ctx.lineWidth=z;
  ctx.shadowBlur=i%7===0?9:3;ctx.shadowColor=colors[i%4];
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7-z*5,y+2+z*2);ctx.stroke();
 }
 // Passing ships: short luminous silhouettes at different depths and speeds.
 for(let i=0;i<5;i++){
  const x=((i*137+t*(75+i*27))%(W+120))-60;
  const y=118+(i*31)%105;
  const scale=.55+(i%3)*.28;
  ctx.globalAlpha=fade*(.42+(i%2)*.2);
  ctx.fillStyle=i%2?"#ff9b50":"#a5f4ff";
  ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+17*scale,y-2*scale);ctx.lineTo(x+29*scale,y);ctx.lineTo(x+17*scale,y+2*scale);ctx.closePath();ctx.fill();
  ctx.globalAlpha=fade*.48;ctx.fillRect(x-24*scale,y-.65,24*scale,1.3);
 }
 ctx.restore();
 // Warm/cool light sweeps travel over the canopy and reflect across the instrument glass.
 const sweepX=((t*190)%650)-90;
 ctx.save();ctx.globalAlpha=fade*(.11+.08*Math.sin(t*5));
 const beam=ctx.createLinearGradient(sweepX-90,0,sweepX+100,0);
 beam.addColorStop(0,"rgba(255,255,255,0)");beam.addColorStop(.48,"rgba(111,226,255,.72)");beam.addColorStop(1,"rgba(255,255,255,0)");
 ctx.fillStyle=beam;ctx.fillRect(0,90,480,210);ctx.restore();
 const pulse=Math.max(0,Math.sin(t*3.8-1.1))**12;
 if(pulse>.04){
  ctx.globalAlpha=fade*pulse*.32;
  const flare=ctx.createRadialGradient(250,195,2,250,195,250);
  flare.addColorStop(0,"rgba(255,225,170,.72)");flare.addColorStop(.35,"rgba(96,205,255,.18)");flare.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=flare;ctx.fillRect(0,80,480,480);
 }
 // Fine cockpit glints and instrument reflections, without covering the reference.
 ctx.globalAlpha=fade*(.2+.12*Math.sin(t*9));
 ctx.fillStyle="#b9f5ff";
 for(let i=0;i<14;i++){const x=24+(i*71)%432,y=270+(i*43)%330;ctx.fillRect(x,y,1.5,1.5);}
 ctx.restore();
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
