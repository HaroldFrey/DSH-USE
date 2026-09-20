import { portsOfFile } from './verilog.mjs';

const files = process.argv.slice(2);
for (const f of files) {
  try {
    const r = await portsOfFile(f);
    console.log(`\n=== ${f} ===`);
    console.log(`模块: ${r.module}   端口数: ${r.count}${r.error ? '   错误: ' + r.error : ''}`);
    const pad = Math.max(4, ...r.ports.map((p) => String(p.dir).length));
    const wp = Math.max(5, ...r.ports.map((p) => p.width.length));
    for (const p of r.ports) {
      console.log(`   ${String(p.dir).padEnd(pad)}  ${p.width.padEnd(wp)}  ${p.name}`);
    }
  } catch (e) {
    console.log(`\n=== ${f} ===\n  读取失败: ${e.message}`);
  }
}
