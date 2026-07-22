(function () {
    'use strict';

    function initTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeIcon(theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        const btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        btn.innerHTML = theme === 'dark'
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }

    function initNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href === currentPage || href.endsWith('/' + currentPage))) {
                link.classList.add('active');
            }
        });
    }

    window.showToast = function (message, type = 'info', duration = 4000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
            error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
        };

        const span = document.createElement('span');
        span.textContent = message;
        toast.innerHTML = `${icons[type] || icons.info}`;
        toast.appendChild(span);
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    window.showLoading = function(element, message = 'Processing...') {
        const existing = element.parentElement.querySelector('.loading-overlay');
        if (existing) return;
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `<div class="spinner"></div><span>${message}</span>`;
        element.style.position = 'relative';
        element.parentElement.appendChild(overlay);
    };

    window.hideLoading = function(element) {
        const overlay = element.parentElement.querySelector('.loading-overlay');
        if (overlay) overlay.remove();
    };

    window.formatFileSize = function (bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    window.sanitizeHtml = function (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'style'];
        dangerousTags.forEach(tag => {
            doc.querySelectorAll(tag).forEach(el => el.remove());
        });
        doc.querySelectorAll('*').forEach(el => {
            [...el.attributes].forEach(attr => {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    return;
                }
                const val = attr.value.replace(/[\t\n\r]/g, '').toLowerCase();
                if (/^\s*(javascript|data|vbscript|blob):/.test(val)) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        return doc.body.innerHTML;
    };

    window.encodeHtmlAttr = function (str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    window.downloadBlob = function (blob, filename) {
        if (!blob || !filename) return false;
        const sanitized = filename.replace(/[<>'";&/\\]/g, '').substring(0, 200) || 'download';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitized;
        a.rel = 'noopener';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        requestAnimationFrame(() => {
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        });
        return true;
    };

    window.initToolRouting = function () {
        function switchTool(toolId) {
            if (!toolId) return;
            if (/[^a-zA-Z0-9_-]/.test(toolId)) return;
            document.querySelectorAll('.tool-panel').forEach(panel => {
                panel.classList.toggle('active', panel.id === toolId);
            });
            document.querySelectorAll('.dock-card').forEach(card => {
                card.classList.toggle('active', card.dataset.tool === toolId);
            });
            if (window.location.hash.slice(1) !== toolId) {
                history.replaceState(null, null, '#' + toolId);
            }
        }

        window.addEventListener('hashchange', () => {
            switchTool(window.location.hash.slice(1));
        });

        const hash = window.location.hash.slice(1);
        if (hash) {
            switchTool(hash);
        } else {
            const firstPanel = document.querySelector('.tool-panel');
            if (firstPanel) switchTool(firstPanel.id);
        }

        document.querySelectorAll('.dock-card').forEach(card => {
            card.addEventListener('click', () => {
                const tool = card.dataset.tool;
                window.location.hash = tool;
                switchTool(tool);
            });
        });
    };

    function initMobileMenu() {
        const nav = document.querySelector('.nav-links');
        if (!nav) return;

        document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                nav.classList.toggle('mobile-open');
            });
        });
    }

    function initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        if (!faqItems.length) return;

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (!question) return;

            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initNav();
        initMobileMenu();
        initFAQ();

        const themeBtn = document.querySelector('.theme-toggle');
        if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

        if (document.querySelector('.workspace')) {
            initToolRouting();
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
            });
        }
    });


})();