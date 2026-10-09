# DSH-USE

DeepSeek Harness 的安装、配置与扩展实践资料：三篇中文指南，外加一个可运行的 MCP 服务器演示。

DeepSeek Harness 是 DeepSeek AI 开源的 Agent 运行框架，命令行工具名为 `dsh`，使用 TypeScript 编写，采用 MIT 许可证，于 2026 年 8 月开源。

## 目录结构

| 路径 | 内容 |
| --- | --- |
| [`guide/`](guide/) | 三篇中文指南：安装、首次使用与配置、自定义技能 |
| [`mcp-demo/`](mcp-demo/) | MCP 服务器演示：用官方 SDK 暴露一个 Verilog 端口解析工具 |

## 指南

按顺序阅读即可，三篇各自独立成篇，文末均附有参考来源。

| 文档 | 覆盖内容 |
| --- | --- |
| [01-安装方案.md](guide/01-安装方案.md) | 从装 Node.js 开始，到环境变量、目录规划、npm 缓存、安装验证、启动脚本与常见问题 |
| [02-首次使用与配置.md](guide/02-首次使用与配置.md) | 首次启动、配置 API Key、选择工作区、运行模式、权限审批、数据存储位置与故障排查 |
| [03-自定义技能.md](guide/03-自定义技能.md) | 技能格式与存放位置、扫描优先级、从 Claude Code 迁移技能、部署与验证方法 |

## MCP 演示（`mcp-demo/`）

一个最小可用的 MCP 服务器，暴露单个工具 `verilog_ports`：读入一个 Verilog/SystemVerilog 文件，返回模块名与端口清单（方向、宽度、名字），同时以 `structuredContent` 返回结构化结果，便于调用方程序化使用。

它同时演示了 stdio 传输的一条铁律——**只有 JSON-RPC 协议消息能写进 stdout，调试输出必须走 `stderr`**，否则一个 `console.log` 就会让服务器失联。

### 文件说明

| 文件 | 作用 | 需要外部依赖 |
| --- | --- | --- |
| [`verilog.mjs`](mcp-demo/verilog.mjs) | 纯解析逻辑：按括号深度切分端口列表，支持 ANSI 与非 ANSI 两种风格 | 否 |
| [`ports-cli.mjs`](mcp-demo/ports-cli.mjs) | 命令行调用解析器，打印若干文件的端口表 | 否 |
| [`test-verilog.mjs`](mcp-demo/test-verilog.mjs) | 解析器的用例测试，不启动 MCP、不 spawn 子进程 | 否 |
| [`debug-regex.mjs`](mcp-demo/debug-regex.mjs) | 单步观察类型剥离与宽度区间解析的中间结果 | 否 |
| [`server.mjs`](mcp-demo/server.mjs) | MCP 服务器本体：注册 `verilog_ports` 工具，stdio 传输 | 是 |
| [`test-client.mjs`](mcp-demo/test-client.mjs) | 用官方 SDK 的客户端连一次自己的服务器，验证握手与工具调用 | 是 |

> 解析逻辑与 MCP 传输层是分开的：`verilog.mjs` 不依赖 MCP，前四个脚本无需任何外部依赖即可运行，装不装 SDK 都能先验证解析是否正确。

### 解析方式

没有堆复杂正则，而是分三步走：

1. 定位模块名之后的「顶层括号组」，取最后一组作为端口列表（`#( 参数 )` 会排在端口列表前面）。
2. 按括号深度为 0 的 `,` `;` 把端口列表切成 token。
3. ANSI 风格（token 自带 `input`/`output`/`inout`）直接取方向、宽度、名字；非 ANSI 风格（端口列表只有名字）再回模块体里找方向声明。

已知局限见 `verilog.mjs` 文件头注释——这是教学实现，够用即可。

### 运行

环境要求：Node.js `^22.19.0` 或 `>=24.0.0`（同安装指南第 2 节）。

```bash
# 解析器测试与 CLI（无需安装任何依赖）
node mcp-demo/test-verilog.mjs
node mcp-demo/ports-cli.mjs path/to/your_module.v

# MCP 服务器与客户端需要官方 SDK 和 zod
cd mcp-demo && npm install @modelcontextprotocol/sdk zod
node server.mjs           # 启动 stdio 服务器
node test-client.mjs      # 另开一个终端，验证握手与工具调用
```

仓库未包含 `package.json`，依赖需按上面的命令自行安装。`server.mjs` 是标准 stdio MCP 服务器，任何支持 MCP 的客户端都能接入。

> `test-client.mjs` 需要客户端 spawn 子进程并接管管道；若运行环境禁止创建管道，会直接以 `EPERM` 失败——那属于环境限制，不是服务器的问题。

## 环境要求

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows、Linux 或 macOS |
| Node.js | `^22.19.0` 或 `>=24.0.0` |
| npm | 随 Node.js 一并安装 |

实际判断标准很简单：用 Node.js 的 LTS 版本，避开 `23.x`。

## 说明

文中出现的盘符与路径均为示例，读者可根据自己的磁盘情况调整。指南中的 DeepSeek Harness 相关表述均标注了来源，另附社区说法与官方资料的区分。
