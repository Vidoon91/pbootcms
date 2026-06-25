// Global module entry point.
document.addEventListener('DOMContentLoaded', function () {
    [
        'initTopBar',
        'initSidebar',
        'initFooter',
        'initMobileTabbar',
        'setupMobileResponsive',
        'initBackToTop',
        'initSmoothScroll'
    ].forEach(function (name) {
        try {
            const init = window[name];
            if (typeof init === 'function') init();
        } catch (error) {
            console.error(name + ' failed:', error);
        }
    });
});

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (event) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            const topBar = document.querySelector('.top-bar');
            const headerOffset = topBar ? topBar.offsetHeight : 0;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        });
    });
}
