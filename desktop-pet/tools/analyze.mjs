import sharp from "file:///D:/APP_Install/24_deepseek-harness/node_modules/sharp/dist/index.mjs";
const SRC = "D:/APP_Install/24_deepseek-harness/home/attachments/v1/objects/93/9315aab0b110a10ac3c0b74757257a3925f03bfe43fc850ea4fad70dcb5aa7be";
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
console.log("size", W, H, "channels", C);
const idx = (x, y) => (y * W + x) * C;
const isInk = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y);
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  // near-white background: bright and unsaturated
  if (!(mn > 232 && mx - mn < 14)) isInk[y * W + x] = 1;
}
// connected components (4-conn) over ink
const label = new Int32Array(W * H).fill(-1);
const comps = [];
const stack = new Int32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (!isInk[p] || label[p] !== -1) continue;
  const id = comps.length; let sp = 0; stack[sp++] = p; label[p] = id;
  let minX = x, maxX = x, minY = y, maxY = y, area = 0;
  while (sp > 0) {
    const q = stack[--sp]; const qx = q % W, qy = (q - qx) / W; area++;
    if (qx < minX) minX = qx; if (qx > maxX) maxX = qx;
    if (qy < minY) minY = qy; if (qy > maxY) maxY = qy;
    const nb = [q - 1, q + 1, q - W, q + W];
    for (let k = 0; k < 4; k++) {
      const n = nb[k]; if (n < 0 || n >= W * H) continue;
      if (k < 2 && Math.abs((n % W) - qx) !== 1) continue;
      if (!isInk[n] || label[n] !== -1) continue;
      label[n] = id; stack[sp++] = n;
    }
  }
  comps.push({ id, area, minX, maxX, minY, maxY });
}
comps.sort((a, b) => b.area - a.area);
for (const c of comps.slice(0, 12)) console.log(JSON.stringify({ area: c.area, x: c.minX, y: c.minY, w: c.maxX - c.minX + 1, h: c.maxY - c.minY + 1 }));
