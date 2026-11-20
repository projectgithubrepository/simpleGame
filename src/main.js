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
 const t=3-specialCinematic,p=Math.min(1,t/3),fade=Math.min(1,t/.18,specialCinematic/.24),accent=palettes[ship][0];
 ctx.save();ctx.globalAlpha=fade;
 // Cinematic wipe: the cockpit appears to assemble in depth, like a hand-built mecha cockpit.
 ctx.fillStyle="#02040d";ctx.fillRect(0,0,W,H);
 const ease=Math.min(1,Math.max(0,t/.42)),depth=1-Math.pow(1-ease,3);
 const cx=W/2,top=H*.075,base=H*.79;
 function poly(points,fill,stroke=null,lw=1){ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
 function extrude(points,dx,dy,layers,front,side,stroke){
  // True sprite-stacking illusion: many individually shaded silhouettes create visible thickness.
  for(let z=layers;z>=1;z--){const k=z/layers;ctx.globalAlpha=fade*(.24+.48*(1-k));const shifted=points.map(([x,y])=>[x+dx*k,y+dy*k]);poly(shifted,side);}
  ctx.globalAlpha=fade;poly(points,front,stroke,2);
 }
 // Deep armored canopy: outer shell, bevels and nested glass create a tunnel rather than a flat frame.
 const shell=[[10,top+35],[cx-48,top],[cx+48,top],[W-10,top+35],[W-34,H*.61],[W-72,base],[72,base],[34,H*.61]];
 extrude(shell,0,20,22,"#182b48","#091323","#7295bf");
 const rim=[[27,top+43],[cx-39,top+17],[cx+39,top+17],[W-27,top+43],[W-49,H*.59],[W-85,base-19],[85,base-19],[49,H*.59]];
 extrude(rim,0,12,16,"#243e62","#101e35",accent);
 const glass=[[49,top+58],[cx-29,top+35],[cx+29,top+35],[W-49,top+58],[W-68,H*.55],[W-101,H*.69],[101,H*.69],[68,H*.55]];
 const sky=ctx.createLinearGradient(0,top,0,H*.7);sky.addColorStop(0,"#102f55");sky.addColorStop(.5,"#07172e");sky.addColorStop(1,"#160e30");poly(glass,sky,"#8cecff",2);
 // Layered distant planet, orbital rings and a fast-moving starfield.
 ctx.save();ctx.beginPath();ctx.moveTo(...glass[0]);glass.slice(1).forEach(v=>ctx.lineTo(...v));ctx.closePath();ctx.clip();
 const planetX=cx+(ship-1)*W*.12,planetY=H*.34,planetR=H*.105;
 const pg=ctx.createRadialGradient(planetX-planetR*.35,planetY-planetR*.45,2,planetX,planetY,planetR);pg.addColorStop(0,"#e8faff");pg.addColorStop(.18,accent);pg.addColorStop(.62,"#304a81");pg.addColorStop(1,"#090d24");
 ctx.fillStyle=pg;ctx.beginPath();ctx.arc(planetX,planetY,planetR,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=accent;ctx.globalAlpha=fade*.55;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(planetX,planetY,planetR*1.65,planetR*.42,-.2,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<90;i++){const seed=i*91.73;const x=((seed*13+t*(70+(i%6)*38))%(W+80))-40;const y=((seed*31+t*(120+(i%5)*55))%(H*.68));const len=2+Math.min(30,t*10)*(i%4===0?1:.18);ctx.globalAlpha=fade*(.25+(i%5)*.12);ctx.strokeStyle=i%7===0?accent:"#e4f5ff";ctx.lineWidth=i%9===0?2:1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-len*.35,y+len);ctx.stroke();}
 // Perspective guide rails converge toward the vanishing point.
 ctx.globalAlpha=fade*.5;ctx.strokeStyle=accent;ctx.lineWidth=1.5;for(let i=0;i<9;i++){const x=i*W/8;ctx.beginPath();ctx.moveTo(cx+(x-cx)*.08,H*.31);ctx.lineTo(x,H*.72);ctx.stroke();}
 ctx.restore();
 // Canopy braces, exposed hydraulic pistons and luminous mechanical fasteners.
 for(const side of [-1,1]){
  const sx=side<0?34:W-34,ex=side<0?W*.19:W*.81;
  ctx.strokeStyle="#b5d8ef";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sx,H*.19);ctx.lineTo(ex,H*.67);ctx.stroke();
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx+side*7,H*.2);ctx.lineTo(ex+side*4,H*.65);ctx.stroke();
  for(let j=0;j<4;j++){const y=H*(.22+j*.105);ctx.fillStyle="#d9f6ff";ctx.shadowColor=accent;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(side<0?42+j*4:W-42-j*4,y,3,0,Math.PI*2);ctx.fill();}
 }
 ctx.shadowBlur=0;
 // Heavy lower cockpit dashboard, layered like an anime mecha control deck.
 const dash=[[0,H*.72],[W*.18,H*.67],[W*.34,H*.71],[W*.66,H*.71],[W*.82,H*.67],[W,H*.72],[W,H],[0,H]];
 extrude(dash,0,18,20,"#1c2d49","#080e1d","#536e99");
 const consolePoly=[[W*.08,H*.77],[W*.31,H*.72],[W*.69,H*.72],[W*.92,H*.77],[W*.84,H*.94],[W*.16,H*.94]];
 extrude(consolePoly,0,9,10,"#263e60","#101b31",accent);
 // Instrument clusters and animated telemetry.
 for(let side=0;side<2;side++){
  const x=side===0?W*.2:W*.8;
  ctx.fillStyle="#071326";ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-W*.095,H*.775,W*.19,H*.12,8);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5e8fb8";ctx.lineWidth=1;for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(x-W*.07+j*W*.035,H*.86);ctx.lineTo(x-W*.07+j*W*.035,H*.80+(j%2)*7);ctx.stroke();}
  ctx.fillStyle=accent;ctx.font="bold 9px monospace";ctx.textAlign="center";ctx.fillText(side===0?"REACTOR":"GYRO",x,H*.795);
 }
 // Center holographic reticle and targeting brackets.
 ctx.strokeStyle="#d9fbff";ctx.lineWidth=1.5;ctx.globalAlpha=fade*.8;ctx.beginPath();ctx.arc(cx,H*.43,16+Math.sin(t*9)*3,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-34,H*.43);ctx.lineTo(cx-20,H*.43);ctx.moveTo(cx+20,H*.43);ctx.lineTo(cx+34,H*.43);ctx.moveTo(cx,H*.43-34);ctx.lineTo(cx,H*.43-20);ctx.moveTo(cx,H*.43+20);ctx.lineTo(cx,H*.43+34);ctx.stroke();
 // A massive throttle column advances toward the camera in 3D stacked perspective.
 const push=Math.min(1,Math.max(0,(t-.22)/.62)),leverX=cx+W*.285,leverBase=H*.83,leverY=leverBase-push*H*.115;
 const handX=leverX+5,handY=leverY+15;
 const column=[[leverX-13,leverBase],[leverX+13,leverBase],[leverX+9,leverY+18],[leverX-9,leverY+18]];
 extrude(column,7,7,16,"#8ba9c9","#344c6c","#d8f4ff");
 const grip=[[leverX-23,leverY+12],[leverX-19,leverY-10],[leverX-9,leverY-20],[leverX+12,leverY-20],[leverX+23,leverY-8],[leverX+20,leverY+15],[leverX+8,leverY+25],[leverX-13,leverY+23]];
 extrude(grip,5,7,18,accent,"#163c5b","#e8ffff");
 ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(leverX-12,leverY-8);ctx.lineTo(leverX+12,leverY-8);ctx.stroke();
 // Pixel-art pilot glove: a sculpted low-resolution sprite, extruded into stacked depth layers.
 // The hand remains human and naturally wrapped around the grip; no robotic fingers or armor.
 const gloveCanvas=document.createElement("canvas");gloveCanvas.width=gloveCanvas.height=72;
 const gg=gloveCanvas.getContext("2d");gg.imageSmoothingEnabled=false;
 // Wrist cuff and palm silhouette.
 gg.fillStyle="#101b2c";gg.fillRect(10,39,23,27);gg.fillStyle="#344b68";gg.fillRect(12,38,19,25);
 gg.fillStyle="#7187a4";gg.fillRect(13,39,16,3);gg.fillStyle="#1b2d46";gg.fillRect(14,45,14,15);
 // Palm: rounded stepped silhouette with shaded planes.
 gg.fillStyle="#0b1423";gg.fillRect(12,21,35,27);gg.fillRect(17,17,27,34);
 gg.fillStyle="#243a57";gg.fillRect(14,22,31,25);gg.fillRect(18,18,24,32);
 gg.fillStyle="#526b8b";gg.fillRect(19,19,18,4);gg.fillRect(15,24,5,15);
 gg.fillStyle="#172941";gg.fillRect(38,27,8,15);gg.fillRect(23,45,17,4);
 // Four gloved fingers curl over the forward side of the throttle.
 const finger=(x,y,w,shade)=>{gg.fillStyle="#0a1321";gg.fillRect(x-1,y-1,w+2,14);gg.fillStyle=shade;gg.fillRect(x,y,w,11);gg.fillStyle="#8ba0bb";gg.fillRect(x,y,w,2);gg.fillStyle="#1a2c44";gg.fillRect(x,y+8,w,3);gg.fillStyle="#9aacc2";gg.fillRect(x+1,y+5,w-2,1);};
 finger(18,8,7,"#526b89");finger(27,5,7,"#657d9b");finger(36,8,7,"#536b89");finger(44,14,6,"#3b5372");
 // Thumb crosses the grip in front, with a natural curved stepped shape.
 gg.fillStyle="#0a1321";gg.fillRect(37,31,19,11);gg.fillRect(42,27,13,11);
 gg.fillStyle="#405a7a";gg.fillRect(38,31,16,8);gg.fillRect(43,28,10,8);
 gg.fillStyle="#91a7c1";gg.fillRect(43,28,8,2);gg.fillStyle="#1a2b43";gg.fillRect(39,37,12,2);
 // Fabric seams, knuckle pads and restrained highlights.
 gg.fillStyle="#a9bdd3";gg.fillRect(20,13,4,1);gg.fillRect(29,11,4,1);gg.fillRect(38,14,4,1);
 gg.fillStyle="#101e31";gg.fillRect(21,24,2,12);gg.fillRect(30,23,2,13);gg.fillRect(39,24,2,8);
 gg.fillStyle="#91a8c2";gg.fillRect(17,43,13,1);gg.fillRect(16,47,8,1);
 // Build thickness from many offset copies, then render a crisp nearest-neighbour face.
 const gloveX=handX-17,gloveY=handY-24,gloveScale=1.12;
 ctx.save();ctx.translate(gloveX,gloveY);ctx.rotate(-.12-push*.08);
 for(let z=13;z>=1;z--){ctx.globalAlpha=fade*(.12+.035*(14-z));ctx.drawImage(gloveCanvas,z*.55,-z*.38,72*gloveScale,72*gloveScale);}
 ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=false;ctx.shadowColor="#000";ctx.shadowBlur=5;
 ctx.drawImage(gloveCanvas,0,0,72*gloveScale,72*gloveScale);ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;
 // Small stitched cuff tab catches the cockpit light.
 ctx.fillStyle=accent;ctx.globalAlpha=fade*.8;ctx.fillRect(12*gloveScale,49*gloveScale,11*gloveScale,1.5);
 ctx.restore();
 // Dramatic speed streaks radiate from the windshield as the power engages.
 ctx.globalAlpha=fade*Math.min(1,t*2);ctx.strokeStyle=accent;ctx.lineWidth=2;for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const r1=H*.18,r2=H*(.24+push*.23);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,H*.39+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*r2,H*.39+Math.sin(a)*r2);ctx.stroke();}
 ctx.globalAlpha=fade;ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="900 22px sans-serif";ctx.shadowColor=accent;ctx.shadowBlur=20;ctx.fillText(["OVERDRIVE","PHASE SHIFT","EMP BURST"][ship],cx,H*.115);ctx.shadowBlur=0;
 ctx.fillStyle="#b9d8ef";ctx.font="bold 9px monospace";ctx.fillText("NEURAL LINK  //  PILOT SYSTEM ONLINE",cx,H*.145);
 // Anime-style warning chevrons and activation bar.
 ctx.fillStyle=accent;ctx.font="bold 10px monospace";ctx.fillText(">> DRIVE LIMITER RELEASED <<",cx,H*.64);
 ctx.fillStyle="#263a59";ctx.fillRect(cx-75,H*.965,150,4);ctx.fillStyle=accent;ctx.fillRect(cx-75,H*.965,150*p,4);
 ctx.fillStyle="#e8f7ff";ctx.font="bold 9px monospace";ctx.fillText("SYSTEM OVERRIDE  ·  03 SEC",cx,H*.948);
 ctx.restore();
}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle="#080c1d";ctx.fillRect(0,0,W,H);ctx.strokeStyle="#17213e";ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
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
