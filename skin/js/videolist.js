// Horizontal video cards: load on demand and preview for 10 seconds.
const VideoPreviewController = window.VideoPreviewController || {
    active: null,
    stopActive(exceptVideo = null) {
        if (!this.active || this.active.video === exceptVideo) return;
        this.active.stop();
        this.active = null;
    },
    setActive(video, stop) {
        this.active = { video, stop };
    },
    clear(video) {
        if (this.active && this.active.video === video) {
            this.active = null;
        }
    }
};
window.VideoPreviewController = VideoPreviewController;

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
        return player ? player.play() : Promise.reject();
    },
    pause(video) {
        const player = this.players.get(video);
        return player ? player.pause() : null;
    },
    currentTime(video, time) {
        const player = this.players.get(video);
        if (player && typeof player.currentTime === 'function') return player.currentTime(time);
        return null;
    },
    isPaused(video) {
        const player = this.players.get(video);
        return player && typeof player.paused === 'function' ? player.paused() : true;
    }
};
window.TencentVideoPreview = TencentVideoPreview;

(function() {
    const PREVIEW_SECONDS = 10;

    function updatePlayIcon(btn, isPlaying) {
        if (!btn) return;
        btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    function setupHorizontalVideoCards() {
        const cards = document.querySelectorAll('.horizontal-videos-section .video-card');
        cards.forEach((card) => {
            if (card.dataset.boundHorizontal) return;
            card.dataset.boundHorizontal = 'true';

            const video = card.querySelector('.preview-video');
            const playBtn = card.querySelector('.video-play-btn');
            const videoThumb = card.querySelector('.video-thumb');
            if (!video || !playBtn || !videoThumb || !TencentVideoPreview.hasCloudVideo(video)) return;

            let previewTimer = null;

            function clearPreviewTimer() {
                if (previewTimer) {
                    clearTimeout(previewTimer);
                    previewTimer = null;
                }
            }

            function stopPreview(resetToStart = true) {
                clearPreviewTimer();
                TencentVideoPreview.pause(video);
                if (resetToStart) {
                    TencentVideoPreview.currentTime(video, 0);
                }
                card.classList.remove('is-previewing');
                updatePlayIcon(playBtn, false);
                VideoPreviewController.clear(video);
            }

            function startPreview() {
                if (video.dataset.previewLoading === '1') return;
                video.dataset.previewLoading = '1';
                VideoPreviewController.stopActive(video);
                clearPreviewTimer();
                TencentVideoPreview.currentTime(video, 0);
                TencentVideoPreview.play(video).then(() => {
                    delete video.dataset.previewLoading;
                    VideoPreviewController.setActive(video, () => stopPreview(true));
                    card.classList.add('is-previewing');
                    updatePlayIcon(playBtn, true);
                    previewTimer = setTimeout(() => {
                        stopPreview();
                    }, PREVIEW_SECONDS * 1000);
                }).catch((err) => {
                    delete video.dataset.previewLoading;
                    console.warn('Tencent preview play failed:', err);
                    updatePlayIcon(playBtn, false);
                });
            }

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (TencentVideoPreview.isPaused(video)) {
                    startPreview();
                } else {
                    stopPreview(false);
                }
            });

            videoThumb.addEventListener('click', (e) => {
                if (e.target.closest('.video-play-btn') || e.target.closest('a')) return;
                e.preventDefault();
                if (TencentVideoPreview.isPaused(video)) {
                    startPreview();
                } else {
                    stopPreview(false);
                }
            });

            video.addEventListener('ended', () => {
                stopPreview();
            });
        });
    }

    function observeHorizontalContent() {
        const observer = new MutationObserver(() => {
            setupHorizontalVideoCards();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupHorizontalVideoCards();
        observeHorizontalContent();
    });
})();

