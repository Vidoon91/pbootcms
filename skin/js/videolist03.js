document.addEventListener('DOMContentLoaded', function() {
    const filterContainer = document.getElementById('videoFilterContainer');
    const filterToggle = document.getElementById('videoFilterToggle');
    if (filterContainer && filterToggle) {
        const filterStateKey = `videoFilterExpanded:${window.location.pathname}`;
        const icon = filterToggle.querySelector('.video-filter-toggle i');

        function setFilterExpanded(isExpanded) {
            filterContainer.classList.toggle('collapsed', !isExpanded);
            sessionStorage.setItem(filterStateKey, isExpanded ? '1' : '0');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        }

        const storedFilterState = sessionStorage.getItem(filterStateKey);
        const defaultExpanded = window.innerWidth > 768;
        setFilterExpanded(storedFilterState === null ? defaultExpanded : storedFilterState === '1');

        filterToggle.addEventListener('click', () => {
            setFilterExpanded(filterContainer.classList.contains('collapsed'));
        });
    }
    
    const filterTags = document.querySelectorAll('.filter-tag');
    const filterTitles = document.querySelectorAll('.filter-row-title[data-clear-filter]');
    const resetBtn = document.getElementById('filterReset');
    const countSpan = document.getElementById('selectedFiltersCount');
    let activeCount = document.querySelectorAll('.filter-tag.active:not(.filter-tag-all)').length;
    
    function updateCount() {
        if (countSpan) countSpan.innerText = activeCount;
    }
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            if (tag.tagName.toLowerCase() === 'a' && tag.getAttribute('href')) return;
            if (tag.classList.contains('active')) {
                tag.classList.remove('active');
                activeCount--;
            } else {
                tag.classList.add('active');
                activeCount++;
            }
            updateCount();
        });
    });

    filterTitles.forEach(title => {
        title.addEventListener('click', () => {
            const row = title.closest('.filter-row');
            const allLink = row ? row.querySelector('.filter-tag-all[href]') : null;
            if (allLink) window.location.href = allLink.href;
        });
    });
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const resetUrl = resetBtn.getAttribute('data-reset-url');
            if (resetUrl) {
                window.location.href = resetUrl;
                return;
            }
            filterTags.forEach(t => t.classList.remove('active'));
            activeCount = 0;
            updateCount();
        });
    }
    updateCount();
    document.querySelectorAll('.nav-link[href*="video"]').forEach(link => link.classList.add('active'));
    document.querySelectorAll('.sidebar-item a[href*="videolist"]').forEach(link => {
        if (link.parentElement) link.parentElement.classList.add('active');
    });
    document.querySelectorAll('.tab-item a[href*="videolist"]').forEach(link => {
        if (link.parentElement) link.parentElement.classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const list = document.getElementById('verticalVideoList');
    const cards = Array.from(document.querySelectorAll('[data-short-video-card]'));
    const overlay = document.getElementById('shortFeedOverlay');
    const wrapper = document.getElementById('shortFeedWrapper');
    const recommendList = document.getElementById('shortFeedRecommendList');
    const closeBtn = document.getElementById('shortFeedClose');
    const prevBtn = document.getElementById('shortFeedPrev');
    const nextBtn = document.getElementById('shortFeedNext');
    const signApi = '/api/tencent-vod-psign.php';
    const siteLogo = overlay?.dataset.siteLogo || '/skin/images/default-avatar.svg';

    if (!cards.length || !overlay || !wrapper) return;

    let swiper = null;
    let activePlayer = null;
    let activePlayerId = '';
    let activeSlideIndex = -1;
    let playToken = 0;
    let slidesRendered = false;
    let listUrl = window.location.href;
    let isOpen = false;
    const videos = cards.map((card, index) => {
        const extra = card.querySelector('.short-video-card-extra');
        const mobileCopyNode = extra?.querySelector('.short-video-mobile-copy') || null;
        const detailNode = extra?.querySelector('.short-video-desktop-detail') || null;
        const descriptionNode = extra?.querySelector('.short-video-description') || null;
        const productNode = extra?.querySelector('.short-video-product');

        return {
            index,
            id: card.dataset.contentId || '',
            url: card.dataset.detailUrl || card.querySelector('a[href]')?.href || window.location.href,
            title: card.dataset.title || card.querySelector('.vertical-video-title')?.textContent.trim() || 'Short video',
            poster: card.dataset.poster || card.querySelector('.vertical-video-cover')?.getAttribute('src') || '',
            category: card.dataset.category || '',
            duration: card.dataset.duration || '',
            date: card.dataset.date || '',
            visits: card.dataset.visits || '0',
            description: descriptionNode?.textContent.trim() || card.dataset.description || '',
            licenseUrl: card.dataset.licenseUrl || '',
            licenseKey: card.dataset.licenseKey || '',
            mobileCopyNode,
            detailNode,
            productNode
        };
    });

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function renderSlides() {
        if (slidesRendered) return;
        wrapper.innerHTML = '';

        videos.forEach(video => {
            const videoId = `shortFeedVideo_${video.id || video.index}`;
            const slide = document.createElement('div');
            slide.className = 'swiper-slide short-feed-slide';
            slide.dataset.index = String(video.index);
            slide.dataset.contentId = video.id || '';
            slide.innerHTML = `
                <div class="video-card-container">
                    <div class="video-portrait">
                        <div class="short-feed-mobile-topbar">
                            <div class="short-feed-mobile-author">
                                <img src="${escapeHtml(siteLogo)}" alt="WishPower" loading="lazy">
                                <div class="short-feed-mobile-author-text">
                                    <strong>WishPower</strong>
                                    <span>${escapeHtml(video.visits)} views | ${escapeHtml(video.category || 'Video')}</span>
                                </div>
                            </div>
                            <button class="short-feed-mobile-close" type="button" aria-label="Close video"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="short-feed-video-box">
                            <video
                                id="${escapeHtml(videoId)}"
                                class="short-feed-video video-player"
                                playsinline
                                webkit-playsinline
                                x5-playsinline
                                preload="none"
                                poster="${escapeHtml(video.poster)}">
                            </video>
                            <div class="short-feed-loading" hidden>Loading...</div>
                            <div class="short-feed-error" hidden>Video failed to load.</div>
                        </div>
                        <button class="center-play-btn" type="button"><i class="fas fa-play"></i></button>
                        <div class="video-info-overlay expanded">
                            <div class="short-feed-mobile-copy-slot"></div>
                            <div class="video-progress-wrap">
                                <div class="video-progress-track"><div class="video-progress-bar"></div></div>
                                <span class="video-time"><span class="current-time">00:00</span>/<span class="duration">${escapeHtml(video.duration || '00:00')}</span></span>
                                <button class="fullscreen-btn sound-control-btn" type="button" aria-label="Toggle sound"><i class="fas fa-volume-up"></i></button>
                            </div>
                        </div>
                        <div class="mobile-slide-sidebar">
                            <button class="m-avatar-circle m-home-btn" type="button" aria-label="Home"><i class="fas fa-home"></i></button>
                            <button class="m-action-btn m-intro-btn" type="button"><i class="fas fa-info-circle"></i><span>\u7b80\u4ecb</span></button>
                            <button class="m-action-btn m-quote-btn" type="button"><i class="fas fa-file-signature"></i><span>\u8be2\u4ef7</span></button>
                            <button class="m-action-btn m-ai-btn" type="button"><i class="fas fa-headset"></i><span>AI\u5ba2\u670d</span></button>
                        </div>
                        <div class="short-feed-mobile-bottombar">
                            <div class="short-feed-mobile-comment">
                                <input type="text" class="short-feed-mobile-comment-input" data-mobile-comment-input placeholder="\u8bf4\u70b9\u4ec0\u4e48...">
                                <button type="button" class="short-feed-mobile-comment-submit" data-mobile-comment-submit>\u53d1\u5e03</button>
                            </div>
                            <button class="short-feed-mobile-emoji" type="button" aria-label="Comment"><i class="far fa-comment"></i></button>
                            <button class="short-feed-mobile-action m-cart-btn" type="button" aria-label="Product"><i class="fas fa-shopping-cart"></i></button>
                            <button class="short-feed-mobile-action m-like-btn" type="button" aria-label="Like"><i class="fas fa-heart"></i></button>
                            <button class="short-feed-mobile-action m-share-btn" type="button" aria-label="Share"><i class="fas fa-share"></i></button>
                        </div>
                    </div>
                    <div class="short-feed-detail-slot"></div>
                </div>
            `;

            const mobileCopySlot = slide.querySelector('.short-feed-mobile-copy-slot');
            if (mobileCopySlot && video.mobileCopyNode) {
                mobileCopySlot.innerHTML = video.mobileCopyNode.innerHTML;
                const dateNode = document.createElement('div');
                dateNode.className = 'video-publish-date';
                dateNode.textContent = video.date || '';
                mobileCopySlot.querySelector('.video-tags')?.insertAdjacentElement('afterend', dateNode);
            }

            const detailSlot = slide.querySelector('.short-feed-detail-slot');
            if (detailSlot) {
                if (video.detailNode) {
                    const detailNode = video.detailNode.cloneNode(true);
                    detailNode.classList.add('short-feed-detail-card');
                    detailSlot.replaceWith(detailNode);
                } else {
                    detailSlot.remove();
                }
            }

            wrapper.appendChild(slide);
        });

        renderRecommendations();
        slidesRendered = true;
    }

    function renderRecommendations(activeVideo) {
        if (!recommendList) return;
        recommendList.innerHTML = '';

        const fragment = document.createDocumentFragment();
        videos.forEach(video => {
            const item = document.createElement('button');
            item.className = 'short-feed-rec-item';
            item.type = 'button';
            item.dataset.index = String(video.index);
            if (activeVideo && activeVideo.index === video.index) {
                item.classList.add('active');
            }
            item.innerHTML = `
                <span class="short-feed-rec-thumb">
                    <img src="${escapeHtml(video.poster)}" alt="${escapeHtml(video.title)}" loading="lazy">
                    <span class="short-feed-rec-play"><i class="fas fa-play"></i></span>
                </span>
                <span class="short-feed-rec-info">
                    <strong>${escapeHtml(video.title)}</strong>
                    <span><i class="fas fa-eye"></i> ${escapeHtml(video.visits)} views</span>
                </span>
            `;
            fragment.appendChild(item);
        });

        recommendList.appendChild(fragment);
    }
    function getActiveIndex() {
        if (!swiper) return 0;
        return Number(swiper.slides[swiper.activeIndex]?.dataset.index || 0);
    }

    function updateUrl(video, replace) {
        if (!video?.url) return;

        const targetUrl = new URL(video.url, window.location.href).href;
        const state = {
            shortFeed: true,
            contentId: String(video.id || ''),
            listUrl
        };

        if (replace) {
            history.replaceState(state, '', targetUrl);
            return;
        }

        history.pushState(state, '', targetUrl);
    }

    function showSlideMessage(slide, type, visible) {
        const node = slide?.querySelector(type === 'error' ? '.short-feed-error' : '.short-feed-loading');
        if (node) node.hidden = !visible;
    }

    function setSlidePlaying(slide, playing) {
        const card = slide?.querySelector('.video-card-container');
        if (card) card.classList.toggle('playing', !!playing);
    }

    function formatVideoTime(seconds) {
        const value = Math.max(0, Number(seconds) || 0);
        const mins = Math.floor(value / 60);
        const secs = Math.floor(value % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function readPlayerNumber(methodName) {
        if (!activePlayer || typeof activePlayer[methodName] !== 'function') return 0;
        const value = Number(activePlayer[methodName]());
        return Number.isFinite(value) ? value : 0;
    }

    function syncSlideProgress(slide) {
        if (!slide || !activePlayer) return;
        const current = readPlayerNumber('currentTime');
        const duration = readPlayerNumber('duration');
        const percent = duration > 0 ? Math.min(100, Math.max(0, current / duration * 100)) : 0;
        const bar = slide.querySelector('.video-progress-bar');
        const currentNode = slide.querySelector('.current-time');
        const durationNode = slide.querySelector('.duration');
        if (bar) bar.style.width = `${percent}%`;
        if (currentNode) currentNode.textContent = formatVideoTime(current);
        if (durationNode && duration > 0) durationNode.textContent = formatVideoTime(duration);
    }

    function toggleActiveSound(button) {
        if (!activePlayer || typeof activePlayer.muted !== 'function') return;
        const nextMuted = !activePlayer.muted();
        activePlayer.muted(nextMuted);
        const icon = button?.querySelector('i');
        if (icon) {
            icon.className = nextMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }
    }

    function seekActiveFromPointer(event, track) {
        if (!activePlayer || typeof activePlayer.currentTime !== 'function' || typeof activePlayer.duration !== 'function') return;
        const rect = track.getBoundingClientRect();
        if (!rect.width) return;
        const duration = Number(activePlayer.duration()) || 0;
        if (duration <= 0) return;
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        activePlayer.currentTime(duration * ratio);
        const slide = wrapper.querySelector(`.short-feed-slide[data-index="${activeSlideIndex}"]`);
        syncSlideProgress(slide);
    }

    function clearPlayingState() {
        wrapper.querySelectorAll('.video-card-container').forEach(card => card.classList.remove('playing'));
    }

    function pauseActivePlayer() {
        if (activePlayer && typeof activePlayer.pause === 'function') {
            try {
                activePlayer.pause();
            } catch (error) {
                console.warn('Pause short feed player failed:', error);
            }
        }

        clearPlayingState();
    }

    function createVideoMarkup(video) {
        const videoId = `shortFeedVideo_${video.id || video.index}`;
        return `
            <video
                id="${escapeHtml(videoId)}"
                class="short-feed-video video-player"
                playsinline
                webkit-playsinline
                x5-playsinline
                preload="none"
                poster="${escapeHtml(video.poster)}">
            </video>
            <div class="short-feed-loading" hidden>\u89c6\u9891\u52a0\u8f7d\u4e2d...</div>
            <div class="short-feed-error" hidden>\u89c6\u9891\u6388\u6743\u83b7\u53d6\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5</div>
        `;
    }

    function prepareVideoElement(slide, video) {
        const box = slide?.querySelector('.short-feed-video-box');
        if (!box) return null;
        box.innerHTML = createVideoMarkup(video);
        box.classList.remove('is-portrait-video');
        return box.querySelector('video');
    }

    function updateVideoPresentationMode(videoElement, slide) {
        const box = slide?.querySelector('.short-feed-video-box');
        if (!box || !videoElement) return;

        const videoWidth = Number(videoElement.videoWidth) || 0;
        const videoHeight = Number(videoElement.videoHeight) || 0;
        const isPortraitVideo = videoHeight > videoWidth;

        box.classList.toggle('is-portrait-video', isPortraitVideo);
    }

    function destroyActivePlayer() {
        playToken++;
        pauseActivePlayer();

        if (activePlayer && typeof activePlayer.dispose === 'function') {
            try {
                activePlayer.dispose();
            } catch (error) {
                console.error('Destroy short feed player failed:', error);
            }
        }

        activePlayer = null;
        activePlayerId = '';
        activeSlideIndex = -1;
    }

    async function fetchPsign(contentId) {
        const response = await fetch(`${signApi}?contentId=${encodeURIComponent(contentId)}`, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        });
        const result = await response.json();
        if (!response.ok || !result || Number(result.code) !== 0 || !result.data) {
            throw new Error(result?.message || `Signature request failed: ${response.status}`);
        }
        return result.data;
    }

    async function playActiveSlide() {
        if (!isOpen) return;

        const index = getActiveIndex();
        const video = videos[index];
        const slide = wrapper.querySelector(`.short-feed-slide[data-index="${index}"]`);

        if (!video || !slide || !video.id) return;

        if (activePlayer && activeSlideIndex === index && activePlayerId) {
            if (
                typeof activePlayer.paused === 'function' &&
                activePlayer.paused() &&
                typeof activePlayer.play === 'function'
            ) {
                const result = activePlayer.play();

                if (result && typeof result.then === 'function') {
                    result
                        .then(() => setSlidePlaying(slide, true))
                        .catch(error => {
                            setSlidePlaying(slide, false);
                            console.warn('Short feed play failed:', error);
                        });
                } else {
                    setSlidePlaying(slide, true);
                }
            }

            return;
        }

        destroyActivePlayer();

        const videoElement = prepareVideoElement(slide, video);
        if (!videoElement) return;

        const playerId = videoElement.id;
        const currentToken = ++playToken;

        showSlideMessage(slide, 'error', false);
        showSlideMessage(slide, 'loading', true);

        try {
            if (typeof TCPlayer === 'undefined') {
                throw new Error('TCPlayer SDK not loaded');
            }

            const signData = await fetchPsign(video.id);

            if (
                currentToken !== playToken ||
                !isOpen ||
                getActiveIndex() !== index
            ) {
                return;
            }

            if (!signData.appId || !signData.fileId || !signData.psign) {
                throw new Error('Signature payload missing appId, fileId or psign');
            }

            activePlayer = TCPlayer(playerId, {
                appID: String(signData.appId),
                fileID: String(signData.fileId),
                psign: String(signData.psign),
                licenseUrl: String(signData.licenseUrl || video.licenseUrl || ''),
                licenseKey: String(signData.licenseKey || video.licenseKey || ''),
                width: '100%',
                height: '100%',
                controls: false,
                autoplay: true,
                muted: false,
                playsinline: true,
                preload: 'none'
            });

            activePlayerId = playerId;
            activeSlideIndex = index;

            activePlayer.ready(function() {
                if (
                    currentToken !== playToken ||
                    !activePlayer ||
                    !isOpen ||
                    activeSlideIndex !== index
                ) {
                    return;
                }

                showSlideMessage(slide, 'loading', false);

                const playResult = activePlayer.play();

                if (playResult && typeof playResult.then === 'function') {
                    playResult
                        .then(() => setSlidePlaying(slide, true))
                        .catch(error => {
                            setSlidePlaying(slide, false);
                            console.warn('Short feed autoplay was blocked:', error);
                        });
                } else {
                    setSlidePlaying(slide, true);
                }
            });

            if (typeof activePlayer.on === 'function') {
                activePlayer.on('play', () => {
                    if (
                        currentToken === playToken &&
                        isOpen &&
                        activeSlideIndex === index
                    ) {
                        setSlidePlaying(slide, true);
                    }
                });

                activePlayer.on('playing', () => {
                    if (
                        currentToken === playToken &&
                        isOpen &&
                        activeSlideIndex === index
                    ) {
                        setSlidePlaying(slide, true);
                    }
                });

                activePlayer.on('timeupdate', () => {
                    if (
                        currentToken === playToken &&
                        isOpen &&
                        activeSlideIndex === index
                    ) {
                        syncSlideProgress(slide);
                    }
                });

                activePlayer.on('durationchange', () => {
                    if (
                        currentToken === playToken &&
                        isOpen &&
                        activeSlideIndex === index
                    ) {
                        syncSlideProgress(slide);
                    }
                });

                activePlayer.on('loadedmetadata', () => {
                    if (
                        currentToken !== playToken ||
                        !isOpen ||
                        activeSlideIndex !== index
                    ) {
                        return;
                    }

                    syncSlideProgress(slide);
                    updateVideoPresentationMode(videoElement, slide);
                });

                activePlayer.on('pause', () => {
                    if (
                        currentToken === playToken &&
                        activeSlideIndex === index
                    ) {
                        syncSlideProgress(slide);
                        setSlidePlaying(slide, false);
                    }
                });

                activePlayer.on('ended', () => {
                    if (
                        currentToken === playToken &&
                        activeSlideIndex === index
                    ) {
                        syncSlideProgress(slide);
                        setSlidePlaying(slide, false);
                    }
                });

                activePlayer.on('error', () => {
                    if (
                        currentToken === playToken &&
                        activeSlideIndex === index
                    ) {
                        showSlideMessage(slide, 'loading', false);
                        showSlideMessage(slide, 'error', true);
                        setSlidePlaying(slide, false);
                    }
                });
            }
        } catch (error) {
            if (currentToken !== playToken || !isOpen) return;

            console.error('Short feed player init failed:', error);
            showSlideMessage(slide, 'loading', false);
            showSlideMessage(slide, 'error', true);
            setSlidePlaying(slide, false);
        }
    }

    function isActivePaused() {
        if (!activePlayer || typeof activePlayer.paused !== 'function') return true;
        return !!activePlayer.paused();
    }

    function toggleActivePlayback() {
        const index = getActiveIndex();
        const slide = wrapper.querySelector(`.short-feed-slide[data-index="${index}"]`);
        if (!activePlayer || !activePlayerId || activeSlideIndex !== index) {
            playActiveSlide();
            return;
        }

        if (isActivePaused()) {
            const result = activePlayer.play();
            if (result && typeof result.catch === 'function') {
                result.then(() => setSlidePlaying(slide, true)).catch(error => {
                    setSlidePlaying(slide, false);
                    console.warn('Short feed play failed:', error);
                });
            } else {
                setSlidePlaying(slide, true);
            }
        } else {
            if (typeof activePlayer.pause === 'function') activePlayer.pause();
            setSlidePlaying(slide, false);
        }
    }

    function bumpButtonCount(button) {
        const countNode = button?.querySelector('span');
        if (!countNode) return;
        const value = Number(String(countNode.textContent || '').replace(/\D/g, '') || 0);
        countNode.textContent = String(value + 1);
    }

    function copyShareLink() {
        const url = videos[getActiveIndex()]?.url || window.location.href;
        if (navigator.share) {
            navigator.share({ title: document.title, url }).catch(() => {});
            return;
        }
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                console.info('Short video link copied:', url);
            }).catch(error => console.warn('Copy short video link failed:', error));
        }
    }

    function ensureActionPanels() {
        const panels = document.getElementById('shortFeedActionPanels');
        if (!panels) return null;
        if (panels.dataset.bound === '1') return panels;

        const mask = document.getElementById('shortFeedPanelMask');
        mask?.addEventListener('click', closeActionPanels);

        document.getElementById('shortFeedCommentSubmit')?.addEventListener('click', submitPanelComment);
        document.getElementById('shortFeedAiSubmit')?.addEventListener('click', submitAiMessage);
        document.getElementById('shortFeedQuoteSubmit')?.addEventListener('click', submitQuoteMessage);

        panels.querySelectorAll('[data-share-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.shareAction;
                const video = videos[getActiveIndex()];
                const url = video?.url || window.location.href;
                if (action === 'whatsapp') {
                    window.open(`https://wa.me/?text=${encodeURIComponent(`${video?.title || ''} ${url}`)}`, '_blank');
                    return;
                }
                copyShareLink();
            });
        });

        panels.addEventListener('click', event => {
            const prevBtn = event.target.closest('[data-product-carousel-prev]');
            const nextBtn = event.target.closest('[data-product-carousel-next]');
            if (!prevBtn && !nextBtn) return;
            event.preventDefault();
            switchProductImage(prevBtn || nextBtn, prevBtn ? -1 : 1);
        });
        panels.querySelectorAll('.ai-chat-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('shortFeedAiInput');
                if (input) input.value = btn.dataset.msg || '';
            });
        });

        panels.dataset.bound = '1';
        return panels;
    }

    function submitPanelComment() {
        const input = document.getElementById('shortFeedCommentInput');
        const text = String(input?.value || '').trim();
        if (!text) return;
        document.getElementById('shortFeedComments')?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
        input.value = '';
        const commentCount = document.getElementById('shortFeedCommentCount');
        if (commentCount) commentCount.textContent = String(Number(commentCount.textContent || 0) + 1);
    }

    function submitMobileComment(input) {
        const text = String(input?.value || '').trim();
        if (!text) return;

        document.getElementById('shortFeedComments')?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
        const activeDetail = document.querySelector('.short-feed-slide.swiper-slide-active .short-feed-detail-comments, .short-feed-slide.active .short-feed-detail-comments');
        activeDetail?.insertAdjacentHTML('beforeend', `
            <div class="short-feed-detail-comment">
                <div class="short-feed-detail-comment-avatar official">我</div>
                <div>
                    <strong>我</strong>
                    <p>${escapeHtml(text)}</p>
                    <span>刚刚</span>
                </div>
            </div>
        `);

        const commentCount = document.getElementById('shortFeedCommentCount');
        if (commentCount) commentCount.textContent = String(Number(commentCount.textContent || 0) + 1);

        input.value = '';
        input.blur();
    }

    function submitAiMessage() {
        const input = document.getElementById('shortFeedAiInput');
        const text = String(input?.value || '').trim();
        if (!text) return;
        const body = document.getElementById('shortFeedAiBody');
        body?.insertAdjacentHTML('beforeend', `<div class="ai-chat-message user">${escapeHtml(text)}</div><div class="ai-chat-message bot">\u5df2\u6536\u5230\uff0c\u6211\u4eec\u4f1a\u6839\u636e\u60a8\u7684\u95ee\u9898\u5c3d\u5feb\u4e3a\u60a8\u63d0\u4f9b\u5e2e\u52a9\u3002</div>`);
        input.value = '';
        if (body) body.scrollTop = body.scrollHeight;
    }

    function submitQuoteMessage() {
        const nameInput = document.getElementById('shortFeedQuoteName');
        const contactInput = document.getElementById('shortFeedQuoteContact');
        const emailInput = document.getElementById('shortFeedQuoteEmail');
        const messageInput = document.getElementById('shortFeedQuoteMessage');
        const name = String(nameInput?.value || '').trim();
        const contact = String(contactInput?.value || '').trim();
        const email = String(emailInput?.value || '').trim();
        const message = String(messageInput?.value || '').trim();
        if (!name && !contact && !email && !message) return;
        const list = document.getElementById('shortFeedQuoteMessages');
        list?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item"><strong>${escapeHtml(name || '\u8bbf\u5ba2')}</strong><br>${escapeHtml(contact)}${contact && email ? ' / ' : ''}${escapeHtml(email)}<p>${escapeHtml(message)}</p></div>`);
        [nameInput, contactInput, emailInput, messageInput].forEach(input => { if (input) input.value = ''; });
    }

    function getActionPanelRoot(node) {
        return node?.closest('.short-feed-cart-panel,.short-feed-comment-panel,.short-feed-share-panel,.short-feed-ai-panel,.short-feed-intro-panel,.short-feed-quote-panel') || null;
    }

    function closeActionPanel(panel) {
        if (!panel) return;
        panel.classList.remove('active');
        const hasActivePanel = !!document.querySelector('.short-feed-cart-panel.active,.short-feed-comment-panel.active,.short-feed-share-panel.active,.short-feed-ai-panel.active,.short-feed-intro-panel.active,.short-feed-quote-panel.active');
        if (!hasActivePanel) {
            document.getElementById('shortFeedPanelMask')?.classList.remove('active');
        }
    }

    document.addEventListener('click', event => {
        const closeBtn = event.target.closest('[data-short-panel-close]');
        if (!closeBtn) return;
        event.preventDefault();
        event.stopPropagation();
        closeActionPanel(getActionPanelRoot(closeBtn));
    }, true);

    function closeActionPanels() {
        document.getElementById('shortFeedPanelMask')?.classList.remove('active');
        document.querySelectorAll('.short-feed-cart-panel,.short-feed-comment-panel,.short-feed-share-panel,.short-feed-ai-panel,.short-feed-intro-panel,.short-feed-quote-panel').forEach(panel => panel.classList.remove('active'));
    }

    function showActionPanel(panelId) {
        ensureActionPanels();
        closeActionPanels();
        document.getElementById('shortFeedPanelMask')?.classList.add('active');
        document.getElementById(panelId)?.classList.add('active');
    }

    function openCartPanel() {
        const video = videos[getActiveIndex()];
        const panels = ensureActionPanels();
        const content = panels?.querySelector('#shortFeedCartContent');
        if (!content) return;

        content.innerHTML = '';
        if (!video?.productNode) {
            content.innerHTML = '<div class="short-feed-empty">\u5f53\u524d\u89c6\u9891\u672a\u7ed1\u5b9a\u5546\u54c1\u3002</div>';
        } else {
            const productNode = video.productNode.cloneNode(true);
            productNode.hidden = false;
            productNode.querySelector('.carousel-slide')?.classList.add('active');
            content.appendChild(productNode);
        }

        showActionPanel('shortFeedCartPanel');
    }

    function switchProductImage(button, step) {
        const carousel = button.closest('.product-carousel');
        const slides = Array.from(carousel?.querySelectorAll('.carousel-slide') || []);
        if (slides.length < 2) return;
        const current = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
        const next = (current + step + slides.length) % slides.length;
        slides[current]?.classList.remove('active');
        slides[next]?.classList.add('active');
    }

    function openCommentPanel() {
        showActionPanel('shortFeedCommentPanel');
    }

    function openSharePanel() {
        const video = videos[getActiveIndex()];
        const link = video?.url || window.location.href;
        const linkNode = document.getElementById('shortFeedShareLink');
        if (linkNode) linkNode.textContent = link;
        showActionPanel('shortFeedSharePanel');
    }

    function openAiPanel() {
        showActionPanel('shortFeedAiPanel');
    }

    function openIntroPanel() {
        const video = videos[getActiveIndex()];
        const slide = wrapper.querySelector(`.short-feed-slide[data-index="${getActiveIndex()}"]`);
        const body = document.getElementById('shortFeedIntroBody') || ensureActionPanels()?.querySelector('#shortFeedIntroBody');
        const desc = video?.description || slide?.querySelector('.short-feed-detail-desc')?.textContent?.trim() || '';
        if (body) {
            const textNode = document.createElement('p');
            textNode.className = 'short-feed-intro-text';
            textNode.textContent = desc || '\u6682\u65e0\u89c6\u9891\u7b80\u4ecb\u3002';
            body.replaceChildren(textNode);
        }
        showActionPanel('shortFeedIntroPanel');
    }

    function openQuotePanel() {
        showActionPanel('shortFeedQuotePanel');
    }

    function submitDesktopComment(target) {
        const detailRoot = target.closest('.short-feed-desktop-detail');
        const input = detailRoot?.querySelector('[data-detail-comment-input]');
        const text = String(input?.value || '').trim();
        if (!detailRoot || !input || !text) return;
        const comments = detailRoot.querySelector('.short-feed-detail-comments');
        comments?.insertAdjacentHTML('beforeend', `
            <div class="short-feed-detail-comment">
                <div class="short-feed-detail-comment-avatar official">\u6211</div>
                <div>
                    <strong>\u6211</strong>
                    <p>${escapeHtml(text)}</p>
                    <span>\u521a\u521a</span>
                </div>
            </div>
        `);
        input.value = '';
        if (comments) comments.scrollTop = comments.scrollHeight;
    }

    function setSwiperEnabled(enabled) {
        if (!swiper) return;

        if (enabled) {
            if (typeof swiper.enable === 'function') swiper.enable();
            if (swiper.keyboard && typeof swiper.keyboard.enable === 'function') {
                swiper.keyboard.enable();
            }
            if (swiper.mousewheel && typeof swiper.mousewheel.enable === 'function') {
                swiper.mousewheel.enable();
            }
            return;
        }

        if (swiper.keyboard && typeof swiper.keyboard.disable === 'function') {
            swiper.keyboard.disable();
        }
        if (swiper.mousewheel && typeof swiper.mousewheel.disable === 'function') {
            swiper.mousewheel.disable();
        }
        if (typeof swiper.disable === 'function') swiper.disable();
    }

    function initSwiper(initialIndex) {
        if (typeof Swiper === 'undefined') {
            console.error('Swiper SDK not loaded');
            return;
        }

        const targetIndex = Math.max(
            0,
            Math.min(videos.length - 1, Number(initialIndex) || 0)
        );

        if (swiper) {
            setSwiperEnabled(true);

            if (swiper.activeIndex === targetIndex) {
                renderRecommendations(videos[targetIndex]);
                playActiveSlide();
            } else {
                swiper.slideTo(targetIndex, 0);
            }

            return;
        }

        swiper = new Swiper('#shortFeedSwiper', {
            direction: 'vertical',
            initialSlide: targetIndex,
            speed: 420,
            slidesPerView: 1,
            resistanceRatio: 0.45,
            preventInteractionOnTransition: true,
            mousewheel: {
                forceToAxis: true,
                sensitivity: 0.85,
                releaseOnEdges: true
            },
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            on: {
                init() {
                    if (!isOpen) return;

                    const video = videos[getActiveIndex()];
                    renderRecommendations(video);
                    playActiveSlide();
                },

                slideChangeTransitionStart() {
                    if (!isOpen) return;
                    pauseActivePlayer();
                },

                slideChangeTransitionEnd() {
                    if (!isOpen) return;

                    const video = videos[getActiveIndex()];
                    updateUrl(video, true);
                    renderRecommendations(video);
                    playActiveSlide();
                }
            }
        });
    }

    function openFeed(index, options = {}) {
        renderSlides();

        const fromHistory = options.fromHistory === true;
        const targetIndex = Math.max(
            0,
            Math.min(videos.length - 1, Number(index) || 0)
        );
        const video = videos[targetIndex];

        if (!video) return;

        if (!isOpen) {
            listUrl = fromHistory && options.listUrl
                ? options.listUrl
                : window.location.href;
        }

        isOpen = true;
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('short-feed-open');

        if (!fromHistory) {
            updateUrl(video, false);
        }

        renderRecommendations(video);
        initSwiper(targetIndex);
        setSwiperEnabled(true);
    }

    function closeFeed(restoreHistory = true) {
        if (!isOpen) return;

        closeActionPanels();
        destroyActivePlayer();
        setSwiperEnabled(false);

        isOpen = false;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('short-feed-open');

        if (
            !restoreHistory ||
            !listUrl ||
            window.location.href === listUrl
        ) {
            return;
        }

        if (history.state?.shortFeed) {
            history.back();
            return;
        }

        history.replaceState(
            { shortFeed: false },
            '',
            listUrl
        );
    }

    function handleCardClick(event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) return;

        const card = event.target.closest('[data-short-video-card]');
        if (!card) return;

        const index = cards.indexOf(card);
        if (index < 0) return;

        event.preventDefault();
        event.stopPropagation();
        openFeed(index);
    }

    if (list) {
        list.addEventListener('click', handleCardClick, true);
    }

    closeBtn?.addEventListener('click', () => closeFeed(true));
    prevBtn?.addEventListener('click', () => swiper?.slidePrev());
    nextBtn?.addEventListener('click', () => swiper?.slideNext());

    recommendList?.addEventListener('click', event => {
        if (event.target.closest('[data-detail-close]')) {
            event.preventDefault();
            closeFeed(true);
            return;
        }
        if (event.target.closest('[data-detail-ai]')) {
            event.preventDefault();
            openAiPanel();
            return;
        }
        if (event.target.closest('[data-detail-quote]')) {
            event.preventDefault();
            openQuotePanel();
            return;
        }
        if (event.target.closest('[data-detail-cart]')) {
            event.preventDefault();
            openCartPanel();
            return;
        }
        if (event.target.closest('[data-detail-comment]')) {
            event.preventDefault();
            openCommentPanel();
            return;
        }
        if (event.target.closest('[data-detail-share]')) {
            event.preventDefault();
            openSharePanel();
            return;
        }
        const likeAction = event.target.closest('[data-detail-like], [data-detail-save]');
        if (likeAction) {
            event.preventDefault();
            const span = likeAction.querySelector('span');
            if (span) span.textContent = String(Number(span.textContent || 0) + 1);
            likeAction.classList.toggle('active');
            return;
        }
        const item = event.target.closest('.short-feed-rec-item');
        if (!item || !swiper) return;
        swiper.slideTo(Number(item.dataset.index || 0));
    });

    wrapper.addEventListener('click', event => {
        const detailTagLink = event.target.closest('.short-feed-desktop-detail a[href], .video-info-overlay a[href]');
        if (detailTagLink) {
            event.stopPropagation();
            return;
        }

        const detailAiBtn = event.target.closest('[data-detail-ai]');
        if (detailAiBtn) {
            event.preventDefault();
            event.stopPropagation();
            openAiPanel();
            return;
        }

        const detailQuoteBtn = event.target.closest('[data-detail-quote]');
        if (detailQuoteBtn) {
            event.preventDefault();
            event.stopPropagation();
            openQuotePanel();
            return;
        }

        const detailCartBtn = event.target.closest('[data-detail-cart]');
        if (detailCartBtn) {
            event.preventDefault();
            event.stopPropagation();
            openCartPanel();
            return;
        }

        const detailCommentSubmitBtn = event.target.closest('[data-detail-comment-submit]');
        if (detailCommentSubmitBtn) {
            event.preventDefault();
            event.stopPropagation();
            submitDesktopComment(detailCommentSubmitBtn);
            return;
        }

        const detailShareBtn = event.target.closest('[data-detail-share]');
        if (detailShareBtn) {
            event.preventDefault();
            event.stopPropagation();
            openSharePanel();
            return;
        }

        const detailLikeBtn = event.target.closest('[data-detail-like], [data-detail-save]');
        if (detailLikeBtn) {
            event.preventDefault();
            event.stopPropagation();
            const span = detailLikeBtn.querySelector('span');
            if (span) span.textContent = String(Number(span.textContent || 0) + 1);
            detailLikeBtn.classList.toggle('active');
            return;
        }

        const homeBtn = event.target.closest('.m-home-btn');
        if (homeBtn) {
            event.preventDefault();
            event.stopPropagation();
            window.location.href = '/';
            return;
        }

        const mobileCloseBtn = event.target.closest('.short-feed-mobile-close');
        if (mobileCloseBtn) {
            event.preventDefault();
            event.stopPropagation();
            closeFeed(true);
            return;
        }

        const mobileEmojiBtn = event.target.closest('.short-feed-mobile-emoji');
        if (mobileEmojiBtn) {
            event.preventDefault();
            event.stopPropagation();
            openCommentPanel();
            return;
        }

        const cartBtn = event.target.closest('.m-cart-btn');
        if (cartBtn) {
            event.preventDefault();
            event.stopPropagation();
            openCartPanel();
            return;
        }

        const likeBtn = event.target.closest('.m-like-btn');
        if (likeBtn) {
            event.preventDefault();
            event.stopPropagation();
            likeBtn.classList.toggle('m-liked');
            if (likeBtn.classList.contains('m-liked')) bumpButtonCount(likeBtn);
            return;
        }

        const quoteBtn = event.target.closest('.m-quote-btn');
        if (quoteBtn) {
            event.preventDefault();
            event.stopPropagation();
            openQuotePanel();
            return;
        }

        const introBtn = event.target.closest('.m-intro-btn');
        if (introBtn) {
            event.preventDefault();
            event.stopPropagation();
            openIntroPanel();
            return;
        }

        const shareBtn = event.target.closest('.m-share-btn');
        if (shareBtn) {
            event.preventDefault();
            event.stopPropagation();
            bumpButtonCount(shareBtn);
            openSharePanel();
            return;
        }

        const mobileCommentSubmit = event.target.closest('[data-mobile-comment-submit]');
        if (mobileCommentSubmit) {
            event.preventDefault();
            event.stopPropagation();
            submitMobileComment(mobileCommentSubmit.closest('.short-feed-mobile-comment')?.querySelector('[data-mobile-comment-input]'));
            return;
        }

        if (event.target.closest('[data-mobile-comment-input]')) {
            event.stopPropagation();
            return;
        }

        const aiBtn = event.target.closest('.m-ai-btn');
        if (aiBtn) {
            event.preventDefault();
            event.stopPropagation();
            openAiPanel();
            return;
        }

        const soundBtn = event.target.closest('.sound-control-btn');
        if (soundBtn) {
            event.preventDefault();
            event.stopPropagation();
            toggleActiveSound(soundBtn);
            return;
        }

        if (event.target.closest('.mobile-slide-sidebar, .fullscreen-btn')) return;
        if (!event.target.closest('.video-portrait, .center-play-btn')) return;

        event.preventDefault();
        event.stopPropagation();
        toggleActivePlayback();
    });

    wrapper.addEventListener('keydown', event => {
        const mobileInput = event.target.closest('[data-mobile-comment-input]');
        if (mobileInput && event.key === 'Enter') {
            event.preventDefault();
            submitMobileComment(mobileInput);
            return;
        }

        const input = event.target.closest('[data-detail-comment-input]');
        if (!input || event.key !== 'Enter') return;
        event.preventDefault();
        submitDesktopComment(input);
    });

    wrapper.addEventListener('pointerdown', event => {
        const track = event.target.closest('.video-progress-track');
        if (!track) return;
        event.preventDefault();
        event.stopPropagation();
        seekActiveFromPointer(event, track);

        const handlePointerMove = moveEvent => {
            moveEvent.preventDefault();
            seekActiveFromPointer(moveEvent, track);
        };
        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    });

    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeFeed(true);
    });

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen) closeFeed(true);
    });

    window.addEventListener('popstate', event => {
        const historyState = event.state;

        if (historyState?.shortFeed) {
            const index = videos.findIndex(video => {
                return String(video.id || '') === String(historyState.contentId || '');
            });

            if (index >= 0) {
                openFeed(index, {
                    fromHistory: true,
                    listUrl: historyState.listUrl || listUrl
                });
            }

            return;
        }

        if (isOpen) {
            closeFeed(false);
        }
    });

    window.addEventListener('beforeunload', destroyActivePlayer);
});
