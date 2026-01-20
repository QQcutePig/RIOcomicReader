// ==================== 隨機顏色生成 ====================
function getRandomColor() {
    const colors = [
        '#2196F3', // 藍色
        '#4CAF50', // 綠色
        '#FF9800', // 橙色
        '#9C27B0', // 紫色
        '#F44336', // 紅色
        '#00BCD4', // 青色
        '#FF5722', // 深橙色
        '#3F51B5', // 靛藍色
        '#E91E63', // 粉紅色
        '#009688', // 青綠色
        '#FFC107', // 琥珀色
        '#795548'  // 棕色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ==================== 全域狀態 ====================
const APP = {
    currentComic: null,
    currentComicName: '', // 當前漫畫名稱
    currentFolderName: '', // 當前資料夾名稱（如果有）
    currentPage: 0,
    totalPages: 0,
    pages: [],
    pageMode: 'single', // 'single' 或 'double'
    fitMode: 'width', // 'width', 'height', 'original'
    isReading: false,
    comics: [],
    bookmarks: {},
    readingHistory: {}
};

let toolbarTimer = null;
let readingDirection = 'ltr'; // 🆕 翻頁方向

// LocalForage 設定
localforage.config({
    name: 'RIOcomicReader',
    storeName: 'comicsdata'
});

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadLibrary();
    loadSettings();
    setupEventListeners();
    applyTheme();
});

// ==================== 事件監聽 ====================
function setupEventListeners() {
    
    // 主題切換
// 主題切換
	document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// 視圖大小切換
	document.getElementById('view-small').addEventListener('click', () => setViewSize('small'));
	document.getElementById('view-medium').addEventListener('click', () => setViewSize('medium'));
	document.getElementById('view-large').addEventListener('click', () => setViewSize('large'));
    
    // 閱讀器點擊區域
    document.getElementById('prev-area').addEventListener('click', prevPage);
    document.getElementById('next-area').addEventListener('click', nextPage);
    document.getElementById('center-area').addEventListener('click', toggleToolbar);
    
    // 工具列按鈕
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-panel').classList.toggle('hidden');
    });
    document.getElementById('bookmark-btn').addEventListener('click', toggleBookmark);
document.getElementById('stats-btn').addEventListener('click', showStats);

// 🆕 單頁/雙頁切換
document.getElementById('page-mode-toggle-btn').addEventListener('click', () => {
    APP.pageMode = APP.pageMode === 'single' ? 'double' : 'single';
    localStorage.setItem('pageMode', APP.pageMode);
    renderCurrentPage();
});

// 🆕 全屏切換
document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

document.getElementById('close-reader-btn').addEventListener('click', closeReader);
    
    // 進度條
    document.getElementById('progress-slider').addEventListener('input', (e) => {
        goToPage(parseInt(e.target.value) - 1);
    });
    
    // 設定面板關閉
    document.querySelectorAll('.close-panel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.panel').classList.add('hidden');
        });
    });
    // 設定面板確定/取消
    const confirmBtn = document.getElementById('settings-confirm-btn');
    const cancelBtn = document.getElementById('settings-cancel-btn');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('hidden');
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('hidden');
            loadSettings(); // 恢復設定
        });
    }
    
    // 重置滾動速度按鈕
    const resetScrollBtn = document.getElementById('reset-scroll-btn');
    if (resetScrollBtn) {
        resetScrollBtn.addEventListener('click', () => {
            autoScrollSpeed = 1;
            localStorage.setItem('autoScrollSpeed', '1');
            document.getElementById('scroll-speed-select').value = '1';
            alert('✅ 捲動速度已重置');
        });
    }
    
    // 點擊面板外區域關閉所有面板
    document.addEventListener('click', (e) => {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            if (!panel.classList.contains('hidden') && 
                !panel.contains(e.target) && 
                !e.target.closest('.tool-btn') && 
                !e.target.closest('.btn-secondary')) {
                panel.classList.add('hidden');
            }
        });
    });
    
    // 頁面模式切換
    document.querySelectorAll('input[name="page-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            APP.pageMode = e.target.value;
            localStorage.setItem('pageMode', e.target.value);
            renderCurrentPage();
        });
    });
    
// 適應模式切換
document.querySelectorAll('input[name="fit-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        APP.fitMode = e.target.value;
        localStorage.setItem('fitMode', e.target.value);
        applyFitMode();
        
        // 如果切換離開符合寬度模式，停止自動捲動
        if (e.target.value !== 'width' && autoScrollActive) {
            stopAutoScroll();
            autoScrollActive = false;
            const btn = document.getElementById('auto-scroll-btn');
            btn.style.background = 'rgba(255,255,255,0.1)';
            alert('⚠️ 已停止自動捲動\n自動捲動只支援符合寬度模式');
        }
    });
});
    
    // 重新掃描（舊版設定面板按鈕，新版已移除）
    const rescanBtn = document.getElementById('rescan-btn');
    if (rescanBtn) {
        rescanBtn.addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('hidden');
            scanComics();
        });
    }
    
    // 書籤管理（舊版設定面板按鈕，新版已移除）
    const manageBookmarksBtn = document.getElementById('manage-bookmarks-btn');
    if (manageBookmarksBtn) {
        manageBookmarksBtn.addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('hidden');
            showBookmarksPanel();
        });
    }
    
    // 快捷鍵說明（舊版設定面板按鈕，新版已移除）
    const showShortcutsBtn = document.getElementById('show-shortcuts-btn');
    if (showShortcutsBtn) {
        showShortcutsBtn.addEventListener('click', () => {
            document.getElementById('settings-panel').classList.add('hidden');
            document.getElementById('shortcuts-panel').classList.remove('hidden');
        });
    }
    
    // 快捷鍵
    document.addEventListener('keydown', handleKeyboard);
    
    // 工具列自動隱藏
    document.getElementById('reader-view').addEventListener('mousemove', resetToolbarTimer);
    
// 主頁工具列按鈕
const libSettingsBtn = document.getElementById('lib-settings-btn');
if (libSettingsBtn) {
    libSettingsBtn.addEventListener('click', () => {
        document.getElementById('settings-panel').classList.toggle('hidden');
    });
}

const libRescanBtn = document.getElementById('lib-rescan-btn');
const libStatsBtn = document.getElementById('lib-stats-btn');
const libBookmarksBtn = document.getElementById('lib-bookmarks-btn');
const libHistoryBtn = document.getElementById('lib-history-btn');

if (libRescanBtn) {
    libRescanBtn.addEventListener('click', scanComics);
}
if (libStatsBtn) {
    libStatsBtn.addEventListener('click', showStats);
}
if (libBookmarksBtn) {
    libBookmarksBtn.addEventListener('click', () => {
        document.querySelector('#bookmarks-panel .panel-header h3').textContent = '🔖 書籤管理';
        const panel = document.getElementById('bookmarks-panel');
        if (panel.classList.contains('hidden')) {
            showBookmarksPanel();
        } else {
            panel.classList.add('hidden');
        }
    });
}
if (libHistoryBtn) {
    libHistoryBtn.addEventListener('click', () => {
        const panel = document.getElementById('bookmarks-panel');
        if (panel.classList.contains('hidden')) {
            showReadingHistory();
        } else {
            panel.classList.add('hidden');
        }
    });
}
    
    // 主頁工具列自動隱藏
    let libToolbarTimer = null;
    document.getElementById('library-view').addEventListener('mousemove', () => {
        const toolbar = document.getElementById('library-toolbar');
        toolbar.classList.remove('hidden');
        clearTimeout(libToolbarTimer);
        libToolbarTimer = setTimeout(() => {
            toolbar.classList.add('hidden');
        }, 3000);
    });
    
    // 🆕 搜尋功能
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const sortBy = sortSelect ? sortSelect.value : 'name';
            
            // 顯示/隱藏清除按鈕
            if (clearSearchBtn) {
                clearSearchBtn.style.display = keyword ? 'flex' : 'none';
            }
            
            renderLibrary(keyword, sortBy);
        });
    }
    
    // 🆕 清除搜尋按鈕
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            const sortBy = sortSelect ? sortSelect.value : 'name';
            renderLibrary('', sortBy);
            searchInput.focus();
        });
    }
    
    // 🆕 排序功能
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            const keyword = searchInput ? searchInput.value.toLowerCase() : '';
            renderLibrary(keyword, sortBy);
        });
    }
    
    // 🆕 翻頁方向切換
    document.querySelectorAll('input[name="reading-direction"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            readingDirection = e.target.value;
            localStorage.setItem('readingDirection', e.target.value);
        });
    });
    
    // 🆕 匯出備份
    const exportBtn = document.getElementById('export-backup-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportBackup);
    }
    
    // 🆕 匯入備份
    const importBtn = document.getElementById('import-backup-btn');
    const importFileInput = document.getElementById('import-file-input');
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importBackup(file);
                e.target.value = '';
            }
        });
    }
}
    // 設定面板標籤切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = btn.dataset.tab;
            
            // 切換標籤按鈕狀態
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 切換內容顯示
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
        });
    });

