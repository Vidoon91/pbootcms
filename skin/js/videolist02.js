// Page initialization
document.addEventListener('DOMContentLoaded', function() {
    let currentVideo = null;
    let previewTimer = null;
    const previewSeconds = 5;
    const TencentVideoPreview = window.TencentVideoPreview || {
        players: new WeakMap(),
        signatures: new Map(),
        hasCloudVideo(video) {
            return Boolean(video && typeof TCPlayer !== 'undefined' && (video.dataset.contentId || (video.dataset.appId && video.dataset.fileId)));
        },
        async fetchSignature(video) {
            const contentId = String(video.dataset.contentId || video.closest('[data-content-id]')?.dataset.contentId || '').trim();
            const signApi = String(video.dataset.signApi || video.closest('[data-sign-api]')?.dataset.signApi || '/api/tencent-vod-psign.php').trim();
            if (!contentId || !signApi) return null;
            const cacheKey = `${signApi}::${contentId}`;
            if (!this.signatures.has(cacheKey)) {
                this.signatures.set(cacheKey, fetch(`${signApi}?contentId=${encodeURIComponent(contentId)}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { Accept: 'application/json' }
                }).then(async (response) => {
                    const result = await response.json();
                    if (!response.ok || !result || Number(result.code) !== 0 || !result.data) {
                        throw new Error(result?.message || `Signature request failed: ${response.status}`);
                    }
                    return result.data;
                }).catch((error) => {
                    this.signatures.delete(cacheKey);
                    throw error;
                }));
            }
            return this.signatures.get(cacheKey);
        },
        async resolveVideoData(video) {
            const signData = await this.fetchSignature(video);
            if (signData) {
                return {
                    appId: String(signData.appId || '').trim(),
                    fileId: String(signData.fileId || '').trim(),
                    psign: String(signData.psign || '').trim(),
                    licenseUrl: String(signData.licenseUrl || video.dataset.licenseUrl || '').trim(),
                    licenseKey: String(signData.licenseKey || video.dataset.licenseKey || '').trim()
                };
            }
            return {
                appId: String(video.dataset.appId || '').trim(),
                fileId: String(video.dataset.fileId || '').trim(),
                psign: String(video.dataset.psign || '').trim(),
                licenseUrl: String(video.dataset.licenseUrl || '').trim(),
                licenseKey: String(video.dataset.licenseKey || '').trim()
            };
        },
        async getPlayer(video) {
            if (!this.hasCloudVideo(video)) return null;
            if (this.players.has(video)) return this.players.get(video);
            const videoData = await this.resolveVideoData(video);
            if (!videoData.appId || !videoData.fileId) return null;

            if (!video.id) {
                video.id = `tc-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }

            const options = {
                appID: videoData.appId,
                fileID: videoData.fileId,
                width: '100%',
                height: '100%',
                poster: video.getAttribute('poster') || '',
                autoplay: false,
                controls: false,
                preload: 'none'
            };

            if (videoData.psign) options.psign = videoData.psign;
            if (videoData.licenseUrl) options.licenseUrl = videoData.licenseUrl;
            if (videoData.licenseKey) options.licenseKey = videoData.licenseKey;

            const player = TCPlayer(video.id, options);
            this.players.set(video, player);
            return player;
        },
        async play(video) {
            const player = await this.getPlayer(video);
            return player ? player.play() : video.play();
        },
        pause(video) {
            const player = this.players.get(video);
            return player ? player.pause() : video.pause();
        },
        currentTime(video, time) {
            const player = this.players.get(video);
            if (player && typeof player.currentTime === 'function') return player.currentTime(time);
            video.currentTime = time;
            return time;
        },
        isPaused(video) {
            const player = this.players.get(video);
            return player && typeof player.paused === 'function' ? player.paused() : video.paused;
        }
    };
    window.TencentVideoPreview = TencentVideoPreview;

    function clearPreviewTimer() {
        if (previewTimer) {
            clearTimeout(previewTimer);
            previewTimer = null;
        }
    }

    function stopCurrentVideo(nextVideo) {
        clearPreviewTimer();
        if (currentVideo && currentVideo !== nextVideo) {
            TencentVideoPreview.pause(currentVideo);
            TencentVideoPreview.currentTime(currentVideo, 0);
            const currentCard = currentVideo.closest('.video-card');
            if (currentCard) {
                currentCard.classList.remove('is-playing', 'is-paused');
                const currentBtnIcon = currentCard.querySelector('.video-play-btn i');
                if (currentBtnIcon) currentBtnIcon.className = 'fas fa-play';
            }
        }
    }

    function pausePreview(video, card) {
        clearPreviewTimer();
        TencentVideoPreview.pause(video);
        card.classList.remove('is-playing');
        card.classList.add('is-paused');
        const btnIcon = card.querySelector('.video-play-btn i');
        if (btnIcon) btnIcon.className = 'fas fa-play';
        if (currentVideo === video) currentVideo = null;
    }

    function startPreview(video, card) {
        if (video.dataset.previewLoading === '1') return;
        video.dataset.previewLoading = '1';
        stopCurrentVideo(video);
        TencentVideoPreview.currentTime(video, 0);
        card.classList.remove('is-paused');
        card.classList.add('is-playing');
        const btnIcon = card.querySelector('.video-play-btn i');
        if (btnIcon) btnIcon.className = 'fas fa-pause';
        currentVideo = video;

        const playPromise = TencentVideoPreview.play(video);
        const startTimer = () => {
            delete video.dataset.previewLoading;
            clearPreviewTimer();
            previewTimer = setTimeout(() => {
                pausePreview(video, card);
                previewTimer = null;
            }, previewSeconds * 1000);
        };

        if (playPromise !== undefined) {
            playPromise.then(startTimer).catch((err) => {
                delete video.dataset.previewLoading;
                console.warn('Tencent preview play failed:', err);
                card.classList.remove('is-playing');
                if (btnIcon) btnIcon.className = 'fas fa-play';
            });
        } else {
            startTimer();
        }
    }

    document.querySelectorAll('.video-card .video-play-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            const card = btn.closest('.video-card');
            const video = card ? card.querySelector('.video-preview') : null;
            if (!card || !video || !TencentVideoPreview.hasCloudVideo(video)) return;

            if (currentVideo === video && !TencentVideoPreview.isPaused(video)) {
                pausePreview(video, card);
                return;
            }

            startPreview(video, card);
        });
    });

    document.querySelectorAll('.video-preview').forEach(video => {
        video.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const card = video.closest('.video-card');
            if (!card || !TencentVideoPreview.hasCloudVideo(video)) return;

            if (!TencentVideoPreview.isPaused(video)) {
                pausePreview(video, card);
            } else {
                startPreview(video, card);
            }
        });

        video.addEventListener('pause', () => {
            clearPreviewTimer();
            const card = video.closest('.video-card');
            if (card) card.classList.remove('is-playing');
            if (currentVideo === video) currentVideo = null;
        });

        video.addEventListener('ended', () => {
            clearPreviewTimer();
            const card = video.closest('.video-card');
            if (card) card.classList.remove('is-playing', 'is-paused');
            if (currentVideo === video) currentVideo = null;
        });
    });

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

        setFilterExpanded(sessionStorage.getItem(filterStateKey) === '1');

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

            filterTags.forEach(tag => tag.classList.remove('active'));
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
