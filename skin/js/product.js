// ===== 产品详情页专用脚??- 最终版（修复轮播图图片放大??====
document.addEventListener('DOMContentLoaded', function() {
    // --- 获取DOM元素 ---
    const sliderContainer = document.getElementById('sliderContainer');
    const sliderTrack = document.getElementById('sliderTrack');
    const sliderPrev = document.getElementById('sliderPrev');
    const sliderNext = document.getElementById('sliderNext');
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    const currentSlideEl = document.getElementById('currentSlide');
    const totalSlidesEl = document.getElementById('totalSlides');
    const mediaTypeEl = document.querySelector('.media-type');
    const sliderSlides = document.querySelectorAll('.slider-slide');
    
    // 轮播图变量
    let currentSlide = 0;
    let totalSlides = sliderSlides.length;
    let isAnimating = false;
    let stopInlineVideo = function() {};

    if (!sliderContainer || !sliderTrack || !sliderPrev || !sliderNext || totalSlides === 0) return;
    if (totalSlidesEl) totalSlidesEl.textContent = totalSlides;

    function getCleanData(element, key) {
        const value = (element?.dataset?.[key] || '').trim();
        return /^\[[a-z]+:/i.test(value) ? '' : value;
    }

    async function fetchTencentVodSignature(source) {
        const signApi = getCleanData(source, 'signApi') || '/api/tencent-vod-psign.php';
        const contentId = getCleanData(source, 'contentId');
        const fileId = getCleanData(source, 'fileId');

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

    // ===== 轮播图功??=====
    function updateSlider() {
        if (isAnimating) return;
        isAnimating = true;

        sliderSlides.forEach(slide => slide.classList.remove('active'));
        sliderSlides[currentSlide].classList.add('active');
        sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        thumbnails.forEach((thumb, index) => thumb.classList.toggle('active', index === currentSlide));
        if (currentSlideEl) currentSlideEl.textContent = currentSlide + 1;
        detectCurrentSlideType();
        if (!sliderSlides[currentSlide].querySelector('.video-cover')) {
            stopInlineVideo();
        }

        setTimeout(() => { isAnimating = false; }, 500);
    }

    function nextSlide() {
        if (isAnimating) return;
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlider();
    }

    function prevSlide() {
        if (isAnimating) return;
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateSlider();
    }

    function goToSlide(index) {
        if (isAnimating || index === currentSlide) return;
        currentSlide = index;
        updateSlider();
    }

    sliderNext.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
    sliderPrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });

    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(index); });
    });

    // 触摸滑动
    let touchStartX = 0, touchEndX = 0, isSwiping = false;
    sliderContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        isSwiping = false;
    }, { passive: true });
    sliderContainer.addEventListener('touchmove', () => { isSwiping = true; }, { passive: true });
    sliderContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (!isSwiping) return;
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) nextSlide();
        if (touchEndX > touchStartX + threshold) prevSlide();
    }, { passive: true });

    // 媒体类型指示器
    function updateMediaTypeIndicator(type) {
        if (!mediaTypeEl) return;
        const icon = mediaTypeEl.querySelector('i');
        if (type === 'video') {
            icon.className = 'fas fa-video';
            mediaTypeEl.style.color = '#FF8C00';
            mediaTypeEl.classList.remove('image-type');
        } else {
            icon.className = 'fas fa-image';
            mediaTypeEl.style.color = '#3498db';
            mediaTypeEl.classList.add('image-type');
        }
    }

    function detectCurrentSlideType() {
        const hasVideo = sliderSlides[currentSlide].querySelector('.video-cover');
        updateMediaTypeIndicator(hasVideo ? 'video' : 'image');
    }

    // ===== 轮播图内嵌腾讯云视频播放器 =====
    const videoCovers = document.querySelectorAll('.video-cover');

    if (videoCovers.length > 0) {
        let tcInlinePlayer = null;
        let activeVideoCover = null;
        let isInlineVideoPlaying = false;

        function hasCloudVideo(videoData) {
            return Boolean((videoData.contentId || videoData.fileId) && typeof TCPlayer !== 'undefined');
        }

        function buildTcPlayerOptions(videoData) {
            const options = {
                appID: videoData.appId,
                fileID: videoData.fileId,
                width: '100%',
                height: '100%',
                poster: videoData.posterUrl || '',
                autoplay: false,
                controls: true,
                preload: 'none',
                language: 'zh-CN',
                playsinline: true,
                html5: {
                    nativeControlsForTouch: false
                }
            };

            if (videoData.psign) options.psign = videoData.psign;
            if (videoData.licenseUrl) options.licenseUrl = videoData.licenseUrl;
            if (videoData.licenseKey) options.licenseKey = videoData.licenseKey;

            return options;
        }

        function getVideoData(cover) {
            return {
                posterUrl: cover.dataset.videoPoster || '',
                contentId: getCleanData(cover, 'contentId'),
                signApi: getCleanData(cover, 'signApi'),
                fileId: cover.dataset.fileId || ''
            };
        }

        async function getSignedVideoData(cover) {
            const videoData = getVideoData(cover);
            const signData = await fetchTencentVodSignature(cover);

            return {
                ...videoData,
                appId: String(signData.appId || '').trim(),
                fileId: String(signData.fileId || videoData.fileId || '').trim(),
                psign: String(signData.psign || '').trim(),
                licenseUrl: String(signData.licenseUrl || '').trim(),
                licenseKey: String(signData.licenseKey || '').trim()
            };
        }

        function setCoverPlaying(cover, isPlaying) {
            if (!cover) return;
            if (!isPlaying && !cover.classList.contains('is-video-active')) return;
            isInlineVideoPlaying = isPlaying;
            if (isPlaying) cover.classList.add('is-video-active');
            cover.classList.toggle('is-playing', isPlaying);
            cover.classList.toggle('is-paused', !isPlaying && activeVideoCover === cover);
        }

        function bindPlayerEvents(cover) {
            if (!tcInlinePlayer || tcInlinePlayer._wishPowerInlineEventsBound) return;
            tcInlinePlayer._wishPowerInlineEventsBound = true;

            if (typeof tcInlinePlayer.on === 'function') {
                tcInlinePlayer.on('play', () => setCoverPlaying(cover, true));
                tcInlinePlayer.on('playing', () => setCoverPlaying(cover, true));
                tcInlinePlayer.on('pause', () => setCoverPlaying(cover, false));
                tcInlinePlayer.on('ended', () => setCoverPlaying(cover, false));
                tcInlinePlayer.on('error', () => setCoverPlaying(cover, false));
            }
        }

        async function initInlinePlayer(cover) {
            if (tcInlinePlayer) return tcInlinePlayer;

            const videoData = getVideoData(cover);
            const video = cover.querySelector('.product-tc-video');
            if (!hasCloudVideo(videoData) || !video) return null;

            if (!video.id) {
                video.id = `product-tc-video-${Date.now()}`;
            }
            video.poster = videoData.posterUrl || '';

            const signedVideoData = await getSignedVideoData(cover);
            tcInlinePlayer = TCPlayer(video.id, buildTcPlayerOptions(signedVideoData));
            bindPlayerEvents(cover);

            return tcInlinePlayer;
        }

        stopInlineVideo = function() {
            if (!tcInlinePlayer) return;
            if (typeof tcInlinePlayer.pause === 'function') {
                tcInlinePlayer.pause();
            }
            if (typeof tcInlinePlayer.currentTime === 'function') {
                tcInlinePlayer.currentTime(0);
            }
            if (activeVideoCover) {
                activeVideoCover.classList.remove('is-video-active');
                activeVideoCover.classList.remove('is-playing');
                activeVideoCover.classList.remove('is-paused');
            }
            activeVideoCover = null;
            isInlineVideoPlaying = false;
        }

        async function playInlineVideo(cover) {
            const player = await initInlinePlayer(cover);
            if (!player) return;
            activeVideoCover = cover;
            cover.classList.add('is-video-active');
            cover.classList.add('is-playing');
            cover.classList.remove('is-paused');
            isInlineVideoPlaying = true;

            if (typeof player.play === 'function') {
                Promise.resolve(player.play()).catch(e => {
                    isInlineVideoPlaying = false;
                    cover.classList.remove('is-playing');
                    cover.classList.add('is-paused');
                    console.log('Tencent player play failed:', e);
                });
            }
        }

        videoCovers.forEach(cover => {
            const hitarea = cover.querySelector('.product-video-hitarea');

            if (hitarea) {
                ['touchstart', 'touchmove', 'touchend'].forEach(eventName => {
                    hitarea.addEventListener(eventName, function(e) {
                        e.stopPropagation();
                    }, { passive: true });
                });

                hitarea.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!cover.classList.contains('is-video-active')) {
                        playInlineVideo(cover).catch(error => console.error('Product inline video init failed:', error));
                    }
                });
            }

            cover.addEventListener('click', function(e) {
                if (this.classList.contains('is-video-active')) return;
                e.preventDefault();
                e.stopPropagation();
                playInlineVideo(this).catch(error => console.error('Product inline video init failed:', error));
            });
        });
    }

    // ===== 动态更新幻灯片总数 =====
    function updateTotalSlides() {
        const newTotal = document.querySelectorAll('.slider-slide').length;
        if (totalSlidesEl) totalSlidesEl.textContent = newTotal;
        totalSlides = newTotal;
    }
    updateTotalSlides();

    // ===== Tab切换功能 =====
    const tabNavItems = document.querySelectorAll('.tab-nav li');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function setupEmptyTabMessages() {
        tabPanes.forEach(pane => {
            if (pane.querySelector('.tab-empty-message')) return;

            const clone = pane.cloneNode(true);
            clone.querySelectorAll('h1, h2, h3, h4, h5, h6, .tab-empty-message, script, style').forEach(el => el.remove());

            const text = (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
            const hasMedia = Boolean(clone.querySelector('img, video, iframe, embed, object'));
            const hasTableData = Array.from(clone.querySelectorAll('td, th')).some(cell => cell.textContent.trim() !== '');

            if (text || hasMedia || hasTableData) return;

            const message = document.createElement('div');
            message.className = 'tab-empty-message';
            message.innerHTML = '<i class="fas fa-info-circle"></i><span>暂无相关内容</span>';
            pane.appendChild(message);
        });
    }

    setupEmptyTabMessages();

    tabNavItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabNavItems.forEach(nav => { nav.classList.remove('active'); nav.setAttribute('aria-selected', 'false'); });
            this.classList.add('active'); this.setAttribute('aria-selected', 'true');
            tabPanes.forEach(pane => { pane.classList.remove('active'); pane.setAttribute('aria-hidden', 'true'); });
            const activePane = document.getElementById(tabId);
            if (activePane) { activePane.classList.add('active'); activePane.setAttribute('aria-hidden', 'false'); }
        });
    });

    // ===== FAQ功能 =====
    const faqItems = document.querySelectorAll('.faq-item-tab');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const answer = item.querySelector('.faq-answer-content-tab');
            const answerText = item.querySelector('.faq-answer-text');
            const moreButton = item.querySelector('.faq-more-toggle');
            if (!answer || !answerText || !moreButton) return;

            if (answerText.scrollHeight > answerText.clientHeight + 1) {
                moreButton.hidden = false;
                moreButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const isExpanded = answer.classList.toggle('is-expanded');
                    moreButton.textContent = isExpanded ? 'Less' : 'More';
                    moreButton.setAttribute('aria-expanded', String(isExpanded));
                });
                moreButton.setAttribute('aria-expanded', 'false');
            }
        });

        // 默认展开第一项
        faqItems[0].classList.add('active');
        
        faqItems.forEach((item, index) => {
            const question = item.querySelector('.faq-question-tab');
            
            question.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 如果点击的不是当前展开的，关闭其他
                if (!item.classList.contains('active')) {
                    faqItems.forEach(other => {
                        other.classList.remove('active');
                    });
                }
                
                // 切换当前项的展开/折叠
                item.classList.toggle('active');
            });
        });
    }

    // ===== 图片放大器（支持动态图??+ 轮播图图片）=====
    const lightbox = document.getElementById('lightboxOverlay');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');

    // 1. 轮播图图片点击放大（排除视频封面）
    document.querySelectorAll('.slider-image').forEach(img => {
        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 防止冒泡影响其他事件
            lightboxImg.src = this.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // 2. 产品描述区域内的图片点击放大（事件委托）
    document.querySelector('.product-description')?.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            lightboxImg.src = e.target.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    // 3. 保留原有??.zoomable 监听（兼容手动添加类的情况）
    document.querySelectorAll('.zoomable').forEach(img => {
        img.addEventListener('click', function() {
            lightboxImg.src = this.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
    });

    function setupSidebarShuttles() {
        document.querySelectorAll('[data-shuttle]').forEach(slider => {
            const track = slider.querySelector('.np-video-shuttle-track');
            const allItems = Array.from(slider.querySelectorAll('.np-video-shuttle-card'));
            const maxItems = parseInt(slider.dataset.max || allItems.length, 10);

            allItems.forEach((item, index) => {
                if (index >= maxItems) item.remove();
            });

            const items = Array.from(slider.querySelectorAll('.np-video-shuttle-card'));
            const prevBtn = slider.querySelector('.np-video-shuttle-prev');
            const nextBtn = slider.querySelector('.np-video-shuttle-next');
            if (!track || items.length === 0) return;

            let currentIndex = 0;
            let startX = 0;
            let startY = 0;
            let isTouching = false;

            function updateShuttle() {
                track.style.transform = `translate3d(${-currentIndex * 100}%, 0, 0)`;
            }

            function go(delta) {
                currentIndex = (currentIndex + delta + items.length) % items.length;
                updateShuttle();
            }

            prevBtn?.addEventListener('click', () => go(-1));
            nextBtn?.addEventListener('click', () => go(1));

            slider.addEventListener('touchstart', event => {
                const touch = event.touches[0];
                if (!touch) return;
                startX = touch.clientX;
                startY = touch.clientY;
                isTouching = true;
            }, { passive: true });

            slider.addEventListener('touchend', event => {
                if (!isTouching) return;
                isTouching = false;
                const touch = event.changedTouches[0];
                if (!touch) return;

                const diffX = touch.clientX - startX;
                const diffY = touch.clientY - startY;
                if (Math.abs(diffX) < 35 || Math.abs(diffX) < Math.abs(diffY)) return;

                go(diffX < 0 ? 1 : -1);
            }, { passive: true });

            updateShuttle();
        });
    }

    function setupRelatedProductsCarousel() {
        document.querySelectorAll('[data-related-products]').forEach(slider => {
            const track = slider.querySelector('.related-products-track');
            const allItems = Array.from(slider.querySelectorAll('.related-products-slide'));
            const maxItems = parseInt(slider.dataset.max || allItems.length, 10);

            allItems.forEach((item, index) => {
                if (index >= maxItems) item.remove();
            });

            const items = Array.from(slider.querySelectorAll('.related-products-slide'));
            const prevBtn = slider.querySelector('.related-products-prev');
            const nextBtn = slider.querySelector('.related-products-next');
            if (!track || items.length === 0) return;

            let currentIndex = 0;
            let startX = 0;
            let startY = 0;
            let isTouching = false;

            function updateCarousel() {
                track.style.transform = `translate3d(${-currentIndex * 100}%, 0, 0)`;
            }

            function go(delta) {
                currentIndex = (currentIndex + delta + items.length) % items.length;
                updateCarousel();
            }

            prevBtn?.addEventListener('click', event => {
                event.preventDefault();
                go(-1);
            });
            nextBtn?.addEventListener('click', event => {
                event.preventDefault();
                go(1);
            });

            slider.addEventListener('touchstart', event => {
                const touch = event.touches[0];
                if (!touch) return;
                startX = touch.clientX;
                startY = touch.clientY;
                isTouching = true;
            }, { passive: true });

            slider.addEventListener('touchend', event => {
                if (!isTouching) return;
                isTouching = false;
                const touch = event.changedTouches[0];
                if (!touch) return;

                const diffX = touch.clientX - startX;
                const diffY = touch.clientY - startY;
                if (Math.abs(diffX) < 35 || Math.abs(diffX) < Math.abs(diffY)) return;

                go(diffX < 0 ? 1 : -1);
            }, { passive: true });

            updateCarousel();
        });
    }

    function setupVideoShuttlePlayers() {
        const players = new WeakMap();
        let currentCard = null;

        function getData(element, key) {
            const value = (element?.dataset?.[key] || '').trim();
            return /^\[[a-z]+:/i.test(value) ? '' : value;
        }

        function hasCloudVideo(card) {
            return Boolean(card && (getData(card, 'contentId') || getData(card, 'fileId')) && typeof TCPlayer !== 'undefined');
        }

        function ensureVideo(card) {
            const cover = card.querySelector('.np-video-shuttle-cover');
            if (!cover) return null;

            let video = card.querySelector('.np-video-shuttle-player');
            if (video) return video;

            const poster = card.querySelector('.np-video-shuttle-poster');
            video = document.createElement('video');
            video.className = 'np-video-shuttle-player';
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'none');
            video.setAttribute('poster', getData(card, 'poster') || poster?.getAttribute('src') || '');
            video.setAttribute('aria-label', getData(card, 'title') || poster?.getAttribute('alt') || '');
            cover.insertBefore(video, cover.firstChild);
            return video;
        }

        async function getSignedCardData(card) {
            const signData = await fetchTencentVodSignature(card);
            return {
                appId: String(signData.appId || '').trim(),
                fileId: String(signData.fileId || getData(card, 'fileId') || '').trim(),
                psign: String(signData.psign || '').trim(),
                licenseUrl: String(signData.licenseUrl || '').trim(),
                licenseKey: String(signData.licenseKey || '').trim()
            };
        }

        async function getPlayer(card) {
            if (!hasCloudVideo(card)) return null;
            if (players.has(card)) return players.get(card);

            const video = ensureVideo(card);
            if (!video) return null;
            if (!video.id) {
                video.id = `product-video-shuttle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }

            const videoData = await getSignedCardData(card);
            const options = {
                appID: videoData.appId,
                fileID: videoData.fileId,
                psign: videoData.psign,
                width: '100%',
                height: '100%',
                poster: video.getAttribute('poster') || '',
                autoplay: false,
                controls: true,
                preload: 'none'
            };

            if (videoData.licenseUrl) options.licenseUrl = videoData.licenseUrl;
            if (videoData.licenseKey) options.licenseKey = videoData.licenseKey;

            const player = TCPlayer(video.id, options);
            players.set(card, player);
            return player;
        }

        function pauseCard(card) {
            const player = players.get(card);
            const video = card.querySelector('.np-video-shuttle-player');
            if (player && typeof player.pause === 'function') player.pause();
            else if (video && typeof video.pause === 'function') video.pause();
        }

        async function playCard(card) {
            const icon = card.querySelector('.np-video-shuttle-play i');
            const detailLink = card.querySelector('.np-video-shuttle-title a')?.href;

            if (!hasCloudVideo(card)) {
                if (detailLink) window.location.href = detailLink;
                return;
            }

            if (currentCard && currentCard !== card) {
                pauseCard(currentCard);
                currentCard.classList.remove('is-playing');
                const oldIcon = currentCard.querySelector('.np-video-shuttle-play i');
                if (oldIcon) oldIcon.className = 'fas fa-play';
            }

            const player = await getPlayer(card);
            const video = card.querySelector('.np-video-shuttle-player');
            const playPromise = player ? player.play() : video?.play();
            card.classList.add('is-playing');
            if (icon) icon.className = 'fas fa-pause';
            currentCard = card;

            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    card.classList.remove('is-playing');
                    if (icon) icon.className = 'fas fa-play';
                });
            }
        }

        document.querySelectorAll('.np-video-shuttle-card').forEach(card => {
            const playBtn = card.querySelector('.np-video-shuttle-play');
            const cover = card.querySelector('.np-video-shuttle-cover');

            playBtn?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                playCard(card).catch(error => console.error('Product shuttle video init failed:', error));
            });

            cover?.addEventListener('click', event => {
                if (card.classList.contains('is-playing')) return;
                event.preventDefault();
                event.stopPropagation();
                playCard(card).catch(error => console.error('Product shuttle video init failed:', error));
            });
        });
    }

    setupSidebarShuttles();
    setupRelatedProductsCarousel();
    setupVideoShuttlePlayers();

    // 初始化轮播图
    updateSlider();
});

// ===== 性能优化与移动端检??=====
window.addEventListener('load', function() {
    document.body.classList.add('page-loaded');
});

(function mobileDetect() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile-device');
    }
})();