// ==================== 掃描漫畫（支援子資料夾） ====================
async function scanComics() {
    try {
        if (!window.showDirectoryPicker) {
            alert('❌ 你的瀏覽器不支援資料夾選擇\n請使用 Chrome、Edge 或 Opera');
            return;
        }

        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const grid = document.getElementById('library-grid');
        
        // 顯示進度介面
        grid.innerHTML = `
            <div class="empty-state">
                <p>🔍 正在掃描資料夾...</p>
                <div style="margin: 20px auto; max-width: 400px;">
                    <div style="background: var(--border); height: 8px; border-radius: 10px; overflow: hidden;">
                        <div id="scan-progress-bar" style="background: #2196F3; height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <p id="scan-status" style="margin-top: 10px; font-size: 14px; color: var(--text-secondary);">準備中...</p>
                </div>
            </div>
        `;

        const comics = [];
        const folders = [];
        const allEntries = [];

        // 先收集所有項目
        for await (const entry of dirHandle.values()) {
            allEntries.push(entry);
        }

        // 處理每個項目並更新進度
        for (let i = 0; i < allEntries.length; i++) {
            const entry = allEntries[i];
            const percent = Math.round(((i + 1) / allEntries.length) * 100);
            
            // 更新進度條
            const bar = document.getElementById('scan-progress-bar');
            const status = document.getElementById('scan-status');
            if (bar) bar.style.width = percent + '%';
            if (status) status.textContent = `${entry.name} (${i + 1}/${allEntries.length}) ${percent}%`;

            if (entry.kind === 'file') {
                const ext = entry.name.split('.').pop().toLowerCase();
                if (['cbz', 'zip'].includes(ext)) {
                    const file = await entry.getFile();
                    comics.push({
                        type: 'comic',
                        name: entry.name.replace(/\.(cbz|zip)$/i, ''),
                        fileName: entry.name,
                        cover: null,
                        size: file.size,
                        lastRead: 0,
                        progress: 0,
                        lastModified: file.lastModified
                    });
                    await localforage.setItem(`file_${entry.name}`, file);
                }
            } else if (entry.kind === 'directory') {
                const folderComics = [];
                const imageFiles = [];
                
                for await (const subEntry of entry.values()) {
                    if (subEntry.kind === 'file') {
                        const ext = subEntry.name.split('.').pop().toLowerCase();
                        
                        // 處理壓縮檔
                        if (['cbz', 'zip'].includes(ext)) {
                            const file = await subEntry.getFile();
                            folderComics.push({
                                type: 'comic',
                                name: subEntry.name.replace(/\.(cbz|zip)$/i, ''),
                                fileName: subEntry.name,
                                cover: null,
                                size: file.size,
                                lastRead: 0,
                                progress: 0,
                                lastModified: file.lastModified
                            });
                            await localforage.setItem(`file_${subEntry.name}`, file);
                        }
                        // 處理圖片檔案
                        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
                            imageFiles.push(subEntry);
                        }
                    }
                }
                
                // 如果資料夾包含圖片，當作一本漫畫
                if (imageFiles.length > 0) {
                    // 儲存圖片列表
                    await localforage.setItem(`folder_images_${entry.name}`, imageFiles.map(f => f.name));
                    
                    // 儲存資料夾 handle
                    await localforage.setItem(`folder_handle_${entry.name}`, entry);
                    
                    folderComics.push({
                        type: 'image-folder',
                        name: entry.name,
                        fileName: entry.name,
                        folderName: entry.name,
                        cover: null,
                        size: imageFiles.length * 1024 * 500,
                        lastRead: 0,
                        progress: 0,
                        imageCount: imageFiles.length
                    });
                }
                
                if (folderComics.length > 0) {
                    folders.push({
                        type: 'folder',
                        name: entry.name,
                        comics: folderComics,
                        count: folderComics.length
                    });
                }
            }
        }

        if (comics.length === 0 && folders.length === 0) {
            alert('❌ 沒有找到任何漫畫或圖片資料夾');
            renderLibrary();
            return;
        }

        APP.comics = [...folders, ...comics];
        await localforage.setItem('comics', APP.comics);
        renderLibrary();
        alert(`✅ 掃描完成！\n資料夾：${folders.length}\n漫畫：${comics.length}`);
        extractCoversInBackground([...folders, ...comics]);

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('用戶取消選擇');
            return;
        }
        console.error('掃描錯誤:', err);
        alert('❌ 掃描時發生錯誤：' + err.message);
        renderLibrary();
    }
}

