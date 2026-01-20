#!/bin/bash

# 設定顏色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo "========================================"
echo -e "   ${BLUE}📚 RIOcomicReader 啟動器${NC}"
echo "========================================"
echo ""

# 切換到腳本所在目錄
cd "$(dirname "$0")"

# 檢查必需檔案
MISSING=0

if [ ! -f "index.html" ]; then
    echo -e "${RED}[❌] 缺少 index.html${NC}"
    MISSING=1
fi

if [ ! -f "style.css" ]; then
    echo -e "${RED}[❌] 缺少 style.css${NC}"
    MISSING=1
fi

if [ ! -f "app.js" ]; then
    echo -e "${RED}[❌] 缺少 app.js${NC}"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}[!] 偵測到缺少必要檔案！${NC}"
    echo "請確保以下檔案存在於當前目錄："
    echo "  - index.html"
    echo "  - style.css"
    echo "  - app.js"
    echo ""
    read -p "按 Enter 鍵退出..."
    exit 1
fi

echo -e "${GREEN}[✓] 所有必要檔案已就緒${NC}"
echo ""

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[❌] 未偵測到 Python 3！${NC}"
    echo ""
    echo "請使用套件管理器安裝 Python 3:"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    sudo apt install python3"
    echo ""
    echo "  Fedora/RHEL:"
    echo "    sudo dnf install python3"
    echo ""
    echo "  Arch Linux:"
    echo "    sudo pacman -S python"
    echo ""
    read -p "按 Enter 鍵退出..."
    exit 1
fi

echo -e "${GREEN}[✓] Python 已安裝${NC}"
echo ""

# 創建 comics 資料夾（如果不存在）
if [ ! -d "comics" ]; then
    mkdir comics
    echo -e "${GREEN}[✓] 已創建 comics 資料夾${NC}"
fi

echo "========================================"
echo -e "   ${GREEN}🚀 正在啟動本地伺服器...${NC}"
echo "========================================"
echo ""
echo -e "伺服器地址: ${BLUE}http://localhost:3000${NC}"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "========================================"
echo ""

# 延遲 2 秒後開啟瀏覽器
(sleep 2 && xdg-open http://localhost:3000 2>/dev/null || sensible-browser http://localhost:3000 2>/dev/null) &

# 啟動 Python HTTP 伺服器
python3 -m http.server 3000

echo ""
read -p "按 Enter 鍵退出..."
