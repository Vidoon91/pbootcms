// 导航栏滚动效果
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// 语言切换功能
document.querySelectorAll('.language-option').forEach(option => {
    option.addEventListener('click', function(e) {
        e.preventDefault();
        const lang = this.getAttribute('data-lang');
        document.getElementById('currentLanguage').textContent = this.textContent;
        
        // 移除所有active类
        document.querySelectorAll('.language-option').forEach(item => {
            item.classList.remove('active');
        });
        
        // 给当前选项添加active类
        this.classList.add('active');
        
        // 这里可以添加实际的语言切换逻辑
        console.log('切换语言至:', lang);
    });
});

// 产品卡片动画
function animateOnScroll() {
    const cards = document.querySelectorAll('.product-card, .solution-card, .news-card');
    cards.forEach((card, index) => {
        const cardPosition = card.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;
        
        if (cardPosition < screenPosition) {
            card.classList.add('animate');
            card.classList.add(`delay-${index % 3}`);
        }
    });
}

// 初始化动画和滚动事件
window.addEventListener('load', animateOnScroll);
window.addEventListener('scroll', animateOnScroll);

// 表单验证示例（如果有联系表单）
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const email = form.querySelector('input[type="email"]');
        if (email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.value)) {
            e.preventDefault();
            email.classList.add('is-invalid');
            alert('请输入有效的电子邮件地址');
        }
    });
});

// 视频懒加载
document.addEventListener('DOMContentLoaded', function() {
    const lazyVideos = document.querySelectorAll('.video-container iframe');
    
    const lazyVideoObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(function(video) {
            if (video.isIntersecting) {
                for (const source in video.target.dataset) {
                    if (source.startsWith('src')) {
                        video.target.setAttribute(source, video.target.dataset[source]);
                    }
                }
                observer.unobserve(video.target);
            }
        });
    }, { rootMargin: '100px' });
    
    lazyVideos.forEach(function(video) {
        lazyVideoObserver.observe(video);
    });
});
