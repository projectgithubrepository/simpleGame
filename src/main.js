import {clamp,intersects,nextSpawnInterval,calculateScore} from "./game-core.js";
const $=s=>document.querySelector(s),canvas=$("#game"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
const scoreEl=$("#score"),bestEl=$("#best-score"),coinsEl=$("#coins"),statusEl=$("#status"),overlay=$("#overlay"),titleEl=$("#overlay-title"),copyEl=$("#overlay-copy"),eyebrowEl=$("#overlay-eyebrow"),playButton=$("#play-button"),soundButton=$("#sound-button"),shipPicker=$("#ship-picker"),powerupStatus=$("#powerup-status"),skinButton=$("#skin-button");
const names=["Viper","Phantom","Titan"],palettes=[["#50f6ed","#168aab","#ff4e9b"],["#b8a0ff","#6047c7","#f5d66e"],["#ffb45c","#b84b37","#f7f1dc"]];
let ship=+(localStorage.getItem("neon-dodge-ship")||0),coins=+(localStorage.getItem("neon-dodge-coins")||0),best=+(localStorage.getItem("neon-dodge-best")||0);
const player={x:W/2-18,y:H-92,w:36,h:42,speed:330,tilt:0,shield:false};
let obstacles=[],pickups=[],particles=[],running=false,elapsed=0,spawn=0,pickupSpawn=.45,slow=0,last=0,pointer=0,sound=false,audio=null;
const keys=new Set();bestEl.textContent=best;coinsEl.textContent=coins;
function sprite(type,index=0){
 const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");g.imageSmoothingEnabled=true;
 if(type==="ship"){
  const [a,d,b]=palettes[index],grad=g.createLinearGradient(0,8,0,118);grad.addColorStop(0,a);grad.addColorStop(.48,d);grad.addColorStop(1,"#10182e");
  g.shadowColor=a;g.shadowBlur=10;g.fillStyle=grad;g.beginPath();
  if(index===0){g.moveTo(64,5);g.lineTo(79,35);g.lineTo(119,79);g.lineTo(91,83);g.lineTo(82,111);g.lineTo(64,99);g.lineTo(46,111);g.lineTo(37,83);g.lineTo(9,79);g.lineTo(49,35);}
  else if(index===1){g.moveTo(64,7);g.lineTo(91,30);g.lineTo(117,65);g.lineTo(100,106);g.lineTo(64,91);g.lineTo(28,106);g.lineTo(11,65);g.lineTo(37,30);}
  else{g.moveTo(64,4);g.lineTo(84,34);g.lineTo(124,57);g.lineTo(104,91);g.lineTo(85,88);g.lineTo(81,119);g.lineTo(47,119);g.lineTo(43,88);g.lineTo(24,91);g.lineTo(4,57);g.lineTo(44,34);}
  g.closePath();g.fill();g.shadowBlur=0;
  g.strokeStyle=a;g.lineWidth=3;g.stroke();
  g.fillStyle=d;g.beginPath();g.moveTo(64,13);g.lineTo(78,53);g.lineTo(64,94);g.lineTo(50,53);g.closePath();g.fill();
  g.fillStyle="#eaffff";g.beginPath();g.moveTo(64,20);g.lineTo(73,52);g.lineTo(64,69);g.lineTo(55,52);g.closePath();g.fill();
  g.fillStyle="#8ffcff";g.fillRect(60,27,8,27);
  g.fillStyle=b;g.fillRect(17,75,22,8);g.fillRect(89,75,22,8);
  g.strokeStyle="#d8faff";g.lineWidth=2;g.beginPath();g.moveTo(27,48);g.lineTo(43,64);g.moveTo(101,48);g.lineTo(85,64);g.stroke();
  g.fillStyle="#ffb45c";g.shadowColor="#ff7b37";g.shadowBlur=14;g.fillRect(52,102,9,19);g.fillRect(67,102,9,19);g.shadowBlur=0;
  g.fillStyle="#fff";g.fillRect(46,68,7,5);g.fillRect(75,68,7,5);
 }else if(type==="rock"){
  const grad=g.createLinearGradient(18,12,104,116);grad.addColorStop(0,"#b8c4df");grad.addColorStop(.35,"#596987");grad.addColorStop(1,"#202a43");
  g.fillStyle=grad;g.beginPath();g.moveTo(25,13);g.lineTo(75,7);g.lineTo(116,36);g.lineTo(108,91);g.lineTo(73,119);g.lineTo(20,101);g.lineTo(8,55);g.closePath();g.fill();
  g.strokeStyle="#d1dcf5";g.lineWidth=3;g.stroke();
  g.fillStyle="#dce5f5";g.beginPath();g.moveTo(25,18);g.lineTo(72,14);g.lineTo(91,36);g.lineTo(51,48);g.lineTo(17,55);g.closePath();g.fill();
  g.fillStyle="#394864";g.beginPath();g.moveTo(51,48);g.lineTo(91,36);g.lineTo(108,91);g.lineTo(73,119);g.lineTo(52,88);g.closePath();g.fill();
  g.fillStyle="#182238";g.fillRect(30,68,17,12);g.fillRect(73,61,20,15);g.fillStyle="#8a9ab8";g.fillRect(18,87,20,5);g.fillRect(79,26,17,6);
 }else{
  const grad=g.createRadialGradient(48,42,4,64,64,58);grad.addColorStop(0,"#fff0fa");grad.addColorStop(.25,"#ff83c0");grad.addColorStop(1,"#9c205f");
  g.fillStyle=grad;g.beginPath();g.arc(64,64,49,0,Math.PI*2);g.fill();g.strokeStyle="#ffd8ed";g.lineWidth=5;g.stroke();
  g.fillStyle="#5c174c";g.fillRect(57,8,14,112);g.fillRect(8,57,112,14);g.fillStyle="#fff";g.fillRect(57,29,14,14);
  g.strokeStyle="#ffb6dc";g.lineWidth=3;g.beginPath();g.arc(64,64,31,0,Math.PI*2);g.stroke();
 }
 return c;
}
const ships=names.map((_,i)=>sprite("ship",i)),rock=sprite("rock"),mine=sprite("mine");
const stacked=new WeakMap();
function buildStack(img){
 const out=document.createElement("canvas");out.width=160;out.height=160;const g=out.getContext("2d"),layers=18,slices=64;
 g.imageSmoothingEnabled=true;
 for(let z=layers-1;z>=0;z--){const depth=z-(layers-1)/2;g.globalAlpha=.34+z/layers*.38;
  for(let row=0;row<slices;row++){const sy=row*2,dy=16+row;g.drawImage(img,0,sy,128,2,16+depth*.52,dy+depth*.78,128,2);}
 }
 g.globalAlpha=1;g.shadowColor="#d9faff";g.shadowBlur=3;g.drawImage(img,16,16,128,128);g.shadowBlur=0;
 return out;
}
for(const img of [...ships,rock,mine])stacked.set(img,buildStack(img));
function picker(){shipPicker.innerHTML=names.map((n,i)=>'<button type="button" data-ship="'+i+'" class="'+(ship===i?"selected":"")+'" aria-pressed="'+(ship===i)+'">'+n+'</button>').join("");shipPicker.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ship=+b.dataset.ship;localStorage.setItem("neon-dodge-ship",ship);picker();draw();powerupStatus.textContent="Nave selecionada: "+names[ship];}));}picker();
function beep(f=440,d=.07){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.04,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
function reset(){obstacles=[];pickups=[];particles=[];elapsed=0;spawn=0;pickupSpawn=.35;slow=0;player.x=W/2-player.w/2;player.tilt=0;player.shield=false;powerupStatus.textContent="Moeda = +5. Escudo = bloqueia 1 batida. L = lentidão por 5s.";}
function start(){reset();running=true;last=performance.now();overlay.classList.add("hidden");statusEl.textContent="JOGANDO";requestAnimationFrame(loop);beep(620);}
function finish(){running=false;const s=calculateScore(elapsed);if(s>best){best=s;localStorage.setItem("neon-dodge-best",best);bestEl.textContent=best;}statusEl.textContent="FIM";eyebrowEl.textContent="FIM DE JOGO";titleEl.innerHTML="GAME<br><span>OVER</span>";copyEl.textContent="Pontos: "+s+". Recorde: "+best+". Moedas: "+coins+".";playButton.innerHTML="JOGAR NOVAMENTE <span>→</span>";overlay.classList.remove("hidden");}
function spawnObstacle(){let z=28+Math.random()*24;obstacles.push({x:Math.random()*(W-z),y:-40,w:z,h:z,v:190+Math.min(190,elapsed*4)+Math.random()*45,type:Math.random()<.35?"mine":"rock",angle:Math.random()*6,spin:Math.random()<.4?(Math.random()-.5)*3:0});}
function spawnPickup(){pickups.push({x:34+Math.random()*(W-68),y:-28,r:17,v:205,type:"coin",phase:0});});}
function burst(x,y){for(let i=0;i<18;i++)particles.push({x,y,vx:(Math.random()-.5)*250,vy:(Math.random()-.5)*250,life:.5});}
function collect(p){if(p.type==="coin"){coins+=5;localStorage.setItem("neon-dodge-coins",coins);coinsEl.textContent=coins;powerupStatus.textContent="+5 moedas. Saldo salvo.";}if(p.type==="shield"){player.shield=true;powerupStatus.textContent="ESCUDO ATIVO: a próxima colisão será anulada.";}if(p.type==="slow"){slow=5;powerupStatus.textContent="LENTIDÃO ATIVA: obstáculos 48% mais lentos por 5 segundos.";}beep(800);}
function update(dt){elapsed+=dt;const k=(keys.has("ArrowRight")||keys.has("d")||keys.has("D")?1:0)-(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")?1:0),dir=k||pointer;player.x=clamp(player.x+dir*player.speed*dt,8,W-player.w-8);player.tilt+=(dir*.32-player.tilt)*Math.min(1,dt*9);slow=Math.max(0,slow-dt);
 spawn+=dt*1000;if(spawn>=nextSpawnInterval(calculateScore(elapsed))){spawn=0;spawnObstacle();}pickupSpawn-=dt;if(pickupSpawn<=0){spawnPickup();pickupSpawn=1.65;}
 obstacles.forEach(o=>{o.y+=o.v*dt*(slow?0.52:1);o.angle+=o.spin*dt;});obstacles=obstacles.filter(o=>o.y<H+50);pickups.forEach(p=>{p.y+=p.v*dt;p.phase+=dt*3;});pickups=pickups.filter(p=>p.y<H+30);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
 const hit={x:player.x+7,y:player.y+8,width:player.w-14,height:player.h-16};for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];if(intersects(hit,{x:o.x+4,y:o.y+4,width:o.w-8,height:o.h-8})){if(player.shield){player.shield=false;obstacles.splice(i,1);burst(player.x+18,player.y+20);powerupStatus.textContent="ESCUDO CONSUMIDO: colisão bloqueada!";}else{burst(player.x+18,player.y+20);finish();return;}}}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];if(Math.hypot(p.x-player.x-18,p.y-player.y-21)<p.r+17){collect(p);pickups.splice(i,1);}}scoreEl.textContent=calculateScore(elapsed);}