// ==================== 提取封面（背景執行） ====================
async function extractCoversInBackground(items) {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type === 'folder') {
            // 為資料夾內的所有漫畫提取封面
            for (let j = 0; j < item.comics.length; j++) {
                const comic = item.comics[j];
                
                if (!comic.cover) {
                    try {
                        // 🆕 處理圖片資料夾封面
                        if (comic.type === 'image-folder') {
                            const imageNames = await localforage.getItem(`folder_images_${comic.folderName}`);
                            const folderHandle = await localforage.getItem(`folder_handle_${comic.folderName}`);
                            
                            if (imageNames && imageNames.length > 0 && folderHandle) {
                                imageNames.sort();
                                const firstImageName = imageNames[0];
                                const fileHandle = await folderHandle.getFileHandle(firstImageName);
                                const file = await fileHandle.getFile();
                                comic.cover = await blobToBase64(file);
                                
                                const allComics = await localforage.getItem('comics');
                                const folderIndex = allComics.findIndex(c => c.type === 'folder' && c.name === item.name);
                                if (folderIndex > -1) {
                                    allComics[folderIndex].comics[j].cover = comic.cover;
                                    await localforage.setItem('comics', allComics);
                                    renderLibrary();
                                }
                            }
                        }
                        // 原本的壓縮檔處理
                        else {
                            const file = await localforage.getItem('file_' + comic.fileName);
                            if (file) {
                                comic.cover = await extractCover(file);
                                
                                const allComics = await localforage.getItem('comics');
                                const folderIndex = allComics.findIndex(c => c.type === 'folder' && c.name === item.name);
                                if (folderIndex > -1) {
                                    allComics[folderIndex].comics[j].cover = comic.cover;
                                    await localforage.setItem('comics', allComics);
                                    renderLibrary();
                                }
                            }
                        }
                    } catch (err) {
                        console.error('提取封面失敗:', comic.fileName, err);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } else if (item.type === 'comic') {
            if (!item.cover) {
                try {
                    const file = await localforage.getItem('file_' + item.fileName);
                    if (file) {
                        item.cover = await extractCover(file);
                        
                        const allComics = await localforage.getItem('comics');
                        const index = allComics.findIndex(c => c.fileName === item.fileName);
                        if (index > -1) {
                            allComics[index].cover = item.cover;
                            await localforage.setItem('comics', allComics);
                        }
                        
                        renderLibrary();
                    }
                } catch (err) {
                    console.error('提取封面失敗:', item.fileName, err);
                }
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ 所有封面提取完成');
}

// ==================== 提取封面 ====================
async function extractCover(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        const imageFiles = Object.keys(zip.files)
            .filter(name => /\.(jpg|jpeg|png|gif|webp)$/i.test(name))
            .sort();
        
        if (imageFiles.length > 0) {
            const firstImage = await zip.files[imageFiles[0]].async('blob');
            return await blobToBase64(firstImage);
        }
    } catch (err) {
        console.error('提取封面錯誤:', err);
        return null;
    }
    return null;
}

// ==================== 渲染書架 ====================
function renderLibrary(searchKeyword = '', sortBy = 'name') {
    const grid = document.getElementById('library-grid');
    
    if (APP.comics.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>📂 尚未掃描漫畫</p>
                <p class="hint">點擊「掃描漫畫」選擇 comics 資料夾</p>
            </div>
        `;
        return;
    }
    
    // 🆕 篩選和排序
    let filteredComics = [...APP.comics];
    
// 🆕 搜尋過濾（展開資料夾內的書）
if (searchKeyword) {
    const expandedComics = [];
    
    filteredComics.forEach(item => {
        if (item.type === 'folder') {
            // 檢查資料夾名稱
            if (item.name.toLowerCase().includes(searchKeyword)) {
                // 資料夾名符合，保留整個資料夾
                expandedComics.push(item);
            } else {
                // 檢查資料夾內的書
                item.comics.forEach(comic => {
                    if (comic.name.toLowerCase().includes(searchKeyword)) {
                        // 🆕 直接加入書本，標記來自哪個資料夾
                        expandedComics.push({
                            ...comic,
                            _folderIndex: APP.comics.indexOf(item),
                            _comicIndex: item.comics.indexOf(comic),
                            _fromFolder: item.name
                        });
                    }
                });
            }
        } else {
            // 普通書本
            if (item.name.toLowerCase().includes(searchKeyword)) {
                expandedComics.push(item);
            }
        }
    });
    
    filteredComics = expandedComics;
}
    
    // 排序
    if (sortBy === 'name') {
        filteredComics.sort((a, b) => a.name.localeCompare(b.name, 'zh-HK'));
    } else if (sortBy === 'recent') {
        filteredComics.sort((a, b) => {
            const aTime = a.lastRead || 0;
            const bTime = b.lastRead || 0;
            return bTime - aTime;
        });
    } else if (sortBy === 'progress') {
        filteredComics.sort((a, b) => {
            const aProgress = a.progress || 0;
            const bProgress = b.progress || 0;
            return bProgress - aProgress;
        });
    }
    
    // 🆕 如果搜尋後無結果
    if (filteredComics.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>🔍 找不到符合的漫畫</p>
                <p class="hint">試試其他關鍵字</p>
            </div>
        `;
        return;
    }

grid.innerHTML = filteredComics.map((item, index) => {
    // 🆕 處理來自資料夾的書
    if (item._fromFolder) {
        return `
            <div class="comic-card" onclick="openFolderComic(${item._folderIndex}, ${item._comicIndex})" title="${item.name}">
                <img class="comic-cover" 
                     src="${item.cover || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280'%3E%3Crect fill='%23ccc' width='200' height='280'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666'%3E📖%3C/text%3E%3C/svg%3E`}" 
                     alt="${item.name}">
                <div class="comic-info">
                    <div class="comic-title" title="${item.name}">${item.name}</div>
                    <div class="comic-meta" style="font-size: 10px; color: var(--text-secondary);">📁 ${item._fromFolder}</div>
                    <div class="comic-meta">${item.type === 'image-folder' ? `${item.imageCount} 張圖片` : (item.size / 1024 / 1024).toFixed(1) + ' MB'}</div>
                    <div class="comic-progress">
                        <div class="comic-progress-bar" style="width: ${item.progress || 0}%"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 🆕 要用原本 APP.comics 的 index
    const originalIndex = APP.comics.indexOf(item);
    
    if (item.type === 'folder') {
            const randomColor = getRandomColor();
            const cover1 = item.comics[0]?.cover || '';
            const cover2 = item.comics[1]?.cover || '';
            const cover3 = item.comics[2]?.cover || '';
            
            return `
                <div class="folder-card" onclick="openFolder(${originalIndex})" title="${item.name}" style="border-left-color: ${randomColor};">
                    <div class="folder-stack">
                        <div class="folder-stack-item" style="background-image: url(${cover1});"></div>
                        <div class="folder-stack-item" style="background-image: url(${cover2});"></div>
                        <div class="folder-stack-item" style="background-image: url(${cover3});"></div>
                    </div>
                    <div class="folder-info">
                        <div class="folder-name">${item.name}</div>
                        <div class="folder-count">📚 ${item.count} 本</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="comic-card" onclick="openComic(${originalIndex})" title="${item.name}">
                    <img class="comic-cover" 
                         src="${item.cover || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280'%3E%3Crect fill='%23ccc' width='200' height='280'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666'%3E📖%3C/text%3E%3C/svg%3E`}" 
                         alt="${item.name}">
                    <div class="comic-info">
                        <div class="comic-title" title="${item.name}">${item.name}</div>
                        <div class="comic-meta">${item.type === 'image-folder' ? `${item.imageCount} 張圖片` : (item.size / 1024 / 1024).toFixed(1) + ' MB'}</div>
                        <div class="comic-progress">
                            <div class="comic-progress-bar" style="width: ${item.progress || 0}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

// ==================== 載入書架 ====================
async function loadLibrary() {
    const savedComics = await localforage.getItem('comics');
    const savedHistory = await localforage.getItem('readingHistory');
    const savedBookmarks = await localforage.getItem('bookmarks');
    
    APP.readingHistory = savedHistory || {};
    APP.bookmarks = savedBookmarks || {};
    
    if (savedComics) {
        APP.comics = savedComics;
        renderLibrary();
    }
}
// ==================== 打開漫畫 ====================
async function openComic(index) {
    const comic = APP.comics[index];
    if (comic.type === 'folder') {
        openFolder(index);
        return;
    }
    
    APP.currentComic = index;
    APP.currentComicName = comic.name;
	APP.currentFolderName = '';


    try {
        let file = await localforage.getItem('file_' + comic.fileName);
        
        if (!file) {
            const result = confirm('❌ 找不到文件緩存\n需要重新選擇文件嗎？');
            if (!result) return;
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.cbz,.zip';
            file = await new Promise(resolve => {
                input.onchange = (e) => resolve(e.target.files[0]);
                input.click();
            });
            
            if (!file) return;
            await localforage.setItem('file_' + comic.fileName, file);
        }
        
        const zip = await JSZip.loadAsync(file);
        const imageFiles = Object.keys(zip.files)
            .filter(name => /\.(jpg|jpeg|png|gif|webp)$/i.test(name))
            .sort();
        
        APP.pages = [];
        for (const fileName of imageFiles) {
            const blob = await zip.files[fileName].async('blob');
            APP.pages.push(URL.createObjectURL(blob));
        }
        
        APP.totalPages = APP.pages.length;
        const lastPage = APP.readingHistory[comic.name] || 0;
        APP.currentPage = lastPage;
        
        document.getElementById('library-view').classList.remove('active');
        document.getElementById('reader-view').classList.add('active');
        APP.isReading = true;
        
        renderCurrentPage();
        updateProgressInfo();
        preloadPages();
        resetToolbarTimer();
        startReadingTimer();
    } catch (err) {
        alert('❌ ' + err.message);
        console.error(err);
    }
}

// ==================== 打開資料夾 ====================
function openFolder(index) {
    const folder = APP.comics[index];
    if (folder.type !== 'folder') return;
    
    const grid = document.getElementById('library-grid');
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 10px;">
            <button onclick="renderLibrary()" class="btn-secondary" style="padding: 10px 20px;">← 返回</button>
            <h2 style="display: inline-block; margin-left: 20px;">📁 ${folder.name}</h2>
        </div>
        ${folder.comics.map((comic, comicIndex) => `
            <div class="comic-card" onclick="openFolderComic(${index}, ${comicIndex})" title="${comic.name}">
                <img class="comic-cover" 
                     src="${comic.cover || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280'%3E%3Crect fill='%23ccc' width='200' height='280'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666'%3E📖%3C/text%3E%3C/svg%3E`}" 
                     alt="${comic.name}">
                <div class="comic-info">
                    <div class="comic-title" title="${comic.name}">${comic.name}</div>
                    <div class="comic-meta">📦 ${(comic.size / 1024 / 1024).toFixed(1)} MB</div>
                    <div class="comic-progress">
                        <div class="comic-progress-bar" style="width: ${comic.progress || 0}%"></div>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

// ==================== 打開資料夾內的漫畫 ====================
async function openFolderComic(folderIndex, comicIndex) {
    const folder = APP.comics[folderIndex];
    const comic = folder.comics[comicIndex];
    // 記錄當前資料夾和漫畫名稱
    APP.currentFolderName = folder.name;
    APP.currentComicName = comic.name;

    try {
        // 🆕 處理圖片資料夾
        if (comic.type === 'image-folder') {
            const imageNames = await localforage.getItem(`folder_images_${comic.folderName}`);
            const folderHandle = await localforage.getItem(`folder_handle_${comic.folderName}`);
            
            if (!imageNames || !folderHandle) {
                alert('❌ 找不到圖片資料，請重新掃描');
                return;
            }
            
            // 排序圖片檔名
            imageNames.sort();
            
            APP.pages = [];
            
            // 讀取所有圖片
            for (const imageName of imageNames) {
                try {
                    const fileHandle = await folderHandle.getFileHandle(imageName);
                    const file = await fileHandle.getFile();
                    const url = URL.createObjectURL(file);
                    APP.pages.push(url);
                } catch (err) {
                    console.error(`無法讀取圖片: ${imageName}`, err);
                }
            }
            
            APP.totalPages = APP.pages.length;
            APP.currentComic = folderIndex;
            APP.currentFolderName = folder.name;
            APP.currentComicName = comic.name;
			const historyKey = `${folder.name}/${comic.name}`;
             const lastPage = APP.readingHistory[historyKey] || 0; 
            APP.currentPage = lastPage;
            
            document.getElementById('library-view').classList.remove('active');
            document.getElementById('reader-view').classList.add('active');
            APP.isReading = true;
            
            renderCurrentPage();
            updateProgressInfo();
            preloadPages();
            resetToolbarTimer();
            startReadingTimer();
            return;
        }
        
        // 原本的 ZIP/CBZ 處理
        const file = await localforage.getItem('file_' + comic.fileName);
        if (!file) {
            alert('❌ 找不到文件緩存');
            return;
        }
        
        const zip = await JSZip.loadAsync(file);
        const imageFiles = Object.keys(zip.files)
            .filter(name => /\.(jpg|jpeg|png|gif|webp)$/i.test(name))
            .sort();
        
        APP.pages = [];
        for (const fileName of imageFiles) {
            const blob = await zip.files[fileName].async('blob');
            APP.pages.push(URL.createObjectURL(blob));
        }
        
        APP.totalPages = APP.pages.length;
        APP.currentComic = folderIndex;
        APP.currentFolderName = folder.name;
        APP.currentComicName = comic.name;
		const historyKey = `${folder.name}/${comic.name}`;
         const lastPage = APP.readingHistory[historyKey] || 0; 
        APP.currentPage = lastPage;
        
        document.getElementById('library-view').classList.remove('active');
        document.getElementById('reader-view').classList.add('active');
        APP.isReading = true;
        
        renderCurrentPage();
        updateProgressInfo();
        preloadPages();
        resetToolbarTimer();
        startReadingTimer();
    } catch (err) {
        alert('❌ ' + err.message);
        console.error(err);
    }
}

// ==================== 渲染當前頁 ====================
function renderCurrentPage() {
    if (APP.currentPage < 0) APP.currentPage = 0;
    if (APP.currentPage >= APP.totalPages) APP.currentPage = APP.totalPages - 1;
    
    const display = document.getElementById('page-display');
    const container = document.getElementById('reader-container');
    
    // 根據適應模式設定樣式
    if (APP.fitMode === 'width') {
        // 符合寬度：可能需要捲動，從頂部開始
        container.style.overflow = 'auto';
        container.style.alignItems = 'flex-start';
        container.scrollTop = 0;
    } else {
        // 符合高度 / 原始大小：居中顯示
        container.style.overflow = 'hidden';
        container.style.alignItems = 'center';
        container.scrollTop = 0;
    }
    
    if (APP.pageMode === 'double' && APP.currentPage < APP.totalPages - 1) {
        display.classList.add('double-mode');
        display.innerHTML = `
            <img id="current-page" class="page-image double-page" src="${APP.pages[APP.currentPage]}" alt="">
            <img class="page-image double-page" src="${APP.pages[APP.currentPage + 1]}" alt="">
        `;
        
        const imgs = display.querySelectorAll('img');
        let loadedCount = 0;
        imgs.forEach(img => {
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imgs.length) {
                    imgs.forEach(i => i.classList.add('loaded'));
                    applyFitMode();
                }
            };
        });
    } else {
        display.classList.remove('double-mode');
        display.innerHTML = `<img id="current-page" class="page-image" alt="">`;
        
        const newImg = document.getElementById('current-page');
        newImg.classList.remove('loaded');
        newImg.onload = () => {
            newImg.classList.add('loaded');
            applyFitMode();
        };
        newImg.src = APP.pages[APP.currentPage];
    }
    
    updateProgressInfo();
    saveProgress();
    preloadPages();
    applyRotation();
}

// ==================== 更新進度信息 ====================
function updateProgressInfo() {
    const current = APP.currentPage + 1;
    const total = APP.totalPages;
    const percent = Math.round((current / total) * 100);
    
    document.getElementById('page-info').textContent = `${current}/${total}`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('progress-slider').max = total;
    document.getElementById('progress-slider').value = current;
}

// ==================== 翻頁功能 ====================
function nextPage() {
    if (readingDirection === 'rtl') {
        // 從右到左：下一頁 = 往左（減）
        if (APP.currentPage > 0) {
            APP.currentPage--;
            renderCurrentPage();
        }
    } else {
        // 從左到右：下一頁 = 往右（加）
        if (APP.currentPage < APP.totalPages - 1) {
            APP.currentPage++;
            renderCurrentPage();
        }
    }
}

function prevPage() {
    if (readingDirection === 'rtl') {
        // 從右到左：上一頁 = 往右（加）
        if (APP.currentPage < APP.totalPages - 1) {
            APP.currentPage++;
            renderCurrentPage();
        }
    } else {
        // 從左到右：上一頁 = 往左（減）
        if (APP.currentPage > 0) {
            APP.currentPage--;
            renderCurrentPage();
        }
    }
}

function goToPage(pageNum) {
    if (pageNum >= 0 && pageNum < APP.totalPages) {
        APP.currentPage = pageNum;
        renderCurrentPage();
    }
}

// ==================== 預載頁面 ====================
function preloadPages() {
    const container = document.getElementById('preload-container');
    container.innerHTML = '';
    
    for (let i = -6; i <= 6; i++) {
        const pageIndex = APP.currentPage + i;
        if (pageIndex >= 0 && pageIndex < APP.totalPages && i !== 0) {
            const img = new Image();
            img.src = APP.pages[pageIndex];
            container.appendChild(img);
        }
    }
}
// ==================== 書籤功能 ====================
function toggleBookmark() {
    // 生成唯一的書籤 key：資料夾名/漫畫名 或 漫畫名
    let bookmarkKey;
    if (APP.currentFolderName) {
        bookmarkKey = `${APP.currentFolderName}/${APP.currentComicName}`;
    } else {
        bookmarkKey = APP.currentComicName;
    }
    
    if (!APP.bookmarks[bookmarkKey]) {
        APP.bookmarks[bookmarkKey] = [];
    }
    
    const pageIndex = APP.bookmarks[bookmarkKey].indexOf(APP.currentPage);
    
    if (pageIndex > -1) {
        APP.bookmarks[bookmarkKey].splice(pageIndex, 1);
        if (APP.bookmarks[bookmarkKey].length === 0) {
            delete APP.bookmarks[bookmarkKey];
        }
        alert('❌ 已移除書籤');
    } else {
        const totalBookmarks = Object.values(APP.bookmarks).reduce((sum, arr) => sum + arr.length, 0);
        if (totalBookmarks >= 30) {
            alert('❌ 書籤已達上限 (30 個)');
            return;
        }
        APP.bookmarks[bookmarkKey].push(APP.currentPage);
        const currentTotal = totalBookmarks + 1;
        alert(`✅ 已加入書籤 (${currentTotal}/30)`);
    }
    
    localforage.setItem('bookmarks', APP.bookmarks);
}

// ==================== 儲存進度 ====================
async function saveProgress() {
    // 生成完整路徑名稱
    let comicName;
    let comic;
    
    if (APP.currentFolderName) {
        // 資料夾內的漫畫
        comicName = `${APP.currentFolderName}/${APP.currentComicName}`;
        
        // 找到資料夾對象
        const folder = APP.comics[APP.currentComic];
        if (folder && folder.type === 'folder') {
            // 在資料夾內找到具體的漫畫對象
            comic = folder.comics.find(c => c.name === APP.currentComicName);
        }
    } else {
        // 直接的漫畫
        comicName = APP.currentComicName;
        comic = APP.comics[APP.currentComic];
    }
    
    // 保存閱讀位置到歷史記錄
    APP.readingHistory[comicName] = APP.currentPage;
    
    // 更新漫畫的進度和最後閱讀時間
    if (comic) {
        comic.progress = Math.round((APP.currentPage + 1) / APP.totalPages * 100);
        comic.lastRead = Date.now();
    }
    
    await localforage.setItem('readingHistory', APP.readingHistory);
    await localforage.setItem('comics', APP.comics);
}

// ==================== 關閉閱讀器 ====================
function closeReader() {
    stopReadingTimer();
    APP.isReading = false;
    APP.currentComicName = '';
    APP.currentFolderName = '';
    
    // 🆕 停止自動捲動
    if (autoScrollActive) {
        stopAutoScroll();
        autoScrollActive = false;
        const scrollBtn = document.getElementById('auto-scroll-btn');
        if (scrollBtn) scrollBtn.style.background = 'rgba(255,255,255,0.1)';
    }
    
    // 🆕 停止自動翻頁
    if (autoPageActive) {
        stopAutoPage();
        autoPageActive = false;
        const pageBtn = document.getElementById('auto-page-btn');
        if (pageBtn) pageBtn.style.background = 'rgba(255,255,255,0.1)';
    }
    
    // 停止放大鏡
    if (zoomActive) {
        zoomActive = false;
        removeZoomLens();
        const btn = document.getElementById('zoom-btn');
        if (btn) btn.style.background = 'rgba(255,255,255,0.1)';
    }
    
    document.getElementById('reader-view').classList.remove('active');
    document.getElementById('library-view').classList.add('active');
    APP.pages.forEach(url => URL.revokeObjectURL(url));
    APP.pages = [];
    renderLibrary();
}

// ==================== 工具列控制 ====================
function toggleToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.classList.toggle('hidden');
}

function resetToolbarTimer() {
    // 如果放大鏡開啟，工具列保持透明，不要自動恢復
    if (zoomActive) {
        return;
    }
    
    const toolbar = document.getElementById('toolbar');
    toolbar.classList.remove('hidden');
    
    clearTimeout(toolbarTimer);
    toolbarTimer = setTimeout(() => {
        toolbar.classList.add('hidden');
    }, 3000);
}

// ==================== 適應模式 ====================
function applyFitMode() {
    const imgs = document.querySelectorAll('.page-image');
    
    imgs.forEach(img => {
        switch (APP.fitMode) {
            case 'width':
                img.style.maxWidth = '100vw';
                img.style.maxHeight = 'none';
                img.style.width = '100%';
                img.style.height = 'auto';
                break;
            case 'height':
                img.style.maxHeight = '100vh';
                img.style.maxWidth = 'none';
                img.style.height = '100%';
                img.style.width = 'auto';
                break;
            case 'original':
                img.style.maxWidth = 'none';
                img.style.maxHeight = 'none';
                img.style.width = 'auto';
                img.style.height = 'auto';
                break;
        }
    });
}

// ==================== 主題切換 ====================
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').textContent = '☀️';
    }
}
function setViewSize(size) {
    const grid = document.getElementById('library-grid');
    const buttons = document.querySelectorAll('.view-size-buttons .btn-icon');
    
    // 移除所有大小類
    grid.classList.remove('size-small', 'size-medium', 'size-large');
    
    // 添加選中的大小類
    grid.classList.add(`size-${size}`);
    
    // 更新按鈕激活狀態
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${size}`).classList.add('active');
    
    // 保存設定
    localStorage.setItem('viewSize', size);
}

// ==================== 統計功能 ====================
let readingStartTime = null;
let totalReadingTime = 0;

function showStats() {
    const totalComics = APP.comics.filter(c => c.type !== 'folder').length;
    const totalFolders = APP.comics.filter(c => c.type === 'folder').length;
    const readComics = Object.keys(APP.readingHistory).length;
    const totalBookmarks = Object.values(APP.bookmarks).reduce((sum, arr) => sum + arr.length, 0);
    
    const savedTime = localStorage.getItem('totalReadingTime') || 0;
    const totalMinutes = Math.floor((parseInt(savedTime) + totalReadingTime) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    alert(`📊 統計資訊\n\n📚 漫畫數量: ${totalComics}\n📁 資料夾: ${totalFolders}\n📖 已閱讀: ${readComics}\n🔖 書籤數: ${totalBookmarks}\n⏱️ 閱讀時間: ${hours}小時${minutes}分鐘`);
}

function startReadingTimer() {
    readingStartTime = Date.now();
}

function stopReadingTimer() {
    if (readingStartTime) {
        const elapsed = Date.now() - readingStartTime;
        totalReadingTime += elapsed;
        
        const savedTime = parseInt(localStorage.getItem('totalReadingTime') || 0);
        localStorage.setItem('totalReadingTime', savedTime + elapsed);
        
        readingStartTime = null;
        totalReadingTime = 0;
    }
}

setInterval(() => {
    if (APP.isReading && readingStartTime) {
        const elapsed = Date.now() - readingStartTime;
        const savedTime = parseInt(localStorage.getItem('totalReadingTime') || 0);
        localStorage.setItem('totalReadingTime', savedTime + elapsed);
        readingStartTime = Date.now();
    }
}, 30000);

// ==================== 快捷鍵 ====================
function handleKeyboard(e) {
    if (!APP.isReading) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            prevPage();
            break;
        case 'ArrowRight':
        case ' ':
            e.preventDefault();
            nextPage();
            break;
        case 'Home':
            goToPage(0);
            break;
        case 'End':
            goToPage(APP.totalPages - 1);
            break;
        case 'b':
        case 'B':
            toggleBookmark();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case 'n':
        case 'N':
            toggleTheme();
            break;
        case 'Escape':
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                closeReader();
            }
            break;
        case 's':
        case 'S':
            document.getElementById('settings-btn').click();
            break;
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// ==================== Base64 轉換 ====================
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
// ==================== 書籤管理面板 ====================
function showBookmarksPanel() {
    const panel = document.getElementById('bookmarks-panel');
    const list = document.getElementById('bookmarks-list');
    
    const allBookmarks = [];
    for (const [comicName, pages] of Object.entries(APP.bookmarks)) {
        pages.forEach(page => {
            allBookmarks.push({ comicName, page });
        });
    }
    
    // ✅ 新增：倒轉順序，最新的在最上面
    allBookmarks.reverse();
    
    if (allBookmarks.length === 0) {
        list.innerHTML = '<p class="hint">📭 尚無書籤</p>';
    } else {
        const totalCount = allBookmarks.length;
        const headerHTML = `
            <div style="padding: 10px; border-bottom: 2px solid var(--accent); font-size: 13px; color: var(--text-secondary);">
                📑 書籤列表 (${totalCount}/30)
            </div>
        `;
        
        const tableHTML = `
            <table class="bookmarks-table">
                <thead>
                    <tr>
                        <th style="text-align: left; width: 55%;">書名</th>
                        <th style="text-align: center; width: 25%;">頁碼</th>
                        <th style="text-align: center; width: 20%;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${allBookmarks.map(bm => `
                        <tr class="bookmark-row" data-comic="${bm.comicName}" data-page="${bm.page}">
                            <td class="comic-name" title="${bm.comicName}">${bm.comicName}</td>
                            <td style="text-align: center">${bm.page + 1}</td>
                            <td style="text-align: center">
                                <button class="delete-bookmark-btn" data-comic="${bm.comicName}" data-page="${bm.page}">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        list.innerHTML = headerHTML + tableHTML;
        
        // 點擊書籤行跳轉
        list.querySelectorAll('.bookmark-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-bookmark-btn')) return;
                const comicName = row.dataset.comic;
                const page = parseInt(row.dataset.page);
                goToBookmark(comicName, page);
            });
        });
        
        // 刪除書籤按鈕
        list.querySelectorAll('.delete-bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const comicName = btn.dataset.comic;
                const page = parseInt(btn.dataset.page);
                deleteBookmark(comicName, page);
            });
        });
    }
    
    panel.classList.remove('hidden');
}

