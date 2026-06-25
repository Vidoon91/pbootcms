// Hydrate video duration labels from Tencent VOD metadata.
(function() {
    const DEFAULT_SIGN_API = '/api/tencent-vod-psign.php';
    const DEFAULT_CONCURRENCY = 4;
    const signDataCache = new Map();
    let probeIndex = 0;

    function formatDuration(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        const pad = (value) => String(value).padStart(2, '0');
        return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
    }

    function findSourceElement(node) {
        const root = node.closest('.video-card, .vertical-video-card, .related-item, [data-short-video-card]') || document;
        return root.querySelector('video[data-app-id], video[data-file-id]') || root;
    }

    function readSourceFromNode(node) {
        const source = findSourceElement(node);
        const root = node.closest('.video-card, .vertical-video-card, .related-item, [data-short-video-card]');
        return {
            appId: node.dataset.appId || source.dataset.appId || '',
            fileId: node.dataset.fileId || source.dataset.fileId || root?.dataset.fileId || '',
            psign: node.dataset.psign || source.dataset.psign || '',
            licenseUrl: node.dataset.licenseUrl || source.dataset.licenseUrl || root?.dataset.licenseUrl || '',
            licenseKey: node.dataset.licenseKey || source.dataset.licenseKey || root?.dataset.licenseKey || '',
            contentId: node.dataset.contentId || root?.dataset.contentId || '',
            signApi: node.dataset.signApi || root?.dataset.signApi || DEFAULT_SIGN_API,
            poster: source.getAttribute ? source.getAttribute('poster') || root?.dataset.poster || '' : root?.dataset.poster || ''
        };
    }

    async function fetchSignData(contentId, signApi) {
        const cacheKey = `${signApi}::${contentId}`;
        if (!signDataCache.has(cacheKey)) {
            signDataCache.set(cacheKey, fetch(`${signApi}?contentId=${encodeURIComponent(contentId)}`, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            }).then(async (response) => {
                const result = await response.json();
                if (!response.ok || !result || Number(result.code) !== 0 || !result.data) {
                    throw new Error(result && result.message ? result.message : `Signature request failed: ${response.status}`);
                }
                return result.data;
            }).catch((error) => {
                signDataCache.delete(cacheKey);
                throw error;
            }));
        }
        return signDataCache.get(cacheKey);
    }

    function isNearViewport(node) {
        const rect = node.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        return rect.bottom >= -200 && rect.right >= -200 && rect.top <= viewportHeight + 400 && rect.left <= viewportWidth + 200;
    }

    function sortNodesByPriority(nodes) {
        return nodes.sort((a, b) => {
            const aVisible = isNearViewport(a) ? 0 : 1;
            const bVisible = isNearViewport(b) ? 0 : 1;
            if (aVisible !== bVisible) return aVisible - bVisible;
            return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });
    }

    async function resolvePlayerOptions(node) {
        const data = readSourceFromNode(node);

        if (data.contentId) {
            const signData = await fetchSignData(data.contentId, data.signApi);
            data.appId = String(signData.appId || '').trim();
            data.fileId = String(signData.fileId || '').trim();
            data.psign = String(signData.psign || '').trim();
            data.licenseUrl = String(signData.licenseUrl || data.licenseUrl || '').trim();
            data.licenseKey = String(signData.licenseKey || data.licenseKey || '').trim();
        } else if (!data.appId || !data.fileId) {
            throw new Error('Missing Tencent VOD source data');
        }

        if (!data.appId || !data.fileId) {
            throw new Error('Missing Tencent VOD appId or fileId');
        }

        const options = {
            appID: data.appId,
            fileID: data.fileId,
            width: '1px',
            height: '1px',
            autoplay: false,
            controls: false,
            preload: 'auto',
            poster: data.poster || '',
            language: 'zh-CN',
            playsinline: true,
            html5: {
                nativeControlsForTouch: false
            }
        };

        if (data.psign) options.psign = data.psign;
        if (data.licenseUrl) options.licenseUrl = data.licenseUrl;
        if (data.licenseKey) options.licenseKey = data.licenseKey;
        return options;
    }

    function createProbeElement() {
        const probeId = `tencentDurationProbe_${Date.now()}_${probeIndex++}`;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
        const video = document.createElement('video');
        video.id = probeId;
        video.preload = 'metadata';
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        wrap.appendChild(video);
        document.body.appendChild(wrap);
        return { probeId, wrap };
    }

    function readDuration(player) {
        if (!player || typeof player.duration !== 'function') return 0;
        const duration = Number(player.duration());
        return Number.isFinite(duration) ? duration : 0;
    }

    async function probeDuration(node) {
        if (typeof TCPlayer === 'undefined') throw new Error('TCPlayer SDK not loaded');

        const options = await resolvePlayerOptions(node);
        const probe = createProbeElement();
        let player = null;

        return new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => {
                if (player) {
                    try {
                        if (typeof player.dispose === 'function') {
                            player.dispose();
                        } else if (typeof player.destroy === 'function') {
                            player.destroy();
                        } else if (typeof player.pause === 'function') {
                            player.pause();
                        }
                    } catch (err) {
                        console.warn('Dispose duration probe failed:', err);
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
            const tryFinish = () => {
                const duration = readDuration(player);
                if (duration > 0) finish(duration);
            };
            const timer = setTimeout(() => fail(new Error('Duration probe timeout')), 12000);

            try {
                player = TCPlayer(probe.probeId, options);
                if (player && typeof player.on === 'function') {
                    player.on('loadedmetadata', tryFinish);
                    player.on('durationchange', tryFinish);
                    player.on('error', () => fail(new Error('Duration probe player error')));
                }
                if (player && typeof player.ready === 'function') {
                    player.ready(() => {
                        tryFinish();
                        if (typeof player.load === 'function') {
                            try {
                                player.load();
                            } catch (err) {
                                console.warn('Load duration probe failed:', err);
                            }
                        }
                    });
                }
                if (typeof player.load === 'function') {
                    setTimeout(() => {
                        try {
                            player.load();
                        } catch (err) {
                            console.warn('Load duration probe failed:', err);
                        }
                    }, 100);
                }
                setTimeout(tryFinish, 500);
            } catch (err) {
                fail(err);
            }
        });
    }

    async function hydrateNode(node) {
        if (!node || node.dataset.durationHydrated === '1') return;
        node.dataset.durationHydrated = '1';
        node.textContent = node.dataset.loadingText || 'Loading';
        try {
            const duration = await probeDuration(node);
            node.textContent = formatDuration(duration);
        } catch (err) {
            console.warn('Fetch Tencent video duration failed:', err);
            node.textContent = node.dataset.fallbackText || '--:--';
            delete node.dataset.durationHydrated;
        }
    }

    async function hydrate(selector) {
        const nodes = sortNodesByPriority(Array.from(document.querySelectorAll(selector || '[data-video-duration]')));
        const workers = Array.from({ length: Math.min(DEFAULT_CONCURRENCY, nodes.length) }, async () => {
            while (nodes.length) {
                const node = nodes.shift();
                await hydrateNode(node);
            }
        });
        await Promise.all(workers);
    }

    function hydrateVisibleFirst(selector) {
        const nodes = sortNodesByPriority(Array.from(document.querySelectorAll(selector || '[data-video-duration]')));
        const visibleNodes = nodes.filter(isNearViewport);
        const deferredNodes = nodes.filter((node) => !isNearViewport(node));

        if (visibleNodes.length) {
            hydrateVisibleBatch(visibleNodes);
        }

        if (deferredNodes.length) {
            setTimeout(() => hydrateVisibleBatch(deferredNodes), 900);
        }
    }

    async function hydrateVisibleBatch(nodes) {
        const queue = nodes.slice();
        const workers = Array.from({ length: Math.min(DEFAULT_CONCURRENCY, queue.length) }, async () => {
            while (queue.length) {
                const node = queue.shift();
                await hydrateNode(node);
            }
        });
        await Promise.all(workers);
    }

    function hydrateWhenIdle(selector) {
        const run = () => hydrateVisibleFirst(selector);
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 300 });
        } else {
            setTimeout(run, 80);
        }
    }

    window.WishPowerTencentDuration = {
        hydrate,
        hydrateWhenIdle,
        formatDuration,
        probeDuration
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => hydrateWhenIdle('[data-video-duration]'));
    } else {
        hydrateWhenIdle('[data-video-duration]');
    }
})();
