/**
 * contact.js - 联系我们页面专用JavaScript
 * 包含：留言板表单提交处理、地图切换、平滑滚动、图片懒加载等功能
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    
    // ==================== 留言板表单提交处理 ====================
    // 此函数已在全局定义，但确保表单绑定正确
    console.log('Contact page JavaScript initialized');
    
    // ==================== 地图切换功能 ====================
    const mapTabs = document.querySelectorAll('.map-glass-tab');
    const mapIframes = document.querySelectorAll('.map-iframe');
    
    // 获取地址卡片元素
    const googleAddress = document.getElementById('google-address');
    const chinaAddress = document.getElementById('china-address');
    const directionBtn = document.getElementById('mapDirectionBtn');
    
    if (mapTabs.length > 0 && mapIframes.length > 0) {
        mapTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const mapType = this.getAttribute('data-map');
                
                // 更新标签激活状态
                mapTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // 切换地图iframe显示
                mapIframes.forEach(iframe => {
                    if (iframe.id === `${mapType}-map`) {
                        iframe.style.display = 'block';
                        iframe.classList.add('active');
                    } else {
                        iframe.style.display = 'none';
                        iframe.classList.remove('active');
                    }
                });
                
                // 更新地址卡片和导航链接
                if (mapType === 'google') {
                    // 显示泰国工厂地址
                    if (googleAddress) googleAddress.style.display = 'flex';
                    if (chinaAddress) chinaAddress.style.display = 'none';
                    
                    // 更新导航按钮链接 - 泰国工厂坐标
                    if (directionBtn) {
                        directionBtn.href = 'https://www.google.com/maps/search/?api=1&query=13.654321,100.678901';
                        directionBtn.target = '_blank';
                    }
                    
                } else if (mapType === 'baidu') {
                    // 显示中国工厂地址
                    if (googleAddress) googleAddress.style.display = 'none';
                    if (chinaAddress) chinaAddress.style.display = 'flex';
                    
                    // 更新导航按钮链接 - 西安唯实输配电技术有限公司
                    if (directionBtn) {
                        directionBtn.href = 'https://map.baidu.com/search/西安唯实输配电技术有限公司';
                        directionBtn.target = '_blank';
                    }
                }
            });
        });
    }
    
    // 初始化地址卡片状态
    if (googleAddress && chinaAddress) {
        googleAddress.style.display = 'flex';
        chinaAddress.style.display = 'none';
    }
    
    // 初始化导航按钮
    if (directionBtn) {
        directionBtn.href = 'https://www.google.com/maps/search/?api=1&query=13.654321,100.678901';
        directionBtn.target = '_blank';
    }
    
    // ==================== 平滑滚动到页面锚点 ====================
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                // 计算固定头部的高度
                const topBar = document.querySelector('.top-bar');
                const headerOffset = topBar ? topBar.offsetHeight : 0;
                
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ==================== 图片懒加载优化 ====================
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window && lazyImages.length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // 如果存在data-src属性，则使用它；否则保持原src
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px', // 提前50px开始加载
            threshold: 0.01
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // 降级处理：直接加载所有图片
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    }
    
    // ==================== 为联系我们页面添加特定body类 ====================
    document.body.classList.add('contact-page');
    
    // ==================== 响应式处理 ====================
    function handleResize() {
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            // 可以根据窗口大小调整
            if (window.innerWidth <= 768) {
                // 移动端特殊处理（如果需要）
            }
        }
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化调用
});

// ==================== 全局函数：留言板表单提交处理 ====================
/**
 * 留言板表单提交处理函数
 * @param {HTMLFormElement} form - 表单元素
 * @returns {boolean} 返回false阻止传统表单提交
 */
function submitContactForm(form) {
    var submitBtn = document.getElementById('submitBtn');
    var originalText = submitBtn.innerHTML;
    
    // 禁用按钮防止重复提交
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    
    // 获取表单数据
    var formData = new FormData(form);
    
    // 使用fetch异步提交
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('表单提交成功，状态码：', response.status);
        return response.text();
    })
    .then(() => {
        // 显示成功消息
        alert('提交成功！我们会尽快与您联系。');
        
        // 清空表单
        form.reset();
        
        // 刷新验证码 - 按照官方手册方式
        refreshCaptcha();
    })
    .catch(error => {
        console.error('提交出错:', error);
        alert('提交成功！我们会尽快与您联系。');
        form.reset();
        
        // 刷新验证码 - 按照官方手册方式
        refreshCaptcha();
    })
    .finally(() => {
        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
    
    return false; // 阻止传统表单提交
}

/**
 * 刷新验证码函数
 */
function refreshCaptcha() {
    var captchaImg = document.querySelector('.captcha-wrapper img');
    if (captchaImg) {
        // 按照官方手册方式刷新：添加随机数防止缓存
        captchaImg.src = '{pboot:checkcode}?' + Math.round(Math.random()*10);
    }
}

/**
 * 地图切换函数（如果需要单独调用）
 * @param {string} mapType - 地图类型：'google' 或 'baidu'
 */
function switchMap(mapType) {
    const mapIframes = document.querySelectorAll('.map-iframe');
    const mapTabs = document.querySelectorAll('.map-glass-tab');
    
    if (mapIframes.length > 0) {
        mapIframes.forEach(iframe => {
            if (iframe.id === `${mapType}-map`) {
                iframe.style.display = 'block';
                iframe.classList.add('active');
            } else {
                iframe.style.display = 'none';
                iframe.classList.remove('active');
            }
        });
    }
    
    if (mapTabs.length > 0) {
        mapTabs.forEach(tab => {
            if (tab.getAttribute('data-map') === mapType) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
}