function stack(img,x,y,size,angle=0){const volume=stacked.get(img)||img;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(volume,-size*.625,-size*.625,size*1.25,size*1.25);ctx.restore();}
function drawShip(){ctx.save();ctx.translate(player.x+18,player.y+21);ctx.rotate(player.tilt);if(player.shield){ctx.strokeStyle="#50f6ed";ctx.lineWidth=3;ctx.shadowBlur=15;ctx.shadowColor="#50f6ed";ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}stack(ships[ship],0,0,56,0,16);ctx.restore();}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle="#080c1d";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#17213e";for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 obstacles.forEach(o=>{ctx.shadowBlur=12;ctx.shadowColor=o.type==="mine"?"#ff4e9b":"#9ba8cc";stack(o.type==="mine"?mine:rock,o.x+o.w/2,o.y+o.h/2,o.w,o.spin?o.angle:0,9);});ctx.shadowBlur=0;
 pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);if(p.type==="coin"){ctx.rotate(Math.sin(p.phase)*.2);ctx.shadowBlur=22;ctx.shadowColor="#ffd45a";ctx.fillStyle="#ffd45a";ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff2ad";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#81500c";ctx.font="bold 17px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("$",0,1);}else{ctx.strokeStyle=p.type==="shield"?"#50f6ed":"#a9a0ff";ctx.lineWidth=3;ctx.shadowBlur=12;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(0,0,p.r,0,7);ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(p.type==="shield"?"S":"L",0,1);}ctx.restore();});drawShip();particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle="#ff4e9b";ctx.fillRect(p.x,p.y,4,4);});ctx.globalAlpha=1;}
function loop(t){if(!running)return;const dt=Math.min((t-last)/1000,.035);last=t;update(dt);draw();if(running)requestAnimationFrame(loop);}
function hold(el,d){const down=e=>{e.preventDefault();pointer=d;},up=()=>{if(pointer===d)pointer=0;};el.addEventListener("pointerdown",down);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("pointerleave",up);}hold($("#left-button"),-1);hold($("#right-button"),1);
window.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();keys.add(e.key);});window.addEventListener("keyup",e=>keys.delete(e.key));window.addEventListener("blur",()=>{keys.clear();pointer=0;});
playButton.addEventListener("click",start);soundButton.addEventListener("click",()=>{sound=!sound;soundButton.textContent=sound?"♫":"♪";beep(500);});
skinButton.addEventListener("click",()=>{if(coins<50){powerupStatus.textContent="Você precisa de 50 moedas para trocar a nave.";return;}coins-=50;localStorage.setItem("neon-dodge-coins",coins);coinsEl.textContent=coins;ship=(ship+1)%3;localStorage.setItem("neon-dodge-ship",ship);picker();powerupStatus.textContent="Nave alterada.";});
canvas.addEventListener("pointerdown",e=>{if(!running)return;const r=canvas.getBoundingClientRect();pointer=(e.clientX-r.left)/r.width*W<player.x+18?-1:1;});canvas.addEventListener("pointerup",()=>pointer=0);canvas.addEventListener("pointercancel",()=>pointer=0);draw();