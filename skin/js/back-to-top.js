// ===== back-to-top.js =====
function initBackToTop() {
    const button = document.getElementById('backToTop');
    if (!button) return;

    window.addEventListener('scroll', debounce(() => {
        if (window.scrollY > 300) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    }, 100));

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}