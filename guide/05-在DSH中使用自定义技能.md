# 在 DSH 中使用自定义技能

本文只讲三件事：你的技能仓库是什么、DSH 用上技能需要什么条件、具体怎么配置。

实测环境：DSH 桌面版，`DSH_HOME = C:\Users\28968\.dsh`，2026-11-05。

---

## **1. 你的技能仓库**

### **1.1 来源与位置**

- 仓库：<https://github.com/HaroldFrey/frey-skills>
- 本机克隆位置：`C:\Users\28968\.claude\skills`
- 性质：静态文件集合，克隆后不需要构建，`git pull` 即更新

```bash
git clone https://github.com/HaroldFrey/frey-skills.git C:\Users\28968\.claude\skills
```

### **1.2 布局约定**

仓库根目录下**每个子目录就是一个技能**，技能正文是该目录里的 `SKILL.md`：

```text
C:\Users\28968\.claude\skills\
├── full-review\
│   ├── SKILL.md          ← 正文，YAML frontmatter + 指令
│   ├── 使用说明.md        ← 给人看的说明，DSH 不读
│   └── learnings.md      ← 经验积累
├── sv-dev-workflow-vivado\
│   └── SKILL.md
└── ...
```

`SKILL.md` 开头是 frontmatter，只有两个字段有用：

```yaml
---
name: full-review
description: 全面审查项目脚本和文档，按严重程度分级列出问题。触发词：检查、详细检查、review、全面检查、代码审查、full-review。
---
```

`description` 里那些「触发词」不是装饰，它们决定 DSH 什么时候想起这个技能（见第 2 节）。仓库里其余的 `使用说明.md`、`learnings.md`、`examples/`、`references/` 都是配套资料，DSH 不扫描，由技能正文在运行时按需引用。

### **1.3 技能清单**

共 20 个可用技能（22 个目录里，`project-experiences` 无 `SKILL.md`、`i-have-adhd-repo` 是第三方克隆，都不算）。

| 分类 | 技能 | 用途 |
| --- | --- | --- |
| FPGA 开发链 | `sv-dev-workflow-vivado` | RTL 全流程主编排：微架构→编码→审查→testbench→Vivado 仿真→综合验证 |
| | `sv-dev-workflow` | 同上，但仿真走 iverilog + gtkwave（与上面重复，只留一个） |
| | `verilog-sv-language` | IEEE 1800 代码级知识、可综合写法 |
| | `vivado-synth` | 综合策略、属性、`synth_design` 调优 |
| | `vivado-analysis` | 时序报告解读、时序收敛 |
| | `vivado-tcl` | Vivado/Vitis TCL 脚本生成与执行 |
| 项目流程 | `req-analysis` | 追问式需求澄清，产出需求文档 |
| | `project-reader` | 读项目出架构/调用关系/关键文件报告 |
| | `project-evolution` | 生成 `ITERATION_LOG.md`（文+图+表） |
| | `full-review` | 全项目脚本与文档审查，按严重程度分级 |
| Bash / 构建 | `bash-dev-workflow` | Bash 脚本开发全流程 |
| | `bash-defensive-patterns` | 生产级防御式 Bash 写法 |
| | `makefile-patterns` | Makefile 构建/发布模式 |
| 元技能 | `skill-maker` | 按描述制作新技能并迭代 |
| | `skills` | 列出已安装技能（Claude Code 的 `/skills`，DSH 无此命令） |
| 输出风格 | `i-have-adhd` | 改成「先给下一步动作」的紧凑输出 |
| 与内置重复 | `ls`、`pwd`、`git-pull`、`git-push` | 内置工具已覆盖，接入收益低 |
| 不完整 | `project-experiences` | 只有一个 `.md` 笔记，**没有 `SKILL.md`**，不是技能 |

### **1.4 两个已知问题**

1. **`project-experiences` 缺 `SKILL.md`**，接进去也不会被发现。当资料用：让我直接读那个 `Register-Config-Module.md`。
2. **`sv-dev-workflow` 与 `sv-dev-workflow-vivado` 描述几乎逐字相同**，两个都接会互相抢触发词。本机只接 Vivado 版。

---

## **2. 让 DSH 用上技能：机制与条件**

### **2.1 机制：技能不是命令，是「目录 + 按需读的说明书」**

