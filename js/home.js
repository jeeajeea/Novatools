(function () {
    'use strict';

    const tools = [
        { name: 'Merge PDF', desc: 'Combine multiple PDFs into one file', url: 'pdf-tools.html#merge', category: 'pdf' },
        { name: 'Compress PDF', desc: 'Reduce file size while preserving quality', url: 'pdf-tools.html#compress', category: 'pdf' },
        { name: 'Split PDF', desc: 'Extract specific pages into a new file', url: 'pdf-tools.html#split', category: 'pdf' },
        { name: 'PDF to Images', desc: 'Convert pages to high-quality PNGs', url: 'pdf-tools.html#toimages', category: 'pdf' },
        { name: 'Rotate PDF', desc: 'Rotate pages at 90, 180, or 270 degrees', url: 'pdf-tools.html#rotate', category: 'pdf' },
        { name: 'Sign PDF', desc: 'Add your signature to PDF documents', url: 'pdf-tools.html#sign', category: 'pdf' },
        { name: 'PNG to JPG', desc: 'Convert PNG images to JPEG format', url: 'pdf-tools.html#png2jpg', category: 'pdf' },
        { name: 'JPG to PNG', desc: 'Convert JPEG images to PNG format', url: 'pdf-tools.html#jpg2png', category: 'pdf' },
        { name: 'WebP to JPG', desc: 'Convert WebP images to JPEG format', url: 'pdf-tools.html#webp2jpg', category: 'pdf' },
        { name: 'GIF to JPG', desc: 'Convert GIF images to JPEG format', url: 'pdf-tools.html#gif2jpg', category: 'pdf' },
        { name: 'BMP to PNG', desc: 'Convert BMP images to PNG format', url: 'pdf-tools.html#bmp2png', category: 'pdf' },
        { name: 'SVG to PNG', desc: 'Convert SVG vector images to PNG', url: 'pdf-tools.html#svg2png', category: 'pdf' },
        { name: 'JPG to PDF', desc: 'Combine images into a single PDF', url: 'pdf-tools.html#jpg2pdf', category: 'pdf' },
        { name: 'TXT to PDF', desc: 'Convert text files to PDF documents', url: 'pdf-tools.html#txt2pdf', category: 'pdf' },
        { name: 'Crop PDF', desc: 'Remove margins by cropping pages', url: 'pdf-tools.html#croppdf', category: 'pdf' },
        { name: 'Edit PDF', desc: 'Visual PDF editor like Canva', url: 'pdf-tools.html#editpdf', category: 'pdf' },
        { name: 'Page Numbers', desc: 'Add page numbers to your PDF', url: 'pdf-tools.html#pagenums', category: 'pdf' },
        { name: 'Watermark', desc: 'Add text watermark to PDF pages', url: 'pdf-tools.html#watermark', category: 'pdf' },
        { name: 'Organize PDF', desc: 'Reorder, delete, and manage PDF pages', url: 'pdf-tools.html#organize', category: 'pdf' },
        { name: 'Percentage Calculator', desc: 'Calculate percentages and changes', url: 'calculators.html#percentage', category: 'calculator' },
        { name: 'GPA Calculator', desc: 'Track your academic performance', url: 'calculators.html#gpa', category: 'calculator' },
        { name: 'Age Calculator', desc: 'Exact age in years, months, and days', url: 'calculators.html#age', category: 'calculator' },
        { name: 'BMI Calculator', desc: 'Calculate your body mass index', url: 'calculators.html#bmi', category: 'calculator' },
        { name: 'Compound Interest', desc: 'Calculate investment growth over time', url: 'calculators.html#interest', category: 'calculator' },
        { name: 'Scientific Calculator', desc: 'Advanced math with trigonometric functions', url: 'calculators.html#scientific', category: 'calculator' },
        { name: 'Fraction Calculator', desc: 'Add, subtract, multiply, and divide fractions', url: 'calculators.html#fraction', category: 'calculator' },
        { name: 'Random Number Generator', desc: 'Generate random numbers within a range', url: 'calculators.html#random', category: 'calculator' },
        { name: 'Triangle Calculator', desc: 'Calculate area, perimeter, and angles', url: 'calculators.html#triangle', category: 'calculator' },
        { name: 'Standard Deviation', desc: 'Calculate statistical measures for a dataset', url: 'calculators.html#stddev', category: 'calculator' },
        { name: 'Unit Converter', desc: 'Convert between different units of measurement', url: 'calculators.html#converter', category: 'calculator' },
        { name: 'Subnet Calculator', desc: 'Calculate network details from IP and subnet mask', url: 'calculators.html#subnet', category: 'calculator' },
        { name: 'Time & Date Calculator', desc: 'Calculate dates, times, and durations', url: 'calculators.html#datetime', category: 'calculator' },
        { name: 'Inflation Calculator', desc: 'Calculate the effect of inflation over time', url: 'calculators.html#inflation', category: 'calculator' },
        { name: 'Integration Calculator', desc: 'Calculate definite integrals numerically', url: 'calculators.html#integration', category: 'calculator' },
        { name: 'Loan Calculator', desc: 'Calculate monthly payments and total interest', url: 'calculators.html#loan', category: 'calculator' },
        { name: 'Tip Calculator', desc: 'Calculate tips and split bills', url: 'calculators.html#tip', category: 'calculator' },
        { name: 'Discount Calculator', desc: 'Calculate sale prices and savings', url: 'calculators.html#discount', category: 'calculator' },
        { name: 'Profit Margin', desc: 'Calculate markup and profit margins', url: 'calculators.html#margin', category: 'calculator' },
        { name: 'Speed Calculator', desc: 'Calculate speed, distance, and time', url: 'calculators.html#speed', category: 'calculator' },
        { name: 'Number Base Converter', desc: 'Convert between binary, octal, decimal, hex', url: 'calculators.html#numberbase', category: 'calculator' },
        { name: 'BMR Calculator', desc: 'Calculate basal metabolic rate', url: 'calculators.html#bmr', category: 'calculator' },
        { name: 'Tank Volume', desc: 'Calculate volume of various tank shapes', url: 'calculators.html#tank', category: 'calculator' },
        { name: 'Concrete Calculator', desc: 'Estimate concrete needed for a project', url: 'calculators.html#concrete', category: 'calculator' },
        { name: 'Paint Calculator', desc: 'Estimate paint needed for a room', url: 'calculators.html#paint', category: 'calculator' },
        { name: 'Password Generator', desc: 'Create strong, secure passwords', url: 'calculators.html#password', category: 'calculator' },
        { name: 'UUID Generator', desc: 'Generate unique UUIDs', url: 'calculators.html#uuid', category: 'calculator' },
        { name: 'Date Duration', desc: 'Calculate the duration between two dates', url: 'calculators.html#datediff', category: 'calculator' },
        { name: 'Tile Calculator', desc: 'Estimate tiles needed for a floor or wall', url: 'calculators.html#tile', category: 'calculator' },
        { name: 'To-Do List', desc: 'Organize tasks with priorities', url: 'productivity.html#todo', category: 'productivity' },
        { name: 'Word Counter', desc: 'Count words, characters, and sentences', url: 'productivity.html#wordcount', category: 'productivity' },
        { name: 'Pomodoro Timer', desc: 'Focus with 25-minute work sessions', url: 'productivity.html#pomodoro', category: 'productivity' },
        { name: 'Flashcards', desc: 'Create decks and study with spaced repetition', url: 'productivity.html#flashcards', category: 'productivity' },
        { name: 'Habit Tracker', desc: 'Build and track daily habits', url: 'productivity.html#habits', category: 'productivity' },
        { name: 'Quick Notes', desc: 'Jot down ideas and save them locally', url: 'productivity.html#notes', category: 'productivity' },
        { name: 'Password Generator', desc: 'Create strong, secure passwords', url: 'productivity.html#password', category: 'productivity' },
        { name: 'Markdown Previewer', desc: 'Write Markdown and see live preview', url: 'productivity.html#markdown', category: 'productivity' },
        { name: 'Stopwatch', desc: 'Track time with lap recording', url: 'productivity.html#stopwatch', category: 'productivity' },
        { name: 'Expense Tracker', desc: 'Track your spending and income', url: 'productivity.html#expenses', category: 'productivity' },
        { name: 'Lorem Ipsum Generator', desc: 'Generate placeholder text for designs', url: 'productivity.html#lorem', category: 'productivity' },
        { name: 'Color Palette Generator', desc: 'Generate and copy color palettes', url: 'productivity.html#colors', category: 'productivity' },
        { name: 'Tip Calculator', desc: 'Split bills and calculate tips', url: 'productivity.html#tipcalc', category: 'productivity' },
        { name: 'Book Writer', desc: 'Digital book with page flip animation', url: 'book-writer.html', category: 'productivity' }
    ];

    function initSearch() {
        const searchInput = document.getElementById('tool-search');
        const searchResults = document.getElementById('search-results');
        const shortcuts = document.querySelectorAll('.shortcut');

        if (!searchInput || !searchResults) return;

        function performSearch(query) {
            if (!query.trim()) {
                searchResults.hidden = true;
                return;
            }

            const filtered = tools.filter(tool =>
                tool.name.toLowerCase().includes(query.toLowerCase()) ||
                tool.desc.toLowerCase().includes(query.toLowerCase()) ||
                tool.category.toLowerCase().includes(query.toLowerCase())
            );

            if (filtered.length === 0) {
                searchResults.innerHTML = '<div class="search-result-item"><p>No tools found matching your search</p></div>';
            } else {
                searchResults.innerHTML = filtered.map(tool => `
                    <a href="${window.encodeHtmlAttr(tool.url)}" class="search-result-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div>
                            <h4>${window.encodeHtmlAttr(tool.name)}</h4>
                            <p>${window.encodeHtmlAttr(tool.desc)}</p>
                        </div>
                    </a>
                `).join('');
            }

            searchResults.hidden = false;
        }

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => performSearch(e.target.value), 150);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                searchResults.hidden = false;
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.hidden = true;
            }
        });

        shortcuts.forEach(shortcut => {
            shortcut.addEventListener('click', () => {
                searchInput.value = shortcut.textContent;
                performSearch(shortcut.textContent);
                searchInput.focus();
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
                faqItems.forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                });
                if (!isActive) {
                    item.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    function initCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSearch();
        initFAQ();
        initCurrentYear();
    });
})();
