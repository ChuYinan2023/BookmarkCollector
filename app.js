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
            
            // 获取真实标题和AI生成的标签
            const response = await this.fetchRealTitle(normalizedUrl);
            
            const bookmark = {
                id: Date.now(),
                url: normalizedUrl,
                title: response.title || this.safeGenerateTitle(normalizedUrl),
                thumbnail: this.generatePlaceholderImage(new URL(normalizedUrl).hostname),
                tags: response.tags || this.safeGenerateTags(new URL(normalizedUrl).hostname),
                keywords: response.keywords || this.safeGenerateKeywords(new URL(normalizedUrl).hostname),
                summary: response.summary || this.safeGenerateSummary(normalizedUrl),
                timestamp: new Date().toLocaleString()
            };

            this.bookmarks.push(bookmark);
            this.saveBookmarks();
            this.renderBookmarks();
            this.renderTagFilters();
            this.urlInput.value = '';
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
            
            return {
                title: data.title,
                tags: data.tags,
                keywords: data.keywords,
                summary: data.summary
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

    renderTagFilters() {
        if (!this.tagFilterContainer) return;

        // 收集所有唯一标签
        const allTags = new Set(
            this.bookmarks.flatMap(bookmark => bookmark.tags || [])
        );

        this.tagFilterContainer.innerHTML = '';
        this.activeTags = new Set(); // 新增：记录当前选中的标签

        allTags.forEach(tag => {
            const tagBadge = document.createElement('span');
            tagBadge.classList.add('badge', 'bg-light', 'text-dark', 'me-1', 'mb-1', 'tag-filter-badge');
            tagBadge.textContent = tag;
            tagBadge.dataset.tag = tag;
            
            tagBadge.addEventListener('click', () => {
                // 切换标签的选中状态
                if (this.activeTags.has(tag)) {
                    this.activeTags.delete(tag);
                    tagBadge.classList.remove('active');
                } else {
                    this.activeTags.add(tag);
                    tagBadge.classList.add('active');
                }
                
                // 根据选中的标签重新渲染书签
                this.renderBookmarks();
            });
            
            this.tagFilterContainer.appendChild(tagBadge);
        });

        // 移除统计信息更新代码
        // if (this.totalBookmarksCount) {
        //     this.totalBookmarksCount.textContent = `${this.bookmarks.length} 个书签 | ${allTags.size} 个标签`;
        // }
    }

    renderBookmarks(bookmarksToRender = null) {
        if (!this.bookmarksContainer) return;

        const searchTerm = this.searchInput ? this.searchInput.value.trim().toLowerCase() : '';
        
        // 按时间倒序排序
        const sortedBookmarks = (bookmarksToRender || this.bookmarks).sort((a, b) => {
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

        // 按日期分组
        const groupedBookmarks = filteredBookmarks.reduce((groups, bookmark) => {
            const date = new Date(bookmark.timestamp).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(bookmark);
            return groups;
        }, {});

        this.bookmarksContainer.innerHTML = filteredBookmarks.length ? '' : `
            <div class="col-12 text-center text-muted p-4">
                <i class="bi bi-search me-2 fs-1"></i>
                <p class="mt-2">没有找到匹配的收藏，请尝试其他搜索词或标签</p>
            </div>
        `;

        // 渲染分组的书签
        Object.keys(groupedBookmarks).forEach(date => {
            // 创建日期分组容器
            const dateGroup = document.createElement('div');
            dateGroup.classList.add('date-group');

            // 添加日期标题
            const dateHeader = document.createElement('div');
            dateHeader.classList.add('date-group-header');
            dateHeader.textContent = date;
            dateGroup.appendChild(dateHeader);

            // 创建书签内容容器
            const dateGroupContent = document.createElement('div');
            dateGroupContent.classList.add('date-group-content');

            // 渲染该日期的书签
            groupedBookmarks[date].forEach(bookmark => {
                const bookmarkCard = document.createElement('div');
                
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

                bookmarkCard.innerHTML = `
                    <div class="bookmark-card">
                        <img src="${bookmark.thumbnail}" class="bookmark-thumbnail" alt="网页缩略图">
                        <div class="card-body">
                            <h5 class="card-title">${bookmark.title}</h5>
                            <p class="card-text small">
                                <a href="${bookmark.url}" target="_blank" class="text-decoration-none text-muted">
                                    ${this.truncateUrl(bookmark.url)}
                                </a>
                            </p>
                            <div class="mb-2">
                                <span class="badge bg-secondary me-1 small">标签：</span>
                                ${tagsHtml}
                            </div>
                            <div class="mb-2">
                                <span class="badge bg-secondary me-1 small">关键词：</span>
                                ${keywordsHtml}
                            </div>
                            <p class="card-text small text-muted flex-grow-1">${bookmark.summary || '暂无摘要'}</p>
                        </div>
                        <div class="card-footer">
                            <small class="text-muted">${bookmark.timestamp}</small>
                            <button class="btn btn-sm btn-outline-danger delete-bookmark" data-id="${bookmark.id}">
                                删除
                            </button>
                        </div>
                    </div>
                `;
                
                dateGroupContent.appendChild(bookmarkCard);
            });

            // 将内容容器添加到日期分组
            dateGroup.appendChild(dateGroupContent);
            
            // 将日期分组添加到主容器
            this.bookmarksContainer.appendChild(dateGroup);
        });

        this.bookmarksContainer.querySelectorAll('.delete-bookmark').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookmarkId = parseInt(e.target.getAttribute('data-id'));
                this.deleteBookmark(bookmarkId);
            });
        });
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，初始化 BookmarkManager');
    const bookmarkManager = new BookmarkManager();
});
