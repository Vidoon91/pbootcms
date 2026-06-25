document.addEventListener('DOMContentLoaded', function() {
    initDownloadFullscreenPreview();
    initDownloadButton();
    initBreadcrumbState();
    initMobileLayout();
    initRelatedDownloadCards();
    initPopularDownloadItems();
    initPageAnimation();
    initSupportButton();
});

function initDownloadFullscreenPreview() {
    const loadPreviewBtn = document.getElementById('loadPreviewBtn');
    const fullPreviewBtn = document.getElementById('fullPreviewBtn');
    const previewBody = document.getElementById('previewBody');

    if (!previewBody) return;

    function getPreviewSrc() {
        return previewBody.getAttribute('data-preview-src') || '';
    }

    function loadPdfPreview() {
        const existingPreview = previewBody.querySelector('object');
        if (existingPreview) return existingPreview;

        const previewSrc = getPreviewSrc();
        if (!previewSrc) return null;

        const objectElement = document.createElement('object');
        objectElement.setAttribute('data', previewSrc);
        objectElement.setAttribute('type', 'application/pdf');
        objectElement.setAttribute('width', '100%');
        objectElement.setAttribute('height', '100%');
        objectElement.className = 'pdf-preview-object';
        objectElement.innerHTML = '<p class="preview-fallback">您的浏览器不支持 PDF 预览，请<a href="' + previewSrc + '" download>点击下载文件</a></p>';

        previewBody.innerHTML = '';
        previewBody.appendChild(objectElement);

        if (fullPreviewBtn) {
            fullPreviewBtn.hidden = false;
        }

        return objectElement;
    }

    if (loadPreviewBtn) {
        loadPreviewBtn.addEventListener('click', function(event) {
            event.preventDefault();
            loadPdfPreview();
        });
    }

    if (!fullPreviewBtn) return;

    fullPreviewBtn.addEventListener('click', function(event) {
        event.preventDefault();
        loadPdfPreview();

        if (previewBody.requestFullscreen) {
            previewBody.requestFullscreen();
        } else if (previewBody.webkitRequestFullscreen) {
            previewBody.webkitRequestFullscreen();
        } else if (previewBody.msRequestFullscreen) {
            previewBody.msRequestFullscreen();
        } else {
            const previewSrc = getPreviewSrc();
            if (previewSrc) {
                window.open(previewSrc, '_blank');
            }
        }
    });
}

function initDownloadButton() {
    const downloadBtn = document.querySelector('.btn-download-primary');
    if (!downloadBtn) return;

    downloadBtn.removeAttribute('download');

    downloadBtn.addEventListener('click', function(event) {
        event.preventDefault();

        const originalText = this.innerHTML;
        this.setAttribute('download', '');
        this.innerHTML = '<i class="fas fa-check"></i> Downloading...';
        this.classList.add('is-downloading');

        setTimeout(() => {
            window.location.href = this.href;
        }, 100);

        setTimeout(() => {
            this.innerHTML = originalText;
            this.classList.remove('is-downloading');
        }, 1500);
    });
}

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

function initRelatedDownloadCards() {
    document.querySelectorAll('.related-download-card').forEach(function(card) {
        card.addEventListener('click', function(event) {
            if (event.target.closest('.btn-related-download')) return;

            const link = this.querySelector('.related-download-title a');
            if (link) {
                window.location.href = link.href;
            }
        });
    });
}

function initPopularDownloadItems() {
    document.querySelectorAll('.popular-download-item').forEach(function(item) {
        item.addEventListener('click', function(event) {
            event.preventDefault();

            const link = this.getAttribute('href');
            if (link) {
                window.location.href = link;
            }
        });
    });
}

function initPageAnimation() {
    setTimeout(function() {
        document.querySelectorAll('.fade-in-up').forEach(function(element) {
            element.style.opacity = '1';
        });
    }, 300);
}

function initSupportButton() {
    const supportBtn = document.querySelector('.btn-support');
    if (!supportBtn) return;

    supportBtn.addEventListener('click', function(event) {
        event.preventDefault();

        const url = this.getAttribute('href');
        if (url) {
            window.location.href = url;
        }
    });
}