function goToBookmark(bookmarkKey, page) {
    // 檢查是否是資料夾內的漫畫（格式：資料夾名/漫畫名）
    if (bookmarkKey.includes('/')) {
        const [folderName, comicName] = bookmarkKey.split('/');
        
        // 找到資料夾
        const folderIndex = APP.comics.findIndex(c => c.type === 'folder' && c.name === folderName);
        if (folderIndex === -1) {
            alert('❌ 找不到資料夾：' + folderName);
            return;
        }
        
        // 找到資料夾內的漫畫
        const folder = APP.comics[folderIndex];
        const comicIndex = folder.comics.findIndex(c => c.name === comicName);
        if (comicIndex === -1) {
            alert('❌ 找不到漫畫：' + comicName);
            return;
        }
        
        // 打開資料夾內的漫畫
        document.getElementById('bookmarks-panel').classList.add('hidden');
        openFolderComic(folderIndex, comicIndex).then(() => goToPage(page));
    } else {
        // 第一層的漫畫
        const comicIndex = APP.comics.findIndex(c => c.name === bookmarkKey);
        if (comicIndex === -1) {
            alert('❌ 找不到這本漫畫');
            return;
        }
        
        if (APP.isReading && APP.currentComic === comicIndex) {
            goToPage(page);
            document.getElementById('bookmarks-panel').classList.add('hidden');
        } else {
            document.getElementById('bookmarks-panel').classList.add('hidden');
            openComic(comicIndex).then(() => goToPage(page));
        }
    }
}

