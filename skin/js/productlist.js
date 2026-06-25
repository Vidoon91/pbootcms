(function() {
    'use strict';
    document.addEventListener('DOMContentLoaded', function() {
        // 排序选择 - 保留UI交互
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                console.log('排序方式改变为：', this.value);
                // 实际应用中可由CMS处理排序
            });
        }

        // 分页交互 - 样式切换（实际跳转由链接完成）
        const paginationItems = document.querySelectorAll('.pagination-item:not(.disabled)');
        paginationItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (this.classList.contains('active')) {
                    e.preventDefault();
                    return;
                }
                paginationItems.forEach(it => it.classList.remove('active'));
                this.classList.add('active');
                const productsGrid = document.getElementById('productsGrid');
                productsGrid.classList.add('product-loading');
                setTimeout(() => {
                    productsGrid.classList.remove('product-loading');
                }, 800);
            });
        });
    });
})();
