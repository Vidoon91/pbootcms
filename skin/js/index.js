// ===== content.js =====
// 主内容区所有交互：Banner、横向滑动、视频中心、工厂相册

// ---------- Banner 轮播图 ----------
function initBanner() {
    const slides = document.querySelectorAll('.banner-slide');
    const indicators = document.querySelectorAll('.banner-indicator');
    const prevBtn = document.querySelector('.banner-prev');
    const nextBtn = document.querySelector('.banner-next');
    if (slides.length === 0) return;

    let currentIndex = 0;
    let intervalId = null;
    const interval = 5000;

    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(ind => ind.classList.remove('active'));
        slides[index].classList.add('active');
        indicators[index]?.classList.add('active');
        currentIndex = index;
        resetProgressBar();
    }
    function nextSlide() { showSlide((currentIndex + 1) % slides.length); }
    function prevSlide() { showSlide((currentIndex - 1 + slides.length) % slides.length); }
    function resetProgressBar() {
        document.querySelectorAll('.banner-progress').forEach(bar => {
            bar.style.transition = 'none';
            bar.style.width = '0%';
            bar.offsetWidth;
            bar.style.transition = `width ${interval}ms linear`;
            bar.style.width = '100%';
        });
    }
    function startAutoRotation() {
        stopAutoRotation();
        resetProgressBar();
        intervalId = setInterval(nextSlide, interval);
    }
    function stopAutoRotation() { if (intervalId) clearInterval(intervalId); }
    function resetAutoRotation() { startAutoRotation(); }

    indicators.forEach((indicator, idx) => {
        indicator.addEventListener('click', () => { showSlide(idx); resetAutoRotation(); });
    });
    prevBtn?.addEventListener('click', () => { prevSlide(); resetAutoRotation(); });
    nextBtn?.addEventListener('click', () => { nextSlide(); resetAutoRotation(); });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoRotation(); else startAutoRotation();
    });
    startAutoRotation();
}

