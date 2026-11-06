import sharp from "file:///D:/APP_Install/24_deepseek-harness/node_modules/sharp/dist/index.mjs";
const SRC = "D:/APP_Install/24_deepseek-harness/home/attachments/v1/objects/93/9315aab0b110a10ac3c0b74757257a3925f03bfe43fc850ea4fad70dcb5aa7be";
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const idx = (x, y) => (y * W + x) * C;
const isInk = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y); const r = data[i], g = data[i+1], b = data[i+2];
  const mn = Math.min(r,g,b), mx = Math.max(r,g,b);
  if (!(mn > 232 && mx - mn < 14)) isInk[y*W+x] = 1;
}
const label = new Int32Array(W*H).fill(-1); const comps = [];
const stack = new Int32Array(W*H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y*W+x; if (!isInk[p] || label[p] !== -1) continue;
  const id = comps.length; let sp = 0; stack[sp++] = p; label[p] = id;
  let minX=x,maxX=x,minY=y,maxY=y,area=0;
  while (sp > 0) { const q = stack[--sp]; const qx = q%W, qy = (q-qx)/W; area++;
    if (qx<minX) minX=qx; if (qx>maxX) maxX=qx; if (qy<minY) minY=qy; if (qy>maxY) maxY=qy;
    for (let k=0;k<4;k++){ const n = k===0?q-1:k===1?q+1:k===2?q-W:q+W;
      if (n<0||n>=W*H) continue; if (k<2 && Math.abs((n%W)-qx)!==1) continue;
      if (!isInk[n]||label[n]!==-1) continue; label[n]=id; stack[sp++]=n; } }
  comps.push({id,area,minX,maxX,minY,maxY});
}
comps.sort((a,b)=>b.area-a.area);
const keep = new Set([comps[0].id, comps[1].id]); // everything except bg? build mask of top-1 only
// Diagnostic A: top component only, on magenta
const outA = Buffer.alloc(W*H*4);
for (let y=0;y<H;y++) for (let x=0;x<W;x++){ const p=y*W+x, o=p*4;
  const on = label[p] === comps[0].id;
  if (on) { const i=idx(x,y); outA[o]=data[i]; outA[o+1]=data[i+1]; outA[o+2]=data[i+2]; outA[o+3]=255; }
  else { outA[o]=255; outA[o+1]=0; outA[o+2]=255; outA[o+3]=255; } }
await sharp(outA,{raw:{width:W,height:H,channels:4}}).png().toFile("desktop-pet/assets/_diag-comp1.png");
// also a bounding-box crop of comp0 with 10px margin, on magenta
const c = comps[0]; const m = 8;
const x0 = Math.max(0,c.minX-m), y0 = Math.max(0,c.minY-m);
const x1 = Math.min(W-1,c.maxX+m), y1 = Math.min(H-1,c.maxY+m);
await sharp("desktop-pet/assets/_diag-comp1.png").extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).toFile("desktop-pet/assets/_diag-comp1-crop.png");
console.log("bbox", {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1});
