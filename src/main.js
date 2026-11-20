import { clamp, intersects, nextSpawnInterval, calculateScore } from "./game-core.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best-score");
const statusEl = document.querySelector("#status");
const overlay = document.querySelector("#overlay");
const titleEl = document.querySelector("#overlay-title");
const copyEl = document.querySelector("#overlay-copy");
const eyebrowEl = document.querySelector("#overlay-eyebrow");
const playButton = document.querySelector("#play-button");
const soundButton = document.querySelector("#sound-button");

const W = canvas.width, H = canvas.height;
const player = { x: W / 2 - 17, y: H - 82, width: 34, height: 34, speed: 330 };
let obstacles = [], particles = [], running = false, elapsed = 0, spawnTimer = 0;
let lastTime = 0, pointerDirection = 0, soundOn = false, audioContext = null;
let best = Number(localStorage.getItem("neon-dodge-best") || 0);
bestEl.textContent = best;

const keys = new Set();
function beep(frequency = 440, duration = .06) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.frequency.value = frequency; osc.type = "sine";
    gain.gain.setValueAtTime(.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + duration);
  } catch {}
}

function reset() {
  obstacles = []; particles = []; elapsed = 0; spawnTimer = 0;
  player.x = W / 2 - player.width / 2;
  scoreEl.textContent = "0";
}
function start() {
  reset(); running = true; lastTime = performance.now();
  overlay.classList.add("hidden"); statusEl.textContent = "GO!";
  requestAnimationFrame(loop); beep(620, .1);
}
function endGame() {
  running = false;
  const score = calculateScore(elapsed);
  if (score > best) { best = score; localStorage.setItem("neon-dodge-best", String(best)); bestEl.textContent = best; }
  statusEl.textContent = "GAME OVER";
  eyebrowEl.textContent = "RUN COMPLETE";
  titleEl.innerHTML = "GAME<br><span>OVER</span>";
  copyEl.textContent = `You scored ${score}. Best score: ${best}. Ready for another run?`;
  playButton.innerHTML = "PLAY AGAIN <span>→</span>";
  overlay.classList.remove("hidden"); beep(150, .25);
}

function spawnObstacle() {
  const width = 24 + Math.random() * 42;
  obstacles.push({ x: Math.random() * (W - width), y: -30, width, height: 18 + Math.random() * 22, speed: 190 + Math.min(210, elapsed * 5) + Math.random() * 55, hue: Math.random() > .5 ? 174 : 328 });
}
function burst(x, y) {
  for (let i = 0; i < 18; i++) particles.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, life: .5 });
}
function update(dt) {
  elapsed += dt;
  const direction = (keys.has("ArrowRight") || keys.has("d") || keys.has("D") ? 1 : 0) -
    (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") ? 1 : 0) || pointerDirection;
  player.x = clamp(player.x + direction * player.speed * dt, 8, W - player.width - 8);
  spawnTimer += dt * 1000;
  if (spawnTimer >= nextSpawnInterval(calculateScore(elapsed))) { spawnTimer = 0; spawnObstacle(); }
  for (const obstacle of obstacles) obstacle.y += obstacle.speed * dt;
  obstacles = obstacles.filter(o => o.y < H + 40);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  const box = { x: player.x + 5, y: player.y + 5, width: player.width - 10, height: player.height - 10 };
  for (const obstacle of obstacles) {
    if (intersects(box, obstacle)) { burst(player.x + 17, player.y + 17); endGame(); return; }
  }
  scoreEl.textContent = calculateScore(elapsed);
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#080c1d"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#17213e"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (const o of obstacles) {
    ctx.shadowBlur = 16; ctx.shadowColor = `hsl(${o.hue} 100% 60%)`;
    ctx.fillStyle = `hsl(${o.hue} 100% 62%)`; ctx.fillRect(o.x, o.y, o.width, o.height);
  }
  ctx.shadowBlur = 20; ctx.shadowColor = "#50f6ed";
  ctx.fillStyle = "#50f6ed";
  ctx.beginPath(); ctx.moveTo(player.x + 17, player.y); ctx.lineTo(player.x + 34, player.y + 32); ctx.lineTo(player.x + 17, player.y + 25); ctx.lineTo(player.x, player.y + 32); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = "#ff4e9b"; ctx.fillRect(p.x, p.y, 4, 4); }
  ctx.globalAlpha = 1;
}
function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, .035); lastTime = now;
  update(dt); draw();
  if (running) requestAnimationFrame(loop);
}
function bindHold(button, direction) {
  const down = event => { event.preventDefault(); pointerDirection = direction; };
  const up = () => { if (pointerDirection === direction) pointerDirection = 0; };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
}
bindHold(document.querySelector("#left-button"), -1);
bindHold(document.querySelector("#right-button"), 1);
window.addEventListener("keydown", e => { if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault(); keys.add(e.key); });
window.addEventListener("keyup", e => keys.delete(e.key));
window.addEventListener("blur", () => { keys.clear(); pointerDirection = 0; });
playButton.addEventListener("click", start);
soundButton.addEventListener("click", () => { soundOn = !soundOn; soundButton.textContent = soundOn ? "♫" : "♪"; soundButton.setAttribute("aria-label", soundOn ? "Mute sound" : "Enable sound"); beep(520); });
canvas.addEventListener("pointerdown", e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  pointerDirection = x < player.x + player.width / 2 ? -1 : 1;
});
canvas.addEventListener("pointerup", () => pointerDirection = 0);
canvas.addEventListener("pointercancel", () => pointerDirection = 0);

draw();