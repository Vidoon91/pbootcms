// ===== 商品直通车轮播 =====
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.product-shuttle').forEach(function(slider) {
            const track = slider.querySelector('.product-shuttle-track');
            const items = slider.querySelectorAll('.product-shuttle-card');
            const prevBtn = slider.querySelector('.product-shuttle-prev');
            const nextBtn = slider.querySelector('.product-shuttle-next');
            if (!track || items.length === 0) return;

            let currentIndex = 0;
            let startX = 0;
            let startY = 0;
            let isTouching = false;

            function updateSlider() {
                track.style.transform = `translate3d(${-currentIndex * 100}%, 0, 0)`;
            }

            function go(delta) {
                currentIndex = (currentIndex + delta + items.length) % items.length;
                updateSlider();
            }

            prevBtn?.addEventListener('click', function() {
                go(-1);
            });

            nextBtn?.addEventListener('click', function() {
                go(1);
            });

            slider.addEventListener('touchstart', function(event) {
                const touch = event.touches[0];
                if (!touch) return;
                startX = touch.clientX;
                startY = touch.clientY;
                isTouching = true;
            }, { passive: true });

            slider.addEventListener('touchend', function(event) {
                if (!isTouching) return;
                isTouching = false;
                const touch = event.changedTouches[0];
                if (!touch) return;

                const diffX = touch.clientX - startX;
                const diffY = touch.clientY - startY;
                if (Math.abs(diffX) < 35 || Math.abs(diffX) < Math.abs(diffY)) return;

                go(diffX < 0 ? 1 : -1);
            }, { passive: true });

            updateSlider();
        });
    });
})();
