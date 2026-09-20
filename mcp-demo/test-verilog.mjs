// 纯逻辑测试：不启动 MCP、不 spawn 子进程
import { parsePorts } from './verilog.mjs';

// [用例名, 源码, 期望端口数]
const cases = [
  ['ANSI + 参数 + 宽度', `
module fifo_async #(
  parameter DEPTH = 16,
  parameter WIDTH = 8
) (
  input  wire              wclk,
  input  wire              wrst_n,
  input  wire [WIDTH-1:0]  wdata,
  output wire              wfull,
  output reg  [WIDTH-1:0]  rdata,
  output wire [3:0]        rcount,
  inout  wire              sda
);
  reg [7:0] mem [0:DEPTH-1];
endmodule
`, 7],

  ['非 ANSI', `
module legacy(a, b, clk, rst_n, out);
  input clk;
  input rst_n;
  input wire [7:0] a;
  input [7:0] b;
  output [8:0] out;
endmodule
`, 5],

  ['单行模块', `module tiny(input clk, output reg q); always_ff @(posedge clk) q <= ~q; endmodule`, 2],

  ['负下标区间', `
module neg_slice (
  input  signed [7:0]  a,
  output        [-1:0] weird,
  output logic         done
);
endmodule
`, 3],

  ['注释干扰', `
module cmt (
  input  wire [7:0] data,  // 这里出现 output 字样但不该算端口
  output wire       valid   /* inout 也是 */
);
endmodule
`, 2],

  ['多名字一行', `
module multi (
  input  wire a, b, c,
  output wire x, y
);
endmodule
`, 5],

  ['无端口模块', `module nothing; endmodule`, 0],

  ['括号不配对', `module broken (input clk`, 0],

  ['宋体关键词无空格', `module t(input[7:0]d, output q); endmodule`, 2],
];

let bad = 0;
for (const [label, src, expect] of cases) {
  const r = parsePorts(src, label);
  const ok = r.count === expect;
  if (!ok) bad++;
  console.log(`\n${ok ? '✅' : '❌'} ${label}：期望 ${expect}，实得 ${r.count}${r.error ? ` (${r.error})` : ''}  模块名=${r.module}`);
  for (const p of r.ports) console.log(`     ${String(p.dir).padEnd(7)} ${p.width.padEnd(10)} ${p.name}`);
}
console.log(`\n===== ${cases.length - bad}/${cases.length} 通过 =====`);
process.exit(bad === 0 ? 0 : 1);