function deleteBookmark(comicName, page) {
    if (!APP.bookmarks[comicName]) return;
    
    const index = APP.bookmarks[comicName].indexOf(page);
    if (index > -1) {
        APP.bookmarks[comicName].splice(index, 1);
        if (APP.bookmarks[comicName].length === 0) {
            delete APP.bookmarks[comicName];
        }
    }
    
    localforage.setItem('bookmarks', APP.bookmarks);
    showBookmarksPanel();
}

// ==================== 閱讀歷史 ====================
function showReadingHistory() {
    const panel = document.getElementById('bookmarks-panel');
    const list = document.getElementById('bookmarks-list');
    
    document.querySelector('#bookmarks-panel .panel-header h3').textContent = '📖 閱讀歷史';
    
const historyEntries = [];
for (const [comicName, page] of Object.entries(APP.readingHistory)) {
    // 檢查是否為資料夾內的漫畫（包含 "/"）
    let comic = null;
    let lastRead = 0;
    let progress = 0;
    
    if (comicName.includes('/')) {
        // 資料夾/書名 格式
        const [folderName, bookName] = comicName.split('/');
        const folder = APP.comics.find(c => c.type === 'folder' && c.name === folderName);
        if (folder) {
            comic = folder.comics.find(c => c.name === bookName);
            if (comic) {
                lastRead = comic.lastRead || 0;
                progress = comic.progress || 0;
            }
        }
    } else {
        // 直接漫畫
        comic = APP.comics.find(c => c.name === comicName);
        if (comic) {
            lastRead = comic.lastRead || 0;
            progress = comic.progress || 0;
        }
    }
    
    if (comic) {
        historyEntries.push({
            comicName,
            page,
            lastRead,
            progress
        });
    }
}
    
    historyEntries.sort((a, b) => b.lastRead - a.lastRead);
	const recentHistory = historyEntries.slice(0, 6); // 只取最近 6 個

    
    if (historyEntries.length === 0) {
        list.innerHTML = '<p class="hint">📭 尚未閱讀任何漫畫</p>';
    } else {
        const tableHTML = `
            <table class="bookmarks-table">
                <thead>
                    <tr>
                        <th style="text-align: left; width: 50%">書名</th>
                        <th style="text-align: center; width: 20%">進度</th>
                        <th style="text-align: center; width: 30%">繼續閱讀</th>
                    </tr>
                </thead>
                <tbody>
${historyEntries.slice(0, 6).map(entry => `
    <tr class="history-row" data-comic="${entry.comicName}">
        <td class="comic-name" title="${entry.comicName}">${entry.comicName}</td>
        <td style="text-align: center">${entry.progress}%</td>
        <td style="text-align: center">
            ${entry.progress >= 100 
                ? `<button class="delete-history-btn" data-comic="${entry.comicName}">🗑️ 刪除</button>`
                : `<button class="continue-reading-btn" data-comic="${entry.comicName}">▶️ 繼續</button>`
            }
        </td>
    </tr>
`).join('')}
                </tbody>
            </table>
        `;
        list.innerHTML = tableHTML;
        
        list.querySelectorAll('.continue-reading-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const comicName = btn.dataset.comic;
                continueReading(comicName);
            });
        });
    }
