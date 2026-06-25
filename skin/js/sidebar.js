// ===== sidebar.js =====
function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const desktopToggles = Array.from(document.querySelectorAll('#sidebarDesktopToggle'));
    const isEmbeddedPage = document.body.classList.contains('sidebar-embedded-page');
    if (!sidebar || sidebar.dataset.initialized === '1') return;
    sidebar.dataset.initialized = '1';

    const desktopQuery = window.matchMedia('(min-width: 769px)');
    let hoverCollapseTimer = null;

    function syncToggleState() {
        const expanded = desktopQuery.matches && !document.body.classList.contains('sidebar-folded');
        desktopToggles.forEach(toggle => {
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
        });
    }

    function setModeState() {
        closeAllSubnavs();
        if (desktopQuery.matches) {
            document.body.classList.add('sidebar-collapsed');
            document.body.classList.remove('sidebar-folded');
            sidebar.classList.remove('active');
        } else {
            document.body.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-folded');
            sidebar.classList.remove('active');
        }
        lockScroll(false);
        syncToggleState();
    }

    function expandDesktopSidebar() {
        if (!desktopQuery.matches) return;
        if (document.body.classList.contains('sidebar-folded')) return;
        if (hoverCollapseTimer) {
            clearTimeout(hoverCollapseTimer);
            hoverCollapseTimer = null;
        }
        document.body.classList.remove('sidebar-collapsed');
        syncToggleState();
    }

    function collapseDesktopSidebar() {
        if (!desktopQuery.matches) return;
        document.body.classList.add('sidebar-collapsed');
        closeAllSubnavs();
        syncToggleState();
    }

    function toggleEmbeddedNavFold() {
        const willFold = !document.body.classList.contains('sidebar-folded');
        if (hoverCollapseTimer) {
            clearTimeout(hoverCollapseTimer);
            hoverCollapseTimer = null;
        }
        if (willFold) {
            document.body.classList.add('sidebar-folded');
            document.body.classList.add('sidebar-collapsed');
            closeAllSubnavs();
        } else {
            document.body.classList.remove('sidebar-folded');
            document.body.classList.remove('sidebar-collapsed');
            sidebar.classList.remove('active');
            lockScroll(false);
        }
        syncToggleState();
    }

    function markCurrentLinks() {
        const currentPath = normalizePath(window.location.pathname);
        sidebar.querySelectorAll('a[href]').forEach(link => {
            const linkPath = normalizePath(new URL(link.getAttribute('href'), window.location.origin).pathname);
            if (linkPath && linkPath === currentPath) {
                const sidebarItem = link.closest('.sidebar-item');
                if (sidebarItem) sidebarItem.classList.add('active');
                link.classList.add('active');
            }
        });
    }

    function setSubnavOpen(group, open) {
        group.classList.toggle('is-open', open);
        const toggle = group.querySelector('.sidebar-subnav-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', String(open));
    }

    function closeAllSubnavs() {
        sidebar.querySelectorAll('.sidebar-nav-group.is-open').forEach(group => {
            setSubnavOpen(group, false);
        });
    }

    function initSubnavs() {
        sidebar.querySelectorAll('.sidebar-nav-group').forEach(group => {
            const subnav = group.querySelector('.sidebar-subnav');
            const toggle = group.querySelector('.sidebar-subnav-toggle');
            const hasSubitems = !!subnav && !!subnav.querySelector('.sidebar-subitem');

            group.classList.toggle('has-subnav', hasSubitems);
            if (!toggle) return;

            if (!hasSubitems) {
                toggle.hidden = true;
                return;
            }

            toggle.hidden = false;
            setSubnavOpen(group, false);
            toggle.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                setSubnavOpen(group, !group.classList.contains('is-open'));
            });
        });
    }

    function renderNavIcons() {
        sidebar.querySelectorAll('.sidebar-icon[data-icon]').forEach(iconWrap => {
            const icon = normalizeSidebarIcon(iconWrap.dataset.icon, iconWrap.dataset.title, iconWrap.dataset.index);
            if (!icon) return;

            if (/^(\/|https?:\/\/).+\.(svg|png|jpe?g|gif|webp)$/i.test(icon)) {
                const img = document.createElement('img');
                img.src = icon;
                img.alt = '';
                iconWrap.textContent = '';
                iconWrap.appendChild(img);
                return;
            }

            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.setAttribute('aria-hidden', 'true');
            iconWrap.textContent = '';
            iconWrap.appendChild(iconEl);
        });
    }

    function normalizeSidebarIcon(rawIcon, title, index) {
        let icon = String(rawIcon || '').trim();
        if (icon.indexOf('[') !== -1) icon = '';

        if (icon && !/^(\/|https?:\/\/).+\.(svg|png|jpe?g|gif|webp)$/i.test(icon)) {
            icon = icon.replace(/^\/+/, '').trim();
        }

        if (icon && /^fa-[\w-]+$/i.test(icon)) {
            return 'fa ' + icon;
        }

        if (icon && /^(fa|fas|far|fab|fa-solid|fa-regular|fa-brands)\s+fa-[\w-]+/i.test(icon)) {
            return icon;
        }

        if (icon && /^(\/|https?:\/\/).+\.(svg|png|jpe?g|gif|webp)$/i.test(icon)) {
            return icon;
        }

        const key = String(title || '').toLowerCase();
        const fallbackByTitle = [
            [/about/, 'fas fa-info-circle'],
            [/news/, 'fas fa-newspaper'],
            [/product/, 'fas fa-cubes'],
            [/video/, 'fas fa-video'],
            [/solution/, 'fas fa-lightbulb'],
            [/download/, 'fas fa-download'],
            [/contact/, 'fas fa-envelope'],
            [/xiangce|gallery|case/, 'fas fa-circle']
        ];

        for (let i = 0; i < fallbackByTitle.length; i++) {
            if (fallbackByTitle[i][0].test(key)) return fallbackByTitle[i][1];
        }

        const fallbackByIndex = [
            'fas fa-info-circle',
            'fas fa-newspaper',
            'fas fa-cubes',
            'fas fa-video',
            'fas fa-lightbulb',
            'fas fa-download',
            'fas fa-envelope',
            'fas fa-circle'
        ];
        const fallbackIndex = Math.max(0, Number(index || 1) - 1);
        return fallbackByIndex[fallbackIndex] || 'fas fa-circle';
    }

    function normalizePath(path) {
        if (!path || path === '/') return '/';
        return path.replace(/\/index\.html$/i, '/').replace(/\/$/, '');
    }

    function toggleDesktopSidebar() {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        if (isCollapsed) closeAllSubnavs();
        sidebar.classList.remove('active');
        lockScroll(false);
        syncToggleState();
    }

    function handleToggleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        if (desktopQuery.matches) {
            if (e.currentTarget === menuToggle && isEmbeddedPage) {
                return;
            }
            if (isEmbeddedPage && desktopToggles.includes(e.currentTarget)) {
                toggleEmbeddedNavFold();
                return;
            }
            toggleDesktopSidebar();
            return;
        }
        const isOpen = sidebar.classList.toggle('active');
        lockScroll(isOpen);
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', handleToggleClick, true);
    }

    desktopToggles.forEach(toggle => {
        toggle.addEventListener('click', handleToggleClick);
    });

    sidebar.addEventListener('mouseenter', () => {
        if (!desktopQuery.matches) return;
        if (document.body.classList.contains('sidebar-folded')) return;
        expandDesktopSidebar();
    });

    sidebar.addEventListener('mouseleave', () => {
        if (!desktopQuery.matches) return;
        if (document.body.classList.contains('sidebar-folded')) return;
        if (hoverCollapseTimer) clearTimeout(hoverCollapseTimer);
        hoverCollapseTimer = setTimeout(() => {
            collapseDesktopSidebar();
            hoverCollapseTimer = null;
        }, 80);
    });

    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (link && sidebar.contains(link) && !desktopQuery.matches) {
            sidebar.classList.remove('active');
            lockScroll(false);
        }
    });

    document.addEventListener('click', (e) => {
        if (!desktopQuery.matches && sidebar.classList.contains('active')) {
            if (!e.target.closest('#sidebar') && !e.target.closest('#menuToggle') && !e.target.closest('#sidebarDesktopToggle')) {
                sidebar.classList.remove('active');
                lockScroll(false);
            }
        }
    });

    if (typeof desktopQuery.addEventListener === 'function') {
        desktopQuery.addEventListener('change', setModeState);
    } else if (typeof desktopQuery.addListener === 'function') {
        desktopQuery.addListener(setModeState);
    }

    renderNavIcons();
    initSubnavs();
    markCurrentLinks();
    setModeState();
}

function lockScroll(lock) {
    if (lock) {
        if (document.body.dataset.scrollLocked === 'true') return;
        const scrollTop = window.scrollY;
        document.body.style.top = `-${scrollTop}px`;
        document.body.classList.add('no-scroll');
        document.body.dataset.scrollLocked = 'true';
    } else if (document.body.dataset.scrollLocked === 'true') {
        const scrollTop = parseInt(document.body.style.top || '0', 10);
        document.body.classList.remove('no-scroll');
        document.body.style.top = '';
        delete document.body.dataset.scrollLocked;
        window.scrollTo(0, Math.abs(scrollTop));
    }
}
