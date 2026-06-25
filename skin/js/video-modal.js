// ===== video-modal.js =====
// 视频弹窗模块 - 自执行版本
// 修复进度条不显示/不更新问题，增强稳定性，完全保留原始UI交互

(function() {
    'use strict';
    
    // 检查当前页面是否有视频相关元素
    const videoPlayBtn = document.getElementById('videoPlayBtn');
    const videoModalOverlay = document.getElementById('videoModalOverlay');
    const videoModalPlayer = document.getElementById('videoModalPlayer');
    
    // 如果没有视频元素，直接退出，不执行任何代码
    if (!videoPlayBtn || !videoModalOverlay || !videoModalPlayer) {
        console.log('当前页面无视频模块，跳过初始化');
        return;
    }
    
    // console.log('视频模块初始化...');
    let isPlaying = false;

    // 打开弹窗并播放
    videoPlayBtn.addEventListener('click', () => {
        isPlaying = true;
        lockScroll(true);
        videoModalOverlay.classList.add('active');
        
        // 确保视频重新加载并播放
        videoModalPlayer.load();
        videoModalPlayer.play().catch(e => {
            console.warn('视频播放失败:', e);
        });
        
        const playPauseBtn = document.getElementById('videoModalPlayPauseBtn');
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    // 关闭弹窗
    const videoModalClose = document.getElementById('videoModalClose');
    videoModalClose?.addEventListener('click', closeVideo);
    videoModalOverlay.addEventListener('click', (e) => {
        if (e.target === videoModalOverlay) closeVideo();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPlaying) closeVideo();
    });
    videoModalPlayer.addEventListener('ended', () => {
        closeVideo();
    });

    // 初始化视频控件
    initVideoControls();

    function closeVideo() {
        if (!isPlaying) return;
        isPlaying = false;
        videoModalPlayer.pause();
        lockScroll(false);
        videoModalOverlay.classList.remove('active');
        const playPauseBtn = document.getElementById('videoModalPlayPauseBtn');
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    function lockScroll(lock) {
        if (lock) {
            const scrollTop = window.scrollY;
            document.body.style.top = `-${scrollTop}px`;
            document.body.classList.add('no-scroll');
        } else {
            const scrollTop = parseInt(document.body.style.top || '0');
            document.body.classList.remove('no-scroll');
            window.scrollTo(0, Math.abs(scrollTop));
            document.body.style.top = '';
        }
    }
})();

// 视频控件初始化函数 - 放在自执行函数内部
function initVideoControls() {
    const video = document.getElementById('videoModalPlayer');
    const playPauseBtn = document.getElementById('videoModalPlayPauseBtn');
    const progressBar = document.getElementById('videoModalProgressBar');
    const currentTimeEl = document.getElementById('videoModalCurrentTime');
    const durationEl = document.getElementById('videoModalDuration');
    const progressContainer = document.getElementById('videoModalProgress');
    const volumeBtn = document.getElementById('videoModalVolumeBtn');
    const volumeSlider = document.getElementById('videoModalVolumeSlider');
    const volumeLevel = document.getElementById('videoModalVolumeLevel');
    const fullscreenBtn = document.getElementById('videoModalFullscreenBtn');

    if (!video) return;

    // 初始音量
    video.volume = 0.7;
    if (volumeLevel) volumeLevel.style.width = '70%';

    // ----- 播放/暂停 -----
    playPauseBtn?.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            video.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    // ----- 元数据加载完成：显示总时长 -----
    video.addEventListener('loadedmetadata', () => {
        if (durationEl) {
            durationEl.textContent = formatTime(video.duration);
        }
    });

    // ----- 时间更新：更新当前时间与进度条 -----
    video.addEventListener('timeupdate', () => {
        if (!progressBar || !currentTimeEl) return;
        const current = video.currentTime;
        const total = video.duration || 0;
        const percent = total ? (current / total) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        currentTimeEl.textContent = formatTime(current);
    });

    // ----- 进度条点击跳转 -----
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, clickX / rect.width));
            video.currentTime = percent * (video.duration || 0);
        });
    }

    // ----- 音量控制 -----
    if (volumeBtn && volumeSlider && volumeLevel) {
        volumeBtn.addEventListener('click', () => {
            if (video.volume > 0) {
                video.volume = 0;
                volumeLevel.style.width = '0%';
                volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                video.volume = 0.7;
                volumeLevel.style.width = '70%';
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });

        volumeSlider.addEventListener('click', (e) => {
            const rect = volumeSlider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            video.volume = percent;
            volumeLevel.style.width = `${percent * 100}%`;
            volumeBtn.innerHTML = percent === 0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        });
    }

    // ----- 全屏切换 -----
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                video.requestFullscreen().catch(err => {
                    console.warn('全屏请求失败:', err);
                });
            } else {
                document.exitFullscreen();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            fullscreenBtn.innerHTML = document.fullscreenElement 
                ? '<i class="fas fa-compress"></i>' 
                : '<i class="fas fa-expand"></i>';
        });
    }

    // ----- 视频加载错误处理 -----
    video.addEventListener('error', (e) => {
        console.error('视频加载失败:', video.error);
        if (durationEl) durationEl.textContent = '加载失败';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
    });
}

// ----- 时间格式化辅助函数 -----
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}