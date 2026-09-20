import { takeRange } from './verilog.mjs';

const RE_TYPE = /^(?:wire|reg|logic|bit|var|signed|unsigned)\b\s*/;

const samples = [
  'wire [WIDTH-1:0]  wdata',
  'wire [3:0]        rcount',
  'reg  [WIDTH-1:0]  rdata',
  'wire              wclk',
  '[WIDTH-1:0]  wdata',
];

for (const s of samples) {
  let rest = s;
  while (RE_TYPE.test(rest)) rest = rest.replace(RE_TYPE, '');
  console.log(JSON.stringify(s));
  console.log('   剥类型后 =', JSON.stringify(rest));
  console.log('   takeRange =', JSON.stringify(takeRange(rest)));
}
