document.addEventListener('pdf-deps-ready', function () {
(function () {
    'use strict';

    var PDFLib = window.PDFLib;
    var pdfjsLib = window.pdfjsLib;

    if (!PDFLib || !pdfjsLib) {
        console.error('PDF dependencies missing');
        var banner = document.getElementById('deps-error');
        if (banner) banner.style.display = 'block';
        return;
    }

    var CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var WORKER_LOCAL = 'vendor/pdf.worker.min.js?v=2';
    var workerSrc = WORKER_LOCAL;
    if (window.location.protocol === 'file:') {
        workerSrc = CDN_WORKER;
        fetch(WORKER_LOCAL)
            .then(function (r) { return r.blob(); })
            .then(function (blob) { pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob); })
            .catch(function () { pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER; });
    } else {
        try {
            var workerTest = new XMLHttpRequest();
            workerTest.open('HEAD', workerSrc, false);
            workerTest.send();
            if (workerTest.status >= 400) workerSrc = CDN_WORKER;
        } catch (_) {
            workerSrc = CDN_WORKER;
        }
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
    const MAX_SIG_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_PDF_PAGES = 1300; // max pages allowed per upload

    async function validatePdfFile(file) {
        if (!file) {
            window.showToast('Please select a file', 'error');
            return false;
        }
        if (file.size > MAX_PDF_SIZE) {
            window.showToast('File too large. Maximum size is 50MB', 'error');
            return false;
        }
        const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        const header = String.fromCharCode(...bytes);
        if (!header.startsWith('%PDF')) {
            window.showToast('Invalid PDF file', 'error');
            return false;
        }
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
            const pageCount = pdfDoc.getPageCount();
            if (pageCount > MAX_PDF_PAGES) {
                window.showToast('Book too large. Maximum is ' + MAX_PDF_PAGES + ' pages. This PDF has ' + pageCount + ' pages.', 'error');
                return false;
            }
        } catch (e) {
            window.showToast('Could not read PDF pages', 'error');
            return false;
        }
        return true;
    }

    function validateImageFile(file) {
        if (!file) {
            window.showToast('Please select a valid image file', 'error');
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            window.showToast('File too large. Maximum size is 20MB', 'error');
            return false;
        }
        return true;
    }

    async function validateImageMagicBytes(file) {
        const signatures = {
            'image/png': [[0x89, 0x50, 0x4E, 0x47]],
            'image/jpeg': [[0xFF, 0xD8, 0xFF]],
            'image/gif': [[0x47, 0x49, 0x46, 0x38]],
            'image/webp': [[0x52, 0x49, 0x46, 0x46], null, null, null, [0x57, 0x45, 0x42, 0x50]],
            'image/bmp': [[0x42, 0x4D]],
            'image/svg+xml': [[0x3C, 0x3F, 0x78, 0x6D, 0x6C], [0x3C, 0x73, 0x76, 0x67]]
        };
        const slice = file.slice(0, 12);
        const buffer = await slice.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const type = file.type;
        const sigs = signatures[type];
        if (!sigs) return false;
        for (const sig of sigs) {
            if (!sig) continue;
            let match = true;
            for (let i = 0; i < sig.length; i++) {
                if (bytes[i] !== sig[i]) { match = false; break; }
            }
            if (match) return true;
        }
        return false;
    }

    function sanitizeFilename(filename) {
        // Remove path traversal, control chars, and keep only safe chars
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/\.(?!pdf$|png$|jpg$|jpeg$|webp$|gif$|bmp$|svg$|txt$)[^.]+$/gi, '')
            .substring(0, 100) || 'file';
    }

    /* ================= BUNDLED UTILITIES ================= */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showPreview(container, file, type) {
        if (!file || !container) return;
        if (container.querySelector('.preview-thumb')) return;
        if (type && type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const thumb = document.createElement('div');
                thumb.className = 'preview-thumb';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Preview';
                const removeBtn = document.createElement('button');
                removeBtn.className = 'preview-remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => {
                    thumb.remove();
                    const fl = container.closest('.file-list');
                    if (fl) fl.dataset.hasFile = 'false';
                });
                thumb.appendChild(img);
                thumb.appendChild(removeBtn);
                container.appendChild(thumb);
            };
            reader.readAsDataURL(file);
        } else if (type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                    if (pdf.numPages > MAX_PDF_PAGES) {
                        window.showToast('Book too large. Maximum is ' + MAX_PDF_PAGES + ' pages. This PDF has ' + pdf.numPages + ' pages.', 'error');
                        const fl = container.closest('.file-list');
                        if (fl) fl.dataset.hasFile = 'invalid';
                        return;
                    }
                    const page = await pdf.getPage(1);
                    const scale = 100 / page.getViewport({ scale: 1 }).width;
                    const viewport = page.getViewport({ scale: scale * 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    const thumb = document.createElement('div');
                    thumb.className = 'preview-thumb pdf-preview';
                    const thumbCanvas = document.createElement('canvas');
                    thumbCanvas.width = viewport.width;
                    thumbCanvas.height = viewport.height;
                    thumbCanvas.getContext('2d').drawImage(canvas, 0, 0);
                    const info = document.createElement('span');
                    info.textContent = pdf.numPages + ' page(s)';
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'preview-remove';
                    removeBtn.textContent = '\u00d7';
                    removeBtn.addEventListener('click', () => {
                        thumb.remove();
                        const fl = container.closest('.file-list');
                        if (fl) fl.dataset.hasFile = 'false';
                    });
                    thumb.appendChild(thumbCanvas);
                    thumb.appendChild(info);
                    thumb.appendChild(removeBtn);
                    container.appendChild(thumb);
                } catch (err) {
                    console.warn('Preview failed:', err);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }

    /* ================= MERGE PDF ================= */
    (function() {
        const state = { files: [] };
        const dropzone = document.getElementById('merge-dropzone');
        const input = document.getElementById('merge-input');
        const filelist = document.getElementById('merge-filelist');
        const btn = document.getElementById('merge-btn');
        const clearBtn = document.getElementById('merge-clear');
        const resultArea = document.getElementById('merge-result');
        const downloadBtn = document.getElementById('merge-download');
        let mergedPdfBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
        input.addEventListener('change', e => handleFiles(e.target.files));
        clearBtn.addEventListener('click', () => { state.files = []; mergedPdfBytes = null; resultArea.style.display = 'none'; filelist.innerHTML = ''; btn.disabled = true; });

        async function handleFiles(files) {
            for (const f of Array.from(files)) {
                if (f.size > MAX_PDF_SIZE) continue;
                if (f.type === 'application/pdf' || !f.type || f.name.match(/\.pdf$/i)) {
                    const valid = await validatePdfFile(f);
                    if (valid) {
                        state.files.push(f);
                        addFileToList(f);
                    }
                }
            }
            updateBtn();
        }

        function addFileToList(file) {
            const div = document.createElement('div');
            div.className = 'file-item';
            const preview = document.createElement('div');
            preview.className = 'file-preview pdf-preview';
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 60;
            previewCanvas.height = 80;
            const pageLabel = document.createElement('span');
            pageLabel.textContent = '\u2026';
            preview.appendChild(previewCanvas);
            preview.appendChild(pageLabel);
            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = file.name;
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size';
            sizeSpan.textContent = window.formatFileSize(file.size);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => {
                state.files = state.files.filter(f => f !== file);
                div.remove();
                updateBtn();
            });
            div.appendChild(preview);
            div.appendChild(info);
            div.appendChild(removeBtn);
            filelist.appendChild(div);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                    pageLabel.textContent = pdf.numPages + 'p';
                    const pageObj = await pdf.getPage(1);
                    const scale = 60 / pageObj.getViewport({ scale: 1 }).width;
                    const viewport = pageObj.getViewport({ scale: scale * 2 });
                    previewCanvas.width = viewport.width;
                    previewCanvas.height = viewport.height;
                    await pageObj.render({ canvasContext: previewCanvas.getContext('2d'), viewport }).promise;
                } catch (_) {
                    pageLabel.textContent = '?p';
                }
            };
            reader.readAsArrayBuffer(file);
        }

        function updateBtn() { btn.disabled = state.files.length < 2; }
        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.textContent = 'Merging...';
            try {
                const mergedPdf = await PDFLib.PDFDocument.create();
                for (const file of state.files) {
                    const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
                    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    pages.forEach(p => mergedPdf.addPage(p));
                }
                mergedPdfBytes = await mergedPdf.save();
                resultArea.style.display = 'block';
                window.showToast('PDFs merged successfully!', 'success');
            } catch (err) { window.showToast('Merge failed: ' + err.message, 'error'); }
            btn.disabled = false; btn.textContent = 'Merge PDFs';
        });
        downloadBtn.addEventListener('click', () => mergedPdfBytes && window.downloadBlob(new Blob([mergedPdfBytes], { type: 'application/pdf' }), 'merged.pdf'));
    })();

    /* ================= COMPRESS PDF ================= */
    (function() {
        const state = { file: null, compressedBytes: null };
        const dropzone = document.getElementById('compress-dropzone');
        const input = document.getElementById('compress-input');
        const filelist = document.getElementById('compress-filelist');
        const btn = document.getElementById('compress-btn');
        const resultArea = document.getElementById('compress-result');
        const downloadBtn = document.getElementById('compress-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!f || f.size > MAX_PDF_SIZE) return;
            if (f.type !== 'application/pdf' && f.type !== '' && !f.name.match(/\.pdf$/i)) return;
            const valid = await validatePdfFile(f);
            if (!valid) return;
            state.file = f;
            filelist.innerHTML = '';

            const div = document.createElement('div');
            div.className = 'file-item';
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 60;
            previewCanvas.height = 80;
            preview.appendChild(previewCanvas);
            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = f.name;
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size';
            sizeSpan.textContent = window.formatFileSize(f.size);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
            div.appendChild(preview);
            div.appendChild(info);
            div.appendChild(removeBtn);
            filelist.appendChild(div);
            btn.disabled = false;

            try {
                const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
                const page = await pdf.getPage(1);
                const scale = 60 / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale: scale * 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                previewCanvas.width = viewport.width;
                previewCanvas.height = viewport.height;
                previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
                } catch (err) {
                    console.warn('Preview failed:', err);
                }
        }

        btn.addEventListener('click', async () => {
            if (!state.file) { window.showToast('Please select a PDF file first.', 'warning'); btn.disabled = false; return; }
            btn.disabled = true; btn.textContent = 'Compressing...';
            try {
                const level = document.querySelector('input[name="compress-level"]:checked').value;
                const arrayBuffer = await state.file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

                let compressedBytes;

                let scale, jpegQuality;

                if (level === 'high') {
                    scale = 0.75; jpegQuality = 0.4;
                } else if (level === 'medium') {
                    scale = 1.0; jpegQuality = 0.7;
                } else {
                    scale = 1.5; jpegQuality = 0.88;
                }

                const pdfJsDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
                const newPdf = await PDFLib.PDFDocument.create();
                const totalPages = pdfJsDoc.numPages;
                const BATCH = 10;

                for (let start = 1; start <= totalPages; start += BATCH) {
                    const end = Math.min(start + BATCH - 1, totalPages);
                    const batch = [];
                    for (let i = start; i <= end; i++) {
                        batch.push(pdfJsDoc.getPage(i));
                    }
                    const pages = await Promise.all(batch);

                    for (const page of pages) {
                        const viewport = page.getViewport({ scale });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');
                        await page.render({ canvasContext: ctx, viewport }).promise;

                        const jpgDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
                        const jpgBytes = Uint8Array.from(atob(jpgDataUrl.split(',')[1]), c => c.charCodeAt(0));
                        const jpgImage = await newPdf.embedJpg(jpgBytes);

                        const origViewport = page.getViewport({ scale: 1 });
                        const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
                        newPage.drawImage(jpgImage, {
                            x: 0, y: 0,
                            width: origViewport.width,
                            height: origViewport.height
                        });
                    }

                    btn.textContent = `Compressing... ${Math.round(end / totalPages * 100)}%`;
                    await new Promise(r => setTimeout(r, 0));
                }
                compressedBytes = await newPdf.save({ useObjectStreams: true });

                state.compressedBytes = compressedBytes;
                document.getElementById('compress-original').textContent = window.formatFileSize(state.file.size);
                document.getElementById('compress-compressed').textContent = window.formatFileSize(state.compressedBytes.byteLength);
                const reduction = Math.round((1 - state.compressedBytes.byteLength / state.file.size) * 100);
                document.getElementById('compress-reduction').textContent = (reduction > 0 ? reduction : 0) + '%';
                resultArea.style.display = 'block';
                window.showToast('PDF compressed!', 'success');
            } catch (err) {
                try {
                    if (state.file) {
                        const pdfDoc = await PDFLib.PDFDocument.load(await state.file.arrayBuffer());
                        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
                        state.compressedBytes = compressedBytes;
                        document.getElementById('compress-original').textContent = window.formatFileSize(state.file.size);
                        document.getElementById('compress-compressed').textContent = window.formatFileSize(compressedBytes.byteLength);
                        const reduction = Math.round((1 - compressedBytes.byteLength / state.file.size) * 100);
                        document.getElementById('compress-reduction').textContent = (reduction > 0 ? reduction : 0) + '%';
                        resultArea.style.display = 'block';
                        window.showToast('PDF compressed!', 'success');
                    } else {
                        window.showToast('Compression failed: ' + err.message, 'error');
                    }
                } catch (e) {
                    window.showToast('Compression failed: ' + e.message, 'error');
                }
            }
            btn.disabled = false; btn.textContent = 'Compress PDF';
        });
        downloadBtn.addEventListener('click', () => state.compressedBytes && window.downloadBlob(new Blob([state.compressedBytes], { type: 'application/pdf' }), 'compressed.pdf'));
    })();

    /* ================= SPLIT PDF ================= */
    (function() {
        const state = { file: null, pdfDoc: null, selectedPages: new Set() };
        const dropzone = document.getElementById('split-dropzone');
        const input = document.getElementById('split-input');
        const pageGrid = document.getElementById('split-pages');
        const rangesInput = document.getElementById('split-ranges');
        const previewBtn = document.getElementById('split-preview');
        const btn = document.getElementById('split-btn');
        const resultArea = document.getElementById('split-result');
        const downloadBtn = document.getElementById('split-download');
        let splitBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            state.file = f;
            state.pdfDoc = await PDFLib.PDFDocument.load(await f.arrayBuffer());
            state.selectedPages.clear();
            pageGrid.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Loading preview\u2026</p>';
            rangesInput.style.display = 'block';
            previewBtn.style.display = 'inline-block';
            btn.disabled = true;

            try {
                const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
                pageGrid.innerHTML = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const scale = 80 / page.getViewport({ scale: 1 }).width;
                    const viewport = page.getViewport({ scale: scale * 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    
                    const div = document.createElement('div');
                    div.className = 'page-thumb';
                    div.innerHTML = window.sanitizeHtml(`<canvas width="${viewport.width}" height="${viewport.height}"></canvas><span>${i}</span>`);
                    div.querySelector('canvas').getContext('2d').drawImage(canvas, 0, 0);
                    div.onclick = () => togglePage(i);
                    pageGrid.appendChild(div);
                }
            } catch (_) {
                console.warn('PDF preview failed:', _);
                pageGrid.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Previews unavailable. Use the range input to select pages manually.</p>';
            }
        }

        function togglePage(num) {
            if (state.selectedPages.has(num)) state.selectedPages.delete(num);
            else state.selectedPages.add(num);
            document.querySelectorAll('#split-pages .page-thumb').forEach(div => {
                const p = parseInt(div.querySelector('span').textContent);
                div.classList.toggle('selected', state.selectedPages.has(p));
            });
            btn.disabled = state.selectedPages.size === 0;
        }

        previewBtn.addEventListener('click', () => {
            const ranges = rangesInput.value.trim();
            if (!ranges) return;
            state.selectedPages.clear();
            ranges.split(',').forEach(part => {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start)) {
                    const endPage = isNaN(end) ? start : end;
                    for (let i = start; i <= endPage; i++) {
                        if (i > 0 && i <= state.pdfDoc.getPageCount()) state.selectedPages.add(i);
                    }
                }
            });
            document.querySelectorAll('#split-pages .page-thumb').forEach(div => {
                const p = parseInt(div.querySelector('span').textContent);
                div.classList.toggle('selected', state.selectedPages.has(p));
            });
            btn.disabled = state.selectedPages.size === 0;
        });

        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.textContent = 'Extracting...';
            try {
                const newPdf = await PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(state.pdfDoc, Array.from(state.selectedPages).map(n => n - 1));
                pages.forEach(p => newPdf.addPage(p));
                splitBytes = await newPdf.save();
                resultArea.style.display = 'block';
                window.showToast('Pages extracted!', 'success');
            } catch (err) { window.showToast('Failed: ' + err.message, 'error'); }
            btn.disabled = false; btn.textContent = 'Extract Pages';
        });
        downloadBtn.addEventListener('click', () => splitBytes && window.downloadBlob(new Blob([splitBytes], { type: 'application/pdf' }), 'extracted.pdf'));
    })();

    /* ================= PDF TO IMAGES ================= */
    (function() {
        const state = { file: null };
        const dropzone = document.getElementById('toimages-dropzone');
        const input = document.getElementById('toimages-input');
        const pageGrid = document.getElementById('toimages-pages');
        const progressFill = document.getElementById('toimages-progress');
        const btn = document.getElementById('toimages-btn');
        const resultArea = document.getElementById('toimages-result');
        const downloadBtn = document.getElementById('toimages-download');
        let zipBlob = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            state.file = f;
            pageGrid.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Loading preview\u2026</p>';
            btn.disabled = false;

            try {
                const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
                pageGrid.innerHTML = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const scale = 80 / page.getViewport({ scale: 1 }).width;
                    const viewport = page.getViewport({ scale: scale * 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    
                    const div = document.createElement('div');
                    div.className = 'page-thumb';
                    div.innerHTML = window.sanitizeHtml(`<canvas width="${viewport.width}" height="${viewport.height}"></canvas><span>${i}</span>`);
                    div.querySelector('canvas').getContext('2d').drawImage(canvas, 0, 0);
                    pageGrid.appendChild(div);
                }
            } catch (_) {
                console.warn('PDF preview failed:', _);
                pageGrid.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Previews unavailable. You can still convert the PDF.</p>';
            }
        }

        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            if (typeof JSZip === 'undefined') { window.showToast('JSZip library not loaded', 'error'); btn.disabled = false; btn.textContent = 'Convert to Images'; return; }
            try {
                const zip = new JSZip();
                const pdf = await pdfjsLib.getDocument(await state.file.arrayBuffer()).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    progressFill.style.width = ((i / pdf.numPages) * 100) + '%';
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    const dataUrl = canvas.toDataURL('image/png').split(',')[1];
                    zip.file(`page-${i}.png`, dataUrl, { base64: true });
                }
                zipBlob = await zip.generateAsync({ type: 'blob' });
                resultArea.style.display = 'block';
                progressFill.style.width = '0%';
                window.showToast('Conversion complete!', 'success');
            } catch (err) {
                window.showToast('Conversion failed: ' + err.message, 'error');
            }
            btn.disabled = false; btn.textContent = 'Convert to Images';
        });
        downloadBtn.addEventListener('click', () => zipBlob && window.downloadBlob(zipBlob, 'pdf-images.zip'));
    })();

    /* ================= ROTATE PDF ================= */
    (function() {
        const state = { file: null, pdfDoc: null, rotations: {} };
        const dropzone = document.getElementById('rotate-dropzone');
        const input = document.getElementById('rotate-input');
        const pageGrid = document.getElementById('rotate-pages');
        const btn = document.getElementById('rotate-btn');
        const resultArea = document.getElementById('rotate-result');
        const downloadBtn = document.getElementById('rotate-download');
        let rotatedBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            state.file = f;
            state.pdfDoc = await PDFLib.PDFDocument.load(await f.arrayBuffer());
            state.rotations = {};
            pageGrid.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Loading preview\u2026</p>';
            
            try {
                const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const scale = 80 / page.getViewport({ scale: 1 }).width;
                    const viewport = page.getViewport({ scale: scale * 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    
                    const div = document.createElement('div');
                    div.className = 'page-thumb';
                    div.dataset.page = i - 1;
                    div.innerHTML = window.sanitizeHtml(`<canvas width="${viewport.width}" height="${viewport.height}"></canvas><span>${i}</span>`);
                    div.querySelector('canvas').getContext('2d').drawImage(canvas, 0, 0);
                    div.onclick = () => { state.rotations[div.dataset.page] = (state.rotations[div.dataset.page] || 0) + 90; updateRotations(); };
                    pageGrid.appendChild(div);
                }
            } catch (_) {
                window.showToast('Page previews unavailable. Click page numbers to rotate.', 'warning');
                for (let i = 1; i <= state.pdfDoc.getPageCount(); i++) {
                    const div = document.createElement('div');
                    div.className = 'page-thumb';
                    div.dataset.page = i - 1;
                    div.innerHTML = '<div class="page-num">' + i + '</div>';
                    div.onclick = () => { state.rotations[div.dataset.page] = (state.rotations[div.dataset.page] || 0) + 90; updateRotations(); };
                    pageGrid.appendChild(div);
                }
            }
            btn.disabled = false;
        }

        function updateRotations() {
            document.querySelectorAll('#rotate-pages .page-thumb').forEach(div => {
                const rot = state.rotations[div.dataset.page] || 0;
                div.style.transform = `rotate(${rot}deg)`;
            });
        }

        document.querySelectorAll('.rotate-all').forEach(btn => {
            btn.addEventListener('click', () => {
                const deg = parseInt(btn.dataset.degree);
                for (let i = 0; i < state.pdfDoc.getPageCount(); i++) state.rotations[i] = (state.rotations[i] || 0) + deg;
                updateRotations();
            });
        });

        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.textContent = 'Applying...';
            try {
                const newPdf = await PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(state.pdfDoc, state.pdfDoc.getPageIndices());
                pages.forEach((page, i) => {
                    newPdf.addPage(page);
                    const rot = state.rotations[i] || 0;
                    if (rot) page.setRotation(PDFLib.degrees(page.getRotation().angle + rot));
                });
                rotatedBytes = await newPdf.save();
                resultArea.style.display = 'block';
                window.showToast('PDF rotated!', 'success');
            } catch (err) { window.showToast('Failed: ' + err.message, 'error'); }
            btn.disabled = false; btn.textContent = 'Apply Rotation';
        });
        downloadBtn.addEventListener('click', () => rotatedBytes && window.downloadBlob(new Blob([rotatedBytes], { type: 'application/pdf' }), 'rotated.pdf'));
    })();

    /* ================= SIGN PDF ================= */
    (function() {
        // Consolidated state object
        const sigState = {
            pdfFile: null,
            pdfDoc: null,
            pdfPageCount: 0,
            selectedPage: 0,
            signature: {
                dataUrl: null,
                width: 200,
                height: 80,
                rotation: 0,
                x: 50,
                y: 50
            },
            aspectRatio: 2.5,
            lockRatio: true,
            pdfPageWidth: 0,
            pdfPageHeight: 0
        };

        const dropzone = document.getElementById('sign-dropzone');
        const input = document.getElementById('sign-input');
        const btn = document.getElementById('sign-btn');
        const resultArea = document.getElementById('sign-result');
        const downloadBtn = document.getElementById('sign-download');
        let signedBytes = null;

        // Helper function to get rotated signature image
        async function getRotatedSignature(dataUrl, rotation, width, height) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const rad = rotation * Math.PI / 180;
                    const sin = Math.abs(Math.sin(rad));
                    const cos = Math.abs(Math.cos(rad));
                    canvas.width = width * cos + height * sin;
                    canvas.height = width * sin + height * cos;
                    const ctx = canvas.getContext('2d');
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(rad);
                    ctx.drawImage(img, -width / 2, -height / 2, width, height);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = dataUrl;
            });
        }

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            sigState.pdfFile = f;
            sigState.pdfDoc = await PDFLib.PDFDocument.load(await f.arrayBuffer());
            sigState.pdfPageCount = sigState.pdfDoc.getPageCount();
            sigState.selectedPage = 0;
            
            // Get page dimensions for PDF coordinate system
            const pages = sigState.pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            sigState.pdfPageWidth = width;
            sigState.pdfPageHeight = height;
            
            // Reset signature position to default
            sigState.signature.x = 50;
            sigState.signature.y = 50;
            document.getElementById('sig-pos-x').value = 50;
            document.getElementById('sig-pos-y').value = 50;
            
            btn.disabled = false;
            window.showToast('PDF loaded. Create your signature below.', 'info');
            renderPageThumbnails();
            updateSignButton();
        }

        async function renderPageThumbnails() {
            const container = document.getElementById('sig-page-thumbs');
            const selector = document.getElementById('sig-page-selector');
            container.innerHTML = '';

            if (sigState.pdfPageCount <= 1) {
                selector.style.display = 'none';
                return;
            }

            selector.style.display = 'block';

            const pdf = await pdfjsLib.getDocument(await sigState.pdfFile.arrayBuffer()).promise;

            for (let i = 0; i < sigState.pdfPageCount; i++) {
                const page = await pdf.getPage(i + 1);
                const scale = 80 / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale: scale * 2 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

                const thumb = document.createElement('div');
                thumb.className = 'sig-page-thumb' + (i === 0 ? ' selected' : '');
                thumb.setAttribute('role', 'option');
                thumb.setAttribute('aria-label', 'Page ' + (i + 1));
                thumb.setAttribute('tabindex', '0');
                thumb.appendChild(canvas);
                thumb.appendChild(document.createElement('span')).textContent = (i + 1).toString();

                // BUG 1 FIX: Proper click handler with visual feedback
                thumb.addEventListener('click', function() {
                    selectPage(i);
                });
                thumb.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectPage(i);
                    }
                });

                container.appendChild(thumb);
            }
        }

        // BUG 1 FIX: selectPage with proper class toggling
        function selectPage(index) {
            sigState.selectedPage = index;
            
            // Update page dimensions when selection changes
            const pages = sigState.pdfDoc.getPages();
            const page = pages[sigState.selectedPage];
            const { width, height } = page.getSize();
            sigState.pdfPageWidth = width;
            sigState.pdfPageHeight = height;
            
            // Update all thumbnails - add selected class to clicked, remove from others
            document.querySelectorAll('.sig-page-thumb').forEach((thumb, i) => {
                if (i === index) {
                    thumb.classList.add('selected');
                } else {
                    thumb.classList.remove('selected');
                }
            });
            
            // Re-render PDF preview for selected page
            renderPdfPreview();
            updateSignButton();
        }

        function updateSignButton() {
            const hasSignature = !!sigState.signature.dataUrl;
            const hasPage = sigState.pdfPageCount > 0;
            btn.disabled = !hasSignature || !hasPage;
        }

        function showPlacementControls() {
            document.getElementById('sig-placement-controls').style.display = 'block';
            updateSignaturePreview();
            setupDraggablePlacement();
        }

        // Update signature preview with checkered background for transparency
        function updateSignaturePreview() {
            if (!sigState.signature.dataUrl) return;

            const preview = document.getElementById('sig-final-preview');
            const ctx = preview.getContext('2d');
            
            preview.width = sigState.signature.width;
            preview.height = sigState.signature.height;
            
            // Draw checkered background
            const size = 10;
            for (let y = 0; y < preview.height; y += size) {
                for (let x = 0; x < preview.width; x += size) {
                    ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#ffffff' : '#e0e0e0';
                    ctx.fillRect(x, y, size, size);
                }
            }
            
            const img = new Image();
            img.onload = () => {
                // Store aspect ratio
                sigState.aspectRatio = img.width / img.height;
                
                ctx.save();
                ctx.translate(sigState.signature.width / 2, sigState.signature.height / 2);
                ctx.rotate((sigState.signature.rotation * Math.PI) / 180);
                ctx.drawImage(img, -sigState.signature.width / 2, -sigState.signature.height / 2, sigState.signature.width, sigState.signature.height);
                ctx.restore();
            };
            img.src = sigState.signature.dataUrl;
        }

        function setupDraggablePlacement() {
            const container = document.getElementById('sig-pdf-preview-container');
            
            if (sigState.pdfPageCount <= 1) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            renderPdfPreview();
            initDraggable();
        }

        async function renderPdfPreview() {
            const canvas = document.getElementById('sig-pdf-preview-canvas');
            const pdf = await pdfjsLib.getDocument(await sigState.pdfFile.arrayBuffer()).promise;
            const page = await pdf.getPage(sigState.selectedPage + 1);
            const viewport = page.getViewport({ scale: 1 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            updateDraggable();
        }

        function updateDraggable() {
            const canvas = document.getElementById('sig-pdf-preview-canvas');
            const draggable = document.getElementById('sig-draggable');
            const dragImg = document.getElementById('sig-draggable-img');

            dragImg.src = sigState.signature.dataUrl;
            dragImg.onload = () => {
                const rect = canvas.getBoundingClientRect();
                const scale = rect.width / canvas.width;
                const displayWidth = sigState.signature.width * scale;
                const displayHeight = sigState.signature.height * scale;

                draggable.style.width = displayWidth + 'px';
                draggable.style.height = displayHeight + 'px';
                draggable.style.display = 'block';
                dragImg.style.width = displayWidth + 'px';
                dragImg.style.height = displayHeight + 'px';

                // PDF coordinate system: y=0 is bottom, so convert
                // screenY = pageHeight - pdfY - sigHeight
                const x = sigState.signature.x;
                const y = sigState.signature.y;

                draggable.style.left = (x * scale) + 'px';
                draggable.style.top = ((canvas.height - y - sigState.signature.height) * scale) + 'px';

                if (sigState.signature.rotation !== 0) {
                    draggable.style.transform = `rotate(${sigState.signature.rotation}deg)`;
                } else {
                    draggable.style.transform = '';
                }
            };
        }

        // BUG 6 FIX: Draggable syncs to inputs with initialization guard
        let draggableInitialized = false;
        function initDraggable() {
            if (draggableInitialized) return;
            draggableInitialized = true;
            const canvas = document.getElementById('sig-pdf-preview-canvas');
            const draggable = document.getElementById('sig-draggable');

            let isDragging = false;
            let startX, startY, initialLeft, initialTop;
            let canvasScale = 1;

            const updateScale = () => {
                const rect = canvas.getBoundingClientRect();
                canvasScale = rect.width / canvas.width;
            };

            setTimeout(updateScale, 100);

            draggable.addEventListener('mousedown', e => {
                isDragging = true;
                updateScale();
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = draggable.offsetLeft;
                initialTop = draggable.offsetTop;
                draggable.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', e => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                draggable.style.left = (initialLeft + dx) + 'px';
                draggable.style.top = (initialTop + dy) + 'px';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    draggable.style.cursor = 'move';
                    const pdfX = Math.round(draggable.offsetLeft / canvasScale);
                    const pdfY = Math.round(canvas.height - (draggable.offsetTop / canvasScale) - sigState.signature.height);
                    sigState.signature.x = Math.max(0, Math.min(pdfX, sigState.pdfPageWidth - sigState.signature.width));
                    sigState.signature.y = Math.max(0, Math.min(pdfY, sigState.pdfPageHeight - sigState.signature.height));
                    document.getElementById('sig-pos-x').value = sigState.signature.x;
                    document.getElementById('sig-pos-y').value = sigState.signature.y;
                }
            });
        }

        // BUG 2 FIX: Alignment buttons use PDF page dimensions
        function applyAlignment(align) {
            const pageWidth = sigState.pdfPageWidth;
            const pageHeight = sigState.pdfPageHeight;
            const sigW = sigState.signature.width;
            const sigH = sigState.signature.height;
            const margin = 20;

            // PDF coordinate system: y=0 is bottom
            switch (align) {
                case 'left':
                    sigState.signature.x = margin;
                    break;
                case 'center-h':
                    sigState.signature.x = (pageWidth - sigW) / 2;
                    break;
                case 'right':
                    sigState.signature.x = pageWidth - sigW - margin;
                    break;
                case 'top':
                    sigState.signature.y = pageHeight - sigH - margin;
                    break;
                case 'center-v':
                    sigState.signature.y = (pageHeight - sigH) / 2;
                    break;
                case 'bottom':
                    sigState.signature.y = margin;
                    break;
            }

            // Update input fields
            document.getElementById('sig-pos-x').value = Math.round(sigState.signature.x);
            document.getElementById('sig-pos-y').value = Math.round(sigState.signature.y);
            
            // Update preview
            updateDraggable();
        }

        // Tab switching
        document.querySelectorAll('.sig-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sig-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.sig-panel').forEach(p => p.style.display = 'none');
                tab.classList.add('active');
                document.getElementById('sig-' + tab.dataset.tab + '-panel').style.display = 'block';
            });
        });

        // Draw signature
        const sigCanvas = document.getElementById('sig-canvas');
        const sigCtx = sigCanvas.getContext('2d');
        let isDrawing = false;

        function handleDrawStart(e) {
            isDrawing = true;
            sigCtx.beginPath();
            const rect = sigCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (sigCanvas.width / rect.width);
            const y = (e.clientY - rect.top) * (sigCanvas.height / rect.height);
            sigCtx.moveTo(x, y);
        }

        function handleDrawMove(e) {
            if (!isDrawing) return;
            const rect = sigCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (sigCanvas.width / rect.width);
            const y = (e.clientY - rect.top) * (sigCanvas.height / rect.height);
            sigCtx.lineTo(x, y);
            sigCtx.stroke();
        }

        function handleDrawEnd() {
            isDrawing = false;
            sigState.signature.dataUrl = sigCanvas.toDataURL('image/png');
            showPlacementControls();
            updateSignButton();
        }

        sigCanvas.addEventListener('mousedown', handleDrawStart);
        sigCanvas.addEventListener('mousemove', handleDrawMove);
        sigCanvas.addEventListener('mouseup', handleDrawEnd);
        sigCanvas.addEventListener('mouseleave', () => isDrawing = false);

        sigCanvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = sigCanvas.getBoundingClientRect();
            isDrawing = true;
            sigCtx.beginPath();
            sigCtx.moveTo((touch.clientX - rect.left) * (sigCanvas.width / rect.width), (touch.clientY - rect.top) * (sigCanvas.height / rect.height));
        });

        sigCanvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!isDrawing) return;
            const touch = e.touches[0];
            const rect = sigCanvas.getBoundingClientRect();
            sigCtx.lineTo((touch.clientX - rect.left) * (sigCanvas.width / rect.width), (touch.clientY - rect.top) * (sigCanvas.height / rect.height));
            sigCtx.stroke();
        });

        sigCanvas.addEventListener('touchend', handleDrawEnd);

        document.getElementById('sig-clear').addEventListener('click', () => {
            sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
            sigState.signature.dataUrl = null;
            document.getElementById('sig-placement-controls').style.display = 'none';
            document.getElementById('sig-pdf-preview-container').style.display = 'none';
            updateSignButton();
        });

        // Type signature
        function updateTypeSignature() {
            const input = document.getElementById('sig-type-input');
            if (!input.value.trim()) return;

            const font = document.getElementById('sig-font').value;
            const fontSize = parseInt(document.getElementById('sig-font-size').value) || 48;
            const color = document.getElementById('sig-color').value || '#000000';

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.font = fontSize + 'px ' + font;
            const width = tempCtx.measureText(input.value).width + 40;
            tempCanvas.width = Math.max(width, 100);
            tempCanvas.height = fontSize + 40;

            tempCtx.font = fontSize + 'px ' + font;
            tempCtx.fillStyle = color;
            tempCtx.fillText(input.value, 20, fontSize + 10);

            sigState.signature.dataUrl = tempCanvas.toDataURL('image/png');
            showPlacementControls();
            updateSignButton();
        }

        document.getElementById('sig-type-input').addEventListener('input', updateTypeSignature);
        document.getElementById('sig-font').addEventListener('change', updateTypeSignature);
        document.getElementById('sig-font-size').addEventListener('input', () => {
            document.getElementById('sig-font-size-val').textContent = document.getElementById('sig-font-size').value + 'px';
            updateTypeSignature();
        });
        document.getElementById('sig-color').addEventListener('input', updateTypeSignature);

        // Upload signature
        function initSignatureUpload() {
            const dropzone = document.getElementById('sig-upload-dropzone');
            const fileInput = document.getElementById('sig-upload-input');
            const trigger = document.getElementById('sig-upload-trigger');
            const preview = document.getElementById('sig-upload-preview');
            const img = document.getElementById('sig-upload-img');
            const removeBtn = document.getElementById('sig-upload-remove');

            trigger.addEventListener('click', () => fileInput.click());

            dropzone.addEventListener('dragover', e => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', e => {
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
                handleUpload(e.dataTransfer.files[0]);
            });

            fileInput.addEventListener('change', e => {
                if (e.target.files[0]) handleUpload(e.target.files[0]);
            });

            removeBtn.addEventListener('click', () => {
                sigState.signature.dataUrl = null;
                dropzone.classList.remove('has-image');
                trigger.style.display = 'block';
                preview.style.display = 'none';
                document.getElementById('sig-placement-controls').style.display = 'none';
                document.getElementById('sig-pdf-preview-container').style.display = 'none';
                fileInput.value = '';
                updateSignButton();
            });

            function handleUpload(file) {
                if (!file) return;

                const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    window.showToast('Please upload PNG, JPG, or WebP image', 'error');
                    return;
                }

                if (file.size > 2 * 1024 * 1024) {
                    window.showToast('File size must be under 2MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = e => {
                    sigState.signature.dataUrl = e.target.result;
                    img.src = e.target.result;
                    dropzone.classList.add('has-image');
                    trigger.style.display = 'none';
                    preview.style.display = 'block';
                    showPlacementControls();
                    updateSignButton();
                    window.showToast('Signature uploaded!', 'success');
                };
                reader.readAsDataURL(file);
            }
        }

        initSignatureUpload();

        // BUG 3 FIX: Width input updates state and preview
        document.getElementById('sig-width').addEventListener('input', function(e) {
            const w = parseInt(e.target.value) || 50;
            sigState.signature.width = w;
            if (sigState.lockRatio) {
                sigState.signature.height = Math.round(w / sigState.aspectRatio);
                document.getElementById('sig-height').value = sigState.signature.height;
            }
            updateSignaturePreview();
            updateDraggable();
        });

        // BUG 3 FIX: Height input updates state and preview
        document.getElementById('sig-height').addEventListener('input', function(e) {
            const h = parseInt(e.target.value) || 20;
            sigState.signature.height = h;
            if (sigState.lockRatio) {
                sigState.signature.width = Math.round(h * sigState.aspectRatio);
                document.getElementById('sig-width').value = sigState.signature.width;
            }
            updateSignaturePreview();
            updateDraggable();
        });

        // BUG 4 FIX: Rotation slider updates state and preview
        document.getElementById('sig-rotation').addEventListener('input', function(e) {
            sigState.signature.rotation = parseInt(e.target.value);
            document.getElementById('sig-rotation-val').textContent = sigState.signature.rotation + '°';
            updateSignaturePreview();
            updateDraggable();
        });

        // X position input
        document.getElementById('sig-pos-x').addEventListener('input', function(e) {
            sigState.signature.x = parseInt(e.target.value) || 0;
            updateDraggable();
        });

        // Y position input
        document.getElementById('sig-pos-y').addEventListener('input', function(e) {
            sigState.signature.y = parseInt(e.target.value) || 0;
            updateDraggable();
        });

        // Lock ratio checkbox
        document.getElementById('sig-lock-ratio').addEventListener('change', function(e) {
            sigState.lockRatio = e.target.checked;
        });

        // Alignment buttons
        document.querySelectorAll('.sig-align').forEach(btn => {
            btn.addEventListener('click', function() {
                applyAlignment(this.dataset.align);
            });
        });

        // BUG 5 FIX: Final sign button uses all user settings properly
        btn.addEventListener('click', async () => {
            if (!sigState.signature.dataUrl) { window.showToast('Please create a signature first', 'warning'); return; }
            if (sigState.pdfPageCount === 0) { window.showToast('Please upload a PDF first', 'warning'); return; }

            btn.disabled = true;
            btn.textContent = 'Signing...';

            try {
                const pages = sigState.pdfDoc.getPages();
                const targetPage = pages[sigState.selectedPage];
                const { width: pageW, height: pageH } = targetPage.getSize();

                // BUG 5 FIX: Use actual user settings for position and size
                let sigWidth = sigState.signature.width;
                let sigHeight = sigState.signature.height;
                let x = Math.max(0, Math.min(sigState.signature.x, pageW - sigWidth));
                let y = Math.max(0, Math.min(sigState.signature.y, pageH - sigHeight));

                // BUG 4 FIX: Pre-rotate image if rotation is set
                let finalImage;
                if (sigState.signature.rotation > 0) {
                    const rotatedDataUrl = await getRotatedSignature(
                        sigState.signature.dataUrl,
                        sigState.signature.rotation,
                        sigWidth,
                        sigHeight
                    );
                    finalImage = await sigState.pdfDoc.embedPng(rotatedDataUrl);
                } else {
                    finalImage = await sigState.pdfDoc.embedPng(sigState.signature.dataUrl);
                }

                // Draw image using PDF coordinates (y=0 is bottom)
                // Input Y is already in PDF coords, but we need to convert to PDF-Lib's coordinate system
                // PDF-Lib: y is distance from bottom, so use input y directly
                targetPage.drawImage(finalImage, {
                    x: x,
                    y: y,
                    width: sigWidth,
                    height: sigHeight
                });

                signedBytes = await sigState.pdfDoc.save();
                resultArea.style.display = 'block';
                window.showToast('PDF signed!', 'success');
            } catch (err) {
                window.showToast('Failed: ' + err.message, 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Sign PDF';
        });

        downloadBtn.addEventListener('click', () => signedBytes && window.downloadBlob(new Blob([signedBytes], { type: 'application/pdf' }), 'signed.pdf'));
    })();

    /* ================= PNG TO JPG ================= */
    (function() {
        const state = { file: null, jpgData: null };
        const dropzone = document.getElementById('png2jpg-dropzone');
        const input = document.getElementById('png2jpg-input');
        const filelist = document.getElementById('png2jpg-filelist');
        const qualityInput = document.getElementById('png2jpg-quality');
        const qualityVal = document.getElementById('png2jpg-quality-val');
        const btn = document.getElementById('png2jpg-btn');
        const resultArea = document.getElementById('png2jpg-result');
        const downloadBtn = document.getElementById('png2jpg-download');

        qualityInput.addEventListener('input', () => qualityVal.textContent = qualityInput.value + '%');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || f.type !== 'image/png' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.jpgData = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsDataURL(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.file);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const quality = parseInt(qualityInput.value) / 100;
                canvas.toBlob(blob => {
                    if (state.jpgData) URL.revokeObjectURL(state.jpgData);
                    state.jpgData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('PNG converted to JPG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to JPG';
                }, 'image/jpeg', quality);
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.jpgData) {
                const link = document.createElement('a');
                link.href = state.jpgData;
                link.download = state.file.name.replace(/\.png$/i, '') + '.jpg';
                link.click();
            }
        });
    })();

    /* ================= JPG TO PNG ================= */
    (function() {
        const state = { file: null, pngData: null };
        const dropzone = document.getElementById('jpg2png-dropzone');
        const input = document.getElementById('jpg2png-input');
        const filelist = document.getElementById('jpg2png-filelist');
        const btn = document.getElementById('jpg2png-btn');
        const resultArea = document.getElementById('jpg2png-result');
        const downloadBtn = document.getElementById('jpg2png-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || f.type !== 'image/jpeg' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.pngData = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsDataURL(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.file);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (state.pngData) URL.revokeObjectURL(state.pngData);
                    state.pngData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('JPG converted to PNG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to PNG';
                }, 'image/png');
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.pngData) {
                const link = document.createElement('a');
                link.href = state.pngData;
                link.download = state.file.name.replace(/\.jpe?g$/i, '') + '.png';
                link.click();
            }
        });
    })();

    /* ================= WEBP TO JPG ================= */
    (function() {
        const state = { file: null, jpgData: null };
        const dropzone = document.getElementById('webp2jpg-dropzone');
        const input = document.getElementById('webp2jpg-input');
        const filelist = document.getElementById('webp2jpg-filelist');
        const qualityInput = document.getElementById('webp2jpg-quality');
        const qualityVal = document.getElementById('webp2jpg-quality-val');
        const btn = document.getElementById('webp2jpg-btn');
        const resultArea = document.getElementById('webp2jpg-result');
        const downloadBtn = document.getElementById('webp2jpg-download');

        qualityInput.addEventListener('input', () => qualityVal.textContent = qualityInput.value + '%');
        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || f.type !== 'image/webp' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.jpgData = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsDataURL(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.file);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const quality = parseInt(qualityInput.value) / 100;
                canvas.toBlob(blob => {
                    if (state.jpgData) URL.revokeObjectURL(state.jpgData);
                    state.jpgData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('WebP converted to JPG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to JPG';
                }, 'image/jpeg', quality);
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.jpgData) {
                const link = document.createElement('a');
                link.href = state.jpgData;
                link.download = state.file.name.replace(/\.webp$/i, '') + '.jpg';
                link.click();
            }
        });
    })();

    /* ================= GIF TO JPG ================= */
    (function() {
        const state = { file: null, jpgData: null };
        const dropzone = document.getElementById('gif2jpg-dropzone');
        const input = document.getElementById('gif2jpg-input');
        const filelist = document.getElementById('gif2jpg-filelist');
        const qualityInput = document.getElementById('gif2jpg-quality');
        const qualityVal = document.getElementById('gif2jpg-quality-val');
        const btn = document.getElementById('gif2jpg-btn');
        const resultArea = document.getElementById('gif2jpg-result');
        const downloadBtn = document.getElementById('gif2jpg-download');

        qualityInput.addEventListener('input', () => qualityVal.textContent = qualityInput.value + '%');
        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || f.type !== 'image/gif' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.jpgData = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsDataURL(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.file);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const quality = parseInt(qualityInput.value) / 100;
                canvas.toBlob(blob => {
                    if (state.jpgData) URL.revokeObjectURL(state.jpgData);
                    state.jpgData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('GIF converted to JPG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to JPG';
                }, 'image/jpeg', quality);
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.jpgData) {
                const link = document.createElement('a');
                link.href = state.jpgData;
                link.download = state.file.name.replace(/\.gif$/i, '') + '.jpg';
                link.click();
            }
        });
    })();

    /* ================= BMP TO PNG ================= */
    (function() {
        const state = { file: null, pngData: null };
        const dropzone = document.getElementById('bmp2png-dropzone');
        const input = document.getElementById('bmp2png-input');
        const filelist = document.getElementById('bmp2png-filelist');
        const btn = document.getElementById('bmp2png-btn');
        const resultArea = document.getElementById('bmp2png-result');
        const downloadBtn = document.getElementById('bmp2png-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || f.type !== 'image/bmp' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.pngData = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsDataURL(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.file);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    if (state.pngData) URL.revokeObjectURL(state.pngData);
                    state.pngData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('BMP converted to PNG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to PNG';
                }, 'image/png');
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.pngData) {
                const link = document.createElement('a');
                link.href = state.pngData;
                link.download = state.file.name.replace(/\.bmp$/i, '') + '.png';
                link.click();
            }
        });
    })();

    /* ================= SVG TO PNG ================= */
    (function() {
        const state = { file: null, pngData: null };
        const dropzone = document.getElementById('svg2png-dropzone');
        const input = document.getElementById('svg2png-input');
        const filelist = document.getElementById('svg2png-filelist');
        const widthInput = document.getElementById('svg2png-width');
        const btn = document.getElementById('svg2png-btn');
        const resultArea = document.getElementById('svg2png-result');
        const downloadBtn = document.getElementById('svg2png-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function sanitizeSvg(svgText) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const parseError = doc.querySelector('parsererror');
            if (parseError) return null;
            const dangerousTags = ['script', 'foreignObject', 'object', 'embed', 'link', 'meta', 'base'];
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
            const serializer = new XMLSerializer();
            return serializer.serializeToString(doc);
        }

        function handleFile(f) {
            if (!f || f.type !== 'image/svg+xml' || f.size > MAX_IMAGE_SIZE) return;
            state.file = f;
            state.pngData = null;
            state.sanitizedBlob = null;
            resultArea.style.display = 'none';
            filelist.innerHTML = '';
            const reader = new FileReader();
            reader.onload = e => {
                const sanitized = sanitizeSvg(e.target.result);
                if (!sanitized) { window.showToast('Invalid SVG file', 'error'); return; }
                state.sanitizedBlob = new Blob([sanitized], { type: 'image/svg+xml' });
                const div = document.createElement('div');
                div.className = 'file-item';
                const preview = document.createElement('div');
                preview.className = 'file-preview';
                const img = document.createElement('img');
                const previewUrl = URL.createObjectURL(state.sanitizedBlob);
                img.src = previewUrl;
                preview.appendChild(img);
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { URL.revokeObjectURL(previewUrl); state.file = null; state.sanitizedBlob = null; div.remove(); btn.disabled = true; });
                div.appendChild(preview);
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.readAsText(f);
        }

        btn.addEventListener('click', () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            const img = new Image();
            const srcUrl = URL.createObjectURL(state.sanitizedBlob);
            img.onload = () => {
                URL.revokeObjectURL(srcUrl);
                const targetWidth = parseInt(widthInput.value) || 800;
                const scale = targetWidth / img.width;
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (state.pngData) URL.revokeObjectURL(state.pngData);
                    state.pngData = URL.createObjectURL(blob);
                    resultArea.style.display = 'block';
                    window.showToast('SVG converted to PNG!', 'success');
                    btn.disabled = false; btn.textContent = 'Convert to PNG';
                }, 'image/png');
            };
            img.src = srcUrl;
        });

        downloadBtn.addEventListener('click', () => {
            if (state.pngData) {
                const link = document.createElement('a');
                link.href = state.pngData;
                link.download = state.file.name.replace(/\.svg$/i, '') + '.png';
                link.click();
            }
        });
    })();

    /* ================= JPG TO PDF ================= */
    (function() {
        const state = { files: [], pdfBytes: null };
        const dropzone = document.getElementById('jpg2pdf-dropzone');
        const input = document.getElementById('jpg2pdf-input');
        const filelist = document.getElementById('jpg2pdf-filelist');
        const btn = document.getElementById('jpg2pdf-btn');
        const clearBtn = document.getElementById('jpg2pdf-clear');
        const resultArea = document.getElementById('jpg2pdf-result');
        const downloadBtn = document.getElementById('jpg2pdf-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
        input.addEventListener('change', e => handleFiles(e.target.files));

        function handleFiles(files) {
            const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
            Array.from(files).slice(0, 20).forEach(f => {
                if (imageTypes.includes(f.type)) {
                    state.files.push(f);
                    const reader = new FileReader();
                    reader.onload = e => {
                        const div = document.createElement('div');
                        div.className = 'file-item';
                        const preview = document.createElement('div');
                        preview.className = 'file-preview';
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        preview.appendChild(img);
                        const info = document.createElement('div');
                        info.className = 'file-info';
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'name';
                        nameSpan.textContent = f.name;
                        const sizeSpan = document.createElement('span');
                        sizeSpan.className = 'size';
                        sizeSpan.textContent = window.formatFileSize(f.size);
                        info.appendChild(nameSpan);
                        info.appendChild(sizeSpan);
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'remove';
                        removeBtn.textContent = '\u00d7';
                        removeBtn.addEventListener('click', () => {
                            state.files = state.files.filter(file => file !== f);
                            div.remove();
                            btn.disabled = state.files.length === 0;
                        });
                        div.appendChild(preview);
                        div.appendChild(info);
                        div.appendChild(removeBtn);
                        filelist.appendChild(div);
                        btn.disabled = false;
                    };
                    reader.readAsDataURL(f);
                }
            });
            input.value = '';
        }

        clearBtn.addEventListener('click', () => { state.files = []; state.pdfBytes = null; resultArea.style.display = 'none'; filelist.innerHTML = ''; btn.disabled = true; });

        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.textContent = 'Converting...';
            try {
                const fitToA4 = document.querySelector('input[name="jpg2pdf-fit"]:checked').value === 'a4';
                const pdf = await PDFLib.PDFDocument.create();

                for (const file of state.files) {
                    const bytes = await file.arrayBuffer();
                    let img;
                    if (file.type === 'image/jpeg') {
                        img = await pdf.embedJpg(bytes);
                    } else {
                        const canvas = document.createElement('canvas');
                        const imgEl = new Image();
                        const objUrl = URL.createObjectURL(file);
                        await new Promise(resolve => { imgEl.onload = resolve; imgEl.src = objUrl; });
                        URL.revokeObjectURL(objUrl);
                        canvas.width = imgEl.width;
                        canvas.height = imgEl.height;
                        canvas.getContext('2d').drawImage(imgEl, 0, 0);
                        const pngData = canvas.toDataURL('image/png').split(',')[1];
                        const binaryString = atob(pngData);
                        const pngBytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            pngBytes[i] = binaryString.charCodeAt(i);
                        }
                        img = await pdf.embedPng(pngBytes);
                    }

                    let width = fitToA4 ? 595 : img.width;
                    let height = fitToA4 ? 842 : img.height;
                    const page = pdf.addPage([width, height]);
                    
                    if (fitToA4) {
                        const scale = Math.min(width / img.width, height / img.height);
                        const w = img.width * scale;
                        const h = img.height * scale;
                        page.drawImage(img, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
                    } else {
                        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                    }
                }

                state.pdfBytes = await pdf.save();
                resultArea.style.display = 'block';
                window.showToast('Images converted to PDF!', 'success');
            } catch (err) { window.showToast('Failed: ' + err.message, 'error'); }
            btn.disabled = false; btn.textContent = 'Convert to PDF';
        });
        downloadBtn.addEventListener('click', () => state.pdfBytes && window.downloadBlob(new Blob([state.pdfBytes], { type: 'application/pdf' }), 'images.pdf'));
    })();

    /* ================= TXT TO PDF ================= */
    (function() {
        const state = { file: null, pdfBytes: null, textContent: '' };
        const dropzone = document.getElementById('txt2pdf-dropzone');
        const input = document.getElementById('txt2pdf-input');
        const filelist = document.getElementById('txt2pdf-filelist');
        const preview = document.getElementById('txt2pdf-preview');
        const sizeInput = document.getElementById('txt2pdf-size');
        const btn = document.getElementById('txt2pdf-btn');
        const resultArea = document.getElementById('txt2pdf-result');
        const downloadBtn = document.getElementById('txt2pdf-download');

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        function handleFile(f) {
            if (!f || !f.name.endsWith('.txt') || f.size > MAX_PDF_SIZE) return;
            state.file = f;
            state.pdfBytes = null;
            state.textContent = '';
            resultArea.style.display = 'none';
            
            const reader = new FileReader();
            reader.onload = evt => {
                state.textContent = evt.target.result;
                preview.textContent = state.textContent;
                preview.style.display = 'block';
                filelist.innerHTML = '';
                const div = document.createElement('div');
                div.className = 'file-item';
                const info = document.createElement('div');
                info.className = 'file-info';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name';
                nameSpan.textContent = f.name;
                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'size';
                sizeSpan.textContent = window.formatFileSize(f.size);
                info.appendChild(nameSpan);
                info.appendChild(sizeSpan);
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove';
                removeBtn.textContent = '\u00d7';
                removeBtn.addEventListener('click', () => { state.file = null; state.textContent = ''; div.remove(); btn.disabled = true; preview.style.display = 'none'; });
                div.appendChild(info);
                div.appendChild(removeBtn);
                filelist.appendChild(div);
                btn.disabled = false;
            };
            reader.onerror = () => {
                window.showToast('Failed to read file', 'error');
            };
            reader.readAsText(f);
        }

        btn.addEventListener('click', async () => {
            if (!state.file || !state.textContent) {
                window.showToast('Please select a text file first', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = 'Converting...';
            
            try {
                const text = state.textContent;
                const fontSize = parseInt(sizeInput.value);
                const actualFontSize = (isNaN(fontSize) || fontSize < 6 || fontSize > 72) ? 11 : fontSize;
                
                const pdf = await PDFLib.PDFDocument.create();
                const pageWidth = 595;
                const pageHeight = 842;
                const margin = 50;
                const lineHeight = actualFontSize * 1.5;
                
                const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
                let line = '';
                let y = pageHeight - margin;
                let page = pdf.addPage([pageWidth, pageHeight]);
                
                // Split by newlines to preserve paragraph breaks
                const paragraphs = text.split(/\r?\n/);
                
                for (let p = 0; p < paragraphs.length; p++) {
                    let paragraph = paragraphs[p];
                    
                    // Skip empty paragraphs (create line break)
                    if (!paragraph.trim()) {
                        y -= lineHeight;
                        if (y < margin) {
                            page = pdf.addPage([pageWidth, pageHeight]);
                            y = pageHeight - margin;
                        }
                        continue;
                    }
                    
                    const words = paragraph.split(' ');
                    
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i];
                        const testLine = line + (line ? ' ' : '') + word;
                        const width = font.widthOfTextAtSize(testLine, actualFontSize);
                        const wordWidth = font.widthOfTextAtSize(word, actualFontSize);
                        const maxWidth = pageWidth - margin * 2;

                        if (wordWidth > maxWidth) {
                            // Word is too wide for page - draw what we have, then split the word
                            if (line.trim()) {
                                page.drawText(line.trim(), { x: margin, y: y, size: actualFontSize, font: font });
                                line = '';
                                y -= lineHeight;
                            }
                            // Draw word character by character as fallback
                            let charLine = '';
                            for (const char of word) {
                                const testCharLine = charLine + char;
                                if (font.widthOfTextAtSize(testCharLine, actualFontSize) > maxWidth) {
                                    if (charLine.trim()) {
                                        page.drawText(charLine.trim(), { x: margin, y: y, size: actualFontSize, font: font });
                                        y -= lineHeight;
                                    }
                                    charLine = char;
                                    if (y < margin) {
                                        page = pdf.addPage([pageWidth, pageHeight]);
                                        y = pageHeight - margin;
                                    }
                                } else {
                                    charLine = testCharLine;
                                }
                            }
                            line = charLine;
                        } else if (width > maxWidth) {
                            if (line.trim()) {
                                page.drawText(line.trim(), { x: margin, y: y, size: actualFontSize, font: font });
                            }
                            line = word;
                            y -= lineHeight;
                            if (y < margin) {
                                page = pdf.addPage([pageWidth, pageHeight]);
                                y = pageHeight - margin;
                            }
                        } else {
                            line = testLine;
                        }
                    }
                    if (line.trim()) {
                        page.drawText(line.trim(), { x: margin, y: y, size: actualFontSize, font: font });
                        line = '';
                        y -= lineHeight;
                    }
                    if (y < margin && p < paragraphs.length - 1) {
                        page = pdf.addPage([pageWidth, pageHeight]);
                        y = pageHeight - margin;
                    }
                }
                if (line.trim()) {
                    page.drawText(line.trim(), { x: margin, y: y, size: actualFontSize, font: font });
                }
                
                state.pdfBytes = await pdf.save();
                resultArea.style.display = 'block';
                window.showToast('TXT converted to PDF!', 'success');
            } catch (err) {
                window.showToast('Conversion failed: ' + err.message, 'error');
            }
            
            btn.disabled = false;
            btn.textContent = 'Convert to PDF';
        });
        downloadBtn.addEventListener('click', () => state.pdfBytes && window.downloadBlob(new Blob([state.pdfBytes], { type: 'application/pdf' }), 'document.pdf'));
    })();

    /* ================= CROP PDF ================= */
    (function() {
        const state = { file: null, pdfDoc: null, cropRect: null };
        const dropzone = document.getElementById('crop-dropzone');
        const input = document.getElementById('crop-input');
        const filelist = document.getElementById('crop-filelist');
        const previewWrap = document.getElementById('crop-preview-wrap');
        const canvas = document.getElementById('crop-canvas');
        const overlay = document.getElementById('crop-overlay');
        const dimsEl = document.getElementById('crop-dims');
        const cropAllCheckbox = document.getElementById('crop-all');
        const btn = document.getElementById('crop-btn');
        const resetBtn = document.getElementById('crop-reset');
        const resultArea = document.getElementById('crop-result');
        const downloadBtn = document.getElementById('crop-download');

        let croppedBytes = null;
        let isDragging = false;
        let startX, startY;
        let pageWidth = 0, pageHeight = 0;
        const scale = 1.5;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            state.file = f;
            state.pdfDoc = await PDFLib.PDFDocument.load(await f.arrayBuffer());
            const page = state.pdfDoc.getPages()[0];
            pageWidth = page.getWidth();
            pageHeight = page.getHeight();

            filelist.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'file-item';
            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = f.name;
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size';
            sizeSpan.textContent = window.formatFileSize(f.size);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => { state.file = null; previewWrap.style.display = 'none'; btn.disabled = true; });
            div.appendChild(info);
            div.appendChild(removeBtn);
            filelist.appendChild(div);
            btn.disabled = false;

            try {
                const pdf = await pdfjsLib.getDocument(await f.arrayBuffer()).promise;
                const pdfPage = await pdf.getPage(1);
                const viewport = pdfPage.getViewport({ scale });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                previewWrap.style.display = 'block';
                state.cropRect = null;
                updateOverlay();
            } catch (_) {
                window.showToast('Preview unavailable. You can still crop by entering coordinates.', 'warning');
            }
        }

        function updateOverlay() {
            if (!state.cropRect) {
                overlay.style.background = 'transparent';
                dimsEl.textContent = 'Click and drag to select crop area';
                return;
            }
            
            const selX = state.cropRect.x * scale;
            const selY = state.cropRect.y * scale;
            const selW = state.cropRect.w * scale;
            const selH = state.cropRect.h * scale;
            
            overlay.style.background = `
                linear-gradient(to right, rgba(0,255,0,0.2) ${selX}px, transparent ${selX}px, transparent ${selX + selW}px, rgba(0,255,0,0.2) ${selX + selW}px),
                linear-gradient(to bottom, rgba(0,255,0,0.2) ${selY}px, transparent ${selY}px, transparent ${selY + selH}px, rgba(0,255,0,0.2) ${selY + selH}px),
                linear-gradient(to right, transparent calc(100% - ${selX}px), rgba(0,255,0,0.2) calc(100% - ${selX}px)),
                linear-gradient(to bottom, transparent calc(100% - ${selY}px), rgba(0,255,0,0.2) calc(100% - ${selY}px))`;
            
            dimsEl.textContent = `Crop: x=${Math.round(state.cropRect.x)}, y=${Math.round(state.cropRect.y)}, w=${Math.round(state.cropRect.w)}, h=${Math.round(state.cropRect.h)}`;
        }

        overlay.addEventListener('mousedown', e => {
            const rect = overlay.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDragging = true;
        });

        overlay.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const rect = overlay.getBoundingClientRect();
            const x = Math.max(0, Math.min(startX, e.clientX - rect.left));
            const y = Math.max(0, Math.min(startY, e.clientY - rect.top));
            const w = Math.abs(e.clientX - rect.left - startX);
            const h = Math.abs(e.clientY - rect.top - startY);
            
            state.cropRect = { x: x / scale, y: y / scale, w: w / scale, h: h / scale };
            updateOverlay();
        });

        overlay.addEventListener('mouseup', () => { isDragging = false; });
        resetBtn.addEventListener('click', () => { state.cropRect = null; updateOverlay(); });

        btn.addEventListener('click', async () => {
            if (!state.cropRect) { window.showToast('Select crop area first', 'warning'); return; }
            btn.disabled = true; btn.textContent = 'Cropping...';
            try {
                const newPdf = await PDFLib.PDFDocument.create();
                const pages = await newPdf.copyPages(state.pdfDoc, state.pdfDoc.getPageIndices());
                
                pages.forEach(page => {
                    newPdf.addPage(page);
                    const { width, height } = page.getSize();
                    const cropX = state.cropRect.x;
                    const cropY = height - state.cropRect.y - state.cropRect.h;
                    const cropW = state.cropRect.w;
                    const cropH = state.cropRect.h;
                    page.setMediaBox(cropX, cropY, cropW, cropH);
                });
                
                croppedBytes = await newPdf.save();
                resultArea.style.display = 'block';
                window.showToast('PDF cropped!', 'success');
            } catch (err) { window.showToast('Failed: ' + err.message, 'error'); }
            btn.disabled = false; btn.textContent = 'Apply Crop';
        });
        downloadBtn.addEventListener('click', () => croppedBytes && window.downloadBlob(new Blob([croppedBytes], { type: 'application/pdf' }), 'cropped.pdf'));
    })();

    /* ================= EDIT PDF - CANVA STYLE ================= */
    (function() {
        // State
        const state = {
            pdfFile: null,
            pdfDoc: null,
            pdfPageCount: 0,
            currentPage: 0,
            pageWidth: 0,
            pageHeight: 0,
            elements: [],
            selectedElement: null,
            currentTool: 'select',
            zoom: 1,
            history: [],
            historyIndex: -1,
            elementIdCounter: 0
        };

        // DOM Elements
        const dropzone = document.getElementById('edit-dropzone');
        const input = document.getElementById('edit-input');
        const canvaEditor = document.getElementById('canva-editor');
        const pageThumbsContainer = document.getElementById('edit-page-thumbs');
        const pdfCanvas = document.getElementById('canva-pdf-canvas');
        const elementsLayer = document.getElementById('canva-elements-layer');
        const layersList = document.getElementById('canva-layers-list');
        const propsContent = document.getElementById('canva-props-content');
        const textToolbar = document.getElementById('canva-text-toolbar');
        const tableDialog = document.getElementById('table-dialog');
        const resultArea = document.getElementById('edit-result');
        const applyBtn = document.getElementById('edit-apply-changes');
        const downloadBtn = document.getElementById('edit-download');
        
        let editedBytes = null;

        // Initialize
        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => handleFile(e.target.files[0]));

        // Tool buttons
        document.getElementById('tool-select').addEventListener('click', () => setTool('select'));
        document.getElementById('tool-text').addEventListener('click', () => setTool('text'));
        document.getElementById('tool-table').addEventListener('click', () => { tableDialog.style.display = 'flex'; });
        
        // Undo/Redo
        document.getElementById('edit-undo').addEventListener('click', undo);
        document.getElementById('edit-redo').addEventListener('click', redo);
        
        // Zoom controls
        document.getElementById('edit-zoom-fit').addEventListener('click', () => setZoom('fit'));
        document.getElementById('edit-zoom-50').addEventListener('click', () => setZoom(0.5));
        document.getElementById('edit-zoom-100').addEventListener('click', () => setZoom(1));
        document.getElementById('edit-zoom-150').addEventListener('click', () => setZoom(1.5));
        document.getElementById('edit-zoom-200').addEventListener('click', () => setZoom(2));
        
        // Text toolbar
        document.getElementById('text-bold').addEventListener('click', () => toggleFormat('bold'));
        document.getElementById('text-italic').addEventListener('click', () => toggleFormat('italic'));
        document.getElementById('text-underline').addEventListener('click', () => toggleFormat('underline'));
        document.getElementById('text-font').addEventListener('change', e => updateTextStyle('font', e.target.value));
        document.getElementById('text-size').addEventListener('change', e => updateTextStyle('size', parseInt(e.target.value)));
        document.getElementById('text-color').addEventListener('input', e => updateTextStyle('color', e.target.value));
        document.getElementById('text-bgcolor').addEventListener('input', e => updateTextStyle('bgcolor', e.target.value));
        document.getElementById('text-opacity').addEventListener('input', e => updateTextStyle('opacity', parseInt(e.target.value) / 100));
        document.getElementById('text-align-left').addEventListener('click', () => updateTextStyle('align', 'left'));
        document.getElementById('text-align-center').addEventListener('click', () => updateTextStyle('align', 'center'));
        document.getElementById('text-align-right').addEventListener('click', () => updateTextStyle('align', 'right'));
        
        // Table dialog
        document.getElementById('table-cancel').addEventListener('click', () => tableDialog.style.display = 'none');
        document.getElementById('table-insert').addEventListener('click', insertTable);
        
        // Apply/Cancel
        document.getElementById('edit-cancel').addEventListener('click', () => {
            canvaEditor.style.display = 'none';
            dropzone.style.display = 'block';
        });
        applyBtn.addEventListener('click', applyChanges);
        downloadBtn.addEventListener('click', () => editedBytes && window.downloadBlob(new Blob([editedBytes], { type: 'application/pdf' }), 'edited.pdf'));

        // Canvas click handler
        const canvasContainer = document.getElementById('canva-canvas-wrap');
        canvasContainer.addEventListener('click', handleCanvasClick);

        async function handleFile(f) {
            if (!await validatePdfFile(f)) return;
            state.pdfFile = f;
            state.pdfDoc = await PDFLib.PDFDocument.load(await f.arrayBuffer());
            state.pdfPageCount = state.pdfDoc.getPageCount();
            state.currentPage = 0;
            state.elements = [];
            state.history = [];
            state.historyIndex = -1;
            
            dropzone.style.display = 'none';
            canvaEditor.style.display = 'flex';
            
            renderPageThumbnails();
            selectPage(0);
            updateUndoRedo();
        }

        async function renderPageThumbnails() {
            pageThumbsContainer.innerHTML = '';
            const pdf = await pdfjsLib.getDocument(await state.pdfFile.arrayBuffer()).promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 60 / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale: scale * 2 });
                
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                
                const thumb = document.createElement('div');
                thumb.className = 'canva-page-thumb' + (i === 1 ? ' selected' : '');
                thumb.appendChild(canvas);
                thumb.appendChild(document.createElement('span')).textContent = i;
                thumb.addEventListener('click', () => selectPage(i - 1));
                pageThumbsContainer.appendChild(thumb);
            }
        }

        async function selectPage(idx) {
            state.currentPage = idx;
            
            // Update page thumbnails
            document.querySelectorAll('.canva-page-thumb').forEach((thumb, i) => {
                thumb.classList.toggle('selected', i === idx);
            });
            
            // Render PDF on canvas
            const pdf = await pdfjsLib.getDocument(await state.pdfFile.arrayBuffer()).promise;
            const page = await pdf.getPage(idx + 1);
            const pageObj = page.view;
            state.pageWidth = pageObj[2] - pageObj[0];
            state.pageHeight = pageObj[3] - pageObj[1];
            
            const scale = 1.5 * state.zoom;
            const viewport = page.getViewport({ scale });
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            
            await page.render({ canvasContext: pdfCanvas.getContext('2d'), viewport }).promise;
            
            // Update canvas container size
            const canvasWrap = document.getElementById('canva-canvas-wrap');
            canvasWrap.style.width = viewport.width + 'px';
            canvasWrap.style.height = viewport.height + 'px';
            
            // Render elements for this page
            renderElements();
        }

        function setTool(tool) {
            state.currentTool = tool;
            document.querySelectorAll('.canva-tool-btn').forEach(btn => {
                if (btn.id === 'tool-' + tool) btn.classList.add('active');
                else if (['select', 'text', 'table'].includes(btn.id.replace('tool-', ''))) btn.classList.remove('active');
            });
            
            // Change cursor based on tool
            elementsLayer.style.cursor = tool === 'text' ? 'crosshair' : 'default';
        }

        function handleCanvasClick(e) {
            if (state.currentTool === 'text') {
                const rect = elementsLayer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / state.zoom;
                const y = (e.clientY - rect.top) / state.zoom;
                createTextElement(x, y);
                setTool('select');
            }
        }

        function createTextElement(x, y) {
            const id = 'element-' + (++state.elementIdCounter);
            const element = {
                id,
                type: 'text',
                page: state.currentPage,
                x,
                y,
                width: 150,
                height: 30,
                text: '',
                font: 'Helvetica',
                size: 24,
                color: '#000000',
                bgcolor: 'transparent',
                bold: false,
                italic: false,
                underline: false,
                align: 'left',
                opacity: 1
            };
            
            state.elements.push(element);
            saveHistory();
            renderElements();
            selectElement(id);
            updateLayers();
        }

        function insertTable() {
            const cols = parseInt(document.getElementById('table-cols').value) || 3;
            const rows = parseInt(document.getElementById('table-rows').value) || 4;
            
            const id = 'element-' + (++state.elementIdCounter);
            const element = {
                id,
                type: 'table',
                page: state.currentPage,
                x: 50,
                y: 50,
                width: cols * 80,
                height: rows * 25,
                cols,
                rows,
                cells: Array(rows).fill(null).map(() => Array(cols).fill('')),
                borderColor: '#000000',
                borderWidth: 1
            };
            
            state.elements.push(element);
            saveHistory();
            renderElements();
            selectElement(id);
            updateLayers();
            tableDialog.style.display = 'none';
        }

        function renderElements() {
            elementsLayer.innerHTML = '';
            
            const pageElements = state.elements.filter(e => e.page === state.currentPage);
            
            pageElements.forEach(el => {
                const div = document.createElement('div');
                div.className = 'canva-text-box' + (state.selectedElement === el.id ? ' selected' : '');
                div.id = el.id;
                div.style.left = (el.x * state.zoom) + 'px';
                div.style.top = (el.y * state.zoom) + 'px';
                div.style.width = (el.width * state.zoom) + 'px';
                div.style.minHeight = (el.height * state.zoom) + 'px';
                div.style.fontFamily = el.font;
                div.style.fontSize = (el.size * state.zoom) + 'px';
                div.style.color = el.color;
                div.style.background = el.bgcolor;
                div.style.opacity = el.opacity;
                div.style.textAlign = el.align;
                div.style.fontWeight = el.bold ? 'bold' : 'normal';
                div.style.fontStyle = el.italic ? 'italic' : 'normal';
                div.style.textDecoration = el.underline ? 'underline' : 'none';
                
                if (el.type === 'text') {
                    const content = document.createElement('div');
                    content.className = 'canva-text-content';
                    content.contentEditable = true;
                    content.textContent = el.text;
                    content.style.width = '100%';
                    content.style.minHeight = (el.height * state.zoom) + 'px';
                    
                    content.addEventListener('input', e => {
                        el.text = e.target.textContent;
                        el.width = Math.max(150, e.target.scrollWidth / state.zoom);
                        el.height = Math.max(30, e.target.scrollHeight / state.zoom);
                    });
                    
                    content.addEventListener('blur', () => {
                        saveHistory();
                        updateLayers();
                    });
                    
                    content.addEventListener('focus', () => {
                        selectElement(el.id);
                    });

                    content.addEventListener('paste', e => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    });
                    
                    div.appendChild(content);
                    
                    // Add resize handles
                    addResizeHandles(div, el);
                }
                
                if (el.type === 'table') {
                    const grid = document.createElement('div');
                    grid.className = 'canva-table-grid';
                    grid.style.gridTemplateColumns = `repeat(${el.cols}, 1fr)`;
                    
                    el.cells.forEach((row, ri) => {
                        row.forEach((cell, ci) => {
                            const td = document.createElement('div');
                            td.className = 'canva-table-cell';
                            td.contentEditable = true;
                            td.textContent = cell;
                            td.style.borderColor = el.borderColor;
                            td.addEventListener('input', e => {
                                el.cells[ri][ci] = e.target.textContent;
                            });
                            td.addEventListener('paste', e => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text/plain');
                                document.execCommand('insertText', false, text);
                            });
                            grid.appendChild(td);
                        });
                    });
                    
                    div.appendChild(grid);
                    addResizeHandles(div, el);
                }
                
                // Make draggable
                makeDraggable(div, el);
                
                // Click to select
                div.addEventListener('click', e => {
                    e.stopPropagation();
                    selectElement(el.id);
                });
                
                elementsLayer.appendChild(div);
            });
        }

        function addResizeHandles(div, el) {
            ['nw', 'ne', 'sw', 'se'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `canva-resize-handle ${pos}`;
                handle.addEventListener('mousedown', e => startResize(e, el, pos));
                div.appendChild(handle);
            });
        }

        // Single delegated drag system (prevents memory leaks)
        let dragState = null;

        elementsLayer.addEventListener('mousedown', e => {
            const div = e.target.closest('.canva-text-box');
            if (!div || e.target.classList.contains('canva-resize-handle')) return;
            if (e.target.contentEditable === 'true') return;

            const el = state.elements.find(el => el.id === div.id);
            if (!el) return;

            dragState = {
                el,
                div,
                startX: e.clientX,
                startY: e.clientY,
                startElX: el.x,
                startElY: el.y
            };
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!dragState) return;
            const { el, div, startX, startY, startElX, startElY } = dragState;
            const dx = (e.clientX - startX) / state.zoom;
            const dy = (e.clientY - startY) / state.zoom;
            el.x = Math.max(0, startElX + dx);
            el.y = Math.max(0, startElY + dy);
            div.style.left = (el.x * state.zoom) + 'px';
            div.style.top = (el.y * state.zoom) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (dragState) {
                saveHistory();
                updateProperties();
                dragState = null;
            }
        });

        function makeDraggable(div, el) {
            // No-op: delegated listeners above handle all dragging
        }

        function startResize(e, el, pos) {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = el.width;
            const startH = el.height;
            
            const onMove = ev => {
                const dx = (ev.clientX - startX) / state.zoom;
                const dy = (ev.clientY - startY) / state.zoom;
                
                if (pos.includes('e')) el.width = Math.max(50, startW + dx);
                if (pos.includes('w')) { el.width = Math.max(50, startW - dx); el.x = el.x + dx; }
                if (pos.includes('s')) el.height = Math.max(20, startH + dy);
                if (pos.includes('n')) { el.height = Math.max(20, startH - dy); el.y = el.y + dy; }
                
                renderElements();
            };
            
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                saveHistory();
                updateProperties();
            };
            
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        function selectElement(id) {
            state.selectedElement = id;
            
            document.querySelectorAll('.canva-text-box').forEach(div => {
                div.classList.toggle('selected', div.id === id);
            });
            
            // Update layers
            document.querySelectorAll('.canva-layer-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.id === id);
            });
            
            updateProperties();
            
            // Show text toolbar if text element
            const el = state.elements.find(e => e.id === id);
            if (el && el.type === 'text') {
                showTextToolbar(el);
            } else {
                textToolbar.style.display = 'none';
            }
        }

        function showTextToolbar(el) {
            textToolbar.style.display = 'flex';
            
            // Position below the element
            const div = document.getElementById(el.id);
            if (div) {
                const rect = div.getBoundingClientRect();
                textToolbar.style.top = (rect.bottom + 10) + 'px';
                textToolbar.style.left = (rect.left) + 'px';
            }
            
            // Update toolbar values
            document.getElementById('text-font').value = el.font;
            document.getElementById('text-size').value = el.size;
            document.getElementById('text-color').value = el.color;
            document.getElementById('text-bgcolor').value = el.bgcolor || '#ffffff';
            document.getElementById('text-opacity').value = el.opacity * 100;
            
            // Update button states
            document.getElementById('text-bold').classList.toggle('active', el.bold);
            document.getElementById('text-italic').classList.toggle('active', el.italic);
            document.getElementById('text-underline').classList.toggle('active', el.underline);
        }

        function hideTextToolbar() {
            textToolbar.style.display = 'none';
        }

        // Hide toolbar when clicking outside or pressing Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                hideTextToolbar();
                state.selectedElement = null;
                document.querySelectorAll('.canva-text-box.selected').forEach(div => div.classList.remove('selected'));
                document.querySelectorAll('.canva-layer-item.selected').forEach(item => item.classList.remove('selected'));
                updateProperties();
            }
        });

        document.getElementById('canva-canvas-wrap').addEventListener('click', e => {
            if (!e.target.closest('.canva-text-box') && !e.target.closest('.canva-text-toolbar') && !e.target.closest('.canva-sidebar')) {
                hideTextToolbar();
                state.selectedElement = null;
                document.querySelectorAll('.canva-text-box.selected').forEach(div => div.classList.remove('selected'));
                document.querySelectorAll('.canva-layer-item.selected').forEach(item => item.classList.remove('selected'));
                updateProperties();
            }
        });

        function toggleFormat(format) {
            const el = state.elements.find(e => e.id === state.selectedElement);
            if (!el || el.type !== 'text') return;
            
            el[format] = !el[format];
            document.getElementById('text-' + format).classList.toggle('active', el[format]);
            renderElements();
            saveHistory();
        }

        function updateTextStyle(prop, value) {
            const el = state.elements.find(e => e.id === state.selectedElement);
            if (!el || el.type !== 'text') return;
            
            el[prop] = value;
            renderElements();
            saveHistory();
        }

        function updateLayers() {
            layersList.innerHTML = '';
            
            if (state.elements.length === 0) {
                layersList.innerHTML = '<div class="canva-empty-state">No elements yet</div>';
                return;
            }
            
            state.elements.forEach((el, idx) => {
                const item = document.createElement('div');
                item.className = 'canva-layer-item' + (state.selectedElement === el.id ? ' selected' : '');
                item.dataset.id = el.id;
                const icon = document.createElement('span');
                icon.className = 'canva-layer-icon';
                icon.textContent = el.type === 'text' ? 'T' : '\u229E';
                const name = document.createElement('span');
                name.className = 'canva-layer-name';
                name.textContent = el.type === 'text' ? (el.text || 'Text ' + (idx + 1)) : 'Table ' + (idx + 1);
                const actions = document.createElement('div');
                actions.className = 'canva-layer-actions';
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'canva-layer-btn delete-layer';
                deleteBtn.title = 'Delete';
                deleteBtn.textContent = '\u2715';
                deleteBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    deleteElement(el.id);
                });
                actions.appendChild(deleteBtn);
                item.appendChild(icon);
                item.appendChild(name);
                item.appendChild(actions);
                item.addEventListener('click', () => selectElement(el.id));
                layersList.appendChild(item);
            });
        }

        function deleteElement(id) {
            state.elements = state.elements.filter(e => e.id !== id);
            state.selectedElement = null;
            textToolbar.style.display = 'none';
            saveHistory();
            renderElements();
            updateLayers();
            updateProperties();
        }

        function updateProperties() {
            const el = state.elements.find(e => e.id === state.selectedElement);
            
            if (!el) {
                propsContent.innerHTML = '<div class="canva-empty-state">Select an element</div>';
                return;
            }
            
            propsContent.innerHTML = `
                <div class="canva-prop-group">
                    <label class="canva-prop-label">Position</label>
                    <div class="canva-prop-row">
                        <input type="number" class="canva-prop-input" id="prop-x" value="${Math.round(el.x)}" placeholder="X">
                        <input type="number" class="canva-prop-input" id="prop-y" value="${Math.round(el.y)}" placeholder="Y">
                    </div>
                </div>
                <div class="canva-prop-group">
                    <label class="canva-prop-label">Size</label>
                    <div class="canva-prop-row">
                        <input type="number" class="canva-prop-input" id="prop-w" value="${Math.round(el.width)}" placeholder="W">
                        <input type="number" class="canva-prop-input" id="prop-h" value="${Math.round(el.height)}" placeholder="H">
                    </div>
                </div>
                ${el.type === 'text' ? `
                <div class="canva-prop-group">
                    <label class="canva-prop-label">Text</label>
                    <input type="text" class="canva-prop-input" id="prop-text" value="${window.encodeHtmlAttr(el.text || '')}" placeholder="Text content">
                </div>
                ` : ''}
            `;
            
            document.getElementById('prop-x')?.addEventListener('input', e => { el.x = parseInt(e.target.value) || 0; renderElements(); });
            document.getElementById('prop-y')?.addEventListener('input', e => { el.y = parseInt(e.target.value) || 0; renderElements(); });
            document.getElementById('prop-w')?.addEventListener('input', e => { el.width = parseInt(e.target.value) || 50; renderElements(); });
            document.getElementById('prop-h')?.addEventListener('input', e => { el.height = parseInt(e.target.value) || 20; renderElements(); });
            document.getElementById('prop-text')?.addEventListener('input', e => { el.text = e.target.value; renderElements(); saveHistory(); });
        }

        function setZoom(level) {
            if (level === 'fit') {
                const container = document.getElementById('canva-canvas-container');
                const containerW = container.clientWidth - 40;
                const containerH = container.clientHeight - 40;
                state.zoom = Math.min(containerW / state.pageWidth, containerH / state.pageHeight, 1);
            } else {
                state.zoom = level;
            }
            
            document.querySelectorAll('.canva-zoom-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.id === 'edit-zoom-' + (state.zoom * 100)) btn.classList.add('active');
            });
            
            selectPage(state.currentPage);
        }

        // Undo/Redo
        function saveHistory() {
            state.history = state.history.slice(0, state.historyIndex + 1);
            state.history.push(JSON.stringify(state.elements));
            state.historyIndex = state.history.length - 1;
            updateUndoRedo();
        }

        function undo() {
            if (state.historyIndex > 0) {
                state.historyIndex--;
                state.elements = JSON.parse(state.history[state.historyIndex]);
                state.selectedElement = null;
                renderElements();
                updateLayers();
                updateProperties();
            }
            updateUndoRedo();
        }

        function redo() {
            if (state.historyIndex < state.history.length - 1) {
                state.historyIndex++;
                state.elements = JSON.parse(state.history[state.historyIndex]);
                state.selectedElement = null;
                renderElements();
                updateLayers();
                updateProperties();
            }
            updateUndoRedo();
        }

        function updateUndoRedo() {
            document.getElementById('edit-undo').disabled = state.historyIndex <= 0;
            document.getElementById('edit-redo').disabled = state.historyIndex >= state.history.length - 1;
        }

        // Apply changes to PDF
        async function applyChanges() {
            applyBtn.disabled = true;
            applyBtn.textContent = 'Processing...';
            try {
                const newPdf = await PDFLib.PDFDocument.create();
                const helveticaFont = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                const helveticaBold = await newPdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
                const timesFont = await newPdf.embedFont(PDFLib.StandardFonts.TimesRoman);
                const timesBold = await newPdf.embedFont(PDFLib.StandardFonts.TimesRomanBold);
                const courierFont = await newPdf.embedFont(PDFLib.StandardFonts.Courier);
                const courierBold = await newPdf.embedFont(PDFLib.StandardFonts.CourierBold);
                const fontMap = {
                    'Helvetica': helveticaFont,
                    'Times New Roman': timesFont,
                    'Courier New': courierFont
                };
                const boldFontMap = {
                    'Helvetica': helveticaBold,
                    'Times New Roman': timesBold,
                    'Courier New': courierBold
                };
                const pageIndices = state.pdfDoc.getPageIndices();
                const copiedPages = await newPdf.copyPages(state.pdfDoc, pageIndices);
                for (let i = 0; i < copiedPages.length; i++) {
                    const page = newPdf.addPage(copiedPages[i]);
                    const { width, height } = page.getSize();
                    const pageElements = state.elements.filter(e => e.page === i);
                    for (const el of pageElements) {
                        if (el.type === 'text') {
                            const hex = el.color.replace('#', '');
                            const r = parseInt(hex.slice(0, 2), 16) / 255;
                            const g = parseInt(hex.slice(2, 4), 16) / 255;
                            const b = parseInt(hex.slice(4, 6), 16) / 255;
                            const font = el.bold ? (boldFontMap[el.font] || helveticaBold) : (fontMap[el.font] || helveticaFont);
                            const pdfY = height - el.y - el.size;
                            page.drawText(el.text || '', {
                                x: el.x,
                                y: Math.max(0, pdfY),
                                size: el.size,
                                color: PDFLib.rgb(r, g, b),
                                font: font,
                                opacity: el.opacity
                            });
                        }
                        if (el.type === 'table') {
                            const cellW = el.width / el.cols;
                            const cellH = el.height / el.rows;
                            for (let ri = 0; ri < el.rows; ri++) {
                                for (let ci = 0; ci < el.cols; ci++) {
                                    if (el.cells[ri][ci]) {
                                        const cellX = el.x + ci * cellW;
                                        const cellY = height - el.y - (ri + 1) * cellH;
                                        page.drawText(el.cells[ri][ci], {
                                            x: cellX + 5,
                                            y: Math.max(0, cellY + 5),
                                            size: 10,
                                            color: PDFLib.rgb(0, 0, 0)
                                        });
                                        page.drawRectangle({
                                            x: cellX,
                                            y: cellY,
                                            width: cellW,
                                            height: cellH,
                                            borderColor: PDFLib.rgb(0, 0, 0),
                                            borderWidth: 0.5
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                editedBytes = await newPdf.save();
                resultArea.style.display = 'block';
                window.showToast('PDF edited successfully!', 'success');
            } catch (err) {
                window.showToast('Error: ' + err.message, 'error');
            }
            applyBtn.disabled = false;
            applyBtn.textContent = 'Apply Changes';
        }
    })();



    /* ================= PAGE NUMBERS ================= */
    (function() {
        const state = { file: null };
        const dropzone = document.getElementById('pagenums-dropzone');
        const input = document.getElementById('pagenums-input');
        const filelist = document.getElementById('pagenums-filelist');
        const optionsWrap = document.getElementById('pagenums-options-wrap');
        const positionSelect = document.getElementById('pagenums-position');
        const startInput = document.getElementById('pagenums-start');
        const sizeInput = document.getElementById('pagenums-size');
        const colorInput = document.getElementById('pagenums-color');
        const btn = document.getElementById('pagenums-btn');
        const resultArea = document.getElementById('pagenums-result');
        const downloadBtn = document.getElementById('pagenums-download');
        let numberedPdfBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

        async function handleFile(file) {
            if (!await validatePdfFile(file)) return;
            state.file = file;
            filelist.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'file-item';
            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = file.name;
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size';
            sizeSpan.textContent = window.formatFileSize(file.size);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            div.appendChild(info);
            filelist.appendChild(div);
            optionsWrap.style.display = 'block';
            btn.disabled = false;
        }

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Adding page numbers...';
            try {
                const arrayBuffer = await state.file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                const startNum = parseInt(startInput.value) || 1;
                const fontSize = parseInt(sizeInput.value) || 12;
                const colorHex = colorInput.value;
                const r = parseInt(colorHex.slice(1, 3), 16) / 255;
                const g = parseInt(colorHex.slice(3, 5), 16) / 255;
                const b = parseInt(colorHex.slice(5, 7), 16) / 255;

                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    const { width, height } = page.getSize();
                    const pageNum = startNum + i;
                    const text = `Page ${pageNum} of ${pages.length}`;
                    const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);

                    let x, y;
                    const pos = positionSelect.value;
                    if (pos.includes('bottom')) {
                        y = 30;
                    } else {
                        y = height - 30;
                    }
                    if (pos.includes('center')) {
                        x = (width - textWidth) / 2;
                    } else if (pos.includes('right')) {
                        x = width - textWidth - 30;
                    } else {
                        x = 30;
                    }

                    page.drawText(text, { x, y, size: fontSize, font: helveticaFont, color: PDFLib.rgb(r, g, b) });
                }

                numberedPdfBytes = await pdfDoc.save();
                resultArea.style.display = 'block';
                window.showToast('Page numbers added!', 'success');
            } catch (err) {
                window.showToast('Error: ' + err.message, 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Add Page Numbers';
        });

        downloadBtn.addEventListener('click', () => {
            if (numberedPdfBytes) {
                const blob = new Blob([numberedPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = state.file.name.replace('.pdf', '_numbered.pdf');
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    })();

    /* ================= WATERMARK ================= */
    (function() {
        const state = { file: null };
        const dropzone = document.getElementById('watermark-dropzone');
        const input = document.getElementById('watermark-input');
        const filelist = document.getElementById('watermark-filelist');
        const optionsWrap = document.getElementById('watermark-options-wrap');
        const textInput = document.getElementById('watermark-text');
        const opacityInput = document.getElementById('watermark-opacity');
        const sizeInput = document.getElementById('watermark-size');
        const rotationInput = document.getElementById('watermark-rotation');
        const colorInput = document.getElementById('watermark-color');
        const btn = document.getElementById('watermark-btn');
        const resultArea = document.getElementById('watermark-result');
        const downloadBtn = document.getElementById('watermark-download');
        let watermarkedPdfBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

        async function handleFile(file) {
            if (!await validatePdfFile(file)) return;
            state.file = file;
            filelist.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'file-item';
            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = file.name;
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size';
            sizeSpan.textContent = window.formatFileSize(file.size);
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            div.appendChild(info);
            filelist.appendChild(div);
            optionsWrap.style.display = 'block';
            btn.disabled = false;
        }

        btn.addEventListener('click', async () => {
            const text = textInput.value.trim();
            if (!text) {
                window.showToast('Please enter watermark text', 'error');
                return;
            }
            btn.disabled = true;
            btn.textContent = 'Adding watermark...';
            try {
                const arrayBuffer = await state.file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                const fontSize = parseInt(sizeInput.value) || 48;
                const opacity = (parseInt(opacityInput.value) || 30) / 100;
                const rotation = parseInt(rotationInput.value) || -45;
                const colorHex = colorInput.value;
                const r = parseInt(colorHex.slice(1, 3), 16) / 255;
                const g = parseInt(colorHex.slice(3, 5), 16) / 255;
                const b = parseInt(colorHex.slice(5, 7), 16) / 255;

                for (const page of pages) {
                    const { width, height } = page.getSize();
                    const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
                    const textHeight = fontSize;

                    page.drawText(text, {
                        x: (width - textWidth) / 2,
                        y: (height - textHeight) / 2,
                        size: fontSize,
                        font: helveticaFont,
                        color: PDFLib.rgb(r, g, b),
                        opacity: opacity,
                        rotate: PDFLib.degrees(rotation)
                    });
                }

                watermarkedPdfBytes = await pdfDoc.save();
                resultArea.style.display = 'block';
                window.showToast('Watermark added!', 'success');
            } catch (err) {
                window.showToast('Error: ' + err.message, 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Add Watermark';
        });

        downloadBtn.addEventListener('click', () => {
            if (watermarkedPdfBytes) {
                const blob = new Blob([watermarkedPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = state.file.name.replace('.pdf', '_watermarked.pdf');
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    })();

    /* ================= ORGANIZE PDF ================= */
    (function() {
        const state = { file: null, pages: [], selected: [] };
        const dropzone = document.getElementById('organize-dropzone');
        const input = document.getElementById('organize-input');
        const pagesContainer = document.getElementById('organize-pages');
        const instructions = document.getElementById('organize-instructions');
        const actionsWrap = document.getElementById('organize-actions-wrap');
        const moveUpBtn = document.getElementById('organize-move-up');
        const moveDownBtn = document.getElementById('organize-move-down');
        const deleteBtn = document.getElementById('organize-delete');
        const btn = document.getElementById('organize-btn');
        const resultArea = document.getElementById('organize-result');
        const downloadBtn = document.getElementById('organize-download');
        let organizedPdfBytes = null;

        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', e => { e.stopPropagation(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

        async function handleFile(file) {
            if (!await validatePdfFile(file)) return;
            state.file = file;
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            state.pages = [];
            for (let i = 1; i <= pageCount; i++) {
                state.pages.push({ index: i - 1, selected: false });
            }
            renderPages();
            instructions.style.display = 'block';
            actionsWrap.style.display = 'flex';
            btn.disabled = false;
        }

        function renderPages() {
            pagesContainer.style.display = 'grid';
            pagesContainer.innerHTML = '';
            state.pages.forEach((page, idx) => {
                const div = document.createElement('div');
                div.className = 'page-thumb' + (page.selected ? ' selected' : '');
                div.innerHTML = `<div class="page-num">${page.index + 1}</div>`;
                div.addEventListener('click', () => togglePage(idx));
                pagesContainer.appendChild(div);
            });
        }

        function togglePage(idx) {
            state.pages[idx].selected = !state.pages[idx].selected;
            renderPages();
        }

        moveUpBtn.addEventListener('click', () => {
            const selectedIdx = state.pages.findIndex(p => p.selected);
            if (selectedIdx > 0) {
                const temp = state.pages[selectedIdx];
                state.pages[selectedIdx] = state.pages[selectedIdx - 1];
                state.pages[selectedIdx - 1] = temp;
                renderPages();
            }
        });

        moveDownBtn.addEventListener('click', () => {
            const selectedIdx = state.pages.findIndex(p => p.selected);
            if (selectedIdx < state.pages.length - 1 && selectedIdx !== -1) {
                const temp = state.pages[selectedIdx];
                state.pages[selectedIdx] = state.pages[selectedIdx + 1];
                state.pages[selectedIdx + 1] = temp;
                renderPages();
            }
        });

        deleteBtn.addEventListener('click', () => {
            state.pages = state.pages.filter(p => !p.selected);
            renderPages();
        });

        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = 'Processing...';
            try {
                const arrayBuffer = await state.file.arrayBuffer();
                const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const newDoc = await PDFLib.PDFDocument.create();
                const pageIndices = state.pages.map(p => p.index);
                const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
                copiedPages.forEach(p => newDoc.addPage(p));
                organizedPdfBytes = await newDoc.save();
                resultArea.style.display = 'block';
                window.showToast('PDF organized!', 'success');
            } catch (err) {
                window.showToast('Error: ' + err.message, 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        });

        downloadBtn.addEventListener('click', () => {
            if (organizedPdfBytes) {
                const blob = new Blob([organizedPdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = state.file.name.replace('.pdf', '_organized.pdf');
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    })();

    /* ================= MOBILE MENU ================= */
    (function() {
        const openBtn = document.getElementById('mobile-menu-open-btn');
        const closeBtn = document.getElementById('mobile-menu-close-btn');
        const nav = document.getElementById('nav-links');
        if (openBtn && nav) {
            openBtn.addEventListener('click', () => nav.classList.toggle('mobile-open'));
        }
        if (closeBtn && nav) {
            closeBtn.addEventListener('click', () => nav.classList.toggle('mobile-open'));
        }
    })();

    /* ================= FAQ ACCORDION ================= */
    (function() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                const isActive = item.classList.contains('active');
                document.querySelectorAll('.faq-item.active').forEach(activeItem => {
                    activeItem.classList.remove('active');
                });
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    })();

    /* ================= DOCK CARD NAVIGATION ================= */
    (function() {
        const dockCards = document.querySelectorAll('.dock-card');
        const toolPanels = document.querySelectorAll('.tool-panel');

        function activateTool(card) {
            const toolId = card.dataset.tool;
            dockCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            toolPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === toolId) {
                    panel.classList.add('active');
                }
            });
        }

        dockCards.forEach(card => {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Switch to ' + card.querySelector('span').textContent + ' tool');

            card.addEventListener('click', () => activateTool(card));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activateTool(card);
                }
            });
        });

        // Handle URL hash on page load
        const validTools = ['merge','compress','split','toimages','rotate','sign','png2jpg','jpg2png','webp2jpg','gif2jpg','bmp2png','svg2png','jpg2pdf','txt2pdf','croppdf','editpdf','pagenums','watermark','organize'];
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            if (validTools.includes(hash)) {
                const targetCard = document.querySelector('.dock-card[data-tool="' + hash + '"]');
                if (targetCard) {
                    targetCard.click();
                }
            }
        }
    })();

})();
});