const assert = require('assert');

// We simulate the exact logic implemented in src/lib/uuid.ts under different environmental scenarios
function createUUIDGenerator(envCrypto, envPerformance) {
  return function generateUUID() {
    // 1. Try native crypto.randomUUID() if supported
    if (typeof envCrypto !== 'undefined' && envCrypto && typeof envCrypto.randomUUID === 'function') {
      try {
        return envCrypto.randomUUID();
      } catch {
        // Fall through
      }
    }

    // 2. Try crypto.getRandomValues()
    if (typeof envCrypto !== 'undefined' && envCrypto && typeof envCrypto.getRandomValues === 'function') {
      try {
        const bytes = new Uint8Array(16);
        envCrypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [];
        for (let i = 0; i < 16; i++) {
          hex.push(bytes[i].toString(16).padStart(2, '0'));
        }
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
      } catch {
        // Fall through
      }
    }

    // 3. Fallback: RFC 4122 compliant UUID v4 using timestamp and pseudo-randomness
    let d = Date.now();
    let d2 = (typeof envPerformance !== 'undefined' && envPerformance && typeof envPerformance.now === 'function')
      ? Math.floor(envPerformance.now() * 1000)
      : 0;

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      let r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else if (d2 > 0) {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      } else {
        r = r | 0;
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };
}

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

console.log('--- TEST 1: Full Native crypto.randomUUID available ---');
const gen1 = createUUIDGenerator(globalThis.crypto, globalThis.performance);
const id1 = gen1();
console.log('Sample ID (native):', id1);
assert.match(id1, uuidV4Regex, 'Native randomUUID should match RFC 4122 v4');

console.log('--- TEST 2: crypto.randomUUID NOT a function, but crypto.getRandomValues available ---');
const cryptoNoRandomUUID = {
  getRandomValues: (arr) => globalThis.crypto.getRandomValues(arr)
};
const gen2 = createUUIDGenerator(cryptoNoRandomUUID, globalThis.performance);
const id2 = gen2();
console.log('Sample ID (getRandomValues):', id2);
assert.match(id2, uuidV4Regex, 'getRandomValues fallback should match RFC 4122 v4');

console.log('--- TEST 3: Neither crypto.randomUUID nor getRandomValues available (Legacy / Insecure fallback) ---');
const gen3 = createUUIDGenerator(undefined, globalThis.performance);
const id3 = gen3();
console.log('Sample ID (Pure Fallback):', id3);
assert.match(id3, uuidV4Regex, 'Pure fallback should match RFC 4122 v4');

console.log('--- TEST 4: Collision / Uniqueness test (10,000 IDs per generator) ---');
[gen1, gen2, gen3].forEach((gen, index) => {
  const set = new Set();
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    const id = gen();
    assert(!set.has(id), `Collision detected on generator ${index + 1} at iteration ${i}: ${id}`);
    assert.match(id, uuidV4Regex, `ID ${id} on generator ${index + 1} does not match UUID v4`);
    set.add(id);
  }
  console.log(`Generator ${index + 1}: Generated ${iterations} unique valid UUIDs without collision.`);
});

console.log('ALL UUID COMPATIBILITY TESTS PASSED SUCCESSFULLY!');
