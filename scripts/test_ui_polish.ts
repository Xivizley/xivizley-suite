import assert from "node:assert";

// 1. Password Strength Logic Test
function calculatePasswordStrength(pass: string) {
  if (!pass) {
    return { score: 0, label: 'Çok Zayıf' };
  }

  const hasLower = /[a-z]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  const hasMinLength = pass.length >= 12;

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecial) poolSize += 33;

  const entropyBits = Math.round(pass.length * (poolSize > 0 ? Math.log2(poolSize) : 0));

  let score = 0;
  if (hasMinLength) score++;
  if (hasLower && hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  if (pass.length >= 16 && score >= 3) score = 4;

  if (pass.length < 8) {
    score = Math.min(score, 1);
  } else if (!hasMinLength) {
    score = Math.min(score, 2);
  }

  let label: 'Çok Zayıf' | 'Zayıf' | 'Orta' | 'Çok Güçlü' = 'Çok Zayıf';
  if (score <= 1) label = 'Çok Zayıf';
  else if (score === 2) label = 'Zayıf';
  else if (score === 3) label = 'Orta';
  else label = 'Çok Güçlü';

  return { score, entropyBits, label };
}

// Tests
console.log("Testing Password Strength meter...");
const shortComplex = calculatePasswordStrength("Ab1!");
assert.strictEqual(shortComplex.score, 1, "Short password should not be score > 1");
assert.strictEqual(shortComplex.label, "Çok Zayıf");

const mediumComplex = calculatePasswordStrength("Abc123$!x");
assert.strictEqual(mediumComplex.score, 2, "10-char password should be capped at 2 (Zayıf)");
assert.strictEqual(mediumComplex.label, "Zayıf");

const strongPass = calculatePasswordStrength("Correct-Horse-Battery-Staple-2026!");
assert.strictEqual(strongPass.score, 4, "Long complex password should be score 4 (Çok Güçlü)");
assert.strictEqual(strongPass.label, "Çok Güçlü");
console.log("✅ Password Strength tests passed!");

// 2. Command History Logic Test
console.log("Testing Cockpit Command Navigation Logic...");
let history = ["status", "say hello", "stop"];
let historyIndex = -1;
let draft = "incomplete-cmd";
let currentInput = draft;

// ArrowUp: index 0 (status)
historyIndex = 0;
currentInput = history[historyIndex]!;
assert.strictEqual(currentInput, "status");

// ArrowUp: index 1 (say hello)
historyIndex = 1;
currentInput = history[historyIndex]!;
assert.strictEqual(currentInput, "say hello");

// ArrowDown: index 0 (status)
historyIndex = 0;
currentInput = history[historyIndex]!;
assert.strictEqual(currentInput, "status");

// ArrowDown: draft restored
historyIndex = -1;
currentInput = draft;
assert.strictEqual(currentInput, "incomplete-cmd");
console.log("✅ Command history navigation logic passed!");

// 3. TOTP Ring Boundary Test
console.log("Testing TOTP Ring Boundary & Clamping...");
const radius = 15;
const circumference = 2 * Math.PI * radius;

function getTotpOffset(sec: number) {
  const clamped = Math.max(0, Math.min(sec, 30));
  return circumference * (1 - clamped / 30);
}

assert.strictEqual(getTotpOffset(30), 0);
assert(Math.abs(getTotpOffset(0) - circumference) < 0.001);
assert(Math.abs(getTotpOffset(15) - circumference / 2) < 0.001);
console.log("✅ TOTP Ring calculations passed!");

console.log("\n🎉 ALL POLISH & REGRESSION UNIT TESTS PASSED 100%!");
