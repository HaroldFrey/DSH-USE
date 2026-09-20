// test-client.mjs —— 用官方 SDK 的客户端连一次自己的服务器，验证握手 + 工具调用
//
// 说明：MCP 的 stdio 传输要求客户端 spawn 子进程并接管它的管道。
// 如果运行环境禁止创建管道，这里会直接以 EPERM 失败——
// 那属于环境限制，不是服务器的问题。

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const serverPath = new URL('./server.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: here,
  stderr: 'pipe',
});

const client = new Client({ name: 'dsh-demo-client', version: '1.0.0' });

try {
  await client.connect(transport);
  console.log('✅ 握手成功');

  const tools = await client.listTools();
  console.log(`\n发现 ${tools.tools.length} 个工具：`);
  for (const t of tools.tools) {
    console.log(`  • ${t.name}`);
    console.log(`    ${t.description?.slice(0, 70)}…`);
    console.log(`    参数: ${Object.keys(t.inputSchema?.properties ?? {}).join(', ')}`);
  }

  const target =
    'D:\\Stduy\\AXI寄存器资料\\iverilog_gtkwave_example\\counter.sv';
  console.log(`\n调用 verilog_ports(${target}) …`);
  const res = await client.callTool({ name: 'verilog_ports', arguments: { file: target } });
  console.log('\n--- 文本结果 ---');
  console.log(res.content.map((c) => c.text).join('\n'));
  console.log('\n--- 结构化结果 ---');
  console.log(JSON.stringify(res.structuredContent, null, 2));

  console.log('\n调用一个不存在的文件（应当优雅报错）…');
  const bad = await client.callTool({ name: 'verilog_ports', arguments: { file: 'D:\\no-such-file.sv' } });
  console.log('isError =', bad.isError, '|', bad.content.map((c) => c.text).join(''));
} catch (error) {
  console.error('\n❌ 测试失败：', error?.message ?? error);
  if (String(error?.message ?? '').includes('EPERM')) {
    console.error('   → 这是环境禁止创建管道导致的，不是服务器本身的缺陷。');
  }
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
