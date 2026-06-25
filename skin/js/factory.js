/**
 * footer.js
 * 功能：留言表单验证、友情链接滚动 + 淡入淡出轮播相册（3秒自动轮播）
 */

// 原有页脚功能
function initFooter() {
    const fromPageInput = document.getElementById('from_page');
    if (fromPageInput) {
        fromPageInput.value = window.location.href;
    }

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            const name = contactForm.querySelector('input[name="contacts"]')?.value.trim();
            const email = contactForm.querySelector('input[name="email"]')?.value.trim();
            const content = contactForm.querySelector('textarea[name="content"]')?.value.trim();
            const checkcode = contactForm.querySelector('input[name="checkcode"]')?.value.trim();

            if (!name || !email || !content || !checkcode) {
                alert('请填写姓名、邮箱、咨询内容和验证码！');
                e.preventDefault();
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('请输入有效的电子邮箱');
                e.preventDefault();
                return;
            }
        });
    }

    const footerLinksContainer = document.querySelector('.footer-links-container');
    if (footerLinksContainer && window.innerWidth < 769) {
        footerLinksContainer.style.overflowX = 'auto';
        footerLinksContainer.style.scrollbarWidth = 'thin';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
} else {
    initFooter();
}

/**
 * 淡入淡出轮播组件（3秒自动轮播）
 */
function initFadeCarousel() {
    const slidesContainer = document.getElementById('carouselSlides');
    if (!slidesContainer) return;

    const slides = Array.from(slidesContainer.querySelectorAll('.carousel-slide'));
    const slideCount = slides.length;
    if (slideCount === 0) return;

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('carouselDots');

    let currentIndex = 0;
    let autoInterval = null;
    let startX = 0, isSwiping = false;
    let isAnimating = false;
    const AUTO_SWITCH_MS = 3000;  // 改为3秒

    function updateSlide(index, animate = true) {
        if (index === currentIndex && slides[currentIndex]?.classList.contains('active')) return;
        if (isAnimating && animate) return;

        if (animate) isAnimating = true;

        slides.forEach(slide => slide.classList.remove('active'));
        if (slides[index]) slides[index].classList.add('active');

        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        currentIndex = index;

        if (animate) {
            setTimeout(() => { isAnimating = false; }, 600);
        } else {
            isAnimating = false;
        }
    }

    function nextSlide() {
        if (isAnimating) return;
        let next = (currentIndex + 1) % slideCount;
        updateSlide(next, true);
        resetAutoPlay();
    }

    function prevSlide() {
        if (isAnimating) return;
        let prev = (currentIndex - 1 + slideCount) % slideCount;
        updateSlide(prev, true);
        resetAutoPlay();
    }

    function goToSlide(index) {
        if (index === currentIndex || isAnimating) return;
        if (index < 0) index = 0;
        if (index >= slideCount) index = slideCount - 1;
        updateSlide(index, true);
        resetAutoPlay();
    }

    function startAutoPlay() {
        if (autoInterval) clearInterval(autoInterval);
        autoInterval = setInterval(() => {
            if (!isAnimating) nextSlide();
        }, AUTO_SWITCH_MS);
    }

    function stopAutoPlay() {
        if (autoInterval) {
            clearInterval(autoInterval);
            autoInterval = null;
        }
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    function buildDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        for (let i = 0; i < slideCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === currentIndex) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopAutoPlay();
        prevSlide();
        startAutoPlay();
    });
    if (nextBtn) nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        stopAutoPlay();
        nextSlide();
        startAutoPlay();
    });

    const container = document.querySelector('.carousel-container');
    if (container) {
        container.addEventListener('mouseenter', stopAutoPlay);
        container.addEventListener('mouseleave', startAutoPlay);
        container.addEventListener('touchstart', (e) => {
            stopAutoPlay();
            startX = e.touches[0].clientX;
            isSwiping = true;
        });
        container.addEventListener('touchmove', (e) => {
            if (!isSwiping || isAnimating) return;
            const diff = e.touches[0].clientX - startX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) prevSlide();
                else nextSlide();
                isSwiping = false;
            }
        });
        container.addEventListener('touchend', () => {
            isSwiping = false;
            startAutoPlay();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stopAutoPlay();
            prevSlide();
            startAutoPlay();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stopAutoPlay();
            nextSlide();
            startAutoPlay();
        }
    });

    buildDots();
    updateSlide(0, false);
    startAutoPlay();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFadeCarousel);
} else {
    initFadeCarousel();
}