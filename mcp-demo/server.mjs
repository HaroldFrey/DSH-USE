#!/usr/bin/env node
// server.mjs —— 一个最小可用的 MCP 服务器
//
// 暴露 1 个工具：verilog_ports
// 作用：读取 Verilog/SystemVerilog 文件，提取模块端口清单
//
// ⚠️ stdio 传输的铁律：
//    只有 JSON-RPC 协议消息能写进 stdout。
//    任何调试输出都必须走 console.error（stderr），
//    否则一个 console.log 就会让整个服务器失联。

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { portsOfFile } from './verilog.mjs';

const server = new McpServer({
  name: 'verilog-tools',
  version: '1.0.0',
});

server.registerTool(
  'verilog_ports',
  {
    title: '提取 Verilog 模块端口',
    description:
      '读取一个 Verilog/SystemVerilog 文件，返回其模块名与端口清单（方向、宽度、名字）。' +
      '适合在改动 RTL 前先确认接口，或核对例化时的端口连接。',
    inputSchema: {
      file: z.string().describe('Verilog/SystemVerilog 文件的绝对路径'),
    },
  },
  async ({ file }) => {
    try {
      const r = await portsOfFile(file);
      if (r.error) {
        return {
          content: [{ type: 'text', text: `解析失败：${r.error}（文件：${file}）` }],
          isError: true,
        };
      }
      const lines = [
        `模块 ${r.module}：${r.count} 个端口`,
        '',
        ...r.ports.map(
          (p) => `${String(p.dir ?? '?').padEnd(7)} ${p.width.padEnd(12)} ${p.name}`,
        ),
      ];
      // 结构化结果一并返回，方便调用方程序化使用
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { module: r.module, count: r.count, ports: r.ports },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `读取文件失败：${reason}` }],
        isError: true,
      };
    }
  },
);

// 启动：stdio 传输，DSH 会用 `command` 把我们 spawn 起来
await server.connect(new StdioServerTransport());
console.error('verilog-tools MCP 服务器已启动（stdio）');
