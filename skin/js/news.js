(function() {
    'use strict';

    // 新闻文章页面专用功能 —— 自执行，不依赖全局初始化

    // 如果页面没有新闻文章相关元素，则不执行
    if (!document.querySelector('.np-article-title')) return;

    // ==================== 分享按钮功能 ====================
    function setupShareButtons() {
        const shareButtons = document.querySelectorAll('.np-share-btn');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
    
        shareButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const shareType = button.dataset.share;
                if (shareType === 'copy-link') return;
    
                const url = window.location.href;
                const title = document.querySelector('.np-article-title')?.textContent || '';
                const excerpt = document.querySelector('.np-article-excerpt p')?.textContent || '';
    
                // 对于微信和WhatsApp，不触发原生分享（使用专用链接）
                if (navigator.share && shareType !== 'wechat' && shareType !== 'whatsapp') {
                    navigator.share({ title, text: excerpt, url }).catch(() => {});
                } else {
                    let shareUrl = '';
                    switch (shareType) {
                        case 'twitter':
                            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
                            break;
                        case 'facebook':
                            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                            break;
                        case 'linkedin':
                            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                            break;
                        case 'whatsapp':
                            shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`;
                            break;
                        case 'wechat':
                            alert('请使用微信扫描二维码分享'); // 简化处理
                            return;
                    }
                    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
                }
            });
        });
    
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                    copyLinkBtn.classList.add('copied');
                    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i><span class="np-tooltip">已复制</span>';
                    setTimeout(() => {
                        copyLinkBtn.classList.remove('copied');
                        copyLinkBtn.innerHTML = '<i class="fas fa-link"></i><span class="np-tooltip">复制链接</span>';
                    }, 2000);
                }).catch(() => {
                    const temp = document.createElement('input');
                    document.body.appendChild(temp);
                    temp.value = url;
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                    copyLinkBtn.classList.add('copied');
                    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i><span class="np-tooltip">已复制</span>';
                    setTimeout(() => {
                        copyLinkBtn.classList.remove('copied');
                        copyLinkBtn.innerHTML = '<i class="fas fa-link"></i><span class="np-tooltip">复制链接</span>';
                    }, 2000);
                });
            });
        }
    }

    // ==================== 图片查看器（点击放大） ====================
    function setupImageZoom() {
        const overlay = document.getElementById('imageViewerOverlay');
        const viewerImg = document.getElementById('imageViewerImg');
        const closeBtn = document.getElementById('imageViewerClose');
        if (!overlay || !viewerImg || !closeBtn) return;

        const articleContent = document.querySelector('.np-article-content');
        if (articleContent) {
            articleContent.addEventListener('click', (e) => {
                const target = e.target;
                if (target.tagName === 'IMG') {
                    e.preventDefault();
                    viewerImg.src = target.src;
                    viewerImg.alt = target.alt || '图片预览';
                    overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    function setupContentShuttles() {
        document.querySelectorAll('[data-shuttle]').forEach(slider => {
            const track = slider.querySelector('.np-product-shuttle-track, .np-video-shuttle-track');
            const allItems = Array.from(slider.querySelectorAll('.np-product-shuttle-card, .np-video-shuttle-card'));
            const maxItems = parseInt(slider.dataset.max || allItems.length, 10);

            allItems.forEach((item, index) => {
                if (index >= maxItems) item.remove();
            });

            const items = Array.from(slider.querySelectorAll('.np-product-shuttle-card, .np-video-shuttle-card'));
            const prevBtn = slider.querySelector('.np-product-shuttle-prev, .np-video-shuttle-prev');
            const nextBtn = slider.querySelector('.np-product-shuttle-next, .np-video-shuttle-next');
            if (!track || items.length === 0) return;

            let currentIndex = 0;
            let startX = 0;
            let startY = 0;
            let isTouching = false;

            function updateSlider() {
                track.style.transform = `translate3d(${-currentIndex * 100}%, 0, 0)`;
            }

            function go(delta) {
                currentIndex = (currentIndex + delta + items.length) % items.length;
                updateSlider();
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

            updateSlider();
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
            return Boolean(card && getData(card, 'appId') && getData(card, 'fileId') && getData(card, 'psign') && typeof TCPlayer !== 'undefined');
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
            video.dataset.appId = getData(card, 'appId');
            video.dataset.fileId = getData(card, 'fileId');
            video.dataset.psign = getData(card, 'psign');
            video.dataset.licenseUrl = getData(card, 'licenseUrl');
            video.dataset.licenseKey = getData(card, 'licenseKey');
            cover.insertBefore(video, cover.firstChild);
            return video;
        }

        function getPlayer(card) {
            if (!hasCloudVideo(card)) return null;
            if (players.has(card)) return players.get(card);

            const video = ensureVideo(card);
            if (!video) return null;
            if (!video.id) {
                video.id = `np-video-shuttle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }

            const options = {
                appID: getData(card, 'appId'),
                fileID: getData(card, 'fileId'),
                width: '100%',
                height: '100%',
                poster: video.getAttribute('poster') || '',
                autoplay: false,
                controls: true,
                preload: 'none'
            };

            const psign = getData(card, 'psign');
            const licenseUrl = getData(card, 'licenseUrl');
            const licenseKey = getData(card, 'licenseKey');

            if (psign) options.psign = psign;
            if (licenseUrl) options.licenseUrl = licenseUrl;
            if (licenseKey) options.licenseKey = licenseKey;

            const player = TCPlayer(video.id, options);
            players.set(card, player);
            return player;
        }

        function pauseCard(card) {
            const video = card.querySelector('.np-video-shuttle-player');
            const player = players.get(card);
            if (player && typeof player.pause === 'function') player.pause();
            else if (video && typeof video.pause === 'function') video.pause();
        }

        function playCard(card) {
            const icon = card.querySelector('.np-video-shuttle-play i');
            if (!hasCloudVideo(card)) {
                console.warn('Video fields missing. Check appID, fileID, psign and TCPlayer.', {
                    appID: getData(card, 'appId'),
                    fileID: getData(card, 'fileId'),
                    psign: getData(card, 'psign'),
                    hasTCPlayer: typeof TCPlayer !== 'undefined'
                });
                return;
            }

            if (currentCard && currentCard !== card) {
                pauseCard(currentCard);
                currentCard.classList.remove('is-playing');
                const oldIcon = currentCard.querySelector('.np-video-shuttle-play i');
                if (oldIcon) oldIcon.className = 'fas fa-play';
            }

            const player = getPlayer(card);
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
                playCard(card);
            });

            cover?.addEventListener('click', event => {
                if (card.classList.contains('is-playing')) return;
                event.preventDefault();
                event.stopPropagation();
                playCard(card);
            });
        });
    }

    // ==================== 模拟阅读量（仅用于演示） ====================
    function simulateViewCount() {
        const viewEl = document.getElementById('viewCount');
        if (!viewEl) return;
        const articleId = '2024-innovation-award';
        let count = localStorage.getItem(`article_${articleId}_views`) || 1234;
        count = parseInt(count, 10) + 1;
        localStorage.setItem(`article_${articleId}_views`, count);
        viewEl.textContent = count.toLocaleString();
    }

    // ==================== 页面初始化 ====================
    function initNewsPage() {
        setupShareButtons();
        setupImageZoom();
        setupContentShuttles();
        setupVideoShuttlePlayers();
        simulateViewCount();

        // 图片懒加载完成后的标记（可选）
        if ('loading' in HTMLImageElement.prototype) {
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.addEventListener('load', function() {
                    this.classList.add('loaded');
                });
            });
        }
    }

    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNewsPage);
    } else {
        initNewsPage(); // DOM 已经可用
    }
})();
