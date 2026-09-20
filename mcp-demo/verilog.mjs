// verilog.mjs —— 纯逻辑，不依赖 MCP，可单独测试
// 从 Verilog/SystemVerilog 源码里提取模块端口声明。
//
// 实现思路（比堆复杂正则可靠）：
//   ① 定位模块名之后的「顶层括号组」，最后一组即端口列表
//      （`#( 参数 )` 会排在端口列表前面，所以要取最后一组）
//   ② 按括号深度 0 的 `,` `;` 把端口列表切成 token
//   ③ ANSI 风格：token 自带 input/output/inout → 直接取方向+宽度+名字
//      非 ANSI 风格：端口列表只有名字 → 再回模块体里找方向声明
//
// 已知局限（教学实现，够用即可）：
//   - 端口列表本身是逗号分隔时（`module m(a, b);`）两种风格无法从语法上区分，
//     本实现优先按「列表里带方向」判定，没判定到才回退扫模块体。
//   - 端口列表里用 `parameter` 的极少见写法不处理。

import { readFile } from 'node:fs/promises';

// 只匹配 token 开头的括号区间，不会吃掉后面的名字。
// 字符类含 `-`，才能覆盖 `WIDTH-1:0` 这类表达式。
const RE_LEADING_RANGE = /^\[\s*([-\w$.]+)\s*(?::\s*([-\w$.]+)\s*)?\]\s*/;
const RE_DIR = /^(input|output|inout)\b\s*/;
const RE_TYPE = /^(?:wire|reg|logic|bit|var|signed|unsigned)\b\s*/;
const RE_IDENT = /^[A-Za-z_]\w*$/;

/** 去掉行注释与块注释 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** 从 from 起，按顺序取出所有顶层括号组的内容 */
function parenGroups(src, from) {
  const groups = [];
  let i = from;
  for (;;) {
    const open = src.indexOf('(', i);
    if (open === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = open; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') {
        depth--;
        if (depth === 0) { end = j; break; }
      }
    }
    if (end === -1) return null; // 括号不配对
    groups.push({ text: src.slice(open + 1, end), end });
    i = end + 1;
    // 两组括号之间只允许空白或 `#`，否则说明已经进了模块体
    const gap = src.slice(i).match(/^[\s#]*/)[0];
    i += gap.length;
    if (!src.slice(i).startsWith('(')) break;
  }
  return groups;
}

/** 在括号深度 0 的 , 和 ; 处切分 */
function splitTokens(text) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const c of text) {
    if (c === '[' || c === '(' || c === '{') depth++;
    else if (c === ']' || c === ')' || c === '}') depth--;
    if (depth === 0 && (c === ',' || c === ';')) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 解析 `[7:0]` 这类前导区间，返回 [宽度字符串, 剩余文本] */
function takeRange(text) {
  const m = RE_LEADING_RANGE.exec(text);
  if (!m) return [null, text];
  const width = m[2] !== undefined
    ? `${m[1].replace(/\s+/g, '')}:${m[2].replace(/\s+/g, '')}`
    : m[1].replace(/\s+/g, '');
  return [width, text.slice(m[0].length)];
}

/**
 * 解析一段 Verilog/SystemVerilog 源码的模块端口。
 * @returns {{file:string, module:string|null, count:number, ports:Array, body?:string, error?:string}}
 */
export function parsePorts(text, file = '<memory>') {
  const src = stripComments(text);
  const m = /(?:^|\n)\s*(?:module|macromodule)\s+([A-Za-z_]\w*)/.exec(src);
  if (!m) return { file, module: null, count: 0, ports: [], error: '未找到 module 声明' };

  const moduleName = m[1];
  const groups = parenGroups(src, m.index + m[0].length);
  if (!groups || groups.length === 0) {
    return { file, module: moduleName, count: 0, ports: [], error: '未找到配对的端口括号' };
  }

  const portList = groups[groups.length - 1].text;
  const body = src.slice(groups[groups.length - 1].end + 1);
  const ports = [];
  const order = [];

  // ── 第一遍：ANSI 风格（token 自带方向） ──
  let direction = null;
  let width = null;
  for (const rawToken of splitTokens(portList)) {
    let rest = rawToken;
    const dir = RE_DIR.exec(rest);
    if (dir) {
      direction = dir[1];
      width = null; // 新声明开始，宽度不继承
      rest = rest.slice(dir[0].length);
    } else if (!direction) {
      continue; // 方向还没出现，这个 token 是参数或噪声
    }

    while (RE_TYPE.test(rest)) rest = rest.replace(RE_TYPE, '');

    let w;
    [w, rest] = takeRange(rest);
    if (w !== null) width = w;

    for (const name of rest.split(',')) {
      const clean = name.trim();
      if (RE_IDENT.test(clean)) {
        ports.push({ name: clean, dir: direction, width: width ?? '1' });
        order.push(clean);
      }
    }
  }

  // ── 第二遍：非 ANSI 风格（端口列表只有名字，方向在模块体里） ──
  if (ports.length === 0) {
    const declared = new Map();
    let dir = null;
    let w = null;
    for (const rawToken of splitTokens(body)) {
      let rest = rawToken;
      const d = RE_DIR.exec(rest);
      if (d) {
        dir = d[1];
        w = null;
        rest = rest.slice(d[0].length);
        while (RE_TYPE.test(rest)) rest = rest.replace(RE_TYPE, '');
        let taken;
        [taken, rest] = takeRange(rest);
        if (taken !== null) w = taken;
      } else if (!dir) {
        continue;
      }
      while (RE_TYPE.test(rest)) rest = rest.replace(RE_TYPE, '');
      for (const name of rest.split(',')) {
        const clean = name.trim();
        if (RE_IDENT.test(clean)) declared.set(clean, { dir, width: w ?? '1' });
      }
    }
    for (const name of splitTokens(portList)) {
      const clean = name.trim();
      if (!RE_IDENT.test(clean)) continue;
      order.push(clean);
      const d = declared.get(clean);
      ports.push({
        name: clean,
        dir: d?.dir ?? null,        // null = 模块体里没找到方向声明
        width: d?.width ?? '1',
      });
    }
  }

  return { file, module: moduleName, count: ports.length, ports, order };
}

/** 读文件并解析端口 */
export async function portsOfFile(file) {
  return parsePorts(await readFile(file, 'utf8'), file);
}

export { parenGroups, splitTokens, stripComments, takeRange };
