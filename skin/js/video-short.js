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

    function readVideoData(dataNode) {
        return {
            id: dataNode.dataset.contentId || '',
            title: getFieldText(dataNode, 'title') || document.title,
            url: dataNode.dataset.url || window.location.href,
            poster: dataNode.dataset.poster || '',
            category: dataNode.dataset.category || '',
            description: getFieldText(dataNode, 'description') || '',
            duration: dataNode.dataset.duration || '00:00',
            date: dataNode.dataset.date || '',
            visits: dataNode.dataset.views || '0',
            fileId: dataNode.dataset.fileId || '',
            licenseUrl: dataNode.dataset.licenseUrl || '',
            licenseKey: dataNode.dataset.licenseKey || '',
            signApi: dataNode.dataset.signApi || '/api/tencent-vod-psign.php',
            layout: null
        };
    }

    function createContext() {
        const dataNode = byId('shortVideoInitialData');
        const root = byId('shortDetailOverlay');
        const panelsRoot = byId('shortDetailActionPanels');

        if (!dataNode || !root) return null;

        const slide = scoped(root, '.short-feed-slide');
        const card = scoped(root, '.video-card-container');
        const videoBox = scoped(root, '.short-feed-video-box');
        const videoElement = scoped(root, '.short-feed-video');

        if (!slide || !card || !videoBox || !videoElement) return null;

        return {
            dataNode,
            root,
            panelsRoot,
            mask: byId('shortDetailPanelMask'),
            slide,
            card,
            videoBox,
            videoElement,
            centerPlayBtn: scoped(root, '.center-play-btn'),
            progressTrack: scoped(root, '.video-progress-track'),
            progressBar: scoped(root, '.video-progress-bar'),
            currentTime: scoped(root, '.current-time'),
            duration: scoped(root, '.duration'),
            soundButton: scoped(root, '.sound-control-btn'),
            detailComments: scoped(root, '.short-feed-detail-comments'),
            detailCommentInput: scoped(root, '[data-detail-comment-input]'),
            detailCommentSubmit: scoped(root, '[data-detail-comment-submit]'),
            mobileCommentInput: scoped(root, '[data-mobile-comment-input]'),
            mobileCommentSubmit: scoped(root, '[data-mobile-comment-submit]'),
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
            }
        };
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

    function createPanelController(ctx) {
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
        }

        function open(panelId) {
            closeAll();
            setMask(true);
            byId(panelId)?.classList.add('active');
        }

        return { open, closeAll };
    }

    function createFormController(ctx, video) {
        function submitPanelComment() {
            const input = ctx.panels.commentInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            ctx.panels.comments?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
            input.value = '';

            if (ctx.panels.commentCount) {
                ctx.panels.commentCount.textContent = String(Number(ctx.panels.commentCount.textContent || 0) + 1);
            }
        }

        function submitDetailComment() {
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
            const input = ctx.mobileCommentInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            ctx.panels.comments?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item">${escapeHtml(text)}</div>`);
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

            if (ctx.panels.commentCount) {
                ctx.panels.commentCount.textContent = String(Number(ctx.panels.commentCount.textContent || 0) + 1);
            }

            input.value = '';
            input.blur();
        }

        function submitAiMessage() {
            const input = ctx.panels.aiInput;
            const text = String(input?.value || '').trim();
            if (!text) return;

            ctx.panels.aiBody?.insertAdjacentHTML('beforeend', `<div class="ai-chat-message user">${escapeHtml(text)}</div><div class="ai-chat-message bot">已收到，我们会根据您的问题尽快为您提供帮助。</div>`);
            input.value = '';
            if (ctx.panels.aiBody) ctx.panels.aiBody.scrollTop = ctx.panels.aiBody.scrollHeight;
        }

        function submitQuoteMessage() {
            const fields = [
                ctx.panels.quoteName,
                ctx.panels.quoteContact,
                ctx.panels.quoteEmail,
                ctx.panels.quoteMessage
            ];
            const name = String(ctx.panels.quoteName?.value || '').trim();
            const contact = String(ctx.panels.quoteContact?.value || '').trim();
            const email = String(ctx.panels.quoteEmail?.value || '').trim();
            const message = String(ctx.panels.quoteMessage?.value || '').trim();
            if (!name && !contact && !email && !message) return;

            ctx.panels.quoteMessages?.insertAdjacentHTML('beforeend', `<div class="short-feed-comment-item"><strong>${escapeHtml(name || '访客')}</strong><br>${escapeHtml(contact)}${contact && email ? ' / ' : ''}${escapeHtml(email)}<p>${escapeHtml(message)}</p></div>`);
            fields.forEach(input => {
                if (input) input.value = '';
            });
        }

        function setQuickAiMessage(button) {
            if (ctx.panels.aiInput) ctx.panels.aiInput.value = button.dataset.msg || '';
        }

        function fillShareLink() {
            if (ctx.panels.shareLink) ctx.panels.shareLink.textContent = video.url;
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

    function createShareController(video) {
        function copyLink() {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(video.url).catch(error => {
                    console.warn('Copy detail video link failed:', error);
                });
            }
        }

        function share(action) {
            if (action === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(`${video.title} ${video.url}`)}`, '_blank');
                return;
            }

            if (action === 'native' && navigator.share) {
                navigator.share({ title: video.title, url: video.url }).catch(() => {});
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

    function bindPlayerSurfaceEvents(ctx, playerController, panelController, formController, productCarousel) {
        ctx.root.addEventListener('click', event => {
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

            if (event.target.closest('.short-feed-mobile-close')) {
                event.preventDefault();
                event.stopPropagation();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/';
                }
                return;
            }

            if (event.target.closest('.sound-control-btn')) {
                event.preventDefault();
                event.stopPropagation();
                playerController.toggleSound();
                return;
            }

            if (event.target.closest('.mobile-slide-sidebar, .fullscreen-btn')) return;
            if (!event.target.closest('.video-portrait, .center-play-btn')) return;

            event.preventDefault();
            event.stopPropagation();
            playerController.toggle();
        });

        ctx.root.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target === ctx.mobileCommentInput) {
                event.preventDefault();
                formController.submitMobileComment();
                return;
            }

            if (event.key !== 'Enter' || event.target !== ctx.detailCommentInput) return;
            event.preventDefault();
            formController.submitDetailComment();
        });

        ctx.slide.addEventListener('pointerdown', event => {
            const track = event.target.closest('.video-progress-track');
            if (!track) return;

            event.preventDefault();
            event.stopPropagation();
            playerController.seekFromPointer(event, track);

            const handlePointerMove = moveEvent => {
                moveEvent.preventDefault();
                playerController.seekFromPointer(moveEvent, track);
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

    function initShortVideoDetail() {
        const ctx = createContext();
        if (!ctx) return;

        const video = readVideoData(ctx.dataNode);
        const playerController = createPlayerController(ctx, video);
        const panelController = createPanelController(ctx);
        const formController = createFormController(ctx, video);
        const shareController = createShareController(video);
        const productCarousel = createProductCarouselController(ctx);

        productCarousel.activateFirstSlide();
        bindPanelEvents(ctx, panelController, formController, shareController, productCarousel);
        bindPlayerSurfaceEvents(ctx, playerController, panelController, formController, productCarousel);
        playerController.prepare();

        window.addEventListener('beforeunload', playerController.destroy);
    }

    ready(initShortVideoDetail);
})();
