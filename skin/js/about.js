// 关于我们页面专用JavaScript
document.addEventListener('DOMContentLoaded', function() {
    
    const profileImage = document.getElementById('companyImage');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.image-modal-close');
    
    if (profileImage) {
        profileImage.onclick = function() {
            const img = this.querySelector('img');
            modal.style.display = 'block';
            modalImg.src = img.src;
            document.body.style.overflow = 'hidden';
        }
    }
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // 地图切换功能
    const mapTabs = document.querySelectorAll('.map-tab');
    const mapIframes = document.querySelectorAll('.map-iframe');
    
    if (mapTabs.length > 0 && mapIframes.length > 0) {
        mapTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const mapType = this.getAttribute('data-map');
                
                // 更新标签状态
                mapTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 显示对应的地图
                mapIframes.forEach(iframe => {
                    if (iframe.id === `${mapType}-map`) {
                        iframe.style.display = 'block';
                        iframe.classList.add('active');
                    } else {
                        iframe.style.display = 'none';
                        iframe.classList.remove('active');
                    }
                });
            });
        });
    }
    
    // 平滑滚动到页面锚点
    const aboutLinks = document.querySelectorAll('a[href^="#"]');
    aboutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                // 计算偏移量，考虑顶部固定栏的高度
                const headerOffset = document.querySelector('.top-bar')?.offsetHeight || 0;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 图片懒加载优化
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    // 为关于我们页面添加特定body类，用于样式隔离
    document.body.classList.add('about-page');
});
