/**
 * Movy / WeCollege HLS stream source decryption helper.
 * Receives JSON on stdin: { payload, seed, tmdbId }
 * Prints decrypted JSON to stdout.
 */
const fs = require('fs');

let d = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174];
let i = [109,118,109,49];
let r = e => (e*(e+1)&1) == 0;

function o(e) {
  e >>>= 0;
  e ^= e >>> 16;
  e = Math.imul(e, 0x85ebca6b) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 0xc2b2ae35) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}

function u(e, a) {
  return (e >>>= 0, 0 == (a &= 31)) ? e >>> 0 : (e << a | e >>> 32 - a) >>> 0;
}

function decrypt(e, a, t) {
  let n = function(e) {
    let a = e.replace(/-/g, "+").replace(/_/g, "/").padEnd(4 * Math.ceil(e.length / 4), "=");
    let buf = Buffer.from(a, "base64");
    let arr = new Uint8Array(buf.length);
    for (let i = 0; i < buf.length; i++) arr[i] = buf[i];
    return arr;
  }(e);

  let l = function(e, a, t) {
    let s = function(e, a) {
      let t;
      if (((t = e.length) * (t + 1) & 1) == 1) {
        return {
          S: function(e) {
            let a = Array(256);
            for (let e = 0; e < 256; e++) a[e] = e;
            let t = 0;
            for (let s = 0; s < 256; s++) {
              t = t + a[s] + e.charCodeAt(s % e.length) & 255;
              let n = a[s];
              a[s] = a[t];
              a[t] = n;
            }
            return a;
          }(e),
          acc: function(e) {
            let a = 0x67452301;
            for (let t = 0; t < e.length; t++) a = u((a ^ Math.imul(e.charCodeAt(t), d[15 & t])) >>> 0, 5);
            return o(a);
          }(e)
        };
      }
      let s = Array(61);
      let n = o(function(e) {
        let a = 0x811c9dc5;
        for (let t = 0; t < e.length; t++) a = Math.imul(a ^ e.charCodeAt(t), 0x1000193) >>> 0;
        return o(a);
      }(e) ^ o(a >>> 0 ^ 0x9e3779b9)) >>> 0;

      for (let e = 0; e < 8; e++) {
        if (r(e)) {
          let a = n % 61;
          n = u(n + 0x9e3779b9 >>> 0, 7 + (7 & e));
          s[a] = (n ^ o(n)) >>> 0;
          n = o(n + a >>> 0);
        } else {
          s[e] = d[15 & e];
        }
      }
      return { S: s, acc: o(0xa5a5a5a5 ^ n) >>> 0 };
    }(e, a);

    let n = new Uint8Array(t);
    let l = 0;
    for (let e = 0; e < t;) {
      let a = function(e, a) {
        var t, s;
        let n = e.S;
        let l = e.acc;
        let d = l % 61;
        let i = 0 - Number(d in n);
        let r = n[d] >>> 0;
        let c = Math.imul(0x9e3779b9, a + 1) >>> 0;
        let b = (((t = l) ^ (s = (r ^ c) >>> 0)) >>> 0 | (t & s & i) >>> 0) >>> 0;
        l = o((b = (u(b + l >>> 0, 31 & d) ^ u(l, 31 & Math.imul(d, 7))) >>> 0) + 0x9e3779b9 >>> 0);
        n[d] = l >>> 0;
        e.acc = l;
        return l >>> 0;
      }(s, l++);
      n[e++] = 255 & a;
      if (e < t) n[e++] = a >>> 8 & 255;
      if (e < t) n[e++] = a >>> 16 & 255;
      if (e < t) n[e++] = a >>> 24 & 255;
    }
    return n;
  }(a, t, n.length);

  for (let e = 0; e < n.length; e++) n[e] ^= l[e];
  for (let e = 0; e < i.length; e++) {
    if (n[e] !== i[e]) throw Error("decrypt failed: bad seed or tampered payload");
  }
  let s = n.subarray(i.length);
  return Buffer.from(s).toString("utf8");
}

function main() {
  const input = fs.readFileSync(0, 'utf-8');
  if (!input) return;
  const data = JSON.parse(input);
  const result = decrypt(data.payload, data.seed, parseInt(data.tmdbId));
  process.stdout.write(result);
}

try {
  main();
} catch (err) {
  process.stderr.write(String(err));
  process.exit(1);
}