// ---------- 横向滑动类 ----------
class HorizontalSlider {
    constructor(sliderElement) {
        this.container = sliderElement;
        this.track = sliderElement.querySelector('.js-slider-track');
        this.items = sliderElement.querySelectorAll('.js-slider-item');
        if (!this.container || !this.track || this.items.length === 0) return;

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.dragAxis = null;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.config = {
            step: parseInt(this.container.dataset.step) || 1,
            align: this.container.dataset.align || 'start',
            drag: this.container.dataset.drag !== 'false'
        };

        const parentContainer = this.container.closest('.scroll-container') || 
                              this.container.closest('.video-slider-wrapper') || 
                              this.container.closest('.factory-slider-wrapper') || 
                              this.container.closest('.news-slider-wrapper') ||
                              this.container.parentElement;
        this.prevBtn = parentContainer?.querySelector('.js-slider-prev');
        this.nextBtn = parentContainer?.querySelector('.js-slider-next');

        this.init();
    }
    init() {
        this.disableImageDrag();
        this.setupEventListeners();
        this.setupNavigationButtons();
        this.updateTransform();
    }
    disableImageDrag() {
        this.container.querySelectorAll('img').forEach(img => {
            img.setAttribute('draggable', 'false');
            img.style.userSelect = 'none';
            img.style.webkitUserDrag = 'none';
        });
    }
    setupEventListeners() {
        if (!this.config.drag) return;
        // 使用 touch + mouse 混合监听，避免 pointer 事件干扰链接
        this.container.addEventListener('mousedown', (e) => this.handleDragStart(e));
        this.container.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: true });
        window.addEventListener('mousemove', (e) => this.handleDragMove(e));
        window.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        window.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        window.addEventListener('touchend', (e) => this.handleDragEnd(e));
    }
    handleDragStart(e) {
        const point = e.touches ? e.touches[0] : e;
        const clientX = point.clientX;
        const clientY = point.clientY;
        const target = e.target;
        // 如果点击的是链接、按钮、图标内部，直接放行，不启动拖拽
        if (target.closest('a, button') || target.tagName === 'BUTTON' || target.tagName === 'A') {
            return;
        }
        this.isDragging = true;
        this.startX = clientX;
        this.startY = clientY;
        this.dragAxis = e.touches ? null : 'x';
        this.prevTranslate = this.currentTranslate;
        this.track.classList.remove('is-animating');
        if (!e.touches) e.preventDefault();
    }
    handleDragMove(e) {
        if (!this.isDragging) return;
        const point = e.touches ? e.touches[0] : e;
        const clientX = point.clientX;
        const clientY = point.clientY;
        const diffX = clientX - this.startX;
        const diffY = clientY - this.startY;
        if (e.touches && !this.dragAxis) {
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);
            if (absX < 8 && absY < 8) return;
            if (absY > absX) {
                this.isDragging = false;
                this.dragAxis = null;
                this.track.classList.add('is-animating');
                this.snapToBounds();
                return;
            }
            this.dragAxis = 'x';
        }
        if (e.touches && this.dragAxis !== 'x') return;
        let newTranslate = this.prevTranslate + diffX;
        const maxTranslate = 0;
        const minTranslate = this.container.clientWidth - this.track.scrollWidth;
        if (newTranslate > maxTranslate) newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.35;
        else if (newTranslate < minTranslate) newTranslate = minTranslate + (newTranslate - minTranslate) * 0.35;
        this.currentTranslate = newTranslate;
        this.updateTransform();
        e.preventDefault();
    }
    handleDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dragAxis = null;
        this.track.classList.add('is-animating');
        if (this.config.align === 'start') this.snapToNearestItem();
        else this.snapToBounds();
    }
    snapToBounds() {
        const maxTranslate = 0;
        const minTranslate = this.container.clientWidth - this.track.scrollWidth;
        if (minTranslate >= 0) { this.currentTranslate = 0; this.updateTransform(); return; }
        if (this.currentTranslate > maxTranslate) this.currentTranslate = maxTranslate;
        else if (this.currentTranslate < minTranslate) this.currentTranslate = minTranslate;
        this.updateTransform();
    }
    snapToNearestItem() {
        const maxTranslate = 0;
        const minTranslate = this.container.clientWidth - this.track.scrollWidth;
        if (minTranslate >= 0) { this.currentTranslate = 0; this.updateTransform(); return; }
        let targetTranslate = this.currentTranslate;
        if (targetTranslate > maxTranslate) targetTranslate = maxTranslate;
        else if (targetTranslate < minTranslate) targetTranslate = minTranslate;
        else {
            const itemWidth = this.items[0]?.offsetWidth || 280;
            const gap = parseInt(window.getComputedStyle(this.track).gap) || 20;
            const totalItemWidth = itemWidth + gap;
            const itemIndex = Math.round(-targetTranslate / totalItemWidth);
            targetTranslate = -itemIndex * totalItemWidth;
            if (targetTranslate > maxTranslate) targetTranslate = maxTranslate;
            else if (targetTranslate < minTranslate) targetTranslate = minTranslate;
        }
        this.currentTranslate = targetTranslate;
        this.updateTransform();
    }
    updateTransform() { this.track.style.transform = `translate3d(${this.currentTranslate}px, 0, 0)`; }
    setupNavigationButtons() {
        this.prevBtn?.addEventListener('click', () => this.navigate(-this.config.step));
        this.nextBtn?.addEventListener('click', () => this.navigate(this.config.step));
    }
    navigate(steps) {
        this.track.classList.add('is-animating');
        const itemWidth = this.items[0]?.offsetWidth || 280;
        const gap = parseInt(window.getComputedStyle(this.track).gap) || 20;
        const totalItemWidth = (itemWidth + gap) * steps;
        this.currentTranslate += totalItemWidth;
        this.snapToNearestItem();
    }
}

