document.addEventListener('DOMContentLoaded', function() {
    const filterContainer = document.getElementById('videoFilterContainer');
    const filterToggle = document.getElementById('videoFilterToggle');
    if (filterContainer && filterToggle) {
        const filterStateKey = `videoFilterExpanded:${window.location.pathname}`;
        const icon = filterToggle.querySelector('.video-filter-toggle i');

        function setFilterExpanded(isExpanded) {
            filterContainer.classList.toggle('collapsed', !isExpanded);
            sessionStorage.setItem(filterStateKey, isExpanded ? '1' : '0');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        }

        setFilterExpanded(sessionStorage.getItem(filterStateKey) === '1');

        filterToggle.addEventListener('click', () => {
            setFilterExpanded(filterContainer.classList.contains('collapsed'));
        });
    }
    
    const filterTags = document.querySelectorAll('.filter-tag');
    const filterTitles = document.querySelectorAll('.filter-row-title[data-clear-filter]');
    const resetBtn = document.getElementById('filterReset');
    const countSpan = document.getElementById('selectedFiltersCount');
    let activeCount = document.querySelectorAll('.filter-tag.active:not(.filter-tag-all)').length;
    
    function updateCount() {
        if (countSpan) countSpan.innerText = activeCount;
    }
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            if (tag.tagName.toLowerCase() === 'a' && tag.getAttribute('href')) return;
            if (tag.classList.contains('active')) {
                tag.classList.remove('active');
                activeCount--;
            } else {
                tag.classList.add('active');
                activeCount++;
            }
            updateCount();
        });
    });

    filterTitles.forEach(title => {
        title.addEventListener('click', () => {
            const row = title.closest('.filter-row');
            const allLink = row ? row.querySelector('.filter-tag-all[href]') : null;
            if (allLink) window.location.href = allLink.href;
        });
    });
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const resetUrl = resetBtn.getAttribute('data-reset-url');
            if (resetUrl) {
                window.location.href = resetUrl;
                return;
            }
            filterTags.forEach(t => t.classList.remove('active'));
            activeCount = 0;
            updateCount();
        });
    }
    updateCount();
    document.querySelectorAll('.nav-link[href*="video"]').forEach(link => link.classList.add('active'));
    document.querySelectorAll('.sidebar-item a[href*="videolist"]').forEach(link => {
        if (link.parentElement) link.parentElement.classList.add('active');
    });
    document.querySelectorAll('.tab-item a[href*="videolist"]').forEach(link => {
        if (link.parentElement) link.parentElement.classList.add('active');
    });
});