DSH 每轮只把每个技能注入成一行 `名称 + description`——这就是 Agent 看到的「技能目录」。Agent 判断你的需求命中某条描述，才去调工具读那份 `SKILL.md` 全文并照它执行。

所以「使用技能」靠两件事，缺一不可：

1. **它得在扫描根里**——没被扫到，Agent 根本不知道它存在；
2. **你的话要能命中 `description`**——你每个技能里写的「触发词」，就是为了这一步。

扫描根（优先级从高到低）：

| 优先级 | 来源 | 路径 | 本机 |
| --- | --- | --- | --- |
| 100 | project-dsh | `<项目根>/.dsh/skills` | 不存在 |
| 200 | project-agents | `<项目根>/.agents/skills` | 不存在 |
| 300 | custom | `customSkillDirs` 配置项 | **不生效**（见 2.3） |
| 400 | user-dsh | `<DSH_HOME>/skills` | **本文的目标位置** |
| 500 | user-agents | `<DSH_AGENTS_HOME>/skills` | 变量未设置 |
| 600 | bundled | `bundledSkillDir` 配置项 | 插件自带技能 |

扫描只往下走一层：`<扫描根>/<技能名>/SKILL.md`。再深一层就找不到。

### **2.2 现状：接入前是什么样**

**接入前**，`C:\Users\28968\.dsh\skills` 这个目录**不存在**，项目级技能根也不存在。那时 Agent 的技能目录里只有：

- `archify`——另一个插件（`@tt-a1i/archify-dsh`）自带的
- `hindsight`、`office`、`office-*`、`diagnose-*`——DSH 与插件自带的

你自己那 20 个，一个都没有。所以哪怕你说「用 full-review 检查」，Agent 也不知道有这个技能。

> 第 3 节会把它们接上；接入后这个「现状」就变成历史。

### **2.3 为什么改配置不生效**

在 `cordis.patch.yml` 里给 `skill-filesystem` 加 `customSkillDirs`，在 Web / 桌面版**不生效**：那条补丁命中 host 平面的行，而 `dsh-web-app` 已把它置为 `disabled`，会话里真正生效的是预设作用域内的那一行。详见 `03-自定义技能.md` 第 5.4 节。

结论：接自定义技能走**目录联接**或**复制**，不要走配置。

### **2.4 临时用法：不接入也能用**

不想接线、或只想用一次时，直接把路径给我：

> 读 `C:\Users\28968\.claude\skills\full-review\SKILL.md`，按它检查 `D:\Stduy\DSH-USE\guide`。

我会读全文照做，效果和接入后一样。区别只在于：**每次都要给路径**，而且我事先不知道有哪些技能、也记不住触发词，得你点名。

---

## **3. 怎么配置，让 DSH 能用上这些技能**

目标：在 `<DSH_HOME>/skills` 下，为每个想用的技能建一个**目录联接**，指向 `C:\Users\28968\.claude\skills\<同名>`。

好处：不复制内容，仓库 `git pull` 之后 DSH 那边立刻就是新的，永远只有一份。

| 做法 | 内容份数 | `git pull` 之后 | 会被扫描吗 |
| --- | --- | --- | --- |
| 复制目录 | 2 份，必然不同步 | 要重拷 | 会 |
| **目录联接 `mklink /J`** | **1 份** | **立刻生效** | **会** |
| 快捷方式 `.lnk` | 0 份 | — | **不会**（DSH 不认） |
| `customSkillDirs` | 0 份 | — | 桌面版不生效 |

### **3.1 确认 DSH_HOME**

```powershell
$env:DSH_HOME
```

本机输出 `C:\Users\28968\.dsh`，所以技能根是 `C:\Users\28968\.dsh\skills`。

> `03-自定义技能.md` 第 2.2 节写的 `D:\APP_Install\24_deepseek-harness\home` 是旧安装的路径，现已不存在（`Test-Path` 为 `False`），不要照那份建目录。

### **3.2 建根目录 + 建联接（cmd）**

```cmd
mkdir "C:\Users\28968\.dsh\skills" 2>nul

for %d in (full-review req-analysis project-reader project-evolution sv-dev-workflow-vivado verilog-sv-language) do mklink /J "C:\Users\28968\.dsh\skills\%d" "C:\Users\28968\.claude\skills\%d"
```