// ---------- 初始化所有横向滑动 ----------
function initHorizontalSliders() {
    document.querySelectorAll('.js-horizontal-slider').forEach(el => {
        try { new HorizontalSlider(el); } catch (e) { console.error(e); }
    });
}

// ---------- 热门产品移动端卡片跳转 ----------
function initProductCardLinks() {
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    document.querySelectorAll('.vertical-product-card').forEach(card => {
        let startX = 0;
        let startY = 0;
        let moved = false;

        card.addEventListener('touchstart', (e) => {
            const touch = e.touches?.[0];
            if (!touch) return;
            startX = touch.clientX;
            startY = touch.clientY;
            moved = false;
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            const touch = e.touches?.[0];
            if (!touch) return;
            const diffX = Math.abs(touch.clientX - startX);
            const diffY = Math.abs(touch.clientY - startY);
            if (diffX > 10 || diffY > 10) moved = true;
        }, { passive: true });

        card.addEventListener('click', (e) => {
            if (!isMobile()) return;
            if (e.target.closest('a, button')) return;
            if (moved) {
                moved = false;
                return;
            }

            const detailsLink = card.querySelector('.download-btn[href]');
            if (detailsLink?.href) {
                window.location.href = detailsLink.href;
            }
        });
    });
}

// ---------- 视频中心（修复跳转）----------
function initVideoCenter() {
    // 方案：直接为每个封面容器绑定点击事件，强制跳转到视频详情页
    document.querySelectorAll('.video-cover-container').forEach(container => {
        container.addEventListener('click', function(e) {
            // 找到容器内的播放图标（.video-play-icon），读取其 href
            const playIcon = this.querySelector('.video-play-icon');
            if (playIcon && playIcon.href) {
                window.location.href = playIcon.href;
            }
        });
    });
}

// ---------- 工厂相册（已修复）----------
function initFactoryAlbum() {
    document.querySelectorAll('.factory-card').forEach(card => {
        const detailsBtn = card.querySelector('.factory-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                const title = card.querySelector('.factory-hover-title')?.textContent;
                console.log('查看工厂详情:', title);
            });
        }
    });
}

