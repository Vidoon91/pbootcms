(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        const filterPanel = document.querySelector('.product-filter-panel');
        const filterHeader = filterPanel ? filterPanel.querySelector('.filter-panel-header') : null;
        const filterOptions = document.querySelectorAll('.filter-options a');
        const clearBtn = document.getElementById('clearFilters');
        const selectedFiltersCount = document.getElementById('selectedFiltersCount');
        const productsGrid = document.getElementById('productsGrid');

        function keepFilterGroupsOpen() {
            document.querySelectorAll('.filter-options').forEach(function(options) {
                options.style.maxHeight = 'none';
                options.style.opacity = '1';
                options.style.marginTop = '0';
                options.dataset.expanded = 'true';
            });
        }

        function updateSelectedFiltersCount() {
            if (!selectedFiltersCount || !filterPanel) return;

            const activeFilters = Array.from(filterPanel.querySelectorAll('.filter-options .active')).filter(function(item) {
                const options = item.closest('.filter-options');
                const firstOption = options ? options.querySelector('a, .filter-option') : null;
                return item !== firstOption;
            });

            selectedFiltersCount.textContent = String(activeFilters.length);
        }

        if (filterHeader && filterPanel) {
            if (window.innerWidth <= 768) {
                filterPanel.classList.add('collapsed');
            }

            filterHeader.addEventListener('click', function() {
                filterPanel.classList.toggle('collapsed');
            });
        }

        filterOptions.forEach(function(option) {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                const currentUrl = new URL(window.location.href);
                const params = new URLSearchParams();

                for (const [key, value] of currentUrl.searchParams.entries()) {
                    if (!key.startsWith('ext_')) {
                        params.set(key, value);
                    }
                }

                window.location.href = currentUrl.pathname + (params.toString() ? '?' + params.toString() : '');
            });
        }

        document.querySelectorAll('.pagination-item:not(.disabled), .pagination .page-num:not(.page-num-current)').forEach(function(item) {
            item.addEventListener('click', function() {
                if (!productsGrid) return;

                productsGrid.classList.add('product-loading');
                setTimeout(function() {
                    productsGrid.classList.remove('product-loading');
                }, 800);
            });
        });

        keepFilterGroupsOpen();
        updateSelectedFiltersCount();
    });
})();
