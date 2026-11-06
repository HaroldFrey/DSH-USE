好，桌面版你自己弄，我只负责把**卸载说清楚**。我在这台机器上逐项查过了，先说三个会把你坑到的点，再给步骤。

# 一、先看三个坑

| # | 坑 | 后果 |
|---|---|---|
| 1 | **用户级环境变量还在**：`DSH_HOME` / `DSH_AGENTS_HOME` 已被持久化写进你的用户环境 | 卸载后装桌面版，它会去找一个已删除的 `D:\APP_Install\24_deepseek-harness\home`，表现为启动报错或读不到配置 |
| 2 | 安装目录里有 **503 个 junction（目录联接）**，其中 21 个指向 `C:\Users\28968\.claude\skills\*` | 用 `Remove-Item -Recurse` 在 PowerShell 5.1 下**会顺着 junction 删掉目标内容**，等于把你的 Claude Code 技能库清空 |
| 3 | 你现在这个页面就跑在待删目录的进程里（PID 15668） | 停服务的瞬间聊天页面掉线，这是预期现象，不是出错 |

# 二、这台机器上 DSH 的全部痕迹（实测结果）

| 位置 | 情况 | 处理 |
|---|---|---|
| `D:\APP_Install\24_deepseek-harness\` | **264 MB / 25,583 文件**：`node_modules\`（dsh 本体 0.1.5-rc.1）、`home\`（数据 50 MB）、`start-dsh.cmd`、日志 | 删 |
| `<上面的>\home\` | sessions 30.5 MB、attachments 18.2 MB、storages 1.3 MB、`.credentials.yaml`（API Key）、`settings.yaml` | 删（想留历史就先备份，见步骤 0） |
| npm 全局 | **没有** dsh（`npm ls -g` 只有 `@anthropic-ai/claude-code`） | 无需 uninstall |
| `C:\Users\28968\.dsh` | **不存在**（你这套用的是自定义 DSH_HOME） | 无需处理 |
| `dsh` 命令 | 只存在于 `...\24_deepseek-harness\node_modules\.bin\`，删目录即消失 | 随之消失 |
| npm 缓存 | 84 MB，含 2 条 deepseek 索引 | 可选清理 |
| 开机自启 / 计划任务 / 开始菜单快捷方式 | **都没有** | 无需处理 |
| `agents\` 目录、`_npx` 缓存 | 均不存在 | 无需处理 |
| 你的技能库 `C:\Users\28968\.claude\skills` | 21 个技能**在被删目录之外**，是 junction 的**目标** | **绝不能删** |

# 三、卸载步骤

在**普通 PowerShell 窗口**里按顺序执行（不要在这个聊天里跑，它会跟着服务一起断）。

### 步骤 0：想保留东西就先备份（可选）

只需要留 API Key 和想留的会话：

```powershell
$dst = 'D:\dsh-backup'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item 'D:\APP_Install\24_deepseek-harness\home\.credentials.yaml' $dst
Copy-Item 'D:\APP_Install\24_deepseek-harness\home\settings.yaml'      $dst
Copy-Item 'D:\APP_Install\24_deepseek-harness\home\sessions'           $dst -Recurse   # 30MB，不要可跳过
Copy-Item 'D:\APP_Install\24_deepseek-harness\home\storages'           $dst -Recurse
```

> 工作区 `D:\Stduy\DSH-USE` 是你自己的文件，这次卸载**完全不碰它**。

### 步骤 1：停掉服务

最简单：关掉那个 `dsh` 控制台窗口（或在里面按 `Ctrl+C`）。

窗口已经找不到了就用：

```powershell
$pid3080 = (Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($pid3080) { Stop-Process -Id $pid3080 -Force; "killed $pid3080" }
netstat -ano | findstr :3080     # 应该没有任何输出
Get-Process node                 # 还有残留的就一起关掉
```

> 残留的 `taskkill /F /IM node.exe` 会连 Claude Code 一起杀掉，能不用就不用。

### 步骤 2：删安装目录（**用 cmd 的 rmdir，别用 Remove-Item**）

```cmd
cmd /c rmdir /s /q "D:\APP_Install\24_deepseek-harness"
```

`cmd` 的 `rmdir /s` 对 junction 只删链接本身、不跟进目标，所以 `.claude\skills` 安全。删完确认一下技能还在：

```powershell
Test-Path 'C:\Users\28968\.claude\skills\sv-dev-workflow'   # 必须是 True
```

### 步骤 3：清掉那两个用户环境变量（关键，别漏）

```powershell
[Environment]::SetEnvironmentVariable('DSH_HOME',        $null, 'User')
[Environment]::SetEnvironmentVariable('DSH_AGENTS_HOME', $null, 'User')
```

### 步骤 4：npm 缓存（可选，84 MB）

```powershell
npm cache clean --force
```

### 步骤 5：验证清单（对照期望输出）

```powershell
Test-Path 'D:\APP_Install\24_deepseek-harness'                  # False
Test-Path "$env:USERPROFILE\.dsh"                               # False（本来就没有）
where.exe dsh                                                    # 找不到
netstat -ano | findstr :3080                                     # 空
[Environment]::GetEnvironmentVariable('DSH_HOME','User')          # 空
[Environment]::GetEnvironmentVariable('DSH_AGENTS_HOME','User')   # 空
```

六项都对齐，就是干净了。

# 四、换桌面版时要留意的两点

1. **数据目录不同**：桌面版默认用 `%USERPROFILE%\.dsh`，不会自动继承你这套 `D:\APP_Install\...\home`。所以：步骤 3 做完后它才是干净的；想延续 API Key，就把步骤 0 备份的 `.credentials.yaml`（可选 `settings.yaml`）放进 `C:\Users\28968\.dsh\`，或者直接在桌面版里登录 DeepSeek 账号。
2. **接口/技能不受影响**：`C:\Users\28968\.claude\skills` 是独立目录，桌面版若要复用技能，照样做 junction 指过去即可。

# 五、我在你工作区留的临时文件

都在 `D:\Stduy\DSH-USE` 下，不影响卸载，想清就清：

| 路径 | 内容 | 建议 |
|---|---|---|
| `desktop-pet\dist\whale-girl-0.2.4.tgz` + `dist\package\` | 鲸鱼娘桌宠插件包（离线副本，2.6 MB + 解包 2.8 MB） | **留着**，桌面版 DSH 更新（0.1.7-rc.2）大概率能直接装它 |
| `desktop-pet\test-home\` | 我做的隔离演练环境 | 可删 |
| `desktop-pet\tools\`、`_probe-sharp.mjs` | 图片分析的小脚本 | 可删 |
| `.npm-cache\` | 我下载包用的临时缓存 2.5 MB | 可删 |

要我把步骤 0–5 打包成一个 `卸载DSH.cmd`（双击运行、带确认和验证输出）也行，说一声我就写。