// Vertical video cards: click to load and preview for 10 seconds.
(function() {
    const PREVIEW_SECONDS = 10;

    function setupVerticalVideoCards() {
        const cards = document.querySelectorAll('.vertical-videos-section .vertical-video-card');
        cards.forEach((card) => {
            if (card.dataset.boundVertical) return;
            card.dataset.boundVertical = 'true';

            const video = card.querySelector('.vertical-preview-video');
            const playBtn = card.querySelector('.vertical-video-play-btn');
            const coverImg = card.querySelector('.vertical-cover-img');
            if (!video || !playBtn || !coverImg || !TencentVideoPreview.hasCloudVideo(video)) return;

            let isActive = false;
            let previewTimer = null;

            function clearPreviewTimer() {
                if (previewTimer) {
                    clearTimeout(previewTimer);
                    previewTimer = null;
                }
            }

            function showVideo() {
                coverImg.style.display = 'none';
                card.classList.add('is-previewing');
                playBtn.querySelector('i').className = 'fas fa-pause';
                isActive = true;
            }

            function hideVideo() {
                clearPreviewTimer();
                coverImg.style.display = '';
                card.classList.remove('is-previewing');
                TencentVideoPreview.pause(video);
                TencentVideoPreview.currentTime(video, 0);
                playBtn.querySelector('i').className = 'fas fa-play';
                isActive = false;
                VideoPreviewController.clear(video);
            }

            function scheduleAutoStop() {
                clearPreviewTimer();
                previewTimer = setTimeout(() => {
                    hideVideo();
                }, PREVIEW_SECONDS * 1000);
            }

            function startPreview() {
                if (video.dataset.previewLoading === '1') return;
                video.dataset.previewLoading = '1';
                VideoPreviewController.stopActive(video);
                showVideo();
                TencentVideoPreview.currentTime(video, 0);
                TencentVideoPreview.play(video).then(() => {
                    delete video.dataset.previewLoading;
                    VideoPreviewController.setActive(video, hideVideo);
                    showVideo();
                    scheduleAutoStop();
                }).catch((err) => {
                    delete video.dataset.previewLoading;
                    console.warn('Tencent preview play failed:', err);
                    hideVideo();
                });
            }

            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (!isActive) {
                    startPreview();
                    return;
                }

                if (TencentVideoPreview.isPaused(video)) {
                    if (video.dataset.previewLoading === '1') return;
                    video.dataset.previewLoading = '1';
                    TencentVideoPreview.play(video).then(() => {
                        delete video.dataset.previewLoading;
                        VideoPreviewController.stopActive(video);
                        VideoPreviewController.setActive(video, hideVideo);
                        showVideo();
                        playBtn.querySelector('i').className = 'fas fa-pause';
                        scheduleAutoStop();
                    }).catch((err) => {
                        delete video.dataset.previewLoading;
                        console.warn('Tencent preview play failed:', err);
                    });
                } else {
                    TencentVideoPreview.pause(video);
                    clearPreviewTimer();
                    playBtn.querySelector('i').className = 'fas fa-play';
                }
            });

            video.addEventListener('click', (e) => {
                e.stopPropagation();
                if (TencentVideoPreview.isPaused(video)) {
                    if (video.dataset.previewLoading === '1') return;
                    video.dataset.previewLoading = '1';
                    TencentVideoPreview.play(video).then(() => {
                        delete video.dataset.previewLoading;
                        VideoPreviewController.stopActive(video);
                        VideoPreviewController.setActive(video, hideVideo);
                        showVideo();
                        playBtn.querySelector('i').className = 'fas fa-pause';
                        scheduleAutoStop();
                    }).catch((err) => {
                        delete video.dataset.previewLoading;
                        console.warn('Tencent preview play failed:', err);
                    });
                } else {
                    TencentVideoPreview.pause(video);
                    clearPreviewTimer();
                    playBtn.querySelector('i').className = 'fas fa-play';
                }
            });

            video.addEventListener('ended', () => {
                hideVideo();
            });
        });
    }

    function observeVerticalContent() {
        const observer = new MutationObserver(() => {
            setupVerticalVideoCards();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupVerticalVideoCards();
        observeVerticalContent();
    });
})();

function initAllSliders() {
    const sliders = document.querySelectorAll('.js-horizontal-slider');
    sliders.forEach((slider) => {
        new HorizontalSlider(slider);
    });
}

class HorizontalSlider {
    constructor(sliderElement) {
        this.container = sliderElement;
        this.track = this.container.querySelector('.js-slider-track');
        this.items = Array.from(this.track?.children || []);
        if (!this.track || this.items.length === 0) return;

        this.isDragging = false;
        this.hasDragged = false;
        this.suppressClick = false;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.startX = 0;

        this.config = {
            step: parseInt(this.container.dataset.step, 10) || 1,
            align: this.container.dataset.align || 'start',
            drag: this.container.dataset.drag !== 'false'
        };

        const parent = this.container.closest('.scroll-container') || this.container.parentElement;
        this.prevBtn = parent?.querySelector('.js-slider-prev');
        this.nextBtn = parent?.querySelector('.js-slider-next');

        this.init();
    }

