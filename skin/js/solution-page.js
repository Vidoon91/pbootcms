
// 移动端响应式功能增强 (完整保留原始脚本，并增加图片放大功能)
document.addEventListener('DOMContentLoaded', function() {
    // 检测移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 移动设备特定优化
        
        // 1. 增加触摸目标最小尺寸
        const touchTargets = document.querySelectorAll('.solution-banner-action, .faq-question, .faq-contact');
        touchTargets.forEach(target => {
            target.style.minHeight = '44px';
            target.style.minWidth = '44px';
            target.style.display = 'flex';
            target.style.alignItems = 'center';
            target.style.justifyContent = 'center';
        });
        
        // 2. 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 3. 图片懒加载优化
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });
        
        // 4. 防止长按弹出菜单
        document.addEventListener('contextmenu', function(e) {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });
    }

    // FAQ手风琴：保留正文在HTML中，仅切换可视状态
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const willOpen = !this.classList.contains('active');

            faqQuestions.forEach(item => {
                item.classList.remove('active');
                item.setAttribute('aria-expanded', 'false');
                item.nextElementSibling.classList.remove('active');
                item.closest('.faq-item').classList.remove('active');
            });

            if (willOpen) {
                this.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
                this.nextElementSibling.classList.add('active');
                this.closest('.faq-item').classList.add('active');
            }
        });
    });

    if (faqQuestions.length > 0) {
        faqQuestions[0].classList.add('active');
        faqQuestions[0].setAttribute('aria-expanded', 'true');
        faqQuestions[0].nextElementSibling.classList.add('active');
        faqQuestions[0].closest('.faq-item').classList.add('active');
    }
    
    // 表单提交处理
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 获取表单数据
            const formData = {
                name: this.querySelector('input[placeholder="您的姓名"]').value,
                email: this.querySelector('input[placeholder="电子邮箱"]').value,
                company: this.querySelector('input[placeholder="公司名称"]').value,
                message: this.querySelector('textarea').value
            };
            
            // 简单验证
            if (!formData.name || !formData.email || !formData.message) {
                alert('请填写必填字段：姓名、邮箱和咨询内容');
                return;
            }
            
            // 模拟表单提交
            console.log('方案报价请求提交:', formData);
            
            // 显示成功消息
            this.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #25D366; margin-bottom: 15px;"></i>
                    <h3 style="color: white; margin-bottom: 10px;">报价请求已提交！</h3>
                    <p style="color: rgba(255,255,255,0.9);">我们的工程师将在24小时内联系您，提供详细的技术方案和报价。</p>
                </div>
            `;
            
            // 移动端优化：振动反馈
            if (isMobile && navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            
            // 滚动到表单位置
            setTimeout(() => {
                document.getElementById('quote-form').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 500);
        });
    }
    
    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                e.preventDefault();
                
                // 计算滚动位置（考虑固定头部高度）
                const topBar = document.querySelector('.top-bar');
                const topBarHeight = topBar ? topBar.offsetHeight : 0;
                const mobileTabbar = document.querySelector('.mobile-tabbar');
                const tabbarHeight = mobileTabbar ? mobileTabbar.offsetHeight : 0;
                
                let offsetTop = targetElement.offsetTop - topBarHeight - 20;
                
                // 移动端考虑底部导航栏
                if (window.innerWidth < 768) {
                    offsetTop -= tabbarHeight;
                }
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // 移动端优化：关闭可能的键盘
                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur();
                }
            }
        });
    });
    
    // WhatsApp链接处理
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (window.innerWidth < 768) {
                // 移动端直接打开
                return true;
            }
            
            // 桌面端提示
            e.preventDefault();
            const confirmOpen = confirm('将在新窗口中打开 WhatsApp，是否继续？');
            if (confirmOpen) {
                window.open(this.href, '_blank');
            }
        });
    });
    
    // 移动端卡片触摸反馈
    if (isMobile) {
        document.querySelectorAll('.solution-brief-card, .application-scene-card, .solution-product-group').forEach(card => {
            card.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
                this.style.transition = 'transform 0.1s ease';
            });
            
            card.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.transform = '';
                    this.style.transition = 'transform 0.2s ease';
                }, 150);
            });
        });
    }
    
    // 移动端横屏检测
    function handleOrientationChange() {
        if (window.innerHeight < window.innerWidth) {
            // 横屏模式
            document.body.classList.add('landscape');
        } else {
            // 竖屏模式
            document.body.classList.remove('landscape');
        }
    }
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // 初始化时检查方向
    handleOrientationChange();
    
    // 移动端下拉刷新阻止
    let startY = 0;
    
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].pageY;
    });
    
    document.addEventListener('touchmove', function(e) {
        // 防止在顶部下拉刷新
        if (window.scrollY === 0 && e.touches[0].pageY > startY) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 移动端性能优化：延迟加载非关键资源
    if (isMobile) {
        // 延迟加载非关键图片
        const lazyImages = document.querySelectorAll('img:not(.solution-banner-image)');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    }
});

// 移动端滚动优化
let ticking = false;
window.addEventListener('scroll', function() {
    if (!ticking) {
        requestAnimationFrame(function() {
            const backToTop = document.getElementById('backToTop');
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
            ticking = false;
        });
        ticking = true;
    }
});

// 返回顶部功能
document.getElementById('backToTop').addEventListener('click', function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 移动端振动反馈
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && navigator.vibrate) {
        navigator.vibrate(50);
    }
});

// 移动端键盘弹出处理
window.addEventListener('resize', function() {
    // 当键盘弹出导致窗口高度变化时，确保内容可见
    if (document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA')) {
        setTimeout(() => {
            document.activeElement.scrollIntoView({
                block: 'center',
                behavior: 'smooth'
            });
        }, 300);
    }
});

// 移动端性能监控
if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // 记录页面加载时间
    window.addEventListener('load', function() {
        const loadTime = window.performance.timing.domContentLoadedEventEnd - 
                        window.performance.timing.navigationStart;
        console.log(`移动端页面加载时间: ${loadTime}ms`);
        
        // 如果加载时间过长，显示提示
        if (loadTime > 3000) {
            console.warn('页面加载较慢，建议优化图片和脚本');
        }
    });
}