// 刪除歷史記錄按鈕
		list.querySelectorAll('.delete-history-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const comicName = btn.dataset.comic;
        deleteHistory(comicName);
    });
});
    panel.classList.remove('hidden');
}

function continueReading(comicName) {
    document.getElementById('bookmarks-panel').classList.add('hidden');
    
    // 檢查是否為資料夾內的漫畫（包含 "/"）
    if (comicName.includes('/')) {
        // 資料夾/書名 格式
        const [folderName, bookName] = comicName.split('/');
        const folderIndex = APP.comics.findIndex(c => c.type === 'folder' && c.name === folderName);
        
        if (folderIndex === -1) {
            alert('❌ 找不到資料夾: ' + folderName);
            return;
        }
        
        const folder = APP.comics[folderIndex];
        const comicIndex = folder.comics.findIndex(c => c.name === bookName);
        
        if (comicIndex === -1) {
            alert('❌ 找不到漫畫: ' + bookName);
            return;
        }
        
        openFolderComic(folderIndex, comicIndex);
    } else {
        // 直接漫畫
        const comicIndex = APP.comics.findIndex(c => c.name === comicName);
        if (comicIndex === -1) {
            alert('❌ 找不到這本漫畫');
            return;
        }
        
        openComic(comicIndex);
    }
}
function deleteHistory(comicName) {
    if (confirm(`確定要刪除「${comicName}」的閱讀記錄嗎？`)) {
        delete APP.readingHistory[comicName];
        localforage.setItem('readingHistory', APP.readingHistory);
        
        // 同時清除漫畫的進度
        const comic = APP.comics.find(c => c.name === comicName);
        if (comic) {
            comic.progress = 0;
            comic.lastRead = 0;
            localforage.setItem('comics', APP.comics);
        }
        
        showReadingHistory(); // 重新顯示
        alert('✅ 已刪除閱讀記錄');
    }
}

// ==================== 放大鏡功能 ====================
let zoomActive = false;

document.getElementById('zoom-btn').addEventListener('click', toggleZoom);

function toggleZoom() {
    zoomActive = !zoomActive;
    const btn = document.getElementById('zoom-btn');
    btn.style.background = zoomActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255,255,255,0.1)';
    
    const toolbar = document.getElementById('toolbar');
    
    if (zoomActive) {
        createZoomLens();
        // 開啟放大鏡時，讓工具列變透明
        toolbar.classList.add('hidden');
    } else {
        removeZoomLens();
        // 關閉放大鏡時，恢復工具列正常狀態
        toolbar.classList.remove('hidden');
    }
}

