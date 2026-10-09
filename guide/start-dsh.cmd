@echo off
REM ============================================================
REM  DeepSeek Harness 启动脚本
REM
REM  作用：先把数据目录写死在脚本里，再启动 dsh。
REM        这样无论终端的环境变量是什么状态，
REM        数据都保证落在 D 盘，不会漏到 C 盘。
REM
REM  用法：双击本文件即可。
REM ============================================================

set "DSH_HOME=D:\APP_Install\24_deepseek-harness\home"
set "DSH_AGENTS_HOME=D:\APP_Install\24_deepseek-harness\agents"

cd /d "D:\APP_Install\24_deepseek-harness"

echo.
echo   数据目录 DSH_HOME = %DSH_HOME%
echo.

REM ---- 先检查端口，避免撞上已在运行的实例 ----
netstat -ano | findstr ":3080" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   [警告] 端口 3080 已被占用，说明已有一个 dsh 实例在运行。
    echo          直接再启动会因端口冲突而失败。
    echo.
    echo          请先关闭那个实例（在它的窗口按 Ctrl+C），再运行本脚本。
    echo.
    pause
    exit /b 1
)

echo   正在启动 DeepSeek Harness...
echo   首次启动约需 60-70 秒，之后会快很多。
echo   浏览器会自动打开。关闭本窗口即可停止服务。
echo.

npx dsh web

echo.
echo   DeepSeek Harness 已停止。
pause
