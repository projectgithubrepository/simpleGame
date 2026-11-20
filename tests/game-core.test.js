import test from "node:test";
import assert from "node:assert/strict";
import { clamp, intersects, nextSpawnInterval, calculateScore, coinValue, powerupDuration, canUnlockSkin } from "../src/game-core.js";

test("clamp keeps values inside boundaries", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
});
test("rectangle collision detects overlap but not separation", () => {
  assert.equal(intersects({x:0,y:0,width:10,height:10},{x:5,y:5,width:10,height:10}), true);
  assert.equal(intersects({x:0,y:0,width:10,height:10},{x:11,y:0,width:10,height:10}), false);
});
test("spawn interval gets faster but has a lower limit", () => {
  assert.equal(nextSpawnInterval(0), 900);
  assert.ok(nextSpawnInterval(100) < 900);
  assert.equal(nextSpawnInterval(10000), 260);
});
test("score is elapsed seconds multiplied by ten, rounded down", () => {
  assert.equal(calculateScore(3.89), 38);
  assert.equal(calculateScore(-1), 0);
});
test("coins and powerups have consistent rewards and duration", () => {
  assert.equal(coinValue(), 5);
  assert.equal(powerupDuration(), 5);
});
test("skin unlock checks the saved coin balance", () => {
  assert.equal(canUnlockSkin(49), false);
  assert.equal(canUnlockSkin(50), true);
  assert.equal(canUnlockSkin(100, 75), true);
});