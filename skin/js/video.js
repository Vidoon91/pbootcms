
        (function() {
            const bodyScrollLocks = new Set();
            function setBodyScrollLock(lockKey, shouldLock) {
                if (shouldLock) {
                    bodyScrollLocks.add(lockKey);
                } else {
                    bodyScrollLocks.delete(lockKey);
                }
                document.body.style.overflow = bodyScrollLocks.size > 0 ? 'hidden' : '';
            }
            
            // 分享
            const shareBtn = document.getElementById('shareBtn');
            const shareCountSpan = document.getElementById('shareCount');
            let shareCount = 128;
            if (shareBtn) {
                shareBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    shareCount++;
                    if (shareCountSpan) shareCountSpan.innerText = shareCount;
                    openSharePopup();
                });
            }
            
            // 收藏
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    alert('请点击“分享”按钮复制链接，再将链接保存到浏览器收藏夹或常用文档中。');
                });
            }

            // 视频描述折叠展开
            const videoDescription = document.getElementById('videoDescription');
            const videoDescriptionToggle = document.getElementById('videoDescriptionToggle');
            function updateDescriptionToggleVisibility() {
                if (!videoDescription || !videoDescriptionToggle) return;
                videoDescription.classList.add('is-collapsed');
                const shouldShowToggle = videoDescription.scrollWidth > videoDescription.clientWidth;
                videoDescriptionToggle.style.display = shouldShowToggle ? 'inline-flex' : 'none';
            }
            if (videoDescription && videoDescriptionToggle) {
                updateDescriptionToggleVisibility();
                videoDescriptionToggle.addEventListener('click', function() {
                    const isExpanded = videoDescriptionToggle.getAttribute('aria-expanded') === 'true';
                    videoDescription.classList.toggle('is-collapsed', isExpanded);
                    videoDescriptionToggle.classList.toggle('is-expanded', !isExpanded);
                    videoDescriptionToggle.setAttribute('aria-expanded', String(!isExpanded));
                    const toggleText = videoDescriptionToggle.querySelector('span');
                    if (toggleText) toggleText.innerText = isExpanded ? '展开' : '收起';
                });
                window.addEventListener('resize', updateDescriptionToggleVisibility);
            }
            
            // 轮播图
            const slides = document.querySelectorAll('#carouselSlides .carousel-slide');
            const prevBtn = document.getElementById('carouselPrev');
            const nextBtn = document.getElementById('carouselNext');
            const dotsContainer = document.getElementById('carouselDots');
            let currentIndex = 0;
            let autoInterval;
            if (slides.length > 0 && !document.querySelector('#carouselSlides .carousel-slide.active')) {
                slides[0].classList.add('active');
            }
            function createDots() {
                if (!dotsContainer) return;
                dotsContainer.innerHTML = '';
                slides.forEach((_, index) => {
                    const dot = document.createElement('div');
                    dot.classList.add('carousel-dot');
                    if (index === currentIndex) dot.classList.add('active');
                    dot.addEventListener('click', () => goToSlide(index));
                    dotsContainer.appendChild(dot);
                });
            }
            function updateDots() {
                const dots = document.querySelectorAll('.carousel-dot');
                dots.forEach((dot, idx) => {
                    if (idx === currentIndex) dot.classList.add('active');
                    else dot.classList.remove('active');
                });
            }
            function goToSlide(index) {
                if (index < 0) index = slides.length - 1;
                if (index >= slides.length) index = 0;
                slides[currentIndex].classList.remove('active');
                currentIndex = index;
                slides[currentIndex].classList.add('active');
                updateDots();
                resetAutoPlay();
            }
            function nextSlide() { goToSlide(currentIndex + 1); }
            function prevSlide() { goToSlide(currentIndex - 1); }
            function startAutoPlay() {
                if (autoInterval) clearInterval(autoInterval);
                autoInterval = setInterval(nextSlide, 5000);
            }
            function resetAutoPlay() {
                if (autoInterval) {
                    clearInterval(autoInterval);
                    startAutoPlay();
                }
            }
            if (slides.length > 0 && prevBtn && nextBtn) {
                createDots();
                startAutoPlay();
                prevBtn.addEventListener('click', prevSlide);
                nextBtn.addEventListener('click', nextSlide);
                const carousel = document.getElementById('productCarousel');
                if (carousel) {
                    carousel.addEventListener('mouseenter', () => clearInterval(autoInterval));
                    carousel.addEventListener('mouseleave', startAutoPlay);
                }
            }
            
            // 评论提交
            const commentListDiv = document.getElementById('commentList');
            const modalCommentListDiv = document.getElementById('modalCommentList');
            const commentIconCount = document.getElementById('commentCountIcon');
            const modalCommentTotal = document.getElementById('modalCommentTotal');
            const commentSection = document.getElementById('commentSection');
            const serverCommentLoginUrl = commentSection ? commentSection.dataset.loginUrl : '';
            const serverCommentIsLogin = commentSection ? commentSection.dataset.isLogin === '1' : false;
            const serverCommentStepSize = 5;
            let serverCommentDisplayCount = serverCommentStepSize;

            function getServerCommentItems(container) {
                if (!container) return [];
                return Array.from(container.querySelectorAll(':scope > .comment-item'));
            }

            function resetServerCommentCloneState(container) {
                if (!container) return;
                container.querySelectorAll('.comment-item, .reply-item').forEach(item => {
                    item.style.display = '';
                });
                container.querySelectorAll('.reply-btn, .reply-reply-btn').forEach(btn => {
                    btn.removeAttribute('data-bound');
                });
                container.querySelectorAll('.reply-input-area, .nested-reply-input-area').forEach(area => {
                    area.classList.remove('active');
                });
                container.querySelectorAll('form.comment-input-area, form.reply-input-area, form.nested-reply-input-area').forEach(form => {
                    form.removeAttribute('data-server-submit-bound');
                });
                container.querySelectorAll('.comment-captcha-fields').forEach(fields => {
                    fields.classList.remove('is-visible');
                    fields.setAttribute('aria-hidden', 'true');
                });
                container.querySelectorAll('.comment-checkcode').forEach(input => {
                    input.required = false;
                });
            }

            function syncServerModalComments() {
                if (!commentListDiv || !modalCommentListDiv) return;
                modalCommentListDiv.innerHTML = commentListDiv.innerHTML;
                resetServerCommentCloneState(modalCommentListDiv);
            }

            function updateServerCommentVisibility(container, loadMoreContainer) {
                const items = getServerCommentItems(container);
                items.forEach((item, index) => {
                    item.style.display = index < serverCommentDisplayCount ? '' : 'none';
                });
                if (loadMoreContainer) {
                    loadMoreContainer.style.display = items.length > serverCommentDisplayCount ? 'block' : 'none';
                }
            }

            function bindServerReplyEvents(container) {
                if (!container) return;
                container.querySelectorAll('.comment-item').forEach((commentItem) => {
                    const replyBtn = commentItem.querySelector('.reply-btn');
                    const replyInputArea = commentItem.querySelector('.reply-input-area');
                    if (!replyBtn || !replyInputArea || replyBtn.dataset.bound === '1') return;
                    replyBtn.dataset.bound = '1';
                    replyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.reply-input-area').forEach(area => {
                            if (area !== replyInputArea) area.classList.remove('active');
                        });
                        replyInputArea.classList.toggle('active');
                        if (replyInputArea.classList.contains('active')) {
                            const input = replyInputArea.querySelector('.reply-input');
                            if (input) input.focus();
                        }
                    });
                });
                container.querySelectorAll('.reply-item').forEach((replyItem) => {
                    const replyBtn = replyItem.querySelector('.reply-reply-btn');
                    const replyInputArea = replyItem.querySelector('.nested-reply-input-area');
                    if (!replyBtn || !replyInputArea || replyBtn.dataset.bound === '1') return;
                    replyBtn.dataset.bound = '1';
                    replyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.nested-reply-input-area').forEach(area => {
                            if (area !== replyInputArea) area.classList.remove('active');
                        });
                        replyInputArea.classList.toggle('active');
                        if (replyInputArea.classList.contains('active')) {
                            const input = replyInputArea.querySelector('.nested-reply-input');
                            if (input) input.focus();
                        }
                    });
                });
            }

            function prepareServerCommentForm(form) {
                if (!form || form.dataset.serverSubmitBound === '1') return;
                form.dataset.serverSubmitBound = '1';
                form.addEventListener('submit', (e) => {
                    if (!serverCommentIsLogin && serverCommentLoginUrl) {
                        e.preventDefault();
                        alert('请先登录后发表评论，没有账号请先注册。');
                        window.location.href = serverCommentLoginUrl;
                        return;
                    }

                    const captchaWrap = form.querySelector('.comment-captcha-fields');
                    const captchaInput = form.querySelector('.comment-checkcode');
                    if (captchaWrap && !captchaWrap.classList.contains('is-visible')) {
                        e.preventDefault();
                        captchaWrap.classList.add('is-visible');
                        captchaWrap.setAttribute('aria-hidden', 'false');
                        if (captchaInput) {
                            captchaInput.required = true;
                            captchaInput.focus();
                        }
                        return;
                    }

                    if (captchaInput) captchaInput.required = true;

                    if (!window.fetch) return;

                    e.preventDefault();
                    const submitButton = e.submitter || form.querySelector('button[type="submit"]');
                    const originalButtonText = submitButton ? submitButton.textContent : '';
                    if (submitButton) {
                        submitButton.disabled = true;
                        submitButton.textContent = '提交中...';
                    }

                    fetch(form.action, {
                        method: 'POST',
                        body: new FormData(form),
                        credentials: 'same-origin',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                        .then(response => response.json())
                        .then(result => {
                            const message = typeof result.data === 'string' ? result.data : '提交完成';
                            alert(message);
                            if (Number(result.code) === 1) {
                                window.location.reload();
                                return;
                            }
                            if (captchaInput) captchaInput.value = '';
                            const captchaImg = form.querySelector('.comment-code-img');
                            if (captchaImg) {
                                captchaImg.src = captchaImg.src.split('?')[0] + '?' + Math.round(Math.random() * 10);
                            }
                        })
                        .catch(() => {
                            alert('提交失败，请稍后再试。');
                        })
                        .finally(() => {
                            if (submitButton) {
                                submitButton.disabled = false;
                                submitButton.textContent = originalButtonText;
                            }
                        });
                });
            }

            function bindServerCommentForms(container) {
                if (!container) return;
                container.querySelectorAll('form.comment-input-area, form.reply-input-area, form.nested-reply-input-area').forEach(prepareServerCommentForm);
            }

            function initServerComments() {
                const mainLoadMoreContainer = document.getElementById('loadMoreCommentsBtnContainer');
                const modalLoadMoreContainer = document.getElementById('modalLoadMoreCommentsBtnContainer');
                syncServerModalComments();
                bindServerCommentForms(document);
                bindServerReplyEvents(commentListDiv);
                bindServerReplyEvents(modalCommentListDiv);
                updateServerCommentVisibility(commentListDiv, mainLoadMoreContainer);
                updateServerCommentVisibility(modalCommentListDiv, modalLoadMoreContainer);
                syncCommentCount();
            }
            
            function syncCommentCount() {
                const total = getServerCommentItems(commentListDiv).length;
                if (modalCommentTotal) modalCommentTotal.innerText = total;
                if (commentIconCount) commentIconCount.innerText = total;
            }
            
            const loadMoreBtn = document.getElementById('loadMoreCommentsBtn');
            const modalLoadMoreBtn = document.getElementById('modalLoadMoreCommentsBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', function() {
                    serverCommentDisplayCount += serverCommentStepSize;
                    initServerComments();
                });
            }
            if (modalLoadMoreBtn) {
                modalLoadMoreBtn.addEventListener('click', function() {
                    serverCommentDisplayCount += serverCommentStepSize;
                    initServerComments();
                });
            }
            
            initServerComments();
            
            // 移动端评论弹窗
            const commentIconBtn = document.getElementById('commentIconBtn');
            const commentModal = document.getElementById('commentModal');
            const modalOverlay = document.getElementById('commentModalOverlay');
            const modalClose = document.getElementById('commentModalClose');
            
            function openCommentModal() {
                if (!commentModal || !modalOverlay) return;
                commentModal.classList.add('active');
                modalOverlay.classList.add('active');
                setBodyScrollLock('comments', true);
            }
            function closeCommentModal() {
                if (!commentModal || !modalOverlay) return;
                commentModal.classList.remove('active');
                modalOverlay.classList.remove('active');
                setBodyScrollLock('comments', false);
            }
            if (commentIconBtn) {
                commentIconBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (window.innerWidth <= 768) {
                        openCommentModal();
                    }
                });
            }
            if (modalClose) modalClose.addEventListener('click', closeCommentModal);
            if (modalOverlay) modalOverlay.addEventListener('click', closeCommentModal);
            
            // 推荐视频显示更多
            const relatedList = document.getElementById('relatedList');
            const loadMoreVideoBtn = document.getElementById('loadMoreBtn');
            const allRelatedItems = relatedList ? Array.from(relatedList.querySelectorAll('.related-item')) : [];
            const defaultShowCount = 5;
            let currentVideoShowCount = defaultShowCount;
            function updateMobileDisplay() {
                if (window.innerWidth > 768) {
                    allRelatedItems.forEach(item => item.style.display = 'flex');
                    if (loadMoreVideoBtn) loadMoreVideoBtn.style.display = 'none';
                } else {
                    allRelatedItems.forEach((item, index) => {
                        item.style.display = index < currentVideoShowCount ? 'flex' : 'none';
                    });
                    if (loadMoreVideoBtn) {
                        if (currentVideoShowCount >= allRelatedItems.length) {
                            loadMoreVideoBtn.style.display = 'none';
                        } else {
                            loadMoreVideoBtn.style.display = 'block';
                        }
                    }
                }
            }
            if (loadMoreVideoBtn && allRelatedItems.length > defaultShowCount) {
                loadMoreVideoBtn.addEventListener('click', function() {
                    currentVideoShowCount = allRelatedItems.length;
                    updateMobileDisplay();
                });
            }
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) currentVideoShowCount = defaultShowCount;
                updateMobileDisplay();
            });
            updateMobileDisplay();

            // Read Tencent VOD metadata instead of a manually maintained duration field.
            const relatedDurationNodes = Array.from(document.querySelectorAll('[data-video-duration]'));
            let durationProbeIndex = 0;

            function formatTencentDuration(seconds) {
                const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;
                const pad = (value) => String(value).padStart(2, '0');
                return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
            }

            async function fetchRelatedTencentVodSignature(contentId, signApi) {
                const response = await fetch(`${signApi}?contentId=${encodeURIComponent(contentId)}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' }
                });
                const result = await response.json();
                if (!response.ok || !result || Number(result.code) !== 0 || !result.data) {
                    throw new Error(result && result.message ? result.message : `Signature request failed: ${response.status}`);
                }
                return result.data;
            }

            function createDurationProbeElement() {
                const probeId = `relatedDurationProbe_${Date.now()}_${durationProbeIndex++}`;
                const wrap = document.createElement('div');
                wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
                const probeVideo = document.createElement('video');
                probeVideo.id = probeId;
                probeVideo.setAttribute('playsinline', '');
                probeVideo.setAttribute('webkit-playsinline', '');
                probeVideo.preload = 'metadata';
                wrap.appendChild(probeVideo);
                document.body.appendChild(wrap);
                return { wrap, probeId };
            }

            function readTencentPlayerDuration(player) {
                if (!player || typeof player.duration !== 'function') return 0;
                const duration = Number(player.duration());
                return Number.isFinite(duration) ? duration : 0;
            }

            async function probeTencentVideoDuration(contentId, signApi) {
                if (typeof TCPlayer === 'undefined') {
                    throw new Error('TCPlayer SDK not loaded');
                }

                const signData = await fetchRelatedTencentVodSignature(contentId, signApi);
                const appID = String(signData.appId || '').trim();
                const fileID = String(signData.fileId || '').trim();
                const psign = String(signData.psign || '').trim();
                const licenseUrl = String(signData.licenseUrl || '').trim();
                const licenseKey = String(signData.licenseKey || '').trim();

                if (!appID || !fileID || !psign) {
                    throw new Error('Signature response missing appId, fileId or psign');
                }

                const probe = createDurationProbeElement();
                let probePlayer = null;

                return new Promise((resolve, reject) => {
                    let settled = false;
                    const cleanup = () => {
                        if (probePlayer) {
                            try {
                                if (typeof probePlayer.dispose === 'function') {
                                    probePlayer.dispose();
                                } else if (typeof probePlayer.destroy === 'function') {
                                    probePlayer.destroy();
                                } else if (typeof probePlayer.pause === 'function') {
                                    probePlayer.pause();
                                }
                            } catch (err) {
                                console.warn('Dispose related duration probe failed:', err);
                            }
                        }
                        probe.wrap.remove();
                    };
                    const finish = (duration) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        cleanup();
                        resolve(duration);
                    };
                    const fail = (error) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        cleanup();
                        reject(error);
                    };
                    const tryResolveDuration = () => {
                        const duration = readTencentPlayerDuration(probePlayer);
                        if (duration > 0) finish(duration);
                    };
                    const timer = setTimeout(() => fail(new Error('Duration probe timeout')), 12000);

                    try {
                        const probeOptions = {
                            appID,
                            fileID,
                            psign,
                            width: '1px',
                            height: '1px',
                            autoplay: false,
                            controls: false,
                            preload: 'metadata',
                            language: 'zh-CN',
                            playsinline: true,
                            html5: {
                                nativeControlsForTouch: false
                            }
                        };

                        if (licenseUrl) probeOptions.licenseUrl = licenseUrl;
                        if (licenseKey) probeOptions.licenseKey = licenseKey;

                        probePlayer = TCPlayer(probe.probeId, probeOptions);

                        if (probePlayer && typeof probePlayer.on === 'function') {
                            probePlayer.on('loadedmetadata', tryResolveDuration);
                            probePlayer.on('durationchange', tryResolveDuration);
                            probePlayer.on('error', () => fail(new Error('Duration probe player error')));
                        }
                        if (probePlayer && typeof probePlayer.ready === 'function') {
                            probePlayer.ready(tryResolveDuration);
                        }
                        setTimeout(tryResolveDuration, 500);
                    } catch (err) {
                        fail(err);
                    }
                });
            }

            async function hydrateRelatedVideoDurations() {
                for (const node of relatedDurationNodes) {
                    const contentId = String(node.dataset.contentId || '').trim();
                    const signApi = String(node.dataset.signApi || '/api/tencent-vod-psign.php').trim();
                    if (!contentId || !signApi) continue;
                    node.textContent = 'Loading';
                    try {
                        const duration = await probeTencentVideoDuration(contentId, signApi);
                        node.textContent = formatTencentDuration(duration);
                    } catch (err) {
                        console.warn('Fetch related video duration failed:', contentId, err);
                        node.textContent = '--:--';
                    }
                }
            }

            if (relatedDurationNodes.length) {
                const startDurationHydration = () => hydrateRelatedVideoDurations();
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(startDurationHydration, { timeout: 1500 });
                } else {
                    setTimeout(startDurationHydration, 300);
                }
            }
            
            // 分享弹窗
            const sharePopup = document.getElementById('sharePopup');
            const sharePopupClose = document.getElementById('sharePopupClose');
            const sharePopupCopyBtn = document.getElementById('sharePopupCopyBtn');
            const sharePopupLinkSpan = document.getElementById('sharePopupLink');
            const currentFullUrl = window.location.href;
            if (sharePopupLinkSpan) {
                sharePopupLinkSpan.innerText = currentFullUrl;
                sharePopupLinkSpan.style.overflowX = 'auto';
                sharePopupLinkSpan.style.whiteSpace = 'nowrap';
            }
            const shareTitle = encodeURIComponent('复合绝缘子生产工艺全解析 - WishPower');
            const currentUrlEncoded = encodeURIComponent(currentFullUrl);
            const shareUrls = {
                whatsapp: `https://wa.me/?text=${shareTitle}%20${currentUrlEncoded}`,
                wechat: null,
                pinterest: `https://pinterest.com/pin/create/button/?url=${currentUrlEncoded}&description=${shareTitle}`,
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${currentUrlEncoded}`,
                linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${currentUrlEncoded}&title=${shareTitle}`,
                email: `mailto:?subject=${shareTitle}&body=${currentUrlEncoded}`
            };
            function positionSharePopupDesktop() {
                if (window.innerWidth <= 768) return;
                if (!shareBtn || !sharePopup) return;
                const btnRect = shareBtn.getBoundingClientRect();
                const popupRect = sharePopup.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                let top = btnRect.top - popupRect.height - 8;
                let left = btnRect.left + btnRect.width / 2 - popupRect.width / 2;
                if (top < 10) { top = btnRect.bottom + 8; }
                if (left < 10) left = 10;
                if (left + popupRect.width > viewportWidth - 10) { left = viewportWidth - popupRect.width - 10; }
                if (top + popupRect.height > viewportHeight - 10) { top = viewportHeight - popupRect.height - 10; }
                if (top < 10) top = 10;
                sharePopup.style.top = top + 'px';
                sharePopup.style.left = left + 'px';
                const btnCenterX = btnRect.left + btnRect.width / 2;
                const btnCenterY = btnRect.top + btnRect.height / 2;
                const popupRectAfter = sharePopup.getBoundingClientRect();
                const originX = btnCenterX - popupRectAfter.left;
                const originY = btnCenterY - popupRectAfter.top;
                sharePopup.style.transformOrigin = `${originX}px ${originY}px`;
            }
            function openSharePopup() {
                if (!sharePopup) return;
                if (window.innerWidth > 768) { positionSharePopupDesktop(); }
                sharePopup.classList.add('active');
                document.addEventListener('click', handleOutsideClick);
                document.addEventListener('keydown', handleEscape);
            }
            function closeSharePopup() {
                if (!sharePopup) return;
                sharePopup.classList.remove('active');
                document.removeEventListener('click', handleOutsideClick);
                document.removeEventListener('keydown', handleEscape);
            }
            function handleOutsideClick(e) {
                if (!sharePopup.contains(e.target) && e.target !== shareBtn && !shareBtn.contains(e.target)) {
                    closeSharePopup();
                }
            }
            function handleEscape(e) {
                if (e.key === 'Escape') { closeSharePopup(); }
            }
            if (sharePopupClose) {
                sharePopupClose.addEventListener('click', function(e) {
                    e.stopPropagation();
                    closeSharePopup();
                });
            }
            if (sharePopupCopyBtn) {
                sharePopupCopyBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    copyTextToClipboard(currentFullUrl).then(() => {
                        alert('链接已复制到剪贴板');
                        closeSharePopup();
                    }).catch(() => {
                        alert('复制失败，请手动复制');
                    });
                });
            }

            function copyTextToClipboard(text) {
                if (navigator.clipboard && window.isSecureContext) {
                    return navigator.clipboard.writeText(text);
                }
                return new Promise((resolve, reject) => {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
                    } catch (err) {
                        reject(err);
                    } finally {
                        textarea.remove();
                    }
                });
            }
            document.querySelectorAll('.share-popup-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const platform = this.getAttribute('data-platform');
                    if (platform === 'wechat') {
                        alert('请复制链接，发送给微信好友：\n' + currentFullUrl);
                        closeSharePopup();
                    } else if (shareUrls[platform]) {
                        window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=500');
                        closeSharePopup();
                    }
                });
            });
            window.addEventListener('scroll', function() {
                if (sharePopup && sharePopup.classList.contains('active') && window.innerWidth > 768) {
                    positionSharePopupDesktop();
                }
            });
            window.addEventListener('resize', function() {
                if (sharePopup && sharePopup.classList.contains('active') && window.innerWidth > 768) {
                    positionSharePopupDesktop();
                }
            });
            
            // ========== 腾讯云SDK播放器：16:9容器，通过视频ID调用 ==========
            const video = document.getElementById('mainVideoPlayer');
            const container = document.getElementById('videoPlayerContainer');
            const centerPlayBtn = document.getElementById('centerPlayBtn');
            const startupMask = document.getElementById('videoStartupMask');
            let mainTcPlayer = null;
            let isTencentPlayerInitializing = false;
            let tencentPlayerReadyPromise = null;
            let isPlayerPlaying = false;
            let hasPlayerStarted = false;
            let lastPlayerSurfaceToggleTime = 0;
            const boundTencentSurfaceElements = new WeakSet();
            
            function setVideoFitForPlay(hasStarted) {
                if (!video) return;
                if (hasStarted) {
                    video.classList.add('playing-mode');
                } else {
                    video.classList.remove('playing-mode');
                }
            }

            function setPlayerStatus(isPlaying) {
                isPlayerPlaying = isPlaying;
                if (isPlaying) hasPlayerStarted = true;
                if (!container) return;
                if (isPlaying) {
                    container.classList.add('playing');
                } else {
                    container.classList.remove('playing');
                }
                container.classList.toggle('has-started', hasPlayerStarted);
                if (isPlaying) {
                    container.classList.add('load-complete');
                    if (startupMask) startupMask.setAttribute('aria-hidden', 'true');
                }
                setVideoFitForPlay(hasPlayerStarted);
            }

            async function ensureTencentCloudPlayer() {
                if (mainTcPlayer) return mainTcPlayer;
                if (tencentPlayerReadyPromise) return tencentPlayerReadyPromise;

                tencentPlayerReadyPromise = initTencentCloudPlayer().finally(() => {
                    tencentPlayerReadyPromise = null;
                });

                return tencentPlayerReadyPromise;
            }

            async function toggleTencentPlayer() {
                if (!mainTcPlayer) {
                    try {
                        const player = await ensureTencentCloudPlayer();
                        if (player && typeof player.play === 'function') {
                            player.play();
                        }
                    } catch (err) {
                        console.error('Initialize TCPlayer before play failed:', err);
                    }
                    return;
                }

                if (mainTcPlayer) {
                    if (isTencentPlayerPaused()) {
                        mainTcPlayer.play();
                    } else {
                        mainTcPlayer.pause();
                    }
                    return;
                }
            }

            function isTencentPlayerPaused() {
                if (!mainTcPlayer || typeof mainTcPlayer.paused !== 'function') {
                    return !isPlayerPlaying;
                }
                try {
                    return mainTcPlayer.paused();
                } catch (err) {
                    return !isPlayerPlaying;
                }
            }

            function isTouchPlayerSurfaceEvent(e) {
                if (!e) return false;
                if (e.type === 'tap' || e.type === 'touchend') return true;
                return Boolean(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);
            }

            function isTencentPlayerControlTarget(target) {
                if (!target || !target.closest) return false;
                return Boolean(target.closest(
                    '.vjs-control-bar, .vjs-control, .vjs-menu, .vjs-modal-dialog, .vjs-big-play-button, ' +
                    '.player-nav-btn, .center-play-btn, button, a, input, textarea, select'
                ));
            }

            function handleTencentPlayerSurfaceToggle(e) {
                if (!isTouchPlayerSurfaceEvent(e) || isTencentPlayerControlTarget(e.target)) return;

                const now = Date.now();
                if (now - lastPlayerSurfaceToggleTime < 350) return;
                lastPlayerSurfaceToggleTime = now;

                if (e.preventDefault) e.preventDefault();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                if (e.stopPropagation) e.stopPropagation();
                toggleTencentPlayer();
            }

            function bindTencentPlayerSurfaceElement(player) {
                if (!player || typeof player.el !== 'function') return;
                let playerElement = null;
                try {
                    playerElement = player.el();
                } catch (err) {
                    return;
                }
                if (!playerElement || boundTencentSurfaceElements.has(playerElement)) return;
                boundTencentSurfaceElements.add(playerElement);
                playerElement.addEventListener('touchend', handleTencentPlayerSurfaceToggle, { passive: false, capture: true });
                playerElement.addEventListener('click', handleTencentPlayerSurfaceToggle, true);
            }

            function bindTencentPlayerEvents(player) {
                if (!player || player._wishPowerEventsBound) return;
                player._wishPowerEventsBound = true;
                player.on('play', () => setPlayerStatus(true));
                player.on('playing', () => setPlayerStatus(true));
                player.on('loadedmetadata', () => {
                    if (container) container.classList.add('load-complete');
                    if (startupMask) startupMask.setAttribute('aria-hidden', 'true');
                });
                player.on('loadeddata', () => {
                    if (container) container.classList.add('load-complete');
                    if (startupMask) startupMask.setAttribute('aria-hidden', 'true');
                });
                player.on('pause', () => setPlayerStatus(false));
                player.on('ended', () => setPlayerStatus(false));
                player.on('error', () => {
                    if (container) container.classList.add('load-error');
                    setPlayerStatus(false);
                });
                if (typeof player.ready === 'function') {
                    player.ready(() => {
                        setPlayerStatus(!isTencentPlayerPaused());
                        bindTencentPlayerSurfaceElement(player);
                    });
                }
                setTimeout(() => bindTencentPlayerSurfaceElement(player), 300);
            }

            function showTencentPlayerError(message) {
                if (!container) return;
                let errorNode = container.querySelector('.video-auth-error');
                if (!errorNode) {
                    errorNode = document.createElement('div');
                    errorNode.className = 'video-auth-error';
                    errorNode.style.position = 'absolute';
                    errorNode.style.left = '50%';
                    errorNode.style.top = '50%';
                    errorNode.style.transform = 'translate(-50%, -50%)';
                    errorNode.style.zIndex = '6';
                    errorNode.style.maxWidth = '80%';
                    errorNode.style.padding = '12px 16px';
                    errorNode.style.borderRadius = '10px';
                    errorNode.style.background = 'rgba(0, 0, 0, 0.72)';
                    errorNode.style.color = '#fff';
                    errorNode.style.fontSize = '14px';
                    errorNode.style.lineHeight = '1.6';
                    errorNode.style.textAlign = 'center';
                    container.appendChild(errorNode);
                }
                errorNode.textContent = message;
                if (centerPlayBtn) {
                    centerPlayBtn.style.display = 'none';
                }
            }

            function clearTencentPlayerError() {
                if (!container) return;
                const errorNode = container.querySelector('.video-auth-error');
                if (errorNode) {
                    errorNode.remove();
                }
                if (centerPlayBtn) {
                    centerPlayBtn.style.display = '';
                }
            }

            function destroyTencentCloudPlayer() {
                if (!mainTcPlayer) return;
                try {
                    if (typeof mainTcPlayer.dispose === 'function') {
                        mainTcPlayer.dispose();
                    } else if (typeof mainTcPlayer.destroy === 'function') {
                        mainTcPlayer.destroy();
                    } else if (typeof mainTcPlayer.pause === 'function') {
                        mainTcPlayer.pause();
                    }
                } catch (err) {
                    console.error('Destroy TCPlayer failed:', err);
                }
                mainTcPlayer = null;
                setPlayerStatus(false);
            }

            async function fetchTencentVodSignature() {
                const contentId = video && video.dataset ? String(video.dataset.contentId || '').trim() : '';
                const signApi = video && video.dataset ? String(video.dataset.signApi || '').trim() : '';
                if (!contentId || !signApi) {
                    throw new Error('Missing contentId or signApi');
                }

                const response = await fetch(`${signApi}?contentId=${encodeURIComponent(contentId)}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Signature request failed: ${response.status}`);
                }

                const result = await response.json();
                if (!result || Number(result.code) !== 0 || !result.data) {
                    throw new Error(result && result.message ? result.message : 'Signature payload invalid');
                }

                return result.data;
            }

            async function initTencentCloudPlayer() {
                if (mainTcPlayer) return mainTcPlayer;
                if (!video || typeof TCPlayer === 'undefined' || isTencentPlayerInitializing) return null;
                isTencentPlayerInitializing = true;

                try {
                    clearTencentPlayerError();
                    if (container) {
                        container.classList.remove('load-complete', 'load-error');
                    }
                    if (startupMask) startupMask.setAttribute('aria-hidden', 'false');
                    const signData = await fetchTencentVodSignature();
                    const appID = String(signData.appId || '').trim();
                    const fileID = String(signData.fileId || '').trim();
                    const psign = String(signData.psign || '').trim();
                    const licenseUrl = String(signData.licenseUrl || video.dataset.licenseUrl || '').trim();
                    const licenseKey = String(signData.licenseKey || video.dataset.licenseKey || '').trim();

                    if (!appID || !fileID || !psign) {
                        throw new Error('Signature response missing appId, fileId or psign');
                    }

                    destroyTencentCloudPlayer();

                    const playerOptions = {
                        appID: appID,
                        fileID: fileID,
                        psign: psign,
                        width: '100%',
                        height: '100%',
                        autoplay: true,
                        muted: true,
                        controls: true,
                        preload: 'none',
                        language: 'zh-CN',
                        playsinline: true,
                        html5: {
                            nativeControlsForTouch: false
                        }
                    };

                    if (licenseUrl) {
                        playerOptions.licenseUrl = licenseUrl;
                    }
                    if (licenseKey) {
                        playerOptions.licenseKey = licenseKey;
                    }

                    mainTcPlayer = TCPlayer('mainVideoPlayer', playerOptions);
                    bindTencentPlayerEvents(mainTcPlayer);
                    return mainTcPlayer;
                } catch (err) {
                    console.error('Fetch TCPlayer signature failed:', err);
                    destroyTencentCloudPlayer();
                    showTencentPlayerError('视频授权获取失败，请刷新页面后重试');
                    return null;
                } finally {
                    isTencentPlayerInitializing = false;
                }
            }
            
            if (video) {
                video.addEventListener('play', () => {
                    setPlayerStatus(true);
                });
                video.addEventListener('pause', () => {
                    setPlayerStatus(false);
                });
                video.addEventListener('ended', () => {
                    setPlayerStatus(false);
                });
                setVideoFitForPlay(false);
                ensureTencentCloudPlayer().then((player) => {
                    if (player && typeof player.play === 'function') {
                        Promise.resolve(player.play()).catch((err) => {
                            console.warn('Muted autoplay failed, waiting for user gesture:', err);
                            setPlayerStatus(false);
                        });
                    }
                });
            }
            
            if (centerPlayBtn) {
                centerPlayBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTencentPlayer();
                });
            }

            // 左右切换按钮
            const prevBtnVideo = document.getElementById('prevVideoBtn');
            const nextBtnVideo = document.getElementById('nextVideoBtn');
            if (prevBtnVideo) {
                prevBtnVideo.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            if (nextBtnVideo) {
                nextBtnVideo.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
            
            // 标题旁购物车：独立商品弹窗
            const videoAvatar = document.getElementById('videoAvatarBtn');
            const cartProductPopupModal = document.getElementById('cartProductPopupModal');
            const cartProductPopupOverlay = document.getElementById('cartProductPopupOverlay');
            const cartProductPopupClose = document.getElementById('cartProductPopupClose');
            const cartProductSlides = document.querySelectorAll('#cartProductSlides .cart-product-slide');
            const cartProductPrev = document.getElementById('cartProductPrev');
            const cartProductNext = document.getElementById('cartProductNext');
            const cartProductDots = document.getElementById('cartProductDots');
            const cartProductCarousel = document.getElementById('cartProductCarousel');
            let cartProductIndex = 0;
            let cartProductAutoTimer;

            if (cartProductSlides.length > 0 && !document.querySelector('#cartProductSlides .cart-product-slide.active')) {
                cartProductSlides[0].classList.add('active');
            }

            function renderCartProductDots() {
                if (!cartProductDots) return;
                cartProductDots.innerHTML = '';
                cartProductSlides.forEach((_, index) => {
                    const dot = document.createElement('div');
                    dot.className = 'cart-product-dot';
                    if (index === cartProductIndex) dot.classList.add('active');
                    dot.addEventListener('click', () => showCartProductSlide(index));
                    cartProductDots.appendChild(dot);
                });
            }

            function refreshCartProductDots() {
                if (!cartProductDots) return;
                cartProductDots.querySelectorAll('.cart-product-dot').forEach((dot, index) => {
                    dot.classList.toggle('active', index === cartProductIndex);
                });
            }

            function showCartProductSlide(index) {
                if (cartProductSlides.length === 0) return;
                if (index < 0) index = cartProductSlides.length - 1;
                if (index >= cartProductSlides.length) index = 0;
                cartProductSlides[cartProductIndex].classList.remove('active');
                cartProductIndex = index;
                cartProductSlides[cartProductIndex].classList.add('active');
                refreshCartProductDots();
                restartCartProductAutoPlay();
            }

            function startCartProductAutoPlay() {
                if (cartProductSlides.length <= 1) return;
                if (cartProductAutoTimer) clearInterval(cartProductAutoTimer);
                cartProductAutoTimer = setInterval(() => showCartProductSlide(cartProductIndex + 1), 5000);
            }

            function restartCartProductAutoPlay() {
                if (!cartProductAutoTimer) return;
                clearInterval(cartProductAutoTimer);
                startCartProductAutoPlay();
            }

            if (cartProductSlides.length > 0) {
                renderCartProductDots();
                startCartProductAutoPlay();
                if (cartProductSlides.length <= 1) {
                    if (cartProductPrev) cartProductPrev.style.display = 'none';
                    if (cartProductNext) cartProductNext.style.display = 'none';
                    if (cartProductDots) cartProductDots.style.display = 'none';
                }
                if (cartProductPrev) cartProductPrev.addEventListener('click', () => showCartProductSlide(cartProductIndex - 1));
                if (cartProductNext) cartProductNext.addEventListener('click', () => showCartProductSlide(cartProductIndex + 1));
                if (cartProductCarousel) {
                    cartProductCarousel.addEventListener('mouseenter', () => clearInterval(cartProductAutoTimer));
                    cartProductCarousel.addEventListener('mouseleave', startCartProductAutoPlay);
                }
            }

            function openCartProductPopup() {
                if (!cartProductPopupModal || !cartProductPopupOverlay) return;
                cartProductPopupModal.classList.add('active');
                cartProductPopupOverlay.classList.add('active');
                setBodyScrollLock('cartProduct', true);
                document.addEventListener('keydown', handleCartProductPopupEscape);
            }
            function closeCartProductPopup() {
                if (!cartProductPopupModal || !cartProductPopupOverlay) return;
                cartProductPopupModal.classList.remove('active');
                cartProductPopupOverlay.classList.remove('active');
                setBodyScrollLock('cartProduct', false);
                document.removeEventListener('keydown', handleCartProductPopupEscape);
            }
            function handleCartProductPopupEscape(e) {
                if (e.key === 'Escape') closeCartProductPopup();
            }
            if (videoAvatar) {
                videoAvatar.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openCartProductPopup();
                });
            }
            if (cartProductPopupClose) cartProductPopupClose.addEventListener('click', closeCartProductPopup);
            if (cartProductPopupOverlay) cartProductPopupOverlay.addEventListener('click', closeCartProductPopup);

            const aiAvatar = document.getElementById('aiCustomerAvatar');
            if (aiAvatar) {
                aiAvatar.addEventListener('click', function(e) {
                    e.stopPropagation();
                    alert('AI客服在线会话功能即将开放，敬请期待！');
                });
            }
            
            // 返回顶部
            const backBtn = document.getElementById('backToTop');
            if (backBtn) {
                backBtn.addEventListener('click', function() {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
            
            // 激活导航样式
            document.querySelectorAll('.nav-link[href*="video"]').forEach(link => link.classList.add('active'));
            document.querySelectorAll('.sidebar-item a[href*="videolist"]').forEach(link => {
                if (link.parentElement) link.parentElement.classList.add('active');
            });
            document.querySelectorAll('.tab-item a[href*="videolist"]').forEach(link => {
                if (link.parentElement) link.parentElement.classList.add('active');
            });
        })();