- `mkdir ... 2>nul`：目录已存在时不报错
- `for %d in (...)`：逐个取技能名（写成 `.bat` 文件时用 `%%d`）
- `mklink /J 新 旧`：建目录联接（文件系统重定向，不是快捷方式）

### **3.3 或者用 PowerShell（带存在性检查，本次实际执行的就是这段）**

```powershell
$root = 'C:\Users\28968\.dsh\skills'
$src  = 'C:\Users\28968\.claude\skills'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$names = 'full-review','req-analysis','project-reader','project-evolution',
         'sv-dev-workflow-vivado','verilog-sv-language'
foreach ($n in $names) {
  $t = Join-Path $root $n
  if (Test-Path $t) { Write-Output "[skip] $n 已存在" }
  else { cmd /c mklink /J "$t" "$src\$n" | Out-Null; Write-Output "[link] $n" }
}
```

已在的自动跳过，可重复执行。

### **3.4 验证（三层）**

**链接对不对**

```powershell
Get-ChildItem 'C:\Users\28968\.dsh\skills' | Select-Object Name, LinkType, Target
```

`LinkType` 必须是 `Junction`，`Target` 指向 `.claude\skills\<同名>`。

**文件能不能读到**

```powershell
foreach ($n in 'full-review','req-analysis','project-reader','project-evolution','sv-dev-workflow-vivado','verilog-sv-language') {
  "{0,-26} {1}" -f $n, (Test-Path "C:\Users\28968\.dsh\skills\$n\SKILL.md")
}
```

六行应全为 `True`。有 `False` 说明目标目录没有 `SKILL.md`，那个技能不会被扫到。

**Agent 能不能看见**

新开一个会话，直接问：

> 你现在能看到哪些技能？把和我自定义技能仓库相关的列出来。

能列出那 6 个即成功。

### **3.5 生效时机**

本次实测：联接建完后**同一轮**，Agent 的技能目录就刷新出了这 6 项，**没有重启 DSH**。

万一没出现，依次试：新开一个会话 → 重启 DSH 桌面版 → 回 3.4 做前两层验证。

### **3.6 加装与删除**

加装：把技能名加进上面的 `$names`（或 cmd 的括号列表）重跑。

删除：

```cmd
rmdir "C:\Users\28968\.dsh\skills\full-review"
```

**只能用 `rmdir` 删链接本身**。不要用 `rd /s`、也不要在资源管理器里「删除整个文件夹」连带勾选，否则可能顺着联接删掉 `C:\Users\28968\.claude\skills` 里的真实内容。

### **3.7 本机当前状态**

| 项 | 值 |
| --- | --- |
| 接入根 | `C:\Users\28968\.dsh\skills` |
| 方式 | 目录联接，零副本 |
| 已接入（6 个） | `full-review`、`req-analysis`、`project-reader`、`project-evolution`、`sv-dev-workflow-vivado`、`verilog-sv-language` |
| 验证 | 6 个 `LinkType=Junction`，`SKILL.md` 全部可达，Agent 目录当轮刷新出全部 6 项 |
| 暂未接入 | `vivado-synth`、`vivado-analysis`、`vivado-tcl`、`bash-dev-workflow`、`bash-defensive-patterns`、`makefile-patterns`、`skill-maker`、`i-have-adhd`、`ls`、`pwd`、`skills`、`git-pull`、`git-push` |

暂不接的原因：前 5 个按需再加（主流程 `sv-dev-workflow-vivado` 目前会提示缺 `vivado-synth`）；`ls`/`pwd`/`git-pull`/`git-push` 与内置工具重复；其余是风格类或低频。

接完之后不需要额外操作：直接说触发词即可，例如「检查一下 `guide/` 这个目录」命中 `full-review`，「先做需求分析」命中 `req-analysis`；也可以显式点名「用 full-review 过一遍 `guide/`」。每个技能的触发词都写在它 `SKILL.md` 的 `description` 里。

两个注意点：

1. **技能名取自 frontmatter 的 `name`，不是目录名**。本仓库两者一致，不一致时以 `name` 为准。
2. **每接一个技能就占一行目录预算**。20 个全接会让每轮上下文变长，先接常用的，跑一两周再补。
