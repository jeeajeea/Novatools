(function () {
    'use strict';

    var DEPS = [
        {
            global: 'PDFLib',
            local: 'vendor/pdf-lib.min.js',
            cdn: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
        },
        {
            global: 'pdfjsLib',
            local: 'vendor/pdf.min.js',
            cdn: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        },
        {
            global: 'JSZip',
            local: 'vendor/jszip.min.js',
            cdn: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
        },
        {
            global: 'mammoth',
            local: 'vendor/mammoth.browser.min.js',
            cdn: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
        }
    ];

    var loaded = 0;
    var failed = [];

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
        });
    }

    async function loadDep(dep) {
        if (typeof window[dep.global] !== 'undefined') return true;
        try {
            await loadScript(dep.local);
            if (typeof window[dep.global] !== 'undefined') return true;
        } catch (_) { }
        try {
            await loadScript(dep.cdn);
            if (typeof window[dep.global] !== 'undefined') return true;
        } catch (_) { }
        failed.push(dep.global);
        return false;
    }

    async function loadAll() {
        for (var i = 0; i < DEPS.length; i++) {
            var ok = await loadDep(DEPS[i]);
            if (ok) loaded++;
        }
        if (failed.length > 0) {
            console.error('Failed to load PDF dependencies:', failed.join(', '));
            var banner = document.getElementById('deps-error');
            if (banner) banner.style.display = 'block';
        }
        document.dispatchEvent(new CustomEvent('pdf-deps-ready', {
            detail: { loaded: loaded, failed: failed }
        }));
    }

    loadAll();
})();
