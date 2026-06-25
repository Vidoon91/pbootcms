// ===== mobile-tabbar.js =====
function initMobileTabbar() {
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.href) {
                window.location.href = item.dataset.href;
                return;
            }
            const active = document.querySelector('.tab-item.active');
            if (active) active.classList.remove('active');
            item.classList.add('active');
            if (item.textContent.includes('在线留言')) {
                const contactSection = document.getElementById('contact');
                if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// 移动端响应式设置（原 mobile-components 中的部分）
function setupMobileResponsive() {
    const searchContainer = document.getElementById('searchContainer');
    const mobileSearchTrigger = document.getElementById('mobileSearchTrigger');
    const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
    const desktopSearch = searchContainer?.querySelector('.desktop-search');

    const handleResize = () => {
        if (window.innerWidth < 769) {
            if (mobileSearchTrigger) mobileSearchTrigger.style.display = 'none';
            if (mobileSearchOverlay) mobileSearchOverlay.style.display = 'none';
            if (desktopSearch) desktopSearch.style.display = 'flex';
        } else {
            if (mobileSearchTrigger) mobileSearchTrigger.style.display = 'flex';
            if (desktopSearch) desktopSearch.style.display = 'none';
        }
    };
    handleResize();
    window.addEventListener('resize', debounce(handleResize, 250));
}

// 防抖函数（可复用于多处）
function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}