// ---------- Home video modal ----------
function initHomeVideoModal() {
    const videoPlayBtn = document.getElementById('videoPlayBtn');
    const videoModalOverlay = document.getElementById('videoModalOverlay');
    const videoModalPlayer = document.getElementById('videoModalPlayer');

    if (!videoPlayBtn || !videoModalOverlay || !videoModalPlayer) return;

    const videoModalClose = document.getElementById('videoModalClose');
    let isPlaying = false;
    let modalTcPlayer = null;
    let playerPromise = null;
    let sdkPromise = null;

    videoModalOverlay.classList.add('is-tcplayer');

    videoPlayBtn.addEventListener('click', async () => {
        isPlaying = true;
        lockScroll(true);
        videoModalOverlay.classList.add('active');
        try {
            const player = await ensureTencentModalPlayer();
            if (player && typeof player.play === 'function') {
                player.play();
            }
        } catch (error) {
            console.error('Tencent modal video init failed:', error);
        }
    });

    videoModalClose?.addEventListener('click', closeVideo);
    videoModalOverlay.addEventListener('click', (event) => {
        if (event.target === videoModalOverlay) closeVideo();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isPlaying) closeVideo();
    });

    function ensureTencentModalPlayer() {
        if (modalTcPlayer) return Promise.resolve(modalTcPlayer);
        if (playerPromise) return playerPromise;

        playerPromise = initTencentModalPlayer().finally(() => {
            playerPromise = null;
        });

        return playerPromise;
    }

    async function initTencentModalPlayer() {
        await ensureTencentPlayerSdk();

        const signData = await fetchTencentModalSignature();
        const appID = String(signData.appId || '').trim();
        const fileID = String(signData.fileId || '').trim();
        const psign = String(signData.psign || '').trim();
        const licenseUrl = String(signData.licenseUrl || '').trim();
        const licenseKey = String(signData.licenseKey || '').trim();

        if (!appID || !fileID || !psign) {
            throw new Error('Signature response missing appId, fileId or psign');
        }

        const playerOptions = {
            appID,
            fileID,
            psign,
            width: '100%',
            height: '100%',
            autoplay: true,
            muted: false,
            controls: true,
            preload: 'none',
            language: 'zh-CN',
            playsinline: true,
            html5: {
                nativeControlsForTouch: false
            }
        };

        if (licenseUrl) playerOptions.licenseUrl = licenseUrl;
        if (licenseKey) playerOptions.licenseKey = licenseKey;

        modalTcPlayer = TCPlayer('videoModalPlayer', playerOptions);
        if (modalTcPlayer && typeof modalTcPlayer.on === 'function') {
            modalTcPlayer.on('ended', closeVideo);
        }

        return modalTcPlayer;
    }

    function ensureTencentPlayerSdk() {
        if (typeof TCPlayer !== 'undefined') return Promise.resolve();
        if (sdkPromise) return sdkPromise;

        sdkPromise = new Promise((resolve, reject) => {
            loadStylesheetOnce('/skin/vendor/tcplayer/tcplayer.min.css', 'tcplayer-css');

            const existingScript = document.getElementById('tcplayer-js');
            if (existingScript) {
                existingScript.addEventListener('load', resolve, { once: true });
                existingScript.addEventListener('error', () => reject(new Error('TCPlayer SDK load failed')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.id = 'tcplayer-js';
            script.src = '/skin/vendor/tcplayer/tcplayer.v5.3.3.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('TCPlayer SDK load failed'));
            document.head.appendChild(script);
        });

        return sdkPromise;
    }

    function loadStylesheetOnce(href, id) {
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    async function fetchTencentModalSignature() {
        const signApi = String(videoModalPlayer.dataset.signApi || '/api/tencent-vod-psign.php').trim();
        const contentId = String(videoModalPlayer.dataset.contentId || '').trim();
        const fileId = String(videoModalPlayer.dataset.fileId || '').trim();

        if (!signApi || (!contentId && !fileId)) {
            throw new Error('Missing Tencent VOD sign api, content id or file id');
        }

        const params = new URLSearchParams();
        if (contentId) {
            params.set('contentId', contentId);
        } else {
            params.set('fileId', fileId);
        }

        const response = await fetch(`${signApi}?${params.toString()}`, {
            credentials: 'same-origin'
        });
        const result = await response.json();

        if (!result || Number(result.code) !== 0 || !result.data) {
            throw new Error(result && result.msg ? result.msg : 'Tencent VOD signature failed');
        }

        return result.data;
    }

    function closeVideo() {
        if (!isPlaying) return;
        isPlaying = false;
        try {
            if (modalTcPlayer && typeof modalTcPlayer.pause === 'function') {
                modalTcPlayer.pause();
            } else {
                videoModalPlayer.pause();
            }
        } catch (error) {
            console.warn('Pause Tencent modal video failed:', error);
        }
        lockScroll(false);
        videoModalOverlay.classList.remove('active');
    }

    function lockScroll(lock) {
        if (lock) {
            const scrollTop = window.scrollY;
            document.body.style.top = `-${scrollTop}px`;
            document.body.classList.add('no-scroll');
        } else {
            const scrollTop = parseInt(document.body.style.top || '0', 10);
            document.body.classList.remove('no-scroll');
            window.scrollTo(0, Math.abs(scrollTop));
            document.body.style.top = '';
        }
    }
}

// ---------- 主内容区总入口 ----------
function initContentModules() {
    initBanner();
    initHorizontalSliders();
    initProductCardLinks();
    initVideoCenter();
    initFactoryAlbum();
    initHomeVideoModal();
}

// ★ 在首页 DOM 加载完成后自动初始化
document.addEventListener('DOMContentLoaded', initContentModules);
