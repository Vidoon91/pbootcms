document.addEventListener('DOMContentLoaded', function() {
    initBreadcrumbState();
    initMobileLayout();
    initDownloadProductCarousel();
});

window.addEventListener('load', function() {
    initDownloadProductCarousel();
});

function initBreadcrumbState() {
    const currentPage = document.querySelector('.breadcrumb-current');
    if (currentPage) {
        currentPage.setAttribute('aria-current', 'page');
    }
}

function initMobileLayout() {
    const mainContentWrapper = document.querySelector('.main-content-wrapper');
    if (!mainContentWrapper) return;

    function adjustForMobile() {
        if (window.innerWidth < 769) {
            mainContentWrapper.style.marginLeft = '0';
            mainContentWrapper.style.width = '100%';
        } else {
            mainContentWrapper.style.marginLeft = '';
            mainContentWrapper.style.width = '';
        }
    }

    adjustForMobile();
    window.addEventListener('resize', adjustForMobile);
}

function initDownloadProductCarousel() {
    document.querySelectorAll('[data-dl-product-carousel]').forEach(function(carousel) {
        if (carousel.dataset.carouselReady === 'true') return;

        const track = carousel.querySelector('.dl-product-track');
        const slides = Array.from(carousel.querySelectorAll('.dl-product-slide'));
        const prevBtn = carousel.querySelector('.dl-product-prev');
        const nextBtn = carousel.querySelector('.dl-product-next');
        const viewport = carousel.querySelector('.dl-product-viewport');

        if (!track || slides.length === 0) return;
        carousel.dataset.carouselReady = 'true';
        track.style.width = (slides.length * 100) + '%';
        slides.forEach(function(slide) {
            slide.style.flex = '0 0 ' + (100 / slides.length) + '%';
        });

        let currentIndex = 0;
        let startX = 0;
        let isDragging = false;

        function updateCarousel() {
            track.style.transform = 'translate3d(' + (-(currentIndex * 100) / slides.length) + '%, 0, 0)';

            if (prevBtn) prevBtn.disabled = slides.length <= 1;
            if (nextBtn) nextBtn.disabled = slides.length <= 1;
        }

        function showSlide(index) {
            if (slides.length <= 1) return;

            if (index < 0) {
                currentIndex = slides.length - 1;
            } else if (index >= slides.length) {
                currentIndex = 0;
            } else {
                currentIndex = index;
            }

            updateCarousel();
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                showSlide(currentIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                showSlide(currentIndex + 1);
            });
        }

        const swipeTarget = viewport || track;

        swipeTarget.addEventListener('touchstart', function(event) {
            startX = event.touches[0].clientX;
            isDragging = true;
        }, { passive: true });

        swipeTarget.addEventListener('touchend', function(event) {
            if (!isDragging) return;

            const endX = event.changedTouches[0].clientX;
            const diffX = endX - startX;

            if (Math.abs(diffX) > 36) {
                showSlide(currentIndex + (diffX < 0 ? 1 : -1));
            }

            isDragging = false;
        });

        updateCarousel();
    });
}
