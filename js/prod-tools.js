(function() {
    'use strict';

    // TO-DO LIST
    const MAX_TODOS = 500;
    const MAX_TODO_LENGTH = 500;
    let todos = [];
    let todosLoaded = false;
    let todoFilter = 'all';

    async function loadTodos() {
        try {
            var saved = await window.db.getItem('todos');
            if (saved) { todos = JSON.parse(saved); if (!Array.isArray(todos)) todos = []; }
            else { try { var ls = localStorage.getItem('todos'); if (ls) { todos = JSON.parse(ls); localStorage.removeItem('todos'); } } catch(_) {} }
        } catch (e) { todos = []; }
        todosLoaded = true;
        renderTodos();
    }

    async function saveTodos() {
        try {
            const data = JSON.stringify(todos);
            try {
                await window.db.setItem('todos', data);
            } catch (e) {
                localStorage.setItem('todos', data);
            }
            return true;
        } catch (e) {
            showToast('Failed to save. Storage full.', 'error');
            return false;
        }
    }

    function renderTodos() {
        const list = document.getElementById('todo-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const filtered = todos.filter(t => {
            if (todoFilter === 'active') return !t.completed;
            if (todoFilter === 'completed') return t.completed;
            return true;
        });

        if (filtered.length === 0) {
            const empty = document.createElement('li');
            empty.style.cssText = 'text-align: center; color: var(--text-muted); padding: 24px;';
            empty.textContent = 'No tasks yet. Add one above!';
            list.appendChild(empty);
            return;
        }

        filtered.forEach(t => {
            const isOverdue = t.due && new Date(t.due) < new Date() && !t.completed;
            
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-card); border-radius: var(--radius-btn); border: 1px solid var(--border-subtle);';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = t.completed || false;
            checkbox.style.cssText = 'width: 20px; height: 20px; accent-color: var(--accent-success);';
            checkbox.onchange = function() { toggleTodo(t.id); };

            const text = document.createElement('span');
            text.style.cssText = 'flex: 1;' + (t.completed ? 'text-decoration: line-through; color: var(--text-muted);' : '');
            text.textContent = t.text || '';

            const category = document.createElement('span');
            category.style.cssText = 'font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; background: var(--bg-muted);';
            category.textContent = t.category || 'General';

            const due = document.createElement('span');
            due.style.cssText = 'font-size: 0.8rem; color: ' + (isOverdue ? 'var(--accent-error)' : 'var(--text-muted)') + ';';
            due.textContent = t.due || '';

            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'color: var(--text-muted); padding: 4px; background: none; border: none; cursor: pointer;';
            delBtn.onclick = function() { deleteTodo(t.id); };
            delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(category);
            if (t.due) li.appendChild(due);
            li.appendChild(delBtn);
            list.appendChild(li);
        });

        const completed = todos.filter(t => t.completed).length;
        const total = todos.length;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        
        const fill = document.getElementById('todo-progress-fill');
        const textEl = document.getElementById('todo-progress-text');
        if (fill) fill.style.width = pct + '%';
        if (textEl) textEl.textContent = pct + '% complete';
    }

    function escapeHtml(str) {
        if (!str || typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    window.toggleTodo = function(id) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            saveTodos();
            renderTodos();
        }
    };

    window.deleteTodo = function(id) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderTodos();
    };

    document.getElementById('todo-add').onclick = () => {
        const input = document.getElementById('todo-input');
        let text = input.value.trim();
        if (!text) return;

        if (todos.length >= MAX_TODOS) {
            showToast('Maximum ' + MAX_TODOS + ' tasks allowed', 'error');
            return;
        }

        text = text.substring(0, MAX_TODO_LENGTH).replace(/[<>'";&]/g, '');

        todos.push({
            id: Date.now(),
            text: text,
            category: (document.getElementById('todo-category').value || 'General').substring(0, 50),
            due: document.getElementById('todo-due').value || null,
            completed: false
        });

        if (saveTodos()) {
            input.value = '';
            document.getElementById('todo-due').value = '';
            renderTodos();
        }
    };

    document.getElementById('todo-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('todo-add').click();
    });

    document.querySelectorAll('.todo-filter').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            todoFilter = btn.dataset.filter;
            renderTodos();
        };
    });

    loadTodos();

    // WORD COUNTER
    const STOP_WORDS = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'it', 'be', 'as', 'with', 'that', 'this', 'by', 'from', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must'];

    function updateWordCount() {
        const text = document.getElementById('wc-text').value;

        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const chars = text.length;
        const sentences = (text.match(/[.!?]+/g) || []).length || (text.trim() ? 1 : 0);
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length || (text.trim() ? 1 : 0);
        const readingTime = Math.ceil(words.length / 200);

        document.getElementById('wc-words').textContent = words.length;
        document.getElementById('wc-chars').textContent = chars;
        document.getElementById('wc-sentences').textContent = sentences;
        document.getElementById('wc-paragraphs').textContent = paragraphs;
        document.getElementById('wc-reading').textContent = readingTime + ' min';

        const counts = {};
        words.forEach(w => {
            const cleaned = w.toLowerCase().replace(/[^a-z]/g, '');
            if (cleaned.length > 2 && !STOP_WORDS.includes(cleaned)) {
                counts[cleaned] = (counts[cleaned] || 0) + 1;
            }
        });

        const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        document.getElementById('wc-keywords').textContent = top.length
            ? top.map(([w, c]) => `${w} (${c})`).join(', ')
            : '-';
    }

    document.getElementById('wc-text').addEventListener('input', updateWordCount);

    // POMODORO
    let pomodoroInterval = null;
    let pomodoroTime = 25 * 60;
    let pomodoroMode = 'work';
    let pomodoroSessions = 0;

    async function loadPomodoroSessions() {
        try {
            var val = await window.db.getItem('pomodoroSessions');
            if (val !== null) pomodoroSessions = parseInt(val) || 0;
            else { try { var ls = localStorage.getItem('pomodoroSessions'); if (ls) { pomodoroSessions = parseInt(ls); localStorage.removeItem('pomodoroSessions'); } } catch(_) {} }
        } catch (e) {}
        updatePomodoroDisplay();
    }

    async function savePomodoroSessions() {
        try { await window.db.setItem('pomodoroSessions', String(pomodoroSessions)); } catch (e) { try { localStorage.setItem('pomodoroSessions', String(pomodoroSessions)); } catch(_) {} }
    }

    const workDur = () => parseInt(document.getElementById('pomodoro-work').value) || 25;
    const breakDur = () => parseInt(document.getElementById('pomodoro-break').value) || 5;

    function updatePomodoroDisplay() {
        const mins = Math.floor(pomodoroTime / 60);
        const secs = pomodoroTime % 60;
        document.getElementById('pomodoro-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('pomodoro-label').textContent = pomodoroMode === 'work' ? 'Focus Time' : 'Break Time';
        document.getElementById('pomodoro-sessions').textContent = pomodoroSessions;

        const total = pomodoroMode === 'work' ? workDur() * 60 : breakDur() * 60;
        const progress = ((total - pomodoroTime) / total) * 283;
        document.getElementById('pomodoro-progress').style.strokeDashoffset = 283 - progress;
    }

    function playBeep() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); }, 500);
    }

    document.getElementById('pomodoro-start').onclick = () => {
        if (pomodoroInterval) return;
        pomodoroInterval = setInterval(() => {
            pomodoroTime--;
            updatePomodoroDisplay();
            if (pomodoroTime <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroInterval = null;
                playBeep();
                if (pomodoroMode === 'work') {
                    pomodoroSessions++;
                    savePomodoroSessions();
                    pomodoroMode = 'break';
                    pomodoroTime = breakDur() * 60;
                } else {
                    pomodoroMode = 'work';
                    pomodoroTime = workDur() * 60;
                }
                updatePomodoroDisplay();
                showToast(pomodoroMode === 'break' ? 'Break time! Great work.' : 'Focus time!', 'success');
            }
        }, 1000);
        document.getElementById('pomodoro-start').disabled = true;
        document.getElementById('pomodoro-pause').disabled = false;
    };

    document.getElementById('pomodoro-pause').onclick = () => {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        document.getElementById('pomodoro-start').disabled = false;
        document.getElementById('pomodoro-pause').disabled = true;
    };

    document.getElementById('pomodoro-reset').onclick = () => {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        pomodoroTime = pomodoroMode === 'work' ? workDur() * 60 : breakDur() * 60;
        updatePomodoroDisplay();
        document.getElementById('pomodoro-start').disabled = false;
        document.getElementById('pomodoro-pause').disabled = true;
    };

    document.querySelectorAll('.pomodoro-mode').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.pomodoro-mode').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pomodoroMode = btn.dataset.mode;
            pomodoroTime = pomodoroMode === 'work' ? workDur() * 60 : breakDur() * 60;
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            updatePomodoroDisplay();
            document.getElementById('pomodoro-start').disabled = false;
            document.getElementById('pomodoro-pause').disabled = true;
        };
    });

    document.getElementById('pomodoro-work').addEventListener('change', () => {
        if (pomodoroMode === 'work' && !pomodoroInterval) {
            pomodoroTime = workDur() * 60;
            updatePomodoroDisplay();
        }
    });

    document.getElementById('pomodoro-break').addEventListener('change', () => {
        if (pomodoroMode === 'break' && !pomodoroInterval) {
            pomodoroTime = breakDur() * 60;
            updatePomodoroDisplay();
        }
    });

    loadPomodoroSessions();

    // FLASHCARDS
    let decks = {};
    let currentDeck = 'Default';
    let studyIndex = 0;
    let isFlipped = false;
    let studyCards = [];
    let decksLoaded = false;

    async function loadDecks() {
        try {
            var saved = await window.db.getItem('flashcardDecks');
            if (saved) { decks = JSON.parse(saved); }
            else { try { var ls = localStorage.getItem('flashcardDecks'); if (ls) { decks = JSON.parse(ls); localStorage.removeItem('flashcardDecks'); } } catch(_) {} }
        } catch (e) {}
        if (!decks || typeof decks !== 'object') decks = { 'Default': { cards: [] } };
        if (!decks['Default']) decks['Default'] = { cards: [] };
        decksLoaded = true;
        renderDeckSelect();
        renderCards();
    }

    async function saveDecks() {
        try {
            await window.db.setItem('flashcardDecks', JSON.stringify(decks));
        } catch (e) {
            try { localStorage.setItem('flashcardDecks', JSON.stringify(decks)); } catch(_) { }
            showToast('Failed to save. Storage full.', 'error');
        }
    }

    function sanitizeInput(str, maxLen = 200) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().substring(0, maxLen);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderDeckSelect() {
        const select = document.getElementById('flashcard-deck');
        select.textContent = '';
        Object.keys(decks).forEach(function(d) {
            var opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            if (d === currentDeck) opt.selected = true;
            select.appendChild(opt);
        });
    }

    function renderCards() {
        const container = document.getElementById('flashcard-cards');
        const cards = decks[currentDeck] ? decks[currentDeck].cards : [];

        container.innerHTML = '';

        if (cards.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No cards yet. Add one above!</p>';
        } else {
            cards.forEach((c, i) => {
                const card = document.createElement('div');
                card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-card); border-radius: var(--radius-btn); border: 1px solid var(--border-subtle);';

                const content = document.createElement('div');
                content.style.flex = '1';

                const front = document.createElement('div');
                front.style.fontWeight = '500';
                front.textContent = c.front || '';

                const back = document.createElement('div');
                back.style.cssText = 'color: var(--text-muted); font-size: 0.85rem;';
                back.textContent = c.back || '';

                content.appendChild(front);
                content.appendChild(back);

                const delBtn = document.createElement('button');
                delBtn.style.cssText = 'color: var(--text-muted);';
                delBtn.onclick = function() { deleteFlashcard(i); };
                delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

                card.appendChild(content);
                card.appendChild(delBtn);
                container.appendChild(card);
            });
        }

        studyCards = [...cards];
    }

    window.deleteFlashcard = function(index) {
        decks[currentDeck].cards.splice(index, 1);
        saveDecks();
        renderCards();
    };

    document.getElementById('flashcard-deck').addEventListener('change', e => {
        currentDeck = e.target.value;
        renderCards();
    });

    document.getElementById('flashcard-new-deck').onclick = () => {
        const name = prompt('Deck name:');
        if (name && !decks[name]) {
            decks[name] = { cards: [] };
            currentDeck = name;
            saveDecks();
            renderDeckSelect();
            renderCards();
            showToast('Deck created', 'success');
        }
    };

    document.getElementById('flashcard-delete-deck').onclick = () => {
        if (Object.keys(decks).length <= 1) {
            showToast('Cannot delete last deck', 'error');
            return;
        }
        if (confirm('Delete deck "' + currentDeck + '"?')) {
            delete decks[currentDeck];
            currentDeck = Object.keys(decks)[0];
            saveDecks();
            renderDeckSelect();
            renderCards();
            showToast('Deck deleted', 'success');
        }
    };

    document.getElementById('flashcard-add').onclick = () => {
        const front = sanitizeInput(document.getElementById('flashcard-front').value);
        const back = sanitizeInput(document.getElementById('flashcard-back').value);
        if (!front || !back) return;

        if (!decks[currentDeck].cards) decks[currentDeck].cards = [];
        if (decks[currentDeck].cards.length >= 100) {
            showToast('Maximum 100 cards per deck', 'error');
            return;
        }

        decks[currentDeck].cards.push({ front, back });
        document.getElementById('flashcard-front').value = '';
        document.getElementById('flashcard-back').value = '';
        saveDecks();
        renderCards();
    };

    document.getElementById('flashcard-study').onclick = () => {
        studyCards = [...decks[currentDeck].cards];
        if (studyCards.length === 0) {
            showToast('Add some cards first', 'error');
            return;
        }
        studyIndex = 0;
        isFlipped = false;
        showCard();
        document.getElementById('flashcard-list-view').style.display = 'none';
        document.getElementById('flashcard-study-view').style.display = 'block';
        document.getElementById('flashcard-study').style.display = 'none';
        document.getElementById('flashcard-back-list').style.display = 'inline-flex';
    };

    document.getElementById('flashcard-back-list').onclick = () => {
        document.getElementById('flashcard-list-view').style.display = 'block';
        document.getElementById('flashcard-study-view').style.display = 'none';
        document.getElementById('flashcard-study').style.display = 'inline-flex';
        document.getElementById('flashcard-back-list').style.display = 'none';
    };

    function showCard() {
        if (studyIndex >= studyCards.length) {
            studyIndex = 0;
        }
        const card = studyCards[studyIndex];
        document.getElementById('flashcard-front-display').textContent = card.front;
        document.getElementById('flashcard-back-display').textContent = card.back;
        document.getElementById('flashcard-inner').style.transform = 'rotateY(0deg)';
        isFlipped = false;
        document.getElementById('flashcard-counter').textContent = `${studyIndex + 1} / ${studyCards.length}`;
        document.getElementById('flashcard-prev').disabled = studyIndex === 0;
        document.getElementById('flashcard-next').disabled = studyIndex >= studyCards.length - 1;
    }

    document.getElementById('flashcard-flip').onclick = () => {
        isFlipped = !isFlipped;
        document.getElementById('flashcard-inner').style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    };

    document.getElementById('flashcard-front-display').addEventListener('click', () => document.getElementById('flashcard-flip').click());
    document.getElementById('flashcard-back-display').addEventListener('click', () => document.getElementById('flashcard-flip').click());

    document.getElementById('flashcard-next').onclick = () => {
        studyIndex++;
        showCard();
    };

    document.getElementById('flashcard-prev').onclick = () => {
        studyIndex--;
        showCard();
    };

    document.getElementById('flashcard-shuffle').onclick = () => {
        var sc = [...studyCards];
        for (var si = sc.length - 1; si > 0; si--) {
            var buf = new Uint32Array(1);
            crypto.getRandomValues(buf);
            var sj = buf[0] % (si + 1);
            var tmp = sc[si];
            sc[si] = sc[sj];
            sc[sj] = tmp;
        }
        studyCards = sc;
        studyIndex = 0;
        showCard();
    };

    document.getElementById('flashcard-known').onclick = () => {
        studyIndex++;
        showCard();
    };

    document.getElementById('flashcard-review').onclick = () => {
        studyCards.push(studyCards[studyIndex]);
        studyIndex++;
        showCard();
    };

    loadDecks();

    // HABIT TRACKER
    let habits = [];
    let habitView = 'week';

    async function loadHabits() {
        try {
            var saved = await window.db.getItem('habits');
            if (saved) { habits = JSON.parse(saved); }
            else { try { var ls = localStorage.getItem('habits'); if (ls) { habits = JSON.parse(ls); localStorage.removeItem('habits'); } } catch(_) {} }
        } catch (e) {}
        if (!Array.isArray(habits)) habits = [];
        renderHabitGrid();
    }

    async function saveHabits() {
        try {
            await window.db.setItem('habits', JSON.stringify(habits));
        } catch (e) {
            try { localStorage.setItem('habits', JSON.stringify(habits)); } catch(_) { }
            showToast('Failed to save. Storage full.', 'error');
        }
    }

    function sanitizeHabitName(str, maxLen = 100) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().replace(/[<>'";&]/g, '').substring(0, maxLen);
    }

    function renderHabitGrid() {
        const container = document.getElementById('habit-grid');
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());

        if (habitView === 'week') {
            let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="padding: 8px; text-align: left;"></th>';
            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                html += `<th style="padding: 8px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">${dayNames[d.getDay()]}</th>`;
            }
            html += '</tr></thead><tbody>';

            habits.forEach((h, hi) => {
                html += `<tr><td style="padding: 8px; font-size: 0.85rem;">${escapeHtml(h.name || '')}</td>`;
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startOfWeek);
                    d.setDate(d.getDate() + i);
                    const key = d.toISOString().split('T')[0];
                    const done = h.days && h.days.includes(key);
                    html += `<td style="padding: 4px; text-align: center;">
                        <div class="habit-day" data-hi="${hi}" data-day="${key}" style="width: 28px; height: 28px; margin: auto; border-radius: 6px; border: 2px solid var(--border-subtle); cursor: pointer; ${done ? 'background: var(--accent-success); border-color: var(--accent-success);' : ''}"></div>
                    </td>`;
                }
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html || '<p style="text-align: center; color: var(--text-muted);">Add a habit to get started!</p>';
        } else {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
            let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr>';
            ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
                html += `<th style="padding: 8px; text-align: center; font-size: 0.8rem; color: var(--text-muted);">${d}</th>`;
            });
            html += '</tr></thead><tbody><tr>';

            for (let i = 0; i < firstDay; i++) {
                html += '<td></td>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                if ((firstDay + day - 1) % 7 === 0 && day > 1) html += '</tr><tr>';
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                html += `<td style="padding: 4px; text-align: center; font-size: 0.85rem;">${day}`;
                habits.forEach((h, hi) => {
                    const done = h.days && h.days.includes(dateStr);
                    html += `<div class="habit-day" data-hi="${hi}" data-day="${dateStr}" style="width: 12px; height: 12px; margin: 2px auto; border-radius: 3px; border: 1px solid var(--border-subtle); cursor: pointer; ${done ? 'background: var(--accent-success);' : ''}"></div>`;
                });
                html += '</td>';
            }

            html += '</tr></tbody></table>';
            container.innerHTML = html;
        }

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        for (let i = 0; i < habits.length; i++) {
            if (habits[i].days && habits[i].days.includes(today)) {
                streak++;
            }
        }
        document.getElementById('habit-streak').textContent = streak;
    }

    window.toggleHabitDay = function(hi, day) {
        if (!habits[hi].days) habits[hi].days = [];
        const idx = habits[hi].days.indexOf(day);
        if (idx > -1) {
            habits[hi].days.splice(idx, 1);
        } else {
            habits[hi].days.push(day);
        }
        saveHabits();
        renderHabitGrid();
    };

    document.getElementById('habit-grid').addEventListener('click', (e) => {
        const dayEl = e.target.closest('.habit-day');
        if (!dayEl) return;
        const hi = parseInt(dayEl.dataset.hi, 10);
        const day = dayEl.dataset.day;
        if (!isNaN(hi) && day) window.toggleHabitDay(hi, day);
    });

    document.getElementById('habit-add').onclick = () => {
        const input = document.getElementById('habit-input');
        const name = sanitizeHabitName(input.value);
        if (!name) return;

        if (habits.length >= 50) {
            showToast('Maximum 50 habits allowed', 'error');
            return;
        }

        habits.push({ name, days: [] });
        input.value = '';
        saveHabits();
        renderHabitGrid();
    };

    document.querySelectorAll('.habit-view').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.habit-view').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            habitView = btn.dataset.view;
            renderHabitGrid();
        };
    });

    loadHabits();

    // QUICK NOTES
    let notes = {};
    let currentNote = null;

    async function loadNotes() {
        try {
            var saved = await window.db.getItem('quickNotes');
            if (saved) { notes = JSON.parse(saved); }
            else { try { var ls = localStorage.getItem('quickNotes'); if (ls) { notes = JSON.parse(ls); localStorage.removeItem('quickNotes'); } } catch(_) {} }
        } catch (e) {}
        renderNotesList();
    }

    async function saveNotes() {
        try {
            await window.db.setItem('quickNotes', JSON.stringify(notes));
        } catch (e) {
            try { localStorage.setItem('quickNotes', JSON.stringify(notes)); } catch(_) { }
            showToast('Storage full', 'error');
        }
    }

    function renderNotesList() {
        const list = document.getElementById('notes-list');
        if (!list) return;
        list.innerHTML = '';
        const keys = Object.keys(notes).sort((a, b) => (notes[b].updated || 0) - (notes[a].updated || 0));
        if (keys.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;">No notes yet</p>';
            return;
        }
        keys.forEach(key => {
            const note = notes[key];
            const div = document.createElement('div');
            div.style.cssText = 'padding:8px 12px;border-radius:6px;cursor:pointer;font-size:0.85rem;border:1px solid var(--border-subtle);' + (key === currentNote ? 'background:var(--accent-primary);color:white;border-color:var(--accent-primary);' : '');
            div.textContent = note.title || 'Untitled';
            div.onclick = () => loadNote(key);
            list.appendChild(div);
        });
    }

    function loadNote(key) {
        if (currentNote && notes[currentNote]) {
            notes[currentNote].content = document.getElementById('note-content').value;
            notes[currentNote].updated = Date.now();
        }
        currentNote = key;
        document.getElementById('note-title').value = notes[key].title || '';
        document.getElementById('note-content').value = notes[key].content || '';
        updateNoteWordCount();
        renderNotesList();
        saveNotes();
    }

    function updateNoteWordCount() {
        const text = document.getElementById('note-content').value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        document.getElementById('note-word-count').textContent = words + ' words';
    }

    document.getElementById('note-save').onclick = () => {
        const title = document.getElementById('note-title').value.trim() || 'Untitled';
        const content = document.getElementById('note-content').value;
        if (!currentNote) {
            currentNote = 'note_' + Date.now();
            notes[currentNote] = { title, content, updated: Date.now() };
        } else {
            notes[currentNote].title = title;
            notes[currentNote].content = content;
            notes[currentNote].updated = Date.now();
        }
        saveNotes();
        renderNotesList();
        showToast('Note saved', 'success');
    };

    document.getElementById('note-new').onclick = () => {
        if (currentNote && notes[currentNote]) {
            notes[currentNote].content = document.getElementById('note-content').value;
            notes[currentNote].updated = Date.now();
            saveNotes();
        }
        currentNote = 'note_' + Date.now();
        notes[currentNote] = { title: '', content: '', updated: Date.now() };
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        updateNoteWordCount();
        renderNotesList();
        saveNotes();
    };

    document.getElementById('note-delete').onclick = () => {
        if (!currentNote || !notes[currentNote]) return;
        if (confirm('Delete this note?')) {
            delete notes[currentNote];
            currentNote = null;
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            updateNoteWordCount();
            saveNotes();
            renderNotesList();
        }
    };

    document.getElementById('note-content').addEventListener('input', updateNoteWordCount);

    loadNotes();

    // PASSWORD GENERATOR
    function generatePassword() {
        const length = parseInt(document.getElementById('password-length').value);
        const useUpper = document.getElementById('password-upper').checked;
        const useLower = document.getElementById('password-lower').checked;
        const useNumbers = document.getElementById('password-numbers').checked;
        const useSymbols = document.getElementById('password-symbols').checked;

        let chars = '';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useNumbers) chars += '0123456789';
        if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) {
            showToast('Select at least one option', 'error');
            return;
        }

        let password = '';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
            password += chars[array[i] % chars.length];
        }

        document.getElementById('password-output').textContent = password;
        updatePasswordStrength(password);
    }

    function updatePasswordStrength(password) {
        let score = 0;
        if (password.length >= 12) score += 25;
        else if (password.length >= 8) score += 15;
        if (/[a-z]/.test(password)) score += 15;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[0-9]/.test(password)) score += 20;
        if (/[^a-zA-Z0-9]/.test(password)) score += 20;
        if (password.length >= 20) score += 10;

        const fill = document.getElementById('password-strength-fill');
        const text = document.getElementById('password-strength-text');
        fill.style.width = score + '%';

        if (score < 30) { fill.style.background = '#ef4444'; text.textContent = 'Weak'; }
        else if (score < 60) { fill.style.background = '#f59e0b'; text.textContent = 'Fair'; }
        else if (score < 80) { fill.style.background = '#22c55e'; text.textContent = 'Strong'; }
        else { fill.style.background = '#16a34a'; text.textContent = 'Very Strong'; }
    }

    document.getElementById('password-generate').onclick = generatePassword;
    document.getElementById('password-copy').onclick = () => {
        const pw = document.getElementById('password-output').textContent;
        if (pw === 'Click Generate') return;
        navigator.clipboard.writeText(pw).then(() => showToast('Copied to clipboard', 'success'));
    };
    document.getElementById('password-length').addEventListener('input', e => {
        document.getElementById('password-length-val').textContent = e.target.value;
    });
    document.querySelectorAll('#password-upper, #password-lower, #password-numbers, #password-symbols').forEach(el => {
        el.addEventListener('change', generatePassword);
    });

    // MARKDOWN PREVIEWER
    function sanitizeUrl(url) {
        const cleaned = url.replace(/[\t\n\r]/g, '').trim();
        if (/^\s*(javascript|data|vbscript|blob):/i.test(cleaned)) return '#';
        return cleaned;
    }

    function renderMarkdown() {
        const md = document.getElementById('markdown-input').value;
        let html = md
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`(.*?)`/g, '<code style="background:var(--bg-muted);padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>')
            .replace(/\[(.*?)\]\((.*?)\)/g, function(match, text, url) {
                return '<a href="' + sanitizeUrl(url) + '" target="_blank" rel="noopener" style="color:var(--accent-primary);text-decoration:underline;">' + window.encodeHtmlAttr(text) + '</a>';
            })
            .replace(/^[-*] (.*$)/gm, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/^> (.*$)/gm, '<blockquote style="border-left:3px solid var(--accent-primary);padding-left:12px;color:var(--text-muted);margin:8px 0;">$1</blockquote>')
            .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border-subtle);margin:16px 0;">')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        html = '<p>' + html + '</p>';
        html = html.replace(/<p><(h[1-3]|ul|ol|blockquote|hr)/g, '<$1');
        html = html.replace(/<\/(h[1-3]|ul|ol|blockquote)><\/p>/g, '</$1>');

        document.getElementById('markdown-preview').innerHTML = window.sanitizeHtml(html);
    }

    document.getElementById('markdown-input').addEventListener('input', renderMarkdown);

    // STOPWATCH
    let swInterval = null;
    let swTime = 0;
    let swLaps = [];

    function updateStopwatchDisplay() {
        const hrs = Math.floor(swTime / 360000);
        const mins = Math.floor((swTime % 360000) / 6000);
        const secs = Math.floor((swTime % 6000) / 100);
        const ms = swTime % 100;
        document.getElementById('stopwatch-display').innerHTML =
            `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}<span style="font-size:2rem;color:var(--text-muted);">.${ms.toString().padStart(2,'0')}</span>`;
    }

    document.getElementById('stopwatch-start').onclick = () => {
        if (swInterval) {
            clearInterval(swInterval);
            swInterval = null;
            document.getElementById('stopwatch-start').textContent = 'Resume';
            document.getElementById('stopwatch-lap').disabled = true;
        } else {
            swInterval = setInterval(() => {
                swTime++;
                updateStopwatchDisplay();
            }, 10);
            document.getElementById('stopwatch-start').textContent = 'Stop';
            document.getElementById('stopwatch-lap').disabled = false;
        }
    };

    document.getElementById('stopwatch-lap').onclick = () => {
        swLaps.push(swTime);
        const lapsDiv = document.getElementById('stopwatch-laps');
        const lapNum = swLaps.length;
        const prevLap = lapNum > 1 ? swLaps[lapNum - 2] : 0;
        const diff = swTime - prevLap;
        const formatTime = t => {
            const m = Math.floor(t / 6000);
            const s = Math.floor((t % 6000) / 100);
            const ms = t % 100;
            return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
        };
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-subtle);font-size:0.9rem;';
        div.innerHTML = `<span>Lap ${lapNum}</span><span style="color:var(--text-muted);">${formatTime(diff)}</span><span>${formatTime(swTime)}</span>`;
        lapsDiv.insertBefore(div, lapsDiv.firstChild);
    };

    document.getElementById('stopwatch-reset').onclick = () => {
        clearInterval(swInterval);
        swInterval = null;
        swTime = 0;
        swLaps = [];
        updateStopwatchDisplay();
        document.getElementById('stopwatch-start').textContent = 'Start';
        document.getElementById('stopwatch-lap').disabled = true;
        document.getElementById('stopwatch-laps').innerHTML = '';
    };

    // EXPENSE TRACKER
    let expenses = [];

    async function loadExpenses() {
        try {
            var saved = await window.db.getItem('expenses');
            if (saved) { expenses = JSON.parse(saved); }
            else { try { var ls = localStorage.getItem('expenses'); if (ls) { expenses = JSON.parse(ls); localStorage.removeItem('expenses'); } } catch(_) {} }
        } catch (e) {}
        renderExpenses();
    }

    async function saveExpenses() {
        try { await window.db.setItem('expenses', JSON.stringify(expenses)); } catch (e) { try { localStorage.setItem('expenses', JSON.stringify(expenses)); } catch(_) {} }
    }

    function renderExpenses() {
        const list = document.getElementById('expense-list');
        if (!list) return;
        list.innerHTML = '';
        let income = 0, expense = 0;
        expenses.forEach((e, i) => {
            if (e.type === 'income') income += e.amount;
            else expense += e.amount;
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-subtle);';

            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            const descDiv = document.createElement('div');
            descDiv.style.fontWeight = '500';
            descDiv.textContent = e.desc;
            infoDiv.appendChild(descDiv);
            const dateDiv = document.createElement('div');
            dateDiv.style.cssText = 'font-size:0.8rem;color:var(--text-muted);';
            dateDiv.textContent = e.date;
            infoDiv.appendChild(dateDiv);

            const amountDiv = document.createElement('div');
            amountDiv.style.cssText = `font-weight:600;color:${e.type === 'income' ? '#22c55e' : '#ef4444'};`;
            amountDiv.textContent = `${e.type === 'income' ? '+' : '-'}$${e.amount.toFixed(2)}`;

            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'color:var(--text-muted);background:none;border:none;cursor:pointer;padding:4px;';
            delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            delBtn.addEventListener('click', () => deleteExpense(i));

            div.appendChild(infoDiv);
            div.appendChild(amountDiv);
            div.appendChild(delBtn);
            list.appendChild(div);
        });
        document.getElementById('expense-income').textContent = '$' + income.toFixed(2);
        document.getElementById('expense-total').textContent = '$' + expense.toFixed(2);
        document.getElementById('expense-balance').textContent = '$' + (income - expense).toFixed(2);
    }

    window.deleteExpense = function(i) {
        expenses.splice(i, 1);
        saveExpenses();
        renderExpenses();
    };

    document.getElementById('expense-add').onclick = () => {
        const desc = document.getElementById('expense-desc').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const type = document.getElementById('expense-type').value;
        if (!desc || isNaN(amount) || amount <= 0) return;
        expenses.unshift({ desc, amount, type, date: new Date().toLocaleDateString() });
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
        saveExpenses();
        renderExpenses();
    };

    loadExpenses();

    // LOREM IPSUM GENERATOR
    const loremParagraphs = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
        "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
        "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae.",
        "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
        "Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio.",
        "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.",
        "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam.",
        "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. Ut enim ad minima veniam, quis nostrum.",
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
        "Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit."
    ];

    document.getElementById('lorem-generate').onclick = () => {
        const count = parseInt(document.getElementById('lorem-count').value) || 3;
        let result = [];
        for (let i = 0; i < count; i++) {
            result.push(loremParagraphs[i % loremParagraphs.length]);
        }
        document.getElementById('lorem-output').textContent = result.join('\n\n');
    };

    document.getElementById('lorem-copy').onclick = () => {
        const text = document.getElementById('lorem-output').textContent;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => showToast('Copied', 'success'));
    };

    // COLOR PALETTE GENERATOR
    function generatePalette() {
        const palette = document.getElementById('colors-palette');
        const codes = document.getElementById('colors-codes');
        palette.innerHTML = '';
        codes.innerHTML = '';

        const baseHue = Math.floor(Math.random() * 360);
        const colors = [];
        for (let i = 0; i < 5; i++) {
            const h = (baseHue + i * 30 + Math.floor(Math.random() * 15)) % 360;
            const s = 50 + Math.floor(Math.random() * 30);
            const l = 35 + Math.floor(Math.random() * 35);
            colors.push({ h, s, l, hex: hslToHex(h, s, l) });
        }

        colors.forEach(c => {
            const swatch = document.createElement('div');
            swatch.style.cssText = 'width:100px;height:100px;border-radius:12px;cursor:pointer;transition:transform 0.2s;background:' + c.hex + ';';
            swatch.onmouseenter = () => swatch.style.transform = 'scale(1.1)';
            swatch.onmouseleave = () => swatch.style.transform = '';
            swatch.onclick = () => {
                navigator.clipboard.writeText(c.hex).then(() => showToast('Copied ' + c.hex, 'success'));
            };
            palette.appendChild(swatch);

            const code = document.createElement('div');
            code.style.cssText = 'padding:6px 12px;background:var(--bg-card);border-radius:6px;font-family:monospace;font-size:0.85rem;cursor:pointer;border:1px solid var(--border-subtle);';
            code.textContent = c.hex;
            code.onclick = () => navigator.clipboard.writeText(c.hex).then(() => showToast('Copied ' + c.hex, 'success'));
            codes.appendChild(code);
        });
    }

    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    document.getElementById('colors-generate').onclick = generatePalette;
    generatePalette();

    // TIP CALCULATOR
    function calculateTip() {
        const bill = parseFloat(document.getElementById('tip-bill').value) || 0;
        const percent = parseInt(document.getElementById('tip-percent').value);
        const split = parseInt(document.getElementById('tip-split').value) || 1;

        const tipAmount = bill * (percent / 100);
        const total = bill + tipAmount;
        const perPerson = total / split;

        document.getElementById('tip-amount').textContent = '$' + tipAmount.toFixed(2);
        document.getElementById('tip-total').textContent = '$' + total.toFixed(2);
        document.getElementById('tip-per-person').textContent = '$' + perPerson.toFixed(2);
        document.getElementById('tip-percent-val').textContent = percent + '%';
    }

    document.getElementById('tip-bill').addEventListener('input', calculateTip);
    document.getElementById('tip-percent').addEventListener('input', calculateTip);
    document.getElementById('tip-split').addEventListener('input', calculateTip);

    calculateTip();

})();