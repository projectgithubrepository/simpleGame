export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

export function nextSpawnInterval(score) {
  return Math.max(260, 900 - Math.floor(score / 5) * 22);
}

export function calculateScore(seconds) {
  return Math.max(0, Math.floor(seconds * 10));
}