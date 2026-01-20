@echo off
chcp 65001 >nul
title RIOcomicReader 啟動器
color 0A

echo ========================================
echo    📚 RIOcomicReader 啟動器
echo ========================================
echo.

REM 檢查必需檔案
set MISSING=0

if not exist "index.html" (
    echo [❌] 缺少 index.html
    set MISSING=1
)

if not exist "style.css" (
    echo [❌] 缺少 style.css
    set MISSING=1
)

if not exist "app.js" (
    echo [❌] 缺少 app.js
    set MISSING=1
)

if %MISSING%==1 (
    echo.
    echo [!] 偵測到缺少必要檔案！
    echo [!] 請確保以下檔案存在於當前目錄：
    echo     - index.html
    echo     - style.css
    echo     - app.js
    echo.
    pause
    exit /b 1
)

echo [✓] 所有必要檔案已就緒
echo.

REM 檢查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [❌] 未偵測到 Python！
    echo.
    echo 請安裝 Python 3.x:
    echo https://www.python.org/downloads/
    echo.
    echo 安裝時請勾選 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

echo [✓] Python 已安裝
echo.

REM 創建 comics 資料夾（如果不存在）
if not exist "comics" (
    mkdir comics
    echo [✓] 已創建 comics 資料夾
)

echo ========================================
echo    🚀 正在啟動本地伺服器...
echo ========================================
echo.
echo 伺服器地址: http://localhost:3000
echo.
echo 按 Ctrl+C 停止伺服器
echo ========================================
echo.

REM 延遲 2 秒後開啟瀏覽器
start "" timeout /t 2 /nobreak >nul && start http://localhost:3000

REM 啟動 Python HTTP 伺服器
python -m http.server 3000

pause
