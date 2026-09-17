@echo off
chcp 65001 >nul
title 愤怒的马娘 · 本地预览启动器
cd /d "%~dp0"

echo ======================================================
echo    🐎 愤怒的马娘 · Angry Uma 本地预览启动器
echo ======================================================
echo.

:: 1. 优先使用 Node.js 启动内置零依赖静态服务器
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] 检测到 Node.js，正在启动轻量预览服务器...
    node server.js
    goto end
)

:: 2. 备用方式：尝试使用 Python
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] 检测到 Python，正在启动本地服务...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: 3. 兜底方式：直接用默认浏览器打开 index.html
echo [提示] 未检测到 Node.js 或 Python，正在使用默认浏览器直接打开页面...
start index.html

:end
pause
