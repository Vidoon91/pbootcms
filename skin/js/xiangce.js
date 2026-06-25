
        // ---------- 静态数据：每个卡片包含详情（多图、评论等） ----------
        const galleryItems = [
            {
                id: 1, title: "自动化生产线全景", category: "production", likes: 128, collects: 45, shares: 32,
                cover: "https://picsum.photos/id/20/600/800",
                images: ["https://picsum.photos/id/20/800/800", "https://picsum.photos/id/21/800/800", "https://picsum.photos/id/22/800/800"],
                desc: "全自动智能装配线，24小时不间断生产，精度达到0.01mm。",
                tags: ["智能制造", "工业4.0", "自动化"],
                user: { name: "WishPower工厂", avatar: "https://randomuser.me/api/portraits/men/1.jpg", followed: false },
                comments: [
                    { user: "技术控", text: "这条线效率真高！", time: "2小时前" },
                    { user: "采购张", text: "品质值得信赖", time: "昨天" }
                ]
            },
            {
                id: 2, title: "产品质量检测过程", category: "testing", likes: 92, collects: 28, shares: 15,
                cover: "https://picsum.photos/id/26/600/800",
                images: ["https://picsum.photos/id/26/800/800", "https://picsum.photos/id/27/800/800", "https://picsum.photos/id/28/800/800", "https://picsum.photos/id/29/800/800"],
                desc: "严格执行ISO9001标准，每一只绝缘子都经过高压测试。",
                tags: ["质量检测", "高压测试", "ISO9001"],
                user: { name: "质检中心", avatar: "https://randomuser.me/api/portraits/women/2.jpg", followed: true },
                comments: [
                    { user: "客户王", text: "检测报告很详细", time: "1天前" }
                ]
            },
            {
                id: 3, title: "技术团队现场讨论", category: "workshop", likes: 207, collects: 67, shares: 89,
                cover: "https://picsum.photos/id/32/600/800",
                images: ["https://picsum.photos/id/32/800/800", "https://picsum.photos/id/33/800/800"],
                desc: "工程师团队正在优化生产流程，提升良品率。",
                tags: ["研发创新", "团队协作"],
                user: { name: "研发部", avatar: "https://randomuser.me/api/portraits/men/3.jpg", followed: false },
                comments: []
            }
        ];

        // 补充更多卡片（达到18张以上）
        for (let i = 4; i <= 18; i++) {
            const cat = ["production","testing","workshop","equipment"][i % 4];
            galleryItems.push({
                id: i, title: `工厂精彩瞬间 ${i}`, category: cat, likes: Math.floor(Math.random() * 200) + 50, collects: Math.floor(Math.random() * 50), shares: Math.floor(Math.random() * 30),
                cover: `https://picsum.photos/id/${40 + i}/600/800`,
                images: [`https://picsum.photos/id/${40 + i}/800/800`, `https://picsum.photos/id/${41 + i}/800/800`],
                desc: "WishPower工厂实拍，展现专业制造实力。",
                tags: ["工厂实拍", "品质保障"],
                user: { name: "WishPower官方", avatar: "https://randomuser.me/api/portraits/lego/1.jpg", followed: false },
                comments: []
            });
        }

        const waterfallGrid = document.getElementById('waterfallGrid');
        function getCategoryName(cat) {
            const map = { production: "生产线", testing: "测试质检", workshop: "车间环境", equipment: "先进设备" };
            return map[cat] || cat;
        }
        function escapeHtml(str) {
            return String(str).replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
        function renderCards() {
            let html = '';
            galleryItems.forEach((item, idx) => {
                html += `
                    <div class="photo-card" data-id="${item.id}" data-index="${idx}">
                        <div class="card-img"><img src="${item.cover}" alt="${item.title}" loading="lazy"></div>
                        <div class="card-info">
                            <div class="card-title">${escapeHtml(item.title)}</div>
                            <div class="card-meta">
                                <span class="card-category">${getCategoryName(item.category)}</span>
                                <div class="card-likes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg><span>${item.likes}</span></div>
                            </div>
                        </div>
                    </div>
                `;
            });
            waterfallGrid.innerHTML = html;
            bindCardClick();
        }

        // 弹窗逻辑
        let currentPostData = null;
        let currentImageIndex = 0;
        let currentImagesList = [];
        const modal = document.getElementById('postModal');
        const carouselTrack = document.getElementById('carouselTrack');
        const carouselPrev = document.getElementById('carouselPrev');
        const carouselNext = document.getElementById('carouselNext');
        const carouselDots = document.getElementById('carouselDots');
        const modalRight = document.getElementById('modalRight');

        function openModal(post) {
            currentPostData = post;
            currentImagesList = post.images && post.images.length ? post.images : [post.cover];
            currentImageIndex = 0;
            updateCarousel();
            updateRightContent();
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        function updateCarousel() {
            let slidesHtml = '';
            currentImagesList.forEach(imgUrl => {
                slidesHtml += `<div class="carousel-slide"><img src="${imgUrl}" alt=""></div>`;
            });
            carouselTrack.innerHTML = slidesHtml;
            carouselTrack.style.transform = `translateX(-${currentImageIndex * 100}%)`;
            let dotsHtml = '';
            currentImagesList.forEach((_, idx) => {
                dotsHtml += `<div class="carousel-dot ${idx === currentImageIndex ? 'active' : ''}"></div>`;
            });
            carouselDots.innerHTML = dotsHtml;
        }
        function navigateCarousel(direction) {
            let newIndex = currentImageIndex + direction;
            if (newIndex < 0) newIndex = currentImagesList.length - 1;
            if (newIndex >= currentImagesList.length) newIndex = 0;
            currentImageIndex = newIndex;
            carouselTrack.style.transform = `translateX(-${currentImageIndex * 100}%)`;
            document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentImageIndex);
            });
        }
        function updateRightContent() {
            const data = currentPostData;
            const isFollowed = data.user.followed;
            let commentsHtml = '';
            if (data.comments.length === 0) {
                commentsHtml = '<div class="empty-comments">暂无评论，快来抢沙发～</div>';
            } else {
                data.comments.forEach(c => {
                    commentsHtml += `
                        <div class="comment-item">
                            <div class="comment-avatar"><img src="https://randomuser.me/api/portraits/thumb/lego/1.jpg" alt=""></div>
                            <div class="comment-content">
                                <div class="comment-name">${escapeHtml(c.user)}</div>
                                <div class="comment-text">${escapeHtml(c.text)}</div>
                                <div class="comment-time">${c.time}</div>
                            </div>
                        </div>
                    `;
                });
            }
            // 构建右列完整结构（包含底部输入框+操作栏）
            const rightHtml = `
                <div class="right-content">
                    <div class="post-user">
                        <div class="user-info">
                            <div class="user-avatar"><img src="${data.user.avatar}" alt=""></div>
                            <div class="user-name">${escapeHtml(data.user.name)}</div>
                        </div>
                        <button class="follow-btn" id="followBtn">${isFollowed ? '已关注' : '关注'}</button>
                    </div>
                    <div class="post-title">${escapeHtml(data.title)}</div>
                    <div class="post-desc">${escapeHtml(data.desc)}</div>
                    <div class="topic-tags">
                        ${data.tags.map(tag => `<span class="topic-tag">#${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="comments-scroll" id="commentsScroll">
                        <div class="comments-list" id="commentsList">
                            ${commentsHtml}
                        </div>
                    </div>
                </div>
                <div class="bottom-bar">
                    <div class="comment-input-row">
                        <input type="text" class="comment-input" id="newCommentInput" placeholder="说点什么...">
                        <button class="comment-submit" id="submitComment">发布</button>
                    </div>
                    <div class="action-icons">
                        <div class="action-item" id="likeAction"><i class="far fa-heart"></i> <span id="likeCount">${data.likes}</span></div>
                        <div class="action-item" id="collectAction"><i class="far fa-star"></i> <span id="collectCount">${data.collects || 0}</span></div>
                        <div class="action-item" id="shareAction"><i class="far fa-share-square"></i> <span id="shareCount">${data.shares || 0}</span></div>
                    </div>
                </div>
            `;
            modalRight.innerHTML = rightHtml;
            // 绑定关注按钮
            const followBtn = document.getElementById('followBtn');
            if (followBtn) {
                followBtn.addEventListener('click', () => {
                    const nowFollowed = followBtn.innerText === '关注';
                    followBtn.innerText = nowFollowed ? '已关注' : '关注';
                    currentPostData.user.followed = nowFollowed;
                });
            }
            // 点赞
            const likeAction = document.getElementById('likeAction');
            const likeCountSpan = document.getElementById('likeCount');
            let liked = false;
            likeAction.addEventListener('click', () => {
                if (!liked) {
                    currentPostData.likes++;
                    likeCountSpan.innerText = currentPostData.likes;
                    likeAction.innerHTML = '<i class="fas fa-heart" style="color:#f43f5e;"></i> <span>' + currentPostData.likes + '</span>';
                    liked = true;
                } else {
                    currentPostData.likes--;
                    likeCountSpan.innerText = currentPostData.likes;
                    likeAction.innerHTML = '<i class="far fa-heart"></i> <span>' + currentPostData.likes + '</span>';
                    liked = false;
                }
            });
            // 收藏
            const collectAction = document.getElementById('collectAction');
            const collectCountSpan = document.getElementById('collectCount');
            let collected = false;
            collectAction.addEventListener('click', () => {
                if (!collected) {
                    currentPostData.collects = (currentPostData.collects || 0) + 1;
                    collectCountSpan.innerText = currentPostData.collects;
                    collectAction.innerHTML = '<i class="fas fa-star" style="color:#fbbf24;"></i> <span>' + currentPostData.collects + '</span>';
                    collected = true;
                } else {
                    currentPostData.collects--;
                    collectCountSpan.innerText = currentPostData.collects;
                    collectAction.innerHTML = '<i class="far fa-star"></i> <span>' + currentPostData.collects + '</span>';
                    collected = false;
                }
            });
            // 分享
            const shareAction = document.getElementById('shareAction');
            shareAction.addEventListener('click', () => {
                alert('分享功能开发中');
            });
            // 发布评论
            const submitBtn = document.getElementById('submitComment');
            const commentInput = document.getElementById('newCommentInput');
            submitBtn.addEventListener('click', () => {
                const text = commentInput.value.trim();
                if (!text) return;
                const newComment = { user: "当前用户", text: text, time: "刚刚" };
                currentPostData.comments.push(newComment);
                const commentsDiv = document.getElementById('commentsList');
                const newCommentHtml = `
                    <div class="comment-item">
                        <div class="comment-avatar"><img src="https://randomuser.me/api/portraits/thumb/lego/1.jpg" alt=""></div>
                        <div class="comment-content">
                            <div class="comment-name">当前用户</div>
                            <div class="comment-text">${escapeHtml(text)}</div>
                            <div class="comment-time">刚刚</div>
                        </div>
                    </div>
                `;
                if (commentsDiv.innerHTML.includes('暂无评论')) {
                    commentsDiv.innerHTML = newCommentHtml;
                } else {
                    commentsDiv.insertAdjacentHTML('beforeend', newCommentHtml);
                }
                commentInput.value = '';
                // 滚动到底部
                const scrollDiv = document.getElementById('commentsScroll');
                if (scrollDiv) scrollDiv.scrollTop = scrollDiv.scrollHeight;
            });
        }

        function bindCardClick() {
            document.querySelectorAll('.photo-card').forEach(card => {
                card.removeEventListener('click', card.clickHandler);
                const idx = parseInt(card.dataset.index);
                card.clickHandler = () => openModal(galleryItems[idx]);
                card.addEventListener('click', card.clickHandler);
            });
        }

        // 筛选逻辑
        let currentFilter = 'all';
        function filterCards() {
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach((card, i) => {
                const item = galleryItems[i];
                if (currentFilter === 'all' || item.category === currentFilter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentFilter = chip.getAttribute('data-cat');
                filterCards();
            });
        });

        // 加载更多
        let extraLoaded = false;
        document.querySelector('#loadMoreBtn .load-more-btn').addEventListener('click', () => {
            if (extraLoaded) { alert('已经到底了'); return; }
            const newItems = [
                { id: 19, title: "数字化中控室", category: "workshop", likes: 167, collects: 23, shares: 12, cover: "https://picsum.photos/id/29/600/800", images: ["https://picsum.photos/id/29/800/800","https://picsum.photos/id/30/800/800"], desc: "智能监控系统实时显示生产数据。", tags: ["数字化"], user: { name: "信息部", avatar: "https://randomuser.me/api/portraits/men/5.jpg", followed: false }, comments: [] },
                { id: 20, title: "机器人码垛线", category: "production", likes: 99, collects: 18, shares: 9, cover: "https://picsum.photos/id/31/600/800", images: ["https://picsum.photos/id/31/800/800"], desc: "全自动码垛提升效率30%", tags: ["自动化"], user: { name: "智能装备部", avatar: "https://randomuser.me/api/portraits/women/6.jpg", followed: false }, comments: [] }
            ];
            galleryItems.push(...newItems);
            renderCards();
            filterCards();
            extraLoaded = true;
        });

        // 模态框事件：点击背景关闭
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        carouselPrev.addEventListener('click', () => navigateCarousel(-1));
        carouselNext.addEventListener('click', () => navigateCarousel(1));
        window.addEventListener('keydown', (e) => {
            if (modal.classList.contains('active') && e.key === 'Escape') closeModal();
        });

        renderCards();
        filterCards();
    