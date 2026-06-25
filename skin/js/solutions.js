// 解决方案列表页专用JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 栏目图标：支持 Font Awesome 类名或栏目缩略图图片路径
    document.querySelectorAll('.category-icon[data-icon]').forEach(iconWrap => {
        const icon = (iconWrap.dataset.icon || '').trim();
        if (!icon || icon.indexOf('[') !== -1) return;

        if (/^(\/|https?:\/\/).+\.(svg|png|jpe?g|gif|webp)$/i.test(icon)) {
            const img = document.createElement('img');
            img.src = icon;
            img.alt = '';
            img.loading = 'lazy';
            iconWrap.textContent = '';
            iconWrap.appendChild(img);
            return;
        }

        const iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.setAttribute('aria-hidden', 'true');
        iconWrap.textContent = '';
        iconWrap.appendChild(iconEl);
    });

    // 面包屑导航交互功能
    const breadcrumbLinks = document.querySelectorAll('.breadcrumb-link');
    
    breadcrumbLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(5deg)';
            }
        });
        
        link.addEventListener('mouseleave', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = '';
            }
        });
    });
    
    // 显示Toast消息的函数
    function showToast(message, type = 'info') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = message;
        
        // 添加样式
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: '9999',
            fontWeight: '500',
            fontSize: '14px',
            animation: 'toastSlideIn 0.3s ease forwards',
            transform: 'translateX(100%)',
            opacity: '0'
        });
        
        document.body.appendChild(toast);
        
        // 触发动画
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // 3秒后移除toast
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // 添加toast动画样式
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        @keyframes toastSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .toast-message {
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
    `;
    document.head.appendChild(toastStyles);
    
    // 键盘导航支持
    breadcrumbLinks.forEach(link => {
        link.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                this.click();
            }
        });
    });

    
    // 侧边栏高亮当前栏目
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        if (item.querySelector('a[href*="solutions"]')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 主导航高亮当前栏目
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === '/solutions.html') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // 移动端底部导航栏高亮
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(tab => {
        if (tab.querySelector('span').textContent === '解决方案') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 分页交互 (已无分页模块，但保留代码不影响)
    const paginationLinks = document.querySelectorAll('.pagination-link');
    
    paginationLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            if (!this.classList.contains('current')) {
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.transform = 'scale(1.2)';
                }
            }
        });
        
        link.addEventListener('mouseleave', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = '';
            }
        });
        
        // 键盘导航支持
        link.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                this.click();
            }
        });
    });
    
    // 分页信息更新（示例）
    function updatePaginationInfo(currentPage, itemsPerPage, totalItems) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        
        const currentRange = document.querySelector('.current-range');
        const totalItemsEl = document.querySelector('.total-items');
        
        if (currentRange) {
            currentRange.textContent = `${startItem}-${endItem}`;
        }
        
        if (totalItemsEl) {
            totalItemsEl.textContent = totalItems;
        }
    }
    
    // 示例：初始化为第1页 (已无分页，但保留函数)
    // updatePaginationInfo(1, 6, 12);
    
    // 分页状态管理 (已无分页，但保留)
    const currentPage = 1; // 当前页
    const totalPages = 6; // 总页数
    
    // 更新上一页/下一页按钮状态
    function updatePaginationButtons() {
        const prevLink = document.querySelector('.pagination-prev .pagination-link');
        const nextLink = document.querySelector('.pagination-next .pagination-link');
        
        // 上一页按钮状态
        if (currentPage <= 1) {
            document.querySelector('.pagination-prev').classList.add('disabled');
            if (prevLink) {
                prevLink.style.pointerEvents = 'none';
                prevLink.style.opacity = '0.5';
            }
        } else {
            document.querySelector('.pagination-prev').classList.remove('disabled');
            if (prevLink) {
                prevLink.style.pointerEvents = 'auto';
                prevLink.style.opacity = '1';
                prevLink.href = `/solutions.html?page=${currentPage - 1}`;
            }
        }
        
        // 下一页按钮状态
        if (currentPage >= totalPages) {
            document.querySelector('.pagination-next').classList.add('disabled');
            if (nextLink) {
                nextLink.style.pointerEvents = 'none';
                nextLink.style.opacity = '0.5';
            }
        } else {
            document.querySelector('.pagination-next').classList.remove('disabled');
            if (nextLink) {
                nextLink.style.pointerEvents = 'auto';
                nextLink.style.opacity = '1';
                nextLink.href = `/solutions.html?page=${currentPage + 1}`;
            }
        }
        
        // 更新当前页码高亮
        document.querySelectorAll('.pagination-link').forEach(link => {
            link.classList.remove('current');
            const pageNum = parseInt(link.textContent);
            if (!isNaN(pageNum) && pageNum === currentPage) {
                link.classList.add('current');
            }
        });
    }
    
    // 初始化分页按钮状态 (已无分页，但保留)
    // updatePaginationButtons();
    
    // 分页链接点击事件（模拟页面切换）(已无分页，但保留)
    document.querySelectorAll('.pagination-link[href*="page="]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.classList.contains('current') || 
                this.closest('.pagination-item').classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            
            // 获取目标页码
            const url = new URL(this.href);
            const pageParam = url.searchParams.get('page');
            const targetPage = parseInt(pageParam) || 1;
            
            // 模拟页面切换（实际应用中这里应该加载新页面）
            console.log(`切换到第 ${targetPage} 页`);
        });
    });
    
    // 搜索功能优化
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.placeholder = '搜索解决方案...';
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    window.location.href = `/search.html?q=${encodeURIComponent(searchTerm)}&type=solution`;
                }
            }
        });
    }
    
    // 卡片悬停效果增强
    const solutionCards = document.querySelectorAll('.solution-card');
    solutionCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.zIndex = '';
        });
        
        // 键盘导航支持
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const link = this.querySelector('a');
                if (link) {
                    window.location.href = link.href;
                }
            }
        });
    });
    
    // 页面滚动时显示/隐藏返回顶部按钮
    const backToTopBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    
    // 返回顶部功能
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // 移动端优化
    if (window.innerWidth < 768) {
        // 移动端卡片点击区域优化
        solutionCards.forEach(card => {
            const link = card.querySelector('.solution-title a');
            if (link) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', function(e) {
                    // 如果点击的不是按钮或链接
                    if (!e.target.closest('a') && !e.target.closest('button')) {
                        link.click();
                    }
                });
            }
        });
    }
});
