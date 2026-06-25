/**
 * footer.js
 * 功能：动态设置留言来源页、表单前端验证、移动端友情链接横向滚动
 */
function initFooter() {
    // 设置留言来源页的值为当前页面 URL
    const fromPageInput = document.getElementById('from_page');
    if (fromPageInput) {
        fromPageInput.value = window.location.href;
    }

    // 表单提交前端验证（只验证姓名、邮箱、内容、验证码，电话可选）
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            const name = contactForm.querySelector('input[name="contacts"]')?.value.trim();
            const email = contactForm.querySelector('input[name="email"]')?.value.trim();
            const content = contactForm.querySelector('textarea[name="content"]')?.value.trim();
            const checkcode = contactForm.querySelector('input[name="checkcode"]')?.value.trim();

            if (!name || !email || !content || !checkcode) {
                alert('请填写姓名、邮箱、咨询内容和验证码！');
                e.preventDefault(); // 阻止提交
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('请输入有效的电子邮箱');
                e.preventDefault();
                return;
            }

            // 验证通过，不调用preventDefault，表单正常提交到后台
        });
    }

    // 移动端友情链接横向滚动
    const footerLinksContainer = document.querySelector('.footer-links-container');
    if (footerLinksContainer && window.innerWidth < 769) {
        footerLinksContainer.style.overflowX = 'auto';
        footerLinksContainer.style.scrollbarWidth = 'thin';
    }
}

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
} else {
    initFooter();
}