function createZoomLens() {
    const zoomSize = localStorage.getItem('zoomSize') || 'medium';
    let width, height;
    
    switch(zoomSize) {
        case 'small':
            width = 120;   // 直向
            height = 180;
            break;
        case 'large':
            width = 200;   // 直向
            height = 300;
            break;
        default: // medium
            width = 160;   // 直向
            height = 240;
    }
    
    const lens = document.createElement('div');
    lens.id = 'zoom-lens';
    lens.style.cssText = `
        position: fixed;
        width: ${width}px;
        height: ${height}px;
        border: 3px solid #2196F3;
        border-radius: 12px;
        pointer-events: none;
        z-index: 9999;
        background-size: 400%;
        background-repeat: no-repeat;
        display: none;
        box-shadow: 0 0 20px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(lens);
    
    const container = document.getElementById('reader-container');
    container.addEventListener('mousemove', handleZoomMove);
}

function handleZoomMove(e) {
    const lens = document.getElementById('zoom-lens');
    if (!lens) return;
    
    // 判斷雙頁模式
    const display = document.getElementById('page-display');
    const isDualPage = display.classList.contains('double-mode');
    
    let targetImg = null;
    
if (isDualPage) {
    // 雙頁模式：判斷滑鼠在哪一頁上
    const imgs = display.querySelectorAll('.page-image');
    const tolerance = 50; // 容錯範圍：滑鼠可以超出圖片邊緣 50px 而不關閉放大鏡
    
    for (const img of imgs) {
        const rect = img.getBoundingClientRect();
        // 擴大判定範圍，給邊緣留一些容錯空間
        if (e.clientX >= rect.left - tolerance && e.clientX <= rect.right + tolerance &&
            e.clientY >= rect.top - tolerance && e.clientY <= rect.bottom + tolerance) {
            targetImg = img;
            break;
        }
    }
    
    // 如果不在任何圖片上（包含容錯範圍），隱藏放大鏡
    if (!targetImg) {
        lens.style.display = 'none';
        return;
    }
    } else {
        // 單頁模式
        targetImg = document.getElementById('current-page');
    }
    
    if (!targetImg) {
        lens.style.display = 'none';
        return;
    }
    
    const lensWidth = lens.offsetWidth;
    const lensHeight = lens.offsetHeight;
    
    // 計算放大鏡位置（避免超出畫面）
    let lensX = e.clientX - lensWidth / 2;
    let lensY = e.clientY - lensHeight / 2;
    
    // 邊界檢測 - 防止超出視窗
    const margin = 10; // 距離邊緣的最小距離
    
    if (lensX < margin) {
        lensX = margin;
    }
    if (lensX + lensWidth > window.innerWidth - margin) {
        lensX = window.innerWidth - lensWidth - margin;
    }
    
    if (lensY < margin) {
        lensY = margin;
    }
    if (lensY + lensHeight > window.innerHeight - margin) {
        lensY = window.innerHeight - lensHeight - margin;
    }
    
    lens.style.display = 'block';
    lens.style.left = lensX + 'px';
    lens.style.top = lensY + 'px';
    
    // 計算放大位置（基於目標圖片）
    const rect = targetImg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    lens.style.backgroundImage = `url(${targetImg.src})`;
    lens.style.backgroundPosition = `${x}% ${y}%`;
}

function removeZoomLens() {
    const lens = document.getElementById('zoom-lens');
    if (lens) lens.remove();
    
    const container = document.getElementById('reader-container');
    container.removeEventListener('mousemove', handleZoomMove);
}

document.addEventListener('keydown', (e) => {
    if (APP.isReading && (e.key === 'm' || e.key === 'M' || e.key === 'z' || e.key === 'Z')) {
        toggleZoom();
    }
});

// ==================== 自動捲動功能 ====================
let autoScrollActive = false;
let autoScrollInterval = null;
let autoScrollSpeed = parseFloat(localStorage.getItem('autoScrollSpeed') || '1');
let lastManualScroll = 0;
let savedScrollPosition = 0; // 新增：保存捲動位置

document.getElementById('auto-scroll-btn').addEventListener('click', toggleAutoScroll);

function toggleAutoScroll() {
    // 檢查是否為符合寬度模式
    if (!autoScrollActive && APP.fitMode !== 'width') {
        alert('⚠️ 自動捲動只支援「符合寬度」模式\n請先切換到符合寬度');
        return;
    }
    
    autoScrollActive = !autoScrollActive;
    const btn = document.getElementById('auto-scroll-btn');
    btn.style.background = autoScrollActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255,255,255,0.1)';
    
    if (autoScrollActive) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

function startAutoScroll() {
    // 再次檢查模式
    if (APP.fitMode !== 'width') {
        autoScrollActive = false;
        const btn = document.getElementById('auto-scroll-btn');
        btn.style.background = 'rgba(255,255,255,0.1)';
        alert('⚠️ 自動捲動只支援「符合寬度」模式');
        return;
    }
    
    const container = document.getElementById('reader-container');
    const display = document.getElementById('page-display');
    
    // 保存當前捲動位置
    savedScrollPosition = container.scrollTop || 0;
    
    container.style.overflow = 'auto';
    container.style.alignItems = 'flex-start';
    container.style.paddingTop = '0';
    display.style.maxHeight = 'none';
    
    // 禁用點擊區域
    document.querySelectorAll('.click-area').forEach(area => {
        area.style.pointerEvents = 'none';
    });
    
    // 從保存的位置繼續（如果有）
    if (savedScrollPosition > 0) {
        container.scrollTop = savedScrollPosition;
    }
    
    autoScrollInterval = setInterval(() => {
        container.scrollTop += autoScrollSpeed;
        
        // 到達底部時自動換頁
        if (container.scrollTop >= container.scrollHeight - container.clientHeight - 50) {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
            
            setTimeout(() => {
                nextPage();
                if (autoScrollActive) {
                    const container = document.getElementById('reader-container');
                    container.scrollTop = 0;
                    savedScrollPosition = 0;
                    container.style.alignItems = 'flex-start';
                }
                setTimeout(() => {
                    startAutoScroll();
                }, 2000);
            }, 1000);
        }
    }, 30);
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    const container = document.getElementById('reader-container');
    
    // 保存當前捲動位置
    savedScrollPosition = container.scrollTop;
    
    // 保持 overflow: auto 讓手動滾動可用
    container.style.overflow = 'auto';
    container.style.alignItems = 'flex-start';
    
    // 恢復點擊區域
    document.querySelectorAll('.click-area').forEach(area => {
        area.style.pointerEvents = 'auto';
    });
}

// 鍵盤快捷鍵：調整速度
document.addEventListener('keydown', (e) => {
    if (!APP.isReading || !autoScrollActive) return;
    
    if (e.key === '+' || e.key === '=') {
        autoScrollSpeed = Math.min(10, autoScrollSpeed + 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    } else if (e.key === '-' || e.key === '_') {
        autoScrollSpeed = Math.max(0.5, autoScrollSpeed - 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    }
});


document.addEventListener('keydown', (e) => {
    if (!APP.isReading || !autoScrollActive) return;
    
    if (e.key === '+' || e.key === '=') {
        autoScrollSpeed = Math.min(10, autoScrollSpeed + 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    } else if (e.key === '-' || e.key === '_') {
        autoScrollSpeed = Math.max(0.5, autoScrollSpeed - 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    }
});

document.addEventListener('keydown', (e) => {
    if (!APP.isReading || !autoScrollActive) return;
    
    if (e.key === '+' || e.key === '=') {
        autoScrollSpeed = Math.min(10, autoScrollSpeed + 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    } else if (e.key === '-' || e.key === '_') {
        autoScrollSpeed = Math.max(0.5, autoScrollSpeed - 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    }
});

document.addEventListener('keydown', (e) => {
    if (!APP.isReading || !autoScrollActive) return;
    
    if (e.key === '+' || e.key === '=') {
        autoScrollSpeed = Math.min(10, autoScrollSpeed + 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    } else if (e.key === '-' || e.key === '_') {
        autoScrollSpeed = Math.max(0.5, autoScrollSpeed - 0.5);
        alert(`捲動速度: ${autoScrollSpeed.toFixed(1)}`);
    }
});

// ==================== 旋轉功能 ====================
let currentRotation = 0;

document.getElementById('rotate-select').addEventListener('change', (e) => {
    currentRotation = parseInt(e.target.value);
    localStorage.setItem('rotation', e.target.value);
    applyRotation();
});

document.getElementById('zoom-size-select').addEventListener('change', (e) => {
    localStorage.setItem('zoomSize', e.target.value);
    // 如果放大鏡正在使用，重新創建
    if (zoomActive) {
        removeZoomLens();
        createZoomLens();
    }
});

document.getElementById('scroll-speed-select').addEventListener('change', (e) => {
    autoScrollSpeed = parseFloat(e.target.value);
    localStorage.setItem('autoScrollSpeed', e.target.value);
});

document.getElementById('reset-scroll-btn').addEventListener('click', () => {
    autoScrollSpeed = 1;
    localStorage.setItem('autoScrollSpeed', '1');
    document.getElementById('scroll-speed-select').value = '1';
    alert('✅ 捲動速度已重置為正常');
});

function applyRotation() {
    const imgs = document.querySelectorAll('.page-image');
    imgs.forEach(img => {
        img.style.transform = `rotate(${currentRotation}deg)`;
    });
}

document.addEventListener('keydown', (e) => {
    if (!APP.isReading) return;
    
    if (e.key === 'r' || e.key === 'R') {
        const rotations = [0, 90, 180, 270];
        const currentIndex = rotations.indexOf(currentRotation);
        const nextIndex = (currentIndex + 1) % rotations.length;
        currentRotation = rotations[nextIndex];
        
        document.getElementById('rotate-select').value = currentRotation;
        localStorage.setItem('rotation', currentRotation);
        applyRotation();
    }
});
// ==================== 符合寬度：滑鼠滾輪換頁 ====================
let lastWheelTime = 0;

document.getElementById('reader-container').addEventListener('wheel', (e) => {
    // 只在手動模式（非自動捲動）下生效
    if (autoScrollActive) return;
    
    // 只在符合寬度模式下生效
    if (APP.fitMode !== 'width') return;
    
    // 如果不在閱讀模式，忽略
    if (!APP.isReading) return;
    
    const container = document.getElementById('reader-container');
    const now = Date.now();
    
    // 防抖：150ms內只處理一次換頁動作
    const canChangePage = now - lastWheelTime > 150;
    
    // 向下捲輪
    if (e.deltaY > 0) {
        // 檢查是否已經在底部
        const isAtBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 5;
        
        if (isAtBottom && canChangePage) {
            // 已經在底部，換下一頁
            e.preventDefault();
            lastWheelTime = now;
            
            if (APP.currentPage < APP.totalPages - 1) {
                nextPage();
            }
        }
        // 否則讓瀏覽器正常捲動
    }
    // 向上捲輪
    else if (e.deltaY < 0) {
        // 檢查是否已經在頂部
        const isAtTop = container.scrollTop <= 5;
        
        if (isAtTop && canChangePage) {
            // 已經在頂部，換上一頁
            e.preventDefault();
            lastWheelTime = now;
            
            if (APP.currentPage > 0) {
                prevPage();
            }
        }
        // 否則讓瀏覽器正常捲動
    }
}, { passive: false });
// ==================== 自動翻頁（符合高度專用）====================
let autoPageActive = false;
let autoPageInterval = null;
let autoPageIntervalTime = parseInt(localStorage.getItem('autoPageInterval')) || 8;

document.getElementById('auto-page-btn').addEventListener('click', toggleAutoPage);

function toggleAutoPage() {
    // 檢查是否符合高度模式
    if (APP.fitMode !== 'height') {
        alert('⚠️ 自動翻頁只支援「符合高度」模式\n\n請先到設定 → 適應方式 → 選擇「符合高度」');
        return;
    }
    
    autoPageActive = !autoPageActive;
    const btn = document.getElementById('auto-page-btn');
    btn.style.background = autoPageActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255,255,255,0.1)';
    
    if (autoPageActive) {
        startAutoPage();
    } else {
        stopAutoPage();
    }
}

function startAutoPage() {
    // 再次確認符合高度模式
    if (APP.fitMode !== 'height') {
        stopAutoPage();
        alert('⚠️ 請先切換到「符合高度」模式');
        return;
    }
    
    autoPageInterval = setInterval(() => {
        if (APP.currentPage < APP.totalPages - 1) {
            nextPage();
        } else {
            // 到最後一頁，停止自動翻頁
            stopAutoPage();
            alert('✅ 已閱讀完畢！');
        }
    }, autoPageIntervalTime * 1000);
}

function stopAutoPage() {
    autoPageActive = false;
    const btn = document.getElementById('auto-page-btn');
    if (btn) {
        btn.style.background = 'rgba(255,255,255,0.1)';
    }
    
    if (autoPageInterval) {
        clearInterval(autoPageInterval);
        autoPageInterval = null;
    }
}

// 監聽設定變更
// 監聽設定變更
document.getElementById('auto-page-interval-select').addEventListener('change', (e) => {
    autoPageIntervalTime = parseInt(e.target.value);
    localStorage.setItem('autoPageInterval', e.target.value);
    
    // 如果正在運行，重啟以應用新間隔
    if (autoPageActive) {
        stopAutoPage();
        autoPageActive = true;
        const btn = document.getElementById('auto-page-btn');
        btn.style.background = 'rgba(33, 150, 243, 0.5)';
        startAutoPage();
    }
});

// 監聽適應模式變更，如果切換到非符合高度，自動停止
document.querySelectorAll('input[name="fit-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value !== 'height' && autoPageActive) {
            stopAutoPage();
            alert('⚠️ 已切換到非「符合高度」模式，自動翻頁已停止');
        }
    });
});

// ==================== 匯出備份 ====================
function exportBackup() {
    const backup = {
        version: '1.0',
        exportTime: Date.now(),
        readingHistory: APP.readingHistory,
        bookmarks: APP.bookmarks
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date();
    const filename = `comic-backup-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    alert(`✅ 備份已匯出\n檔名：${filename}`);
}

