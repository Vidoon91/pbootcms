// ===== topbar.js =====
function initTopBar() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar || topBar.dataset.initialized === '1') return;
    topBar.dataset.initialized = '1';

    document.body.classList.add('has-topbar');

    function closeTopbarMainNav() {
        document.querySelectorAll('#topbarMainNav .topbar-nav-item.is-open').forEach(item => {
            item.classList.remove('is-open');
        });
    }

    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        const trigger = languageSelector.querySelector('.dropdown-trigger');
        trigger?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeTopbarMainNav();
            document.getElementById('topbarSocialMenu')?.classList.remove('is-open');
            document.getElementById('topbarSearch')?.classList.remove('is-open');
            languageSelector.classList.toggle('dropdown-open');
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('#languageSelector')) {
                languageSelector.classList.remove('dropdown-open');
            }
        });
    }

    const cityPicker = document.getElementById('topbarCityPicker');
    if (cityPicker) {
        const trigger = document.getElementById('topbarCityTrigger');
        let lastCityTouchTime = 0;

        function closeCityPicker() {
            cityPicker.classList.remove('is-open');
            if (cityPicker._closeTimer) {
                clearTimeout(cityPicker._closeTimer);
                cityPicker._closeTimer = null;
            }
        }

        function openCityPicker() {
            if (cityPicker._closeTimer) {
                clearTimeout(cityPicker._closeTimer);
                cityPicker._closeTimer = null;
            }
            languageSelector?.classList.remove('dropdown-open');
            closeTopbarMainNav();
            document.getElementById('topbarSocialMenu')?.classList.remove('is-open');
            document.getElementById('topbarSearch')?.classList.remove('is-open');
            cityPicker.classList.add('is-open');
        }

        function toggleCityPicker(event) {
            const now = Date.now();
            if (event.type === 'touchstart') {
                lastCityTouchTime = now;
            } else if (event.type === 'click' && now - lastCityTouchTime < 500) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            languageSelector?.classList.remove('dropdown-open');
            closeTopbarMainNav();
            document.getElementById('topbarSocialMenu')?.classList.remove('is-open');
            document.getElementById('topbarSearch')?.classList.remove('is-open');
            cityPicker.classList.toggle('is-open');
        }

        trigger?.addEventListener('click', toggleCityPicker);
        trigger?.addEventListener('touchstart', toggleCityPicker, { passive: false });

        if (window.innerWidth >= 769) {
            cityPicker.addEventListener('mouseenter', openCityPicker);

            cityPicker.addEventListener('mouseleave', () => {
                cityPicker._closeTimer = setTimeout(closeCityPicker, 160);
            });
        }

        cityPicker.querySelectorAll('.topbar-city-item').forEach(item => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const currentCity = document.getElementById('topbarCurrentCity');
                if (currentCity) currentCity.textContent = item.textContent;
                cityPicker.querySelectorAll('.topbar-city-item.active').forEach(activeItem => {
                    activeItem.classList.remove('active');
                });
                item.classList.add('active');
                closeCityPicker();
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#topbarCityPicker')) {
                closeCityPicker();
            }
        });
    }

    initTopbarMainNav();

    upgradeLegacySocialIcons();

    const socialMenu = document.getElementById('topbarSocialMenu');
    if (socialMenu) {
        const trigger = document.getElementById('topbarSocialTrigger');

        function closeSocialMenu() {
            socialMenu.classList.remove('is-open');
            trigger?.setAttribute('aria-expanded', 'false');
        }

        trigger?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            languageSelector?.classList.remove('dropdown-open');
            cityPicker?.classList.remove('is-open');
            closeTopbarMainNav();
            document.getElementById('topbarSearch')?.classList.remove('is-open');
            const isOpen = !socialMenu.classList.contains('is-open');
            socialMenu.classList.toggle('is-open', isOpen);
            trigger.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#topbarSocialMenu')) {
                closeSocialMenu();
            }
        });
    }

    function upgradeLegacySocialIcons() {
        if (document.getElementById('topbarSocialMenu')) return;
        const legacy = topBar.querySelector('.social-icons');
        if (!legacy) return;

        const links = Array.from(legacy.querySelectorAll('a[href]'));
        const menu = document.createElement('div');
        menu.className = 'topbar-social-menu';
        menu.id = 'topbarSocialMenu';
        menu.innerHTML = [
            '<button type="button" class="topbar-social-trigger" id="topbarSocialTrigger" aria-label="Social media" aria-expanded="false">',
            '<i class="fas fa-share-alt" aria-hidden="true"></i>',
            '<i class="fas fa-chevron-down topbar-social-arrow" aria-hidden="true"></i>',
            '</button>',
            '<div class="topbar-social-dropdown" id="topbarSocialDropdown"></div>'
        ].join('');

        const dropdown = menu.querySelector('.topbar-social-dropdown');
        const fallbackLinks = [
            ['https://www.youtube.com/@wishpower-videos', 'youtube', 'fab fa-youtube', 'YouTube'],
            ['https://www.tiktok.com/@wishpower1', 'tiktok', 'fab fa-tiktok', 'TikTok'],
            ['https://www.instagram.com/wishpower66/', 'instagram', 'fab fa-instagram', 'Instagram'],
            ['https://twitter.com/', 'twitter', 'fab fa-twitter', 'Twitter/X']
        ];
        const sourceLinks = links.length ? links : [];

        fallbackLinks.forEach(([href, platform, iconClass, label]) => {
            const existing = sourceLinks.find(link => {
                const value = (link.href || link.getAttribute('href') || '').toLowerCase();
                return value.indexOf(platform === 'twitter' ? 'twitter' : platform) !== -1;
            });
            const item = document.createElement('a');
            item.href = existing ? existing.getAttribute('href') : href;
            item.target = '_blank';
            item.className = 'topbar-social-item ' + platform;
            item.setAttribute('aria-label', label);
            item.innerHTML = '<i class="' + iconClass + '" aria-hidden="true"></i><span>' + label + '</span>';
            dropdown.appendChild(item);
        });

        legacy.parentNode.replaceChild(menu, legacy);
    }

    const topbarSearch = document.getElementById('topbarSearch');
    if (topbarSearch) {
        const trigger = document.getElementById('topbarSearchTrigger');
        const input = document.getElementById('topbarSearchInput');
        const submit = document.getElementById('topbarSearchSubmit');

        function closeTopbarSearch() {
            topbarSearch.classList.remove('is-open');
            trigger?.setAttribute('aria-expanded', 'false');
        }

        function openTopbarSearch() {
            languageSelector?.classList.remove('dropdown-open');
            cityPicker?.classList.remove('is-open');
            closeTopbarMainNav();
            document.getElementById('topbarSocialMenu')?.classList.remove('is-open');
            topbarSearch.classList.add('is-open');
            trigger?.setAttribute('aria-expanded', 'true');
            window.setTimeout(() => input?.focus(), 60);
        }

        function submitTopbarSearch() {
            const keyword = (input?.value || '').trim();
            if (!keyword) {
                input?.focus();
                return;
            }
            window.location.href = '/search.html?q=' + encodeURIComponent(keyword);
        }

        trigger?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (topbarSearch.classList.contains('is-open')) {
                closeTopbarSearch();
            } else {
                openTopbarSearch();
            }
        });

        submit?.addEventListener('click', (event) => {
            event.preventDefault();
            submitTopbarSearch();
        });

        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitTopbarSearch();
            }
            if (event.key === 'Escape') {
                closeTopbarSearch();
            }
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#topbarSearch')) {
                closeTopbarSearch();
            }
        });
    }

    function initTopbarMainNav() {
        const nav = document.getElementById('topbarMainNav');
        if (!nav) return;

        function normalizeTopbarIcon(icon, title, index) {
            const raw = String(icon || '').trim();
            const fallback = [
                'fas fa-info-circle',
                'far fa-newspaper',
                'fas fa-cubes',
                'fas fa-video',
                'fas fa-lightbulb',
                'fas fa-download',
                'fas fa-envelope'
            ];
            const lowerTitle = String(title || '').toLowerCase();

            if (raw && /\.(png|jpe?g|gif|webp|svg)$/i.test(raw)) {
                return '<img src="' + raw + '" alt="">';
            }
            if (raw) {
                let cls = raw.replace(/^\//, '').replace(/\s+/g, ' ');
                if (cls.indexOf('fa-') === 0) cls = 'fas ' + cls;
                if (/\bfa-/.test(cls)) return '<i class="' + cls + '" aria-hidden="true"></i>';
            }
            if (lowerTitle.indexOf('about') !== -1) return '<i class="fas fa-info-circle" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('news') !== -1) return '<i class="far fa-newspaper" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('product') !== -1) return '<i class="fas fa-cubes" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('video') !== -1) return '<i class="fas fa-video" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('solution') !== -1) return '<i class="fas fa-lightbulb" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('download') !== -1) return '<i class="fas fa-download" aria-hidden="true"></i>';
            if (lowerTitle.indexOf('contact') !== -1) return '<i class="fas fa-envelope" aria-hidden="true"></i>';
            return '<i class="' + (fallback[index % fallback.length] || 'fas fa-circle') + '" aria-hidden="true"></i>';
        }

        nav.querySelectorAll('.topbar-nav-category-icon').forEach((icon, index) => {
            const item = icon.closest('.topbar-nav-category');
            icon.innerHTML = normalizeTopbarIcon(icon.getAttribute('data-icon'), item?.textContent, index);
        });

        nav.querySelectorAll('[data-topbar-nav-item]').forEach(item => {
            const dropdown = item.querySelector('.topbar-nav-dropdown');
            const categories = item.querySelectorAll('.topbar-nav-category');
            const panels = item.querySelectorAll('.topbar-nav-panel');
            const link = item.querySelector('.topbar-nav-link');
            let closeTimer = 0;

            if (!dropdown || (!categories.length && !panels.length)) {
                item.classList.add('no-dropdown');
                return;
            }

            function hasPreview(index) {
                return !!panels[index]?.querySelector('.topbar-nav-product');
            }

            function initContent() {
                const firstPreviewIndex = Array.from(panels).findIndex(panel => panel.querySelector('.topbar-nav-product'));
                const hasAnyPreview = firstPreviewIndex !== -1;
                const activeIndex = hasAnyPreview ? firstPreviewIndex : 0;

                dropdown.classList.toggle('no-preview', !hasAnyPreview);
                dropdown.classList.toggle('no-active-preview', !hasPreview(activeIndex));
                categories.forEach((category, index) => {
                    const active = index === activeIndex;
                    category.classList.toggle('active', active);
                    if (panels[index]) {
                        panels[index].classList.toggle('active', active && hasPreview(index));
                        panels[index].style.display = active && hasPreview(index) ? 'grid' : 'none';
                    }
                });
            }

            function openItem() {
                window.clearTimeout(closeTimer);
                closeTopbarMainNav();
                languageSelector?.classList.remove('dropdown-open');
                cityPicker?.classList.remove('is-open');
                document.getElementById('topbarSocialMenu')?.classList.remove('is-open');
                document.getElementById('topbarSearch')?.classList.remove('is-open');
                item.classList.add('is-open');
                initContent();
            }

            function closeItemSoon() {
                window.clearTimeout(closeTimer);
                closeTimer = window.setTimeout(() => item.classList.remove('is-open'), 180);
            }

            function activateCategory(category) {
                const activeIndex = Array.from(categories).indexOf(category);
                dropdown.classList.toggle('no-active-preview', activeIndex === -1 || !hasPreview(activeIndex));
                categories.forEach((node, index) => {
                    const active = node === category;
                    node.classList.toggle('active', active);
                    if (panels[index]) {
                        panels[index].classList.toggle('active', active && hasPreview(index));
                        panels[index].style.display = active && hasPreview(index) ? 'grid' : 'none';
                    }
                });
            }

            item.addEventListener('mouseenter', openItem);
            item.addEventListener('mouseleave', closeItemSoon);
            categories.forEach(category => {
                category.addEventListener('mouseenter', () => activateCategory(category));
                category.addEventListener('focus', () => activateCategory(category));
                category.addEventListener('click', (event) => {
                    event.stopPropagation();
                    activateCategory(category);
                });
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('#topbarMainNav')) {
                closeTopbarMainNav();
            }
        });
    }

    const themeToggle = document.getElementById('topThemeToggle');
    const themeIcon = document.getElementById('topThemeIcon');
    if (themeToggle && themeIcon) {
        const themeStorageKey = 'theme';
        const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        function getSavedTheme() {
            try {
                const theme = window.localStorage.getItem(themeStorageKey);
                return theme === 'dark' || theme === 'light' ? theme : '';
            } catch (error) {
                return '';
            }
        }

        function saveTheme(theme) {
            try {
                window.localStorage.setItem(themeStorageKey, theme);
            } catch (error) {
                // Theme still applies for this visit when storage is unavailable.
            }
        }

        function applyTheme(theme) {
            const nextTheme = theme === 'dark' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', nextTheme);
            document.documentElement.style.colorScheme = nextTheme;
            themeIcon.className = nextTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            themeToggle.setAttribute('aria-pressed', String(nextTheme === 'dark'));
            themeToggle.setAttribute(
                'aria-label',
                nextTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            );
        }

        const savedTheme = getSavedTheme();
        applyTheme(savedTheme || (systemThemeQuery.matches ? 'dark' : 'light'));

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            saveTheme(newTheme);
        });

        function handleSystemThemeChange(event) {
            if (!getSavedTheme()) {
                applyTheme(event.matches ? 'dark' : 'light');
            }
        }

        if (typeof systemThemeQuery.addEventListener === 'function') {
            systemThemeQuery.addEventListener('change', handleSystemThemeChange);
        } else if (typeof systemThemeQuery.addListener === 'function') {
            systemThemeQuery.addListener(handleSystemThemeChange);
        }
    }

    const contactBtn = document.getElementById('topContactBtn');
    const quoteBtn = document.getElementById('topQuoteBtn');
    contactBtn?.addEventListener('click', () => {
        const contactSection = document.getElementById('contact');
        if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
    });
    quoteBtn?.addEventListener('click', () => {
        const quoteForm = document.getElementById('quote-form');
        if (quoteForm) quoteForm.scrollIntoView({ behavior: 'smooth' });
    });

    const emailCopyBtn = document.getElementById('topEmailCopy');
    if (emailCopyBtn) {
        let emailTipTimer = 0;

        function showEmailCopied() {
            emailCopyBtn.classList.add('copied');
            window.clearTimeout(emailTipTimer);
            emailTipTimer = window.setTimeout(() => {
                emailCopyBtn.classList.remove('copied');
            }, 1400);
        }

        async function copyEmail(email) {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(email);
                return;
            }
            const input = document.createElement('input');
            input.value = email;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.left = '-9999px';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }

        emailCopyBtn.addEventListener('click', async () => {
            const email = (emailCopyBtn.dataset.email || '').trim();
            if (!email) return;
            try {
                await copyEmail(email);
                showEmailCopied();
            } catch (error) {
                window.location.href = 'mailto:' + email;
            }
        });
    }

    // Drive the topbar and header from one passive, frame-aligned listener.
    const desktopQuery = window.matchMedia('(min-width: 769px)');
    let lastScrollTop = Math.max(window.scrollY || 0, 0);
    let chromeCollapsed = false;
    let scrollFrame = 0;

    function setChromeCollapsed(collapsed) {
        if (collapsed === chromeCollapsed) return;
        chromeCollapsed = collapsed;
        topBar.classList.toggle('hidden', collapsed);
    }

    function updateChromeOnScroll() {
        scrollFrame = 0;
        const scrollTop = Math.max(window.scrollY || window.pageYOffset || 0, 0);

        if (!desktopQuery.matches || scrollTop <= 50) {
            setChromeCollapsed(false);
            lastScrollTop = scrollTop;
            return;
        }

        const delta = scrollTop - lastScrollTop;
        if (delta > 0) {
            setChromeCollapsed(true);
        } else if (delta < 0) {
            setChromeCollapsed(false);
        }
        lastScrollTop = scrollTop;
    }

    function requestChromeUpdate() {
        if (!scrollFrame) {
            scrollFrame = window.requestAnimationFrame(updateChromeOnScroll);
        }
    }

    window.addEventListener('scroll', requestChromeUpdate, { passive: true });
    if (typeof desktopQuery.addEventListener === 'function') {
        desktopQuery.addEventListener('change', requestChromeUpdate);
    } else if (typeof desktopQuery.addListener === 'function') {
        desktopQuery.addListener(requestChromeUpdate);
    }
    requestChromeUpdate();
}
