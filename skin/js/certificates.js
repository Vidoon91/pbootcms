// 资质证书页面专用JS - 轻量级，仅处理本页面逻辑
document.addEventListener('DOMContentLoaded', function() {
    // ========== 原有功能：证书卡片进入视口动画 ==========
    const certificateItems = document.querySelectorAll('.certificate-item');
    
    // 使用Intersection Observer API实现滚动动画
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        certificateItems.forEach(item => {
            observer.observe(item);
        });
    } else {
        // 兼容旧浏览器 - 直接显示所有卡片
        certificateItems.forEach(item => {
            item.classList.add('visible');
        });
    }
    
    // ========== 原有功能：证书点击放大查看 ==========
    certificateItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 如果点击的不是链接，则放大证书图片
            if (!e.target.closest('a')) {
                const imgSrc = this.querySelector('.certificate-image').src;
                const title = this.querySelector('.certificate-title').textContent;
                
                // 创建模态框
                const modal = document.createElement('div');
                modal.className = 'certificate-modal';
                modal.innerHTML = `
                    <div class="modal-overlay"></div>
                    <div class="modal-content">
                        <button class="modal-close">&times;</button>
                        <h3>${title}</h3>
                        <div class="modal-image-container">
                            <img src="${imgSrc}" alt="${title}">
                        </div>
                    </div>
                `;
                
                // 添加样式
                const style = document.createElement('style');
                style.textContent = `
                    .certificate-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 9999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .modal-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.8);
                    }
                    .modal-content {
                        position: relative;
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        max-width: 800px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        z-index: 2;
                    }
                    .modal-close {
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #666;
                    }
                    .modal-content h3 {
                        margin-top: 0;
                        margin-bottom: 20px;
                        color: #333333;
                    }
                    .modal-image-container {
                        width: 100%;
                        text-align: center;
                    }
                    .modal-image-container img {
                        max-width: 100%;
                        height: auto;
                        border: 1px solid #eee;
                    }
                `;
                
                document.head.appendChild(style);
                document.body.appendChild(modal);
                
                // 关闭模态框
                const closeBtn = modal.querySelector('.modal-close');
                const overlay = modal.querySelector('.modal-overlay');
                
                const closeModal = function() {
                    document.body.removeChild(modal);
                    document.head.removeChild(style);
                };
                
                closeBtn.addEventListener('click', closeModal);
                overlay.addEventListener('click', closeModal);
                
                // ESC键关闭
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && document.body.contains(modal)) {
                        closeModal();
                    }
                });
            }
        });
    });
    
    // ========== 新增功能：企业背书卡联系我们点击滚动到页脚 ==========
    // 获取企业背书卡中的“联系我们”链接
    const contactLinks = document.querySelectorAll('.endorsement-link[href="/contact.html"]');
    
    contactLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止默认跳转
            
            // 获取页脚联系区域
            const footerContact = document.getElementById('contact');
            
            if (footerContact) {
                // 平滑滚动到页脚联系区域
                footerContact.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // ========== 可选：同时处理顶部信息栏的获取报价按钮 ==========
    const quoteBtn = document.getElementById('topQuoteBtn');
    if (quoteBtn) {
        quoteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取在线咨询表单区域
            const quoteForm = document.getElementById('quote-form');
            
            if (quoteForm) {
                quoteForm.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    }
});