// ==================== 匯入備份 ====================
async function importBackup(file) {
    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        
        if (!backup.version || !backup.readingHistory) {
            alert('❌ 無效的備份檔案');
            return;
        }
        
        // ✅ 改為覆蓋模式（完全替換）
        APP.readingHistory = backup.readingHistory || {};
        APP.bookmarks = backup.bookmarks || {};
        
        const historyCount = Object.keys(APP.readingHistory).length;
        const bookmarkCount = Object.values(APP.bookmarks)
            .reduce((sum, arr) => sum + arr.length, 0);
        
        // 更新 APP.comics 的進度
        for (let i = 0; i < APP.comics.length; i++) {
            const item = APP.comics[i];
            
            if (item.type === 'folder') {
                // 更新資料夾內的漫畫
                for (let j = 0; j < item.comics.length; j++) {
                    const comic = item.comics[j];
                    const historyKey = `${item.name}/${comic.name}`;
                    
                    if (APP.readingHistory[historyKey] !== undefined) {
                        const page = APP.readingHistory[historyKey];
                        comic.lastRead = backup.exportTime || Date.now();
                        // progress 會在下次打開時重新計算
                    }
                }
            } else if (item.type === 'comic') {
                // 更新直接漫畫
                if (APP.readingHistory[item.name] !== undefined) {
                    const page = APP.readingHistory[item.name];
                    item.lastRead = backup.exportTime || Date.now();
                    // progress 會在下次打開時重新計算
                }
            }
        }
        
        // 儲存到 LocalForage
        await localforage.setItem('readingHistory', APP.readingHistory);
        await localforage.setItem('bookmarks', APP.bookmarks);
        await localforage.setItem('comics', APP.comics);
        
        // 重新載入書架
        renderLibrary();
        
        alert(`✅ 匯入完成！（覆蓋模式）\n\n📖 ${historyCount} 本書的閱讀記錄\n🔖 ${bookmarkCount} 個書籤`);
        
    } catch (err) {
        console.error('匯入錯誤:', err);
        alert('❌ 匯入失敗：' + err.message);
    }
}

// ==================== 載入設定 ====================
function loadSettings() {
    const savedPageMode = localStorage.getItem('pageMode') || 'single';
    APP.pageMode = savedPageMode;
    document.querySelector(`input[name="page-mode"][value="${savedPageMode}"]`).checked = true;

    // 載入自動翻頁間隔
    const savedAutoPageInterval = localStorage.getItem('autoPageInterval') || '8';
    const autoPageSelect = document.getElementById('auto-page-interval-select');
    if (autoPageSelect) {
        autoPageSelect.value = savedAutoPageInterval;
        autoPageIntervalTime = parseInt(savedAutoPageInterval);
    }
    
    const savedFitMode = localStorage.getItem('fitMode') || 'width';
    APP.fitMode = savedFitMode;
    document.querySelector(`input[name="fit-mode"][value="${savedFitMode}"]`).checked = true;

    const savedRotation = localStorage.getItem('rotation') || '0';
    currentRotation = parseInt(savedRotation);
    document.getElementById('rotate-select').value = savedRotation;

    const savedZoomSize = localStorage.getItem('zoomSize') || 'medium';
    document.getElementById('zoom-size-select').value = savedZoomSize;

    const savedScrollSpeed = localStorage.getItem('autoScrollSpeed') || '1';
    document.getElementById('scroll-speed-select').value = savedScrollSpeed;
    autoScrollSpeed = parseFloat(savedScrollSpeed);

    const savedViewSize = localStorage.getItem('viewSize') || 'medium';
    setViewSize(savedViewSize);
    
    // 🆕 載入翻頁方向
    const savedDirection = localStorage.getItem('readingDirection') || 'ltr';
    readingDirection = savedDirection;
    const directionRadio = document.querySelector(`input[name="reading-direction"][value="${savedDirection}"]`);
    if (directionRadio) {
        directionRadio.checked = true;
    }
}
