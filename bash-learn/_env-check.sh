#!/usr/bin/env bash
# 一次性环境探针：只读，不安装任何东西
echo "=== 1. 发行版 ==="
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"

echo "=== 2. 网络（apt 源可达性）==="
if timeout 8 curl -sI -o /dev/null -w "archive.ubuntu.com -> HTTP %{http_code}\n" http://archive.ubuntu.com/ubuntu/ 2>/dev/null; then :; else echo "curl/网络 不可达或超时"; fi

echo "=== 3. shellcheck 是否在 apt 仓库里 ==="
timeout 20 apt-cache policy shellcheck 2>/dev/null | head -5 || echo "apt-cache 查询失败"

echo "=== 4. 用户与 sudo ==="
echo "user=$(id -un) uid=$(id -u)"
if sudo -n true 2>/dev/null; then echo "sudo: 免密可用"; else echo "sudo: 需要密码或不可用"; fi

echo "=== 5. 是否已装 WSL 之外的东西 ==="
timeout 8 curl -sI -o /dev/null -w "github.com -> HTTP %{http_code}\n" https://github.com 2>/dev/null || echo "github 不可达"
