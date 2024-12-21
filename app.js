class BookmarkManager {
    constructor() {
        this.bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
        this.bookmarksContainer = document.getElementById('bookmarks-container');
        this.urlInput = document.getElementById('urlInput');
        this.searchInput = document.getElementById('searchInput');
        this.urlErrorContainer = document.getElementById('urlErrorContainer');
        this.tagFilterContainer = document.getElementById('tagFilterContainer');
        
        // 移除统计信息相关代码
        // this.totalBookmarksCount = document.getElementById('totalBookmarksCount');

        // 初始化 activeTags
        this.activeTags = new Set();

        this.initEventListeners();
        this.renderBookmarks();
        this.renderTagFilters();
    }

    initEventListeners() {
        if (this.urlInput) {
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.clearUrlError();
                    this.addBookmark();
                }
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.renderBookmarks());
        }

        // 视图切换按钮事件监听
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        const bookmarksContainer = this.bookmarksContainer;

        gridViewBtn.addEventListener('click', () => {
            bookmarksContainer.classList.remove('list-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        });

        listViewBtn.addEventListener('click', () => {
            bookmarksContainer.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        });
    }

    clearUrlError() {
        if (this.urlErrorContainer) {
            this.urlErrorContainer.textContent = '';
        }
    }

    async addBookmark() {
        const urlInput = this.urlInput.value.trim();
        
        if (!urlInput) {
            if (this.urlErrorContainer) {
                this.urlErrorContainer.textContent = '请输入网址';
            }
            return;
        }

        try {
            const normalizedUrl = this.normalizeUrl(urlInput);
            
            // 立即创建一个临时书签
            const tempBookmark = {
                id: Date.now(),
                url: normalizedUrl,
                title: this.safeGenerateTitle(normalizedUrl),
                thumbnail: this.generatePlaceholderImage(new URL(normalizedUrl).hostname),
                tags: this.safeGenerateTags(new URL(normalizedUrl).hostname),
                keywords: this.safeGenerateKeywords(new URL(normalizedUrl).hostname),
                summary: this.safeGenerateSummary(normalizedUrl),
                timestamp: new Date().toLocaleString(),
                isTemporary: true  // 标记为临时书签
            };

            // 立即添加并渲染临时书签
            this.bookmarks.unshift(tempBookmark);
            this.saveBookmarks();
            this.renderBookmarks();
            this.renderTagFilters();
            this.urlInput.value = '';

            // 异步获取更多信息
            try {
                const response = await this.fetchRealTitle(normalizedUrl);
                
                // 找到并更新临时书签
                const index = this.bookmarks.findIndex(b => b.id === tempBookmark.id);
                if (index !== -1) {
                    this.bookmarks[index] = {
                        ...tempBookmark,
                        title: response.title || tempBookmark.title,
                        tags: response.tags || tempBookmark.tags,
                        keywords: response.keywords || tempBookmark.keywords,
                        summary: response.summary || tempBookmark.summary,
                        thumbnail: response.thumbnail || tempBookmark.thumbnail,
                        isTemporary: false  // 移除临时标记
                    };
                    
                    this.saveBookmarks();
                    this.renderBookmarks();
                    this.renderTagFilters();
                }
            } catch (asyncError) {
                console.warn('异步更新书签信息失败', asyncError);
            }
        } catch (error) {
            console.warn('添加书签时出现问题', error);
            if (this.urlErrorContainer) {
                this.urlErrorContainer.textContent = '请输入有效的网址';
            }
        }
    }

    async fetchRealTitle(url) {
        try {
            const response = await fetch(`http://localhost:5000/get_title?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data.error) {
                console.warn('获取标题失败', data.error);
                return {};
            }
            
            console.log('获取标题响应:', data);  // 调试日志
            
            return {
                title: data.title,
                tags: data.tags,
                keywords: data.keywords,
                summary: data.summary,
                thumbnail: data.thumbnail  // 确保使用后端返回的 thumbnail
            };
        } catch (error) {
            console.warn('获取标题失败', error);
            return {};
        }
    }

    normalizeUrl(url) {
        url = url.trim();

        if (url.startsWith('www.')) {
            url = 'https://' + url;
        }

        if (!url.match(/^[a-zA-Z]+:\/\//)) {
            url = 'https://' + url;
        }

        url = url.replace(/\/+$/, '');

        try {
            return new URL(url).toString();
        } catch {
            throw new Error('无效的网址');
        }
    }

    safeGenerateTitle(url) {
        const hostnames = {
            'github.com': 'GitHub 项目',
            'stackoverflow.com': 'Stack Overflow 问答',
            'medium.com': 'Medium 文章',
            'zhihu.com': '知乎文章',
            'juejin.cn': '掘金技术博客'
        };

        for (const [hostname, title] of Object.entries(hostnames)) {
            if (url.includes(hostname)) {
                return `${title} - ${this.truncateUrl(url)}`;
            }
        }

        return `网页 - ${this.truncateUrl(url)}`;
    }

    safeGenerateTags(hostname) {
        const tagMappings = {
            'github.com': ['技术', '开源', '编程'],
            'stackoverflow.com': ['技术问答', '编程', '开发'],
            'medium.com': ['博客', '文章', '阅读'],
            'zhihu.com': ['社区', '知识', '问答'],
            'juejin.cn': ['技术博客', '前端', '后端']
        };

        const defaultTags = ['网页', '收藏'];
        
        for (const [host, tags] of Object.entries(tagMappings)) {
            if (hostname.includes(host)) {
                return tags;
            }
        }

        return defaultTags;
    }

    safeGenerateKeywords(hostname) {
        const keywordMappings = {
            'github.com': ['代码仓库', '项目', '开发工具'],
            'stackoverflow.com': ['技术支持', '编程问题', '解决方案'],
            'medium.com': ['深度文章', '思考', '洞见'],
            'zhihu.com': ['专业问答', '深度讨论', '知识分享'],
            'juejin.cn': ['技术文章', '编程技巧', '行业洞察']
        };

        const defaultKeywords = ['网页', '资源', '收藏'];
        
        for (const [host, keywords] of Object.entries(keywordMappings)) {
            if (hostname.includes(host)) {
                return keywords;
            }
        }

        return defaultKeywords;
    }

    safeGenerateSummary(url) {
        const summaryTemplates = [
            `一个有趣的网页，记录于 ${new Date().toLocaleDateString()}`,
            '值得深入阅读和收藏的资源',
            '包含有价值的信息和见解',
            '对我的学习和工作很有帮助'
        ];

        return summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];
    }

    generatePlaceholderImage(hostname) {
        // 个人头像路径
        const avatarPath = 'assets/avatar.png';
        
        // 直接返回头像图片
        return avatarPath;

        // 以下是原有的备用逻辑，保留以防头像加载失败
        const colors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
        ];

        const color = colors[Math.floor(Math.random() * colors.length)];
        const textColor = this.getContrastColor(color);
        
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.adjustColorBrightness(color, -0.2));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = hostname.split('.')[1]?.slice(0, 2).toUpperCase() || 'WB';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        return canvas.toDataURL();
    }

    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        return brightness > 125 ? '#000000' : '#ffffff';
    }

    adjustColorBrightness(hexColor, percent) {
        const num = parseInt(hexColor.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const B = ((num >> 8) & 0x00ff) + amt;
        const G = (num & 0x0000ff) + amt;

        return `#${(0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
            (B<255?B<1?0:B:255)*0x100 +
            (G<255?G<1?0:G:255)).toString(16).slice(1)}`;
    }

    truncateUrl(url, maxLength = 30) {
        try {
            const parsedUrl = new URL(url);
            const displayUrl = parsedUrl.hostname + parsedUrl.pathname;
            return displayUrl.length > maxLength 
                ? displayUrl.slice(0, maxLength) + '...' 
                : displayUrl;
        } catch {
            return url.length > maxLength 
                ? url.slice(0, maxLength) + '...' 
                : url;
        }
    }

    getBookmarkThumbnail(bookmark) {
        try {
            // 提取主机名，移除 www. 前缀
            const hostname = new URL(bookmark.url).hostname.replace('www.', '');
            
            // Google Favicon API 构建
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
            
            // 特殊处理：对于一些特殊域名，可能需要额外处理
            const specialDomains = {
                'github.com': 'https://github.githubassets.com/favicons/favicon.png',
                'stackoverflow.com': 'https://cdn.sstatic.net/Sites/stackoverflow/img/favicon.ico'
            };

            // 如果是特殊域名，使用特定的 favicon
            if (specialDomains[hostname]) {
                return specialDomains[hostname];
            }

            return faviconUrl;
        } catch (error) {
            console.warn(`获取缩略图失败: ${error}`);
            return this.generatePlaceholderImage(new URL(bookmark.url).hostname);
        }
    }

    formatWechatStyleTime(timestamp) {
        const now = new Date();
        const targetDate = new Date(timestamp);
        const diffSeconds = (now - targetDate) / 1000;
        const diffMinutes = diffSeconds / 60;
        const diffHours = diffMinutes / 60;
        const diffDays = diffHours / 24;

        if (diffSeconds < 60) {
            return '刚刚';
        } else if (diffMinutes < 60) {
            return `${Math.floor(diffMinutes)}分钟前`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}小时前`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)}天前`;
        } else {
            const year = targetDate.getFullYear();
            const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
            const day = targetDate.getDate().toString().padStart(2, '0');
            
            return now.getFullYear() === year 
                ? `${month}-${day}` 
                : `${year}-${month}-${day}`;
        }
    }

    renderTagFilters() {
        if (!this.tagFilterContainer) return;

        // 统计每个标签的出现次数
        const tagCounts = this.bookmarks.reduce((counts, bookmark) => {
            bookmark.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
            return counts;
        }, {});

        // 将标签按出现次数降序排列
        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => ({ tag, count }));

        // 清空现有标签
        this.tagFilterContainer.innerHTML = '';

        // 创建标签过滤器
        sortedTags.forEach(({ tag, count }) => {
            const tagElement = document.createElement('button');
            tagElement.className = `btn btn-sm m-1 ${this.activeTags.has(tag) ? 'btn-primary' : 'btn-outline-secondary'}`;
            tagElement.innerHTML = `${tag} (${count})`;
            
            tagElement.addEventListener('click', () => {
                if (this.activeTags.has(tag)) {
                    this.activeTags.delete(tag);
                    tagElement.classList.remove('btn-primary');
                    tagElement.classList.add('btn-outline-secondary');
                } else {
                    this.activeTags.add(tag);
                    tagElement.classList.remove('btn-outline-secondary');
                    tagElement.classList.add('btn-primary');
                }
                this.renderBookmarks();
            });

            this.tagFilterContainer.appendChild(tagElement);
        });
    }

    renderBookmarks(bookmarksToRender = null) {
        // 清空现有书签容器
        this.bookmarksContainer.innerHTML = '';

        // 使用传入的书签列表，或使用全部书签
        const bookmarks = bookmarksToRender || this.bookmarks;

        const searchTerm = this.searchInput ? this.searchInput.value.trim().toLowerCase() : '';

        // 按时间倒序排序
        const sortedBookmarks = bookmarks.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // 根据搜索词和标签筛选
        const filteredBookmarks = sortedBookmarks.filter(bookmark => {
            // 搜索条件
            const matchSearch = !searchTerm || 
                bookmark.title.toLowerCase().includes(searchTerm) || 
                bookmark.url.toLowerCase().includes(searchTerm) ||
                (bookmark.keywords && bookmark.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) ||
                (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
            // 标签筛选条件
            const matchTags = this.activeTags.size === 0 || 
                (bookmark.tags && [...this.activeTags].some(tag => bookmark.tags.includes(tag)));
            
            return matchSearch && matchTags;
        });

        if (filteredBookmarks.length === 0) {
            this.bookmarksContainer.innerHTML = `
                <div class="col-12 text-center text-muted p-4">
                    <i class="bi bi-search me-2 fs-1"></i>
                    <p class="mt-2">没有找到匹配的收藏，请尝试其他搜索词或标签</p>
                </div>
            `;
        } else {
            // 直接渲染所有书签，不再按日期分组
            filteredBookmarks.forEach(bookmark => {
                const tagsHtml = bookmark.tags && bookmark.tags.length > 0 
                    ? bookmark.tags.map(tag => 
                        `<span class="badge badge-tag ${this.activeTags.has(tag) ? 'active' : ''}">${tag}</span>`
                    ).join('') 
                    : '<span class="badge bg-secondary">无标签</span>';

                const keywordsHtml = bookmark.keywords && bookmark.keywords.length > 0
                    ? bookmark.keywords.map(keyword => 
                        `<span class="badge badge-keyword">${keyword}</span>`
                    ).join('')
                    : '<span class="badge bg-secondary">无关键词</span>';

                const thumbnailSrc = this.getBookmarkThumbnail(bookmark);

                const bookmarkCard = document.createElement('div');
                bookmarkCard.classList.add('bookmark-card', 'clickable-card');
                
                // 如果是临时书签，添加特殊样式
                if (bookmark.isTemporary) {
                    bookmarkCard.classList.add('temporary-bookmark');
                }

                bookmarkCard.innerHTML = `
                    <div class="bookmark-thumbnail-wrapper">
                        <img 
                            src="${thumbnailSrc}" 
                            alt="网站缩略图" 
                            class="bookmark-thumbnail" 
                            onerror="console.error('图片加载失败:', this.src); this.src='${this.generatePlaceholderImage(new URL(bookmark.url).hostname)}'"
                        >
                        ${bookmark.isTemporary ? '<div class="loading-overlay"><div class="spinner"></div></div>' : ''}
                        <button class="delete-bookmark" data-id="${bookmark.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${bookmark.title}</h5>
                        <div class="mb-2">
                            <span class="badge bg-secondary me-1 small">标签：</span>
                            ${tagsHtml}
                        </div>
                        <div class="mb-2">
                            <span class="badge bg-secondary me-1 small">关键词：</span>
                            ${keywordsHtml}
                        </div>
                        <p class="card-text small text-muted mt-2">
                            ${bookmark.summary || this.truncateUrl(bookmark.url)}
                        </p>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">${this.formatWechatStyleTime(bookmark.timestamp)}</small>
                    </div>
                `;
                
                // 添加点击事件，跳转到书签链接
                bookmarkCard.addEventListener('click', (e) => {
                    // 防止在可点击元素上触发跳转
                    if (e.target.closest('a, button, .badge')) {
                        return;
                    }
                    window.open(bookmark.url, '_blank');
                });

                // 添加删除按钮事件
                const deleteButton = bookmarkCard.querySelector('.delete-bookmark');
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const bookmarkId = parseInt(deleteButton.getAttribute('data-id'));
                    this.deleteBookmark(bookmarkId);
                });

                this.bookmarksContainer.appendChild(bookmarkCard);
            });
        }
    }

    saveBookmarks() {
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
        console.log('保存书签，总数:', this.bookmarks.length);
    }

    deleteBookmark(id) {
        this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== id);
        this.saveBookmarks();
        this.renderBookmarks();
        this.renderTagFilters();
    }
}

// 添加动态样式
const dynamicStyleSheet = `
<style>
.bookmark-thumbnail {
    width: 128px;
    height: 128px;
    object-fit: cover;  /* 确保图像填充整个区域 */
    border-radius: 12px; /* 更圆润的圆角 */
    box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* 轻微阴影 */
    transition: transform 0.2s, box-shadow 0.2s; /* 平滑过渡效果 */
    border: 2px solid rgba(0,0,0,0.05); /* 轻微边框 */
}

.bookmark-thumbnail:hover {
    transform: scale(1.05); /* 悬停时略微放大 */
    box-shadow: 0 6px 8px rgba(0,0,0,0.15); /* 悬停时阴影更明显 */
}

.clickable-card {
    cursor: pointer;
    transition: background-color 0.2s;
}

.clickable-card:hover {
    background-color: #f5f5f5;
}

.temporary-bookmark {
    opacity: 0.8;
    filter: grayscale(50%);
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
}

.spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.list-view .date-group-content {
    display: flex;
    flex-direction: column;
}

.list-view .bookmark-card {
    margin-bottom: 16px;
}

.list-view .bookmark-thumbnail-wrapper {
    width: 100%;
    height: 200px;
    margin-bottom: 16px;
}

.list-view .bookmark-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
}
</style>
`;

// 在页面加载时插入样式
document.head.insertAdjacentHTML('beforeend', dynamicStyleSheet);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，初始化 BookmarkManager');
    const bookmarkManager = new BookmarkManager();
});
