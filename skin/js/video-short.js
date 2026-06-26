// Detail short video page interactions. Scoped, standalone, and lazy player initialization.
(function() {
    'use strict';

    const MOBILE_QUERY = '(max-width: 768px)';
    const PANEL_IDS = {
        cart: 'shortDetailCartPanel',
        comment: 'shortDetailCommentPanel',
        share: 'shortDetailSharePanel',
        ai: 'shortDetailAiPanel',
        intro: 'shortDetailIntroPanel',
        quote: 'shortDetailQuotePanel'
    };

    function ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function scoped(root, selector) {
        return root ? root.querySelector(selector) : null;
    }

    function scopedAll(root, selector) {
        return root ? Array.from(root.querySelectorAll(selector)) : [];
    }

    function getFieldText(dataNode, name) {
        return String(scoped(dataNode, `[data-field="${name}"]`)?.textContent || '').trim();
    }

    function getFieldHtml(dataNode, name) {
        return String(scoped(dataNode, `[data-field="${name}"]`)?.innerHTML || '').trim();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function formatVideoTime(seconds) {
        const value = Math.max(0, Number(seconds) || 0);
        const mins = Math.floor(value / 60);
        const secs = Math.floor(value % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function normalizeUrl(value, base = window.location.href) {
        const text = String(value || '').trim();
        if (!text) return '';

        try {
            return new URL(text, base).href;
        } catch (error) {
            return '';
        }
    }

    function getMetaContent(sourceDoc, selector) {
        return String(sourceDoc.querySelector(selector)?.getAttribute('content') || '').trim();
    }

    function readSeoData(sourceDoc = document, base = window.location.href) {
        const canonicalHref = sourceDoc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

        return {
            documentTitle: sourceDoc.title || '',
            metaDescription: getMetaContent(sourceDoc, 'meta[name="description"]'),
            canonicalUrl: normalizeUrl(canonicalHref, base),
            ogTitle: getMetaContent(sourceDoc, 'meta[property="og:title"]'),
            ogDescription: getMetaContent(sourceDoc, 'meta[property="og:description"]'),
            ogUrl: normalizeUrl(getMetaContent(sourceDoc, 'meta[property="og:url"]'), base),
            ogImage: normalizeUrl(getMetaContent(sourceDoc, 'meta[property="og:image"]'), base),
            twitterTitle: getMetaContent(sourceDoc, 'meta[name="twitter:title"]'),
            twitterDescription: getMetaContent(sourceDoc, 'meta[name="twitter:description"]'),
            twitterImage: normalizeUrl(getMetaContent(sourceDoc, 'meta[name="twitter:image"]'), base),
            jsonLd: String(sourceDoc.querySelector('script[type="application/ld+json"]')?.textContent || '').trim()
        };
    }

    function readVideoData(dataNode, sourceDoc = document, base = window.location.href) {
        const seo = readSeoData(sourceDoc, base);

        return {
            id: dataNode.dataset.contentId || '',
            title: getFieldText(dataNode, 'title') || seo.documentTitle || document.title,
            url: normalizeUrl(dataNode.dataset.url, base) || normalizeUrl(base),
            prevUrl: normalizeUrl(dataNode.dataset.prevUrl, base),
            nextUrl: normalizeUrl(dataNode.dataset.nextUrl, base),
            prevTitle: dataNode.dataset.prevTitle || '',
            nextTitle: dataNode.dataset.nextTitle || '',
            poster: dataNode.dataset.poster || '',
            category: dataNode.dataset.category || '',
            description: getFieldHtml(dataNode, 'description') || '',
            duration: dataNode.dataset.duration || '00:00',
            date: dataNode.dataset.date || '',
            visits: dataNode.dataset.views || '0',
            fileId: dataNode.dataset.fileId || '',
            licenseUrl: dataNode.dataset.licenseUrl || '',
            licenseKey: dataNode.dataset.licenseKey || '',
            signApi: dataNode.dataset.signApi || '/api/tencent-vod-psign.php',
            documentTitle: seo.documentTitle,
            metaDescription: seo.metaDescription,
            canonicalUrl: seo.canonicalUrl,
            ogTitle: seo.ogTitle,
            ogDescription: seo.ogDescription,
            ogUrl: seo.ogUrl,
            ogImage: seo.ogImage,
            twitterTitle: seo.twitterTitle,
            twitterDescription: seo.twitterDescription,
            twitterImage: seo.twitterImage,
            jsonLd: seo.jsonLd,
            layout: null
        };
    }

    function createPageContext() {
        const dataNode = byId('shortVideoInitialData');
        const root = byId('shortDetailOverlay');
        const frame = byId('shortVideoPlayerFrame');
        const wrapper = byId('shortDetailWrapper');
        const panelsRoot = byId('shortDetailActionPanels');

        if (!dataNode || !root || !frame || !wrapper) return null;

        return {
            dataNode,
            root,
            frame,
            wrapper,
            panelsRoot,
            mask: byId('shortDetailPanelMask'),
            panels: {
                cartContent: byId('shortDetailCartContent'),
                commentCount: byId('shortDetailCommentCount'),
                comments: byId('shortDetailComments'),
                commentInput: byId('shortDetailCommentInput'),
                commentSubmit: byId('shortDetailCommentSubmit'),
                shareLink: byId('shortDetailShareLink'),
                aiBody: byId('shortDetailAiBody'),
                aiInput: byId('shortDetailAiInput'),
                aiSubmit: byId('shortDetailAiSubmit'),
                quoteName: byId('shortDetailQuoteName'),
                quoteContact: byId('shortDetailQuoteContact'),
                quoteEmail: byId('shortDetailQuoteEmail'),
                quoteMessage: byId('shortDetailQuoteMessage'),
                quoteSubmit: byId('shortDetailQuoteSubmit'),
                quoteMessages: byId('shortDetailQuoteMessages')
            },
            seo: {
                description: document.querySelector('meta[name="description"]'),
                canonical: document.querySelector('link[rel="canonical"]'),
                ogTitle: document.querySelector('meta[property="og:title"]'),
                ogDescription: document.querySelector('meta[property="og:description"]'),
                ogUrl: document.querySelector('meta[property="og:url"]'),
                ogImage: document.querySelector('meta[property="og:image"]'),
                twitterTitle: document.querySelector('meta[name="twitter:title"]'),
                twitterDescription: document.querySelector('meta[name="twitter:description"]'),
                twitterImage: document.querySelector('meta[name="twitter:image"]'),
                jsonLd: document.querySelector('script[type="application/ld+json"]')
            }
        };
    }

    function createSlideContext(pageCtx, slide) {
        if (!pageCtx || !slide) return null;

        const card = scoped(slide, '.video-card-container');
        const videoBox = scoped(slide, '.short-feed-video-box');
        const videoElement = scoped(slide, '.short-feed-video');

        if (!card || !videoBox || !videoElement) return null;

        return {
            ...pageCtx,
            slide,
            card,
            videoBox,
            videoElement,
            centerPlayBtn: scoped(slide, '.center-play-btn'),
            progressTrack: scoped(slide, '.video-progress-track'),
            progressBar: scoped(slide, '.video-progress-bar'),
            currentTime: scoped(slide, '.current-time'),
            duration: scoped(slide, '.duration'),
            soundButton: scoped(slide, '.sound-control-btn'),
            detailComments: scoped(slide, '.short-feed-detail-comments'),
            detailCommentInput: scoped(slide, '[data-detail-comment-input]'),
            detailCommentSubmit: scoped(slide, '[data-detail-comment-submit]'),
            mobileCommentInput: scoped(slide, '[data-mobile-comment-input]'),
            mobileCommentSubmit: scoped(slide, '[data-mobile-comment-submit]')
        };
    }

    function createVideoRecord(video, slide, options = {}) {
        const key = video.url || normalizeUrl(options.sourceUrl) || String(video.id || '');

        return {
            key,
            video,
            slide,
            cartHtml: options.cartHtml || '',
            panelCommentsHtml: options.panelCommentsHtml || '',
            panelCommentCount: Number(options.panelCommentCount) || 0,
            sourceUrl: options.sourceUrl || video.url || '',
            loadedFromNetwork: options.loadedFromNetwork === true
        };
    }

    function removeRemoteOnlyNodes(root) {
        if (!root) return;

        scopedAll(root, [
            'script',
            'style',
            'link',
            'header',
            'footer',
            '.topbar',
            '.top-bar',
            '.site-header',
            '.nav-header',
            '.sidebar-embedded-aside',
            '.mobile-tabbar',
            '.back-to-top',
            '.short-feed-action-panels',
            '.short-feed-modal-overlay'
        ].join(',')).forEach(node => node.remove());
    }

    function ensureSlideVideoMarkup(slide, video) {
        const videoBox = scoped(slide, '.short-feed-video-box');
        if (!videoBox) return;

        let videoElement = scoped(videoBox, '.short-feed-video');
        if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.className = 'short-feed-video video-player';
            videoBox.prepend(videoElement);
        }

        videoElement.id = `shortVideoEl_${video.id || Date.now()}`;
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('webkit-playsinline', '');
        videoElement.setAttribute('x5-playsinline', '');
        videoElement.setAttribute('preload', 'none');
        if (video.poster) videoElement.setAttribute('poster', video.poster);

        if (!scoped(videoBox, '.short-feed-loading')) {
            const loading = document.createElement('div');
            loading.className = 'short-feed-loading';
            loading.hidden = true;
            loading.textContent = '视频加载中...';
            videoElement.insertAdjacentElement('afterend', loading);
        }

        if (!scoped(videoBox, '.short-feed-error')) {
            const error = document.createElement('div');
            error.className = 'short-feed-error';
            error.hidden = true;
            error.textContent = '视频授权获取失败，请刷新页面后重试';
            videoBox.appendChild(error);
        }
    }

    function normalizeRemoteSlide(sourceSlide, video) {
        if (!sourceSlide) return null;

        const slide = sourceSlide.cloneNode(true);
        removeRemoteOnlyNodes(slide);
        scoped(slide, '.short-feed-desktop-detail')?.remove();

        slide.classList.add('short-feed-slide', 'swiper-slide');
        slide.classList.remove('swiper-slide-active', 'swiper-slide-prev', 'swiper-slide-next');
        slide.dataset.contentId = video.id || '';
        slide.dataset.detailUrl = video.url || '';
        slide.dataset.recordKey = video.url || String(video.id || '');

        scoped(slide, '.video-card-container')?.classList.remove('playing');

        const videoBox = scoped(slide, '.short-feed-video-box');
        if (videoBox) {
            videoBox.classList.remove(
                'is-portrait-video',
                'is-landscape-video',
                'is-video-layout-ready'
            );
            videoBox.classList.add('is-video-layout-pending');
        }

        const progressBar = scoped(slide, '.video-progress-bar');
        const currentTime = scoped(slide, '.current-time');
        if (progressBar) progressBar.style.width = '0';
        if (currentTime) currentTime.textContent = '00:00';

        ensureSlideVideoMarkup(slide, video);
        return slide;
    }

    async function fetchDetailRecord(pageCtx, url, state) {
        const targetUrl = normalizeUrl(url);
        if (!targetUrl) return null;

        const parsedUrl = new URL(targetUrl);
        if (parsedUrl.origin !== window.location.origin) {
            console.warn('Skip cross-origin short detail preload:', targetUrl);
            return null;
        }

        if (state.recordsByUrl.has(targetUrl)) {
            return state.recordsByUrl.get(targetUrl);
        }

        if (state.loadPromises.has(targetUrl)) {
            return state.loadPromises.get(targetUrl);
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);

        const loadPromise = (async function() {
            try {
                const response = await fetch(targetUrl, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'text/html' },
                    signal: controller.signal
                });

                const contentType = response.headers.get('content-type') || '';
                if (!response.ok || !contentType.includes('text/html')) {
                    throw new Error(`Invalid detail response: ${response.status}`);
                }

                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const dataNode = doc.getElementById('shortVideoInitialData');
                const sourceSlide = doc.querySelector('#shortDetailOverlay .short-feed-slide');

                if (!dataNode || !sourceSlide) {
                    throw new Error('Remote detail page is missing required short video nodes');
                }

                const video = readVideoData(dataNode, doc, targetUrl);
                const slide = normalizeRemoteSlide(sourceSlide, video);
                if (!slide) throw new Error('Remote detail slide could not be normalized');

                const record = createVideoRecord(video, slide, {
                    cartHtml: doc.getElementById('shortDetailCartContent')?.innerHTML || '',
                    sourceUrl: targetUrl,
                    loadedFromNetwork: true
                });

                state.recordsByUrl.set(record.key, record);
                return record;
            } catch (error) {
                console.warn('Fetch short detail record failed:', error);
                return null;
            } finally {
                window.clearTimeout(timeout);
                state.loadPromises.delete(targetUrl);
            }
        })();

        state.loadPromises.set(targetUrl, loadPromise);
        return loadPromise;
    }

    function createPlayerController(ctx, video) {
        let player = null;
        let playToken = 0;
        let initPromise = null;
        let pendingPlay = false;
        const LAYOUT_CLASSES = [
            'is-portrait-video',
            'is-landscape-video',
            'is-video-layout-pending',
            'is-video-layout-ready'
        ];

        function resetPresentationMode() {
            ctx.videoBox.classList.remove(...LAYOUT_CLASSES);

            if (video.layout === 'portrait') {
                ctx.videoBox.classList.add(
                    'is-portrait-video',
                    'is-video-layout-ready'
                );
                return;
            }

            if (video.layout === 'landscape') {
                ctx.videoBox.classList.add(
                    'is-landscape-video',
                    'is-video-layout-ready'
                );
                return;
            }

            ctx.videoBox.classList.add('is-video-layout-pending');
        }

        function setPlaying(playing) {
            ctx.card.classList.toggle('playing', !!playing);
            ctx.centerPlayBtn?.setAttribute('aria-pressed', playing ? 'true' : 'false');
        }

        function showSlideMessage(type, visible) {
            const selector = type === 'error' ? '.short-feed-error' : '.short-feed-loading';
            const node = scoped(ctx.slide, selector);
            if (node) node.hidden = !visible;
        }

        function readPlayerNumber(methodName) {
            if (!player || typeof player[methodName] !== 'function') return 0;
            const value = Number(player[methodName]());
            return Number.isFinite(value) ? value : 0;
        }

        function syncSoundIcon() {
            if (!player || typeof player.muted !== 'function') return;
            const icon = scoped(ctx.soundButton, 'i');
            if (icon) icon.className = player.muted() ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }

        function syncProgress() {
            const current = readPlayerNumber('currentTime');
            const duration = readPlayerNumber('duration');
            const percent = duration > 0 ? Math.min(100, Math.max(0, current / duration * 100)) : 0;

            if (ctx.progressBar) ctx.progressBar.style.width = `${percent}%`;
            if (ctx.currentTime) ctx.currentTime.textContent = formatVideoTime(current);
            if (ctx.duration && duration > 0) ctx.duration.textContent = formatVideoTime(duration);
        }

        function updatePresentationMode() {
            const renderedVideo =
                scoped(ctx.videoBox, '.vjs-tech') ||
                scoped(ctx.videoBox, 'video.tcp-video') ||
                scoped(ctx.videoBox, 'video') ||
                ctx.videoElement;

            const videoWidth = Number(renderedVideo?.videoWidth) || 0;
            const videoHeight = Number(renderedVideo?.videoHeight) || 0;

            if (!videoWidth || !videoHeight) {
                return false;
            }

            video.layout = videoHeight > videoWidth
                ? 'portrait'
                : 'landscape';

            ctx.videoBox.classList.remove(...LAYOUT_CLASSES);

            ctx.videoBox.classList.add(
                video.layout === 'portrait'
                    ? 'is-portrait-video'
                    : 'is-landscape-video'
            );

            requestAnimationFrame(() => {
                ctx.videoBox.classList.add('is-video-layout-ready');
            });

            return true;
        }

        resetPresentationMode();

        async function requestPsign(params) {
            const response = await fetch(`${video.signApi}?${params.toString()}`, {
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

        async function fetchPsign() {
            if (video.id) {
                const params = new URLSearchParams();
                params.set('contentId', video.id);
                try {
                    return await requestPsign(params);
                } catch (error) {
                    if (!video.fileId) throw error;
                    console.warn('Content id signature failed, retrying with fileId:', error);
                }
            }

            if (!video.fileId) {
                throw new Error('Missing detail video content id or file id');
            }

            const fallbackParams = new URLSearchParams();
            fallbackParams.set('fileId', video.fileId);
            return requestPsign(fallbackParams);
        }

        function validateSignData(signData) {
            if (!signData.appId || !signData.fileId || !signData.psign) {
                throw new Error('Signature payload missing appId, fileId or psign');
            }
        }

        function bindPlayerEvents(token) {
            if (!player || typeof player.on !== 'function') return;

            player.on('play', () => setPlaying(true));
            player.on('playing', () => setPlaying(true));
            player.on('timeupdate', syncProgress);
            player.on('durationchange', syncProgress);
            player.on('loadedmetadata', () => {
                if (token !== playToken) return;

                syncProgress();

                const layoutReady = updatePresentationMode();

                if (layoutReady) {
                    showSlideMessage('loading', false);
                }
            });
            player.on('pause', () => {
                syncProgress();
                setPlaying(false);
            });
            player.on('ended', () => {
                syncProgress();
                setPlaying(false);
            });
            player.on('error', () => {
                showSlideMessage('loading', false);
                showSlideMessage('error', true);
                setPlaying(false);
            });
        }

        function playExistingPlayer() {
            if (!player || typeof player.play !== 'function') return;
            const result = player.play();
            if (result && typeof result.then === 'function') {
                result.then(() => setPlaying(true)).catch(error => {
                    setPlaying(false);
                    console.warn('Detail video play was blocked:', error);
                });
            } else {
                setPlaying(true);
            }
        }

        async function initializePlayer() {
            if (player) return player;
            if (initPromise) return initPromise;

            showSlideMessage('error', false);
            showSlideMessage('loading', true);
            resetPresentationMode();

            initPromise = (async function() {
                const token = ++playToken;

                if (!video.id && !video.fileId) throw new Error('Missing detail video content id or file id');
                if (!ctx.videoElement.id) throw new Error('Missing detail video element id');
                if (typeof TCPlayer === 'undefined') throw new Error('TCPlayer SDK not loaded');

                const signData = await fetchPsign();
                if (token !== playToken) return null;
                validateSignData(signData);

                player = TCPlayer(ctx.videoElement.id, {
                    appID: String(signData.appId),
                    fileID: String(signData.fileId),
                    psign: String(signData.psign),
                    licenseUrl: String(signData.licenseUrl || video.licenseUrl || ''),
                    licenseKey: String(signData.licenseKey || video.licenseKey || ''),
                    width: '100%',
                    height: '100%',
                    controls: false,
                    autoplay: pendingPlay,
                    muted: false,
                    playsinline: true,
                    preload: 'none'
                });

                bindPlayerEvents(token);

                player.ready(function() {
                    if (token !== playToken || !player) return;

                    syncSoundIcon();
                    syncProgress();

                    const layoutReady = updatePresentationMode();

                    if (layoutReady) {
                        showSlideMessage('loading', false);
                    } else {
                        showSlideMessage('loading', true);
                    }

                    if (pendingPlay) {
                        playExistingPlayer();
                    }
                });

                return player;
            })().catch(error => {
                console.error('Detail player init failed:', error);
                showSlideMessage('loading', false);
                showSlideMessage('error', true);
                setPlaying(false);
                player = null;
                throw error;
            }).finally(() => {
                initPromise = null;
            });

            return initPromise;
        }

        async function play() {
            pendingPlay = true;
            if (player) {
                playExistingPlayer();
                return;
            }
            try {
                await initializePlayer();
                if (player) playExistingPlayer();
            } catch (error) {
                // initializePlayer already surfaces the UI state.
            }
        }

        function prepare() {
            pendingPlay = false;
            initializePlayer().catch(() => {
                // initializePlayer already surfaces the UI state.
            });
        }

        function pause() {
            pendingPlay = false;
            if (player && typeof player.pause === 'function') player.pause();
            setPlaying(false);
        }

        function toggle() {
            if (!player || typeof player.paused !== 'function') {
                play();
                return;
            }
            if (player.paused()) {
                play();
            } else {
                pause();
            }
        }

        function toggleSound() {
            if (!player || typeof player.muted !== 'function') return;
            player.muted(!player.muted());
            syncSoundIcon();
        }

        function seekFromPointer(event, track) {
            if (!player || typeof player.currentTime !== 'function' || typeof player.duration !== 'function') return;
            const rect = track.getBoundingClientRect();
            const duration = Number(player.duration()) || 0;
            if (!rect.width || duration <= 0) return;
            const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            player.currentTime(duration * ratio);
            syncProgress();
        }

        function destroy() {
            playToken++;
            pendingPlay = false;
            setPlaying(false);
            if (!player) return;
            try {
                if (typeof player.pause === 'function') player.pause();
                if (typeof player.dispose === 'function') player.dispose();
            } catch (error) {
                console.error('Destroy detail player failed:', error);
            }
            player = null;
            initPromise = null;
            ensureSlideVideoMarkup(ctx.slide, video);
            ctx.videoElement = scoped(ctx.slide, '.short-feed-video');
            resetPresentationMode();
        }

        return {
            play,
            prepare,
            pause,
            toggle,
            toggleSound,
            seekFromPointer,
            destroy
        };
    }

    function createPanelController(ctx, state) {
        const panelSelector = [
            '.short-feed-cart-panel',
            '.short-feed-comment-panel',
            '.short-feed-share-panel',
            '.short-feed-ai-panel',
            '.short-feed-intro-panel',
            '.short-feed-quote-panel'
        ].join(',');

        function setMask(active) {
            ctx.mask?.classList.toggle('active', !!active);
        }

        function closeAll() {
            setMask(false);
            scopedAll(ctx.panelsRoot || document, panelSelector).forEach(panel => {
                panel.classList.remove('active');
            });
            if (state?.isMobileFeed && state.swiper && typeof state.swiper.enable === 'function') {
                state.swiper.enable();
            }
        }

        function open(panelId) {
            closeAll();
            if (state?.isMobileFeed && state.swiper && typeof state.swiper.disable === 'function') {
                state.swiper.disable();
            }
            setMask(true);
            byId(panelId)?.classList.add('active');
        }

        return { open, closeAll };
    }

    function createFormController(pageCtx, getActiveRecord, getActiveSlideContext) {
        function submitPanelComment() {
            const input = pageCtx.panels.commentInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            pageCtx.panels.comments?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
            input.value = '';

            if (pageCtx.panels.commentCount) {
                pageCtx.panels.commentCount.textContent = String(Number(pageCtx.panels.commentCount.textContent || 0) + 1);
            }
        }

        function submitDetailComment() {
            const ctx = getActiveSlideContext();
            if (!ctx) return;
            const input = ctx.detailCommentInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            ctx.detailComments?.insertAdjacentHTML('beforeend', `
                <div class="short-feed-detail-comment">
                    <div class="short-feed-detail-comment-avatar official">我</div>
                    <div>
                        <strong>我</strong>
                        <p>${escapeHtml(text)}</p>
                        <span>刚刚</span>
                    </div>
                </div>
            `);
            input.value = '';
        }

        function submitMobileComment() {
            const ctx = getActiveSlideContext();
            if (!ctx) return;
            const input = ctx.mobileCommentInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            pageCtx.panels.comments?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
            ctx.detailComments?.insertAdjacentHTML('beforeend', `
                <div class="short-feed-detail-comment">
                    <div class="short-feed-detail-comment-avatar official">我</div>
                    <div>
                        <strong>我</strong>
                        <p>${escapeHtml(text)}</p>
                        <span>刚刚</span>
                    </div>
                </div>
            `);

            if (pageCtx.panels.commentCount) {
                pageCtx.panels.commentCount.textContent = String(Number(pageCtx.panels.commentCount.textContent || 0) + 1);
            }

            input.value = '';
            input.blur();
        }

        function submitAiMessage() {
            const input = pageCtx.panels.aiInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            pageCtx.panels.aiBody?.insertAdjacentHTML('beforeend', `<div class="ai-chat-message user">${escapeHtml(text)}</div><div class="ai-chat-message bot">已收到，我们会根据您的问题尽快为您提供帮助。</div>`);
            input.value = '';
            if (pageCtx.panels.aiBody) pageCtx.panels.aiBody.scrollTop = pageCtx.panels.aiBody.scrollHeight;
        }

        function submitQuoteMessage() {
            const fields = [
                pageCtx.panels.quoteName,
                pageCtx.panels.quoteContact,
                pageCtx.panels.quoteEmail,
                pageCtx.panels.quoteMessage
            ];
            const name = String(pageCtx.panels.quoteName?.value || '').trim();
            const contact = String(pageCtx.panels.quoteContact?.value || '').trim();
            const email = String(pageCtx.panels.quoteEmail?.value || '').trim();
            const message = String(pageCtx.panels.quoteMessage?.value || '').trim();
            if (!name && !contact && !email && !message) return;

            pageCtx.panels.quoteMessages?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item"><strong>${escapeHtml(name || '访客')}</strong><br>${escapeHtml(contact)}${contact && email ? ' / ' : ''}${escapeHtml(email)}<p>${escapeHtml(message)}</p></div>`);
            fields.forEach(input => {
                if (input) input.value = '';
            });
        }

        function setQuickAiMessage(button) {
            if (pageCtx.panels.aiInput) pageCtx.panels.aiInput.value = button.dataset.msg || '';
        }

        function fillShareLink() {
            const record = getActiveRecord();
            if (pageCtx.panels.shareLink) pageCtx.panels.shareLink.textContent = record?.video?.url || window.location.href;
        }

        return {
            submitPanelComment,
            submitDetailComment,
            submitMobileComment,
            submitAiMessage,
            submitQuoteMessage,
            setQuickAiMessage,
            fillShareLink
        };
    }

    function createShareController(getActiveRecord) {
        function copyLink() {
            const record = getActiveRecord();
            const url = record?.video?.url || window.location.href;

            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url).catch(error => {
                    console.warn('Copy detail video link failed:', error);
                });
            }
        }

        function share(action) {
            const record = getActiveRecord();
            const video = record?.video || {};
            const title = video.title || document.title;
            const url = video.url || window.location.href;

            if (action === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, '_blank');
                return;
            }

            if (action === 'native' && navigator.share) {
                navigator.share({ title, url }).catch(() => {});
                return;
            }

            copyLink();
        }

        return { share };
    }

    function createProductCarouselController(ctx) {
        function activateFirstSlide() {
            scoped(ctx.panels.cartContent, '.carousel-slide')?.classList.add('active');
        }

        function switchImage(button, step) {
            const carousel = button.closest('.product-carousel');
            const slides = scopedAll(carousel, '.carousel-slide');
            if (slides.length < 2) return;

            let current = slides.findIndex(item => item.classList.contains('active'));
            if (current < 0) current = 0;

            const next = (current + step + slides.length) % slides.length;
            slides[current]?.classList.remove('active');
            slides[next]?.classList.add('active');
        }

        function ensureCartMessage() {
            const cartContent = ctx.panels.cartContent;
            if (!cartContent) return;
            if (scoped(cartContent, '.short-video-product') || String(cartContent.textContent || '').trim()) return;
            cartContent.innerHTML = '<div class="short-feed-empty">当前视频未绑定商品。</div>';
        }

        return { activateFirstSlide, switchImage, ensureCartMessage };
    }

    function syncPanelsForRecord(pageCtx, record) {
        if (!record) return;

        if (pageCtx.panels.cartContent) {
            pageCtx.panels.cartContent.innerHTML = record.cartHtml || '<div class="short-feed-empty">当前视频未绑定商品。</div>';
            scoped(pageCtx.panels.cartContent, '.carousel-slide')?.classList.add('active');
        }

        if (pageCtx.panels.shareLink) {
            pageCtx.panels.shareLink.textContent = record.video.url || window.location.href;
        }

        const introBody = byId('shortDetailIntroBody');
        if (introBody) {
            const introText = document.createElement('div');
            introText.className = 'short-feed-intro-text';
            introText.innerHTML = record.video.description || '暂无视频简介。';
            introBody.replaceChildren(introText);
        }

        if (pageCtx.panels.comments) {
            pageCtx.panels.comments.innerHTML = record.panelCommentsHtml || '';
        }

        if (pageCtx.panels.commentCount) {
            pageCtx.panels.commentCount.textContent = String(record.panelCommentCount || 0);
        }
    }

    function setMetaContent(node, value) {
        if (!node || !value) return;
        node.setAttribute('content', value);
    }

    function updateMetadata(pageCtx, record) {
        const video = record?.video;
        if (!video) return;

        if (video.documentTitle) document.title = video.documentTitle;
        if (pageCtx.seo.canonical && video.canonicalUrl) pageCtx.seo.canonical.href = video.canonicalUrl;

        setMetaContent(pageCtx.seo.description, video.metaDescription);
        setMetaContent(pageCtx.seo.ogTitle, video.ogTitle || video.documentTitle || video.title);
        setMetaContent(pageCtx.seo.ogDescription, video.ogDescription || video.metaDescription);
        setMetaContent(pageCtx.seo.ogUrl, video.ogUrl || video.url);
        setMetaContent(pageCtx.seo.ogImage, video.ogImage || video.poster);
        setMetaContent(pageCtx.seo.twitterTitle, video.twitterTitle || video.documentTitle || video.title);
        setMetaContent(pageCtx.seo.twitterDescription, video.twitterDescription || video.metaDescription);
        setMetaContent(pageCtx.seo.twitterImage, video.twitterImage || video.poster);

        if (pageCtx.seo.jsonLd && video.jsonLd) {
            pageCtx.seo.jsonLd.textContent = video.jsonLd;
        }
    }

    function writeHistory(record, replace) {
        const url = record?.video?.url;
        if (!url) return;

        const state = {
            shortVideoDetail: true,
            url,
            contentId: record.video.id || ''
        };

        if (replace) {
            history.replaceState(state, '', url);
            return;
        }

        history.pushState(state, '', url);
    }

    function savePanelStateForRecord(pageCtx, record) {
        if (!record) return;
        record.panelCommentsHtml = pageCtx.panels.comments?.innerHTML || '';
        record.panelCommentCount = Number(pageCtx.panels.commentCount?.textContent || 0);
    }

    function activateRecord(pageCtx, state, record, options = {}) {
        if (!record || !record.slide) return false;

        state.activeRecord = record;
        state.activeSlideContext = createSlideContext(pageCtx, record.slide);
        if (!state.activeSlideContext) return false;

        updateMetadata(pageCtx, record);
        syncPanelsForRecord(pageCtx, record);

        state.activePlayerController = createPlayerController(
            state.activeSlideContext,
            record.video
        );

        if (options.play === true) {
            state.activePlayerController.play();
        } else {
            state.activePlayerController.prepare();
        }

        return true;
    }

    function findSlideIndexByRecordKey(swiper, key) {
        if (!swiper || !key) return -1;
        return Array.from(swiper.slides || []).findIndex(slide => slide.dataset.recordKey === key);
    }

    async function prefetchAdjacentRecords(pageCtx, state, record) {
        if (!record) return;

        await Promise.allSettled([
            record.video.prevUrl ? fetchDetailRecord(pageCtx, record.video.prevUrl, state) : null,
            record.video.nextUrl ? fetchDetailRecord(pageCtx, record.video.nextUrl, state) : null
        ].filter(Boolean));
    }

    function hasRecordSlide(pageCtx, record) {
        if (!record) return false;
        return scopedAll(pageCtx.wrapper, '.short-feed-slide').some(slide => {
            return slide.dataset.recordKey === record.key;
        });
    }

    function appendRecordSlide(pageCtx, state, record, position) {
        if (!record || !record.slide) return;
        if (hasRecordSlide(pageCtx, record)) return;

        record.slide.dataset.recordKey = record.key;

        if (state.swiper && typeof state.swiper.appendSlide === 'function') {
            if (position === 'prepend' && typeof state.swiper.prependSlide === 'function') {
                const activeKey = state.activeRecord?.key || '';
                state.swiper.prependSlide(record.slide);
                state.swiper.update();
                const newIndex = findSlideIndexByRecordKey(state.swiper, activeKey);
                if (newIndex >= 0) state.swiper.slideTo(newIndex, 0, false);
                return;
            }

            state.swiper.appendSlide(record.slide);
            state.swiper.update();
            return;
        }

        if (position === 'prepend') {
            pageCtx.wrapper.insertBefore(record.slide, pageCtx.wrapper.firstChild);
            return;
        }

        pageCtx.wrapper.appendChild(record.slide);
    }

    async function ensureAdjacentRecords(pageCtx, state, record) {
        if (!state.isMobileFeed || !state.swiper || !record) return;

        if (record.video.prevUrl) {
            const prevRecord = await fetchDetailRecord(pageCtx, record.video.prevUrl, state);
            if (prevRecord) appendRecordSlide(pageCtx, state, prevRecord, 'prepend');
        }

        if (record.video.nextUrl) {
            const nextRecord = await fetchDetailRecord(pageCtx, record.video.nextUrl, state);
            if (nextRecord) appendRecordSlide(pageCtx, state, nextRecord, 'append');
        }
    }

    async function initMobileFeed(pageCtx, state) {
        if (!window.matchMedia(MOBILE_QUERY).matches) return;
        if (typeof Swiper === 'undefined') {
            console.error('Swiper SDK not loaded');
            return;
        }

        const currentRecord = state.activeRecord;
        if (!currentRecord) return;

        await prefetchAdjacentRecords(pageCtx, state, currentRecord);

        const prevRecord = currentRecord.video.prevUrl
            ? state.recordsByUrl.get(currentRecord.video.prevUrl)
            : null;
        const nextRecord = currentRecord.video.nextUrl
            ? state.recordsByUrl.get(currentRecord.video.nextUrl)
            : null;

        if (!prevRecord && !nextRecord) return;

        currentRecord.slide.dataset.recordKey = currentRecord.key;

        if (prevRecord) appendRecordSlide(pageCtx, state, prevRecord, 'prepend');
        if (nextRecord) appendRecordSlide(pageCtx, state, nextRecord, 'append');

        const initialSlide = prevRecord ? 1 : 0;
        state.isMobileFeed = true;

        state.swiper = new Swiper(pageCtx.frame, {
            direction: 'vertical',
            initialSlide,
            speed: 420,
            slidesPerView: 1,
            resistanceRatio: 0.45,
            preventInteractionOnTransition: true,
            observer: true,
            observeParents: true,
            noSwiping: true,
            noSwipingSelector: [
                'a',
                'input',
                'textarea',
                '.short-feed-mobile-close',
                '.mobile-slide-sidebar button',
                '.short-feed-mobile-bottombar button',
                '.short-feed-mobile-comment',
                '.sound-control-btn',
                '.video-progress-track',
                '.short-feed-action-panels'
            ].join(','),
            on: {
                slideChangeTransitionStart() {
                    state.isSwitching = true;
                    savePanelStateForRecord(pageCtx, state.activeRecord);
                    state.activePlayerController?.pause();
                    state.activePlayerController?.destroy();
                    state.activePlayerController = null;
                },

                slideChangeTransitionEnd() {
                    const activeSlide = this.slides[this.activeIndex];
                    const key = activeSlide?.dataset.recordKey || '';
                    const record = state.recordsByUrl.get(key);
                    if (record) {
                        activateRecord(pageCtx, state, record, { play: true });

                        if (!state.suppressHistory) {
                            writeHistory(record, false);
                        }

                        ensureAdjacentRecords(pageCtx, state, record).catch(error => {
                            console.warn('Ensure adjacent short detail records failed:', error);
                        });
                    }
                    state.isSwitching = false;
                }
            }
        });
    }

    function bindPanelEvents(ctx, panelController, formController, shareController, productCarousel) {
        ctx.mask?.addEventListener('click', panelController.closeAll);
        ctx.panels.commentSubmit?.addEventListener('click', formController.submitPanelComment);
        ctx.panels.aiSubmit?.addEventListener('click', formController.submitAiMessage);
        ctx.panels.quoteSubmit?.addEventListener('click', formController.submitQuoteMessage);

        ctx.panelsRoot?.addEventListener('click', event => {
            const closeBtn = event.target.closest('[data-short-panel-close]');
            if (closeBtn) {
                event.preventDefault();
                panelController.closeAll();
                return;
            }

            const shareItem = event.target.closest('[data-share-action]');
            if (shareItem) {
                event.preventDefault();
                shareController.share(shareItem.dataset.shareAction || 'copy');
                return;
            }

            const quickAiBtn = event.target.closest('.ai-chat-quick-btn');
            if (quickAiBtn) {
                event.preventDefault();
                formController.setQuickAiMessage(quickAiBtn);
                return;
            }

            const prevBtn = event.target.closest('[data-product-carousel-prev]');
            const nextBtn = event.target.closest('[data-product-carousel-next]');
            if (prevBtn || nextBtn) {
                event.preventDefault();
                productCarousel.switchImage(prevBtn || nextBtn, prevBtn ? -1 : 1);
            }
        });
    }

    function bindPlayerSurfaceEvents(pageCtx, state, panelController, formController, productCarousel) {
        function getActivePlayerController() {
            return state.activePlayerController;
        }

        function isFromActiveSlide(target) {
            const slide = target.closest('.short-feed-slide');
            return !slide || slide === state.activeSlideContext?.slide;
        }

        pageCtx.root.addEventListener('click', event => {
            if (!isFromActiveSlide(event.target)) return;

            if (event.target.closest('.short-feed-desktop-detail a[href], .video-info-overlay a[href], .m-home-btn')) {
                return;
            }

            if (event.target.closest('[data-detail-intro], .m-intro-btn')) {
                event.preventDefault();
                event.stopPropagation();
                panelController.open(PANEL_IDS.intro);
                return;
            }

            if (event.target.closest('[data-detail-ai], .m-ai-btn')) {
                event.preventDefault();
                event.stopPropagation();
                panelController.open(PANEL_IDS.ai);
                return;
            }

            if (event.target.closest('[data-detail-quote], .m-quote-btn')) {
                event.preventDefault();
                event.stopPropagation();
                panelController.open(PANEL_IDS.quote);
                return;
            }

            if (event.target.closest('[data-detail-cart], .m-cart-btn')) {
                event.preventDefault();
                event.stopPropagation();
                productCarousel.ensureCartMessage();
                panelController.open(PANEL_IDS.cart);
                return;
            }

            if (event.target.closest('[data-detail-share], .m-share-btn')) {
                event.preventDefault();
                event.stopPropagation();
                formController.fillShareLink();
                panelController.open(PANEL_IDS.share);
                return;
            }

            const likeBtn = event.target.closest('[data-detail-like], [data-detail-save], .m-like-btn');
            if (likeBtn) {
                event.preventDefault();
                event.stopPropagation();
                const span = scoped(likeBtn, 'span');
                if (span && !likeBtn.classList.contains('active') && !likeBtn.classList.contains('m-liked')) {
                    span.textContent = String(Number(span.textContent || 0) + 1);
                }
                likeBtn.classList.toggle('active');
                likeBtn.classList.toggle('m-liked');
                return;
            }

            if (event.target.closest('.short-feed-mobile-emoji')) {
                event.preventDefault();
                event.stopPropagation();
                panelController.open(PANEL_IDS.comment);
                return;
            }

            if (event.target.closest('[data-mobile-comment-submit]')) {
                event.preventDefault();
                event.stopPropagation();
                formController.submitMobileComment();
                return;
            }

            if (event.target.closest('[data-mobile-comment-input]')) {
                event.stopPropagation();
                return;
            }

            if (event.target.closest('[data-detail-comment-submit]')) {
                event.preventDefault();
                event.stopPropagation();
                formController.submitDetailComment();
                return;
            }

            const mobileCloseBtn = event.target.closest('.short-feed-mobile-close');
            if (mobileCloseBtn) {
                event.preventDefault();
                event.stopPropagation();

                const listUrl = normalizeUrl(mobileCloseBtn.dataset.listUrl);
                window.location.assign(listUrl || '/');
                return;
            }

            if (event.target.closest('.sound-control-btn')) {
                event.preventDefault();
                event.stopPropagation();
                getActivePlayerController()?.toggleSound();
                return;
            }

            if (event.target.closest('.mobile-slide-sidebar, .fullscreen-btn')) return;
            if (state.isSwitching) return;
            if (state.swiper && state.swiper.allowClick === false) return;

            const videoTapSurface = event.target.closest(
                '.short-feed-video-box, .center-play-btn'
            );

            if (!videoTapSurface) return;

            event.preventDefault();
            event.stopPropagation();
            getActivePlayerController()?.toggle();
        });

        pageCtx.root.addEventListener('keydown', event => {
            const ctx = state.activeSlideContext;
            if (event.key === 'Enter' && event.target === ctx?.mobileCommentInput) {
                event.preventDefault();
                formController.submitMobileComment();
                return;
            }

            if (event.key !== 'Enter' || event.target !== ctx?.detailCommentInput) return;
            event.preventDefault();
            formController.submitDetailComment();
        });

        pageCtx.root.addEventListener('pointerdown', event => {
            const track = event.target.closest('.video-progress-track');
            if (!track || !isFromActiveSlide(event.target)) return;
            const playerController = getActivePlayerController();
            if (!track) return;

            event.preventDefault();
            event.stopPropagation();
            playerController?.seekFromPointer(event, track);

            const handlePointerMove = moveEvent => {
                moveEvent.preventDefault();
                playerController?.seekFromPointer(moveEvent, track);
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
    }

    function bindHistoryEvents(pageCtx, state) {
        window.addEventListener('popstate', event => {
            const historyState = event.state;
            if (!historyState?.shortVideoDetail) return;

            const targetUrl = normalizeUrl(historyState.url);
            const record = targetUrl ? state.recordsByUrl.get(targetUrl) : null;

            if (!record || !state.swiper) {
                window.location.href = targetUrl || window.location.href;
                return;
            }

            const targetIndex = findSlideIndexByRecordKey(state.swiper, record.key);
            if (targetIndex < 0) {
                window.location.href = targetUrl;
                return;
            }

            state.suppressHistory = true;
            state.swiper.slideTo(targetIndex, 420);
            window.setTimeout(() => {
                state.suppressHistory = false;
            }, 460);
        });

        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', event => {
                if (!event.matches && state.isMobileFeed && state.activeRecord?.video?.url) {
                    window.location.href = state.activeRecord.video.url;
                }
            });
        }
    }

    function initShortVideoDetail() {
        const pageCtx = createPageContext();
        if (!pageCtx) return;

        const initialSlide = scoped(pageCtx.wrapper, '.short-feed-slide');
        const slideCtx = createSlideContext(pageCtx, initialSlide);
        if (!slideCtx) return;

        const video = readVideoData(pageCtx.dataNode);
        const currentRecord = createVideoRecord(video, slideCtx.slide, {
            cartHtml: pageCtx.panels.cartContent?.innerHTML || '',
            panelCommentsHtml: pageCtx.panels.comments?.innerHTML || '',
            panelCommentCount: Number(pageCtx.panels.commentCount?.textContent || 0),
            sourceUrl: video.url,
            loadedFromNetwork: false
        });
        const state = {
            swiper: null,
            activeRecord: currentRecord,
            activeSlideContext: slideCtx,
            activePlayerController: null,
            recordsByUrl: new Map([[currentRecord.key, currentRecord]]),
            loadPromises: new Map(),
            isMobileFeed: false,
            isSwitching: false,
            suppressHistory: false,
            destroyed: false
        };
        const playerController = createPlayerController(slideCtx, video);
        state.activePlayerController = playerController;
        const panelController = createPanelController(pageCtx, state);
        const formController = createFormController(
            pageCtx,
            () => state.activeRecord,
            () => state.activeSlideContext
        );
        const shareController = createShareController(() => state.activeRecord);
        const productCarousel = createProductCarouselController(pageCtx);

        productCarousel.activateFirstSlide();
        bindPanelEvents(pageCtx, panelController, formController, shareController, productCarousel);
        bindPlayerSurfaceEvents(pageCtx, state, panelController, formController, productCarousel);
        bindHistoryEvents(pageCtx, state);
        writeHistory(currentRecord, true);
        playerController.prepare();
        initMobileFeed(pageCtx, state).catch(error => {
            console.warn('Mobile short detail feed init failed:', error);
        });

        window.addEventListener('beforeunload', () => {
            state.destroyed = true;
            state.activePlayerController?.destroy();
        });
    }

    ready(initShortVideoDetail);
})();