    init() {
        this.disableImageDrag();
        this.setupEventListeners();
        this.setupNavigationButtons();
        this.updateTransform();

        window.addEventListener('resize', () => {
            this.snapToBounds();
        });
    }

    disableImageDrag() {
        this.items.forEach((item) => {
            item.querySelectorAll('img, video, .video-play-btn, .vertical-video-play-btn').forEach((element) => {
                element.setAttribute('draggable', 'false');
                element.style.userSelect = 'none';
                element.style.webkitUserDrag = 'none';
            });
        });
    }

    setupEventListeners() {
        if (!this.config.drag) return;

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleClick = this.handleClick.bind(this);

        this.container.addEventListener('pointerdown', this.handlePointerDown, true);
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerUp);
        this.container.addEventListener('click', this.handleClick, true);

        this.container.addEventListener('selectstart', (e) => {
            if (this.isDragging) e.preventDefault();
        });
    }

    handlePointerDown(e) {
        if (
            e.target.closest('a') ||
            e.target.tagName === 'A'
        ) {
            return;
        }
        this.isDragging = true;
        this.hasDragged = false;
        this.startX = e.clientX;
        this.prevTranslate = this.currentTranslate;
        this.track.classList.remove('is-animating');
    }

    handlePointerMove(e) {
        if (!this.isDragging) return;
        const diffX = e.clientX - this.startX;
        if (Math.abs(diffX) > 6) {
            this.hasDragged = true;
        }
        let newTranslate = this.prevTranslate + diffX;

        const maxTranslate = 0;
        const minTranslate = this.container.clientWidth - this.track.scrollWidth;

        if (newTranslate > maxTranslate) {
            newTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.35;
        } else if (newTranslate < minTranslate) {
            newTranslate = minTranslate + (newTranslate - minTranslate) * 0.35;
        }

        this.currentTranslate = newTranslate;
        this.updateTransform();
        e.preventDefault();
    }

    handlePointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.suppressClick = this.hasDragged;
        this.track.classList.add('is-animating');
        this.snapToBounds();
        if (this.suppressClick) {
            setTimeout(() => {
                this.suppressClick = false;
            }, 250);
        }
    }

    handleClick(e) {
        if (!this.suppressClick) return;
        e.preventDefault();
        e.stopPropagation();
        this.suppressClick = false;
    }

    snapToBounds() {
        const maxTranslate = 0;
        const minTranslate = this.container.clientWidth - this.track.scrollWidth;

        if (minTranslate >= 0) {
            this.currentTranslate = 0;
            this.updateTransform();
            return;
        }

        if (this.currentTranslate > maxTranslate) {
            this.currentTranslate = maxTranslate;
        } else if (this.currentTranslate < minTranslate) {
            this.currentTranslate = minTranslate;
        } else {
            const itemWidth = this.items[0]?.offsetWidth || 280;
            const gap = parseInt(getComputedStyle(this.track).gap, 10) ||
                parseInt(getComputedStyle(this.items[0]).marginRight, 10) ||
                20;
            const totalItemWidth = itemWidth + (getComputedStyle(this.track).gap ? 0 : gap);
            const itemIndex = Math.round(-this.currentTranslate / totalItemWidth);
            let targetTranslate = -itemIndex * totalItemWidth;
            targetTranslate = Math.max(minTranslate, Math.min(maxTranslate, targetTranslate));
            this.currentTranslate = targetTranslate;
        }
        this.updateTransform();
    }

    updateTransform() {
        this.track.style.transform = `translate3d(${this.currentTranslate}px, 0, 0)`;
    }

    setupNavigationButtons() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.navigate(-1));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.navigate(1));
        }
    }

    navigate(direction) {
        this.track.classList.add('is-animating');
        const itemWidth = this.items[0]?.offsetWidth || 280;
        const gap = parseInt(getComputedStyle(this.track).gap, 10) ||
            parseInt(getComputedStyle(this.items[0]).marginRight, 10) ||
            20;
        const totalItemWidth = itemWidth + (getComputedStyle(this.track).gap ? 0 : gap);
        this.currentTranslate += direction * totalItemWidth * this.config.step;
        this.snapToBounds();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSliders);
} else {
    initAllSliders();
}
