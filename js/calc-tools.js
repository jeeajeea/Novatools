(function() {
    'use strict';

    // ============ UTILITY FUNCTIONS ============
    function showResult(el) {
        if (el) {
            el.style.display = 'block';
            el.classList.add('fade-in');
        }
    }

    window.copyToClipboard = function(text, successMsg) {
        navigator.clipboard.writeText(text).then(function() {
            if (window.showToast) window.showToast(successMsg || 'Copied!', 'success');
        }).catch(function() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (window.showToast) window.showToast(successMsg || 'Copied!', 'success');
        });
    };

    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

    document.addEventListener('DOMContentLoaded', function() {

    // ============ PERCENTAGE CALCULATOR ============
    var pctModeBtns = document.querySelectorAll('.pct-mode');
    if (pctModeBtns.length > 0) {
        pctModeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                pctModeBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var mode = btn.dataset.mode;
                document.querySelectorAll('.pct-input-area').forEach(function(area) {
                    area.style.display = 'none';
                });
                var targetArea = document.getElementById('pct-area-' + mode);
                if (targetArea) targetArea.style.display = 'block';
            });
        });
    }

    var pct1a = document.getElementById('pct1-a');
    var pct1b = document.getElementById('pct1-b');
    var pct1Result = document.getElementById('pct1-result');
    if (pct1a && pct1b && pct1Result) {
        pct1a.addEventListener('input', function() {
            var a = parseFloat(pct1a.value) || 0;
            var b = parseFloat(pct1b.value) || 0;
            var result = (a / 100) * b;
            pct1Result.textContent = result % 1 === 0 ? result : result.toFixed(2);
        });
        pct1b.addEventListener('input', function() {
            var a = parseFloat(pct1a.value) || 0;
            var b = parseFloat(pct1b.value) || 0;
            var result = (a / 100) * b;
            pct1Result.textContent = result % 1 === 0 ? result : result.toFixed(2);
        });
    }

    var pct2a = document.getElementById('pct2-a');
    var pct2b = document.getElementById('pct2-b');
    var pct2Result = document.getElementById('pct2-result');
    if (pct2a && pct2b && pct2Result) {
        pct2a.addEventListener('input', function() {
            var a = parseFloat(pct2a.value) || 0;
            var b = parseFloat(pct2b.value) || 0;
            var result = b ? ((a / b) * 100).toFixed(2) : '0';
            pct2Result.textContent = result + '%';
        });
        pct2b.addEventListener('input', function() {
            var a = parseFloat(pct2a.value) || 0;
            var b = parseFloat(pct2b.value) || 0;
            var result = b ? ((a / b) * 100).toFixed(2) : '0';
            pct2Result.textContent = result + '%';
        });
    }

    var pct3a = document.getElementById('pct3-a');
    var pct3b = document.getElementById('pct3-b');
    var pct3Result = document.getElementById('pct3-result');
    if (pct3a && pct3b && pct3Result) {
        pct3a.addEventListener('input', function() {
            var a = parseFloat(pct3a.value) || 0;
            var b = parseFloat(pct3b.value) || 0;
            var result, color;
            if (!a || a === 0) {
                result = '0%';
                color = 'var(--text-primary)';
            } else {
                var change = ((b - a) / a) * 100;
                result = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                color = change >= 0 ? 'var(--accent-success)' : 'var(--accent-error)';
            }
            pct3Result.textContent = result;
            pct3Result.style.color = color;
        });
        pct3b.addEventListener('input', function() {
            var a = parseFloat(pct3a.value) || 0;
            var b = parseFloat(pct3b.value) || 0;
            var result, color;
            if (!a || a === 0) {
                result = '0%';
                color = 'var(--text-primary)';
            } else {
                var change = ((b - a) / a) * 100;
                result = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                color = change >= 0 ? 'var(--accent-success)' : 'var(--accent-error)';
            }
            pct3Result.textContent = result;
            pct3Result.style.color = color;
        });
    }

    // ============ AGE CALCULATOR ============
    var ageBtn = document.getElementById('age-btn');
    if (ageBtn) {
        ageBtn.addEventListener('click', function() {
            var birthDate = document.getElementById('age-input').value;
            if (!birthDate) {
                if (window.showToast) window.showToast('Please select your birth date', 'error');
                return;
            }
            
            var birth = new Date(birthDate);
            var today = new Date();
            
            if (birth > today) {
                if (window.showToast) window.showToast('Birth date cannot be in the future', 'error');
                return;
            }
            
            var years = today.getFullYear() - birth.getFullYear();
            var months = today.getMonth() - birth.getMonth();
            var days = today.getDate() - birth.getDate();
            
            if (days < 0) {
                months--;
                var prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                days += prevMonth.getDate();
            }
            
            if (months < 0) {
                years--;
                months += 12;
            }
            
            var totalDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
            
            var nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
            if (nextBirthday < today) {
                nextBirthday.setFullYear(today.getFullYear() + 1);
            }
            var daysToBirthday = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            
            var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            var yearsEl = document.getElementById('age-years');
            var monthsEl = document.getElementById('age-months');
            var daysEl = document.getElementById('age-days');
            var totalEl = document.getElementById('age-total');
            var bornDayEl = document.getElementById('age-born-day');
            var nextEl = document.getElementById('age-next');
            var resultEl = document.getElementById('age-result');
            
            if (yearsEl) yearsEl.textContent = years;
            if (monthsEl) monthsEl.textContent = months;
            if (daysEl) daysEl.textContent = days;
            if (totalEl) totalEl.textContent = totalDays;
            if (bornDayEl) bornDayEl.textContent = dayNames[birth.getDay()];
            if (nextEl) nextEl.textContent = daysToBirthday;
            if (resultEl) resultEl.style.display = 'block';
        });
    }

    // ============ BMI CALCULATOR ============
    var bmiUnitBtns = document.querySelectorAll('.bmi-unit');
    if (bmiUnitBtns.length > 0) {
        bmiUnitBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                bmiUnitBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var unit = btn.dataset.unit;
                var metricDiv = document.getElementById('bmi-metric');
                var imperialDiv = document.getElementById('bmi-imperial');
                if (metricDiv) metricDiv.style.display = unit === 'metric' ? 'block' : 'none';
                if (imperialDiv) imperialDiv.style.display = unit === 'imperial' ? 'block' : 'none';
            });
        });
    }

    var bmiBtn = document.getElementById('bmi-btn');
    if (bmiBtn) {
        bmiBtn.addEventListener('click', function() {
            var btn = this;
            btn.textContent = 'Calculating...';
            btn.disabled = true;
            var isMetric = document.querySelector('.bmi-unit.active');
            if (!isMetric) return;
            
            var height, weight, bmi;
            
            if (isMetric.dataset.unit === 'metric') {
                height = parseFloat(document.getElementById('bmi-height-cm').value);
                weight = parseFloat(document.getElementById('bmi-weight-kg').value);
                if (!height || !weight) {
                    if (window.showToast) window.showToast('Enter valid height and weight', 'error');
                    btn.textContent = 'Calculate BMI';
                    btn.disabled = false;
                    return;
                }
                bmi = weight / ((height / 100) * (height / 100));
            } else {
                var ft = parseFloat(document.getElementById('bmi-height-ft').value) || 0;
                var inches = parseFloat(document.getElementById('bmi-height-in').value) || 0;
                var lbs = parseFloat(document.getElementById('bmi-weight-lbs').value);
                height = (ft * 12 + inches) * 2.54;
                weight = lbs * 0.453592;
                if (!height || !weight) {
                    if (window.showToast) window.showToast('Enter valid height and weight', 'error');
                    btn.textContent = 'Calculate BMI';
                    btn.disabled = false;
                    return;
                }
                bmi = weight / ((height / 100) * (height / 100));
            }
            
            var category, color;
            if (bmi < 18.5) { category = 'Underweight'; color = '#3b82f6'; }
            else if (bmi < 25) { category = 'Normal'; color = '#16a34a'; }
            else if (bmi < 30) { category = 'Overweight'; color = '#eab308'; }
            else { category = 'Obese'; color = '#dc2626'; }
            
            var bmiValueEl = document.getElementById('bmi-value');
            var bmiCategoryEl = document.getElementById('bmi-category');
            var bmiMarkerEl = document.getElementById('bmi-marker');
            var bmiResultEl = document.getElementById('bmi-result');
            
            if (bmiValueEl) { bmiValueEl.textContent = bmi.toFixed(1); bmiValueEl.style.color = color; }
            if (bmiCategoryEl) { bmiCategoryEl.textContent = category; bmiCategoryEl.style.color = color; }
            if (bmiMarkerEl) { bmiMarkerEl.style.left = Math.min(Math.max((bmi - 15) / (35 - 15) * 100, 0), 100) + '%'; }
            if (bmiResultEl) showResult(bmiResultEl);
            btn.textContent = 'Calculate BMI';
            btn.disabled = false;
        });
    }

    // ============ COMPOUND INTEREST CALCULATOR ============
    var intBtn = document.getElementById('int-btn');
    if (intBtn) {
        intBtn.addEventListener('click', function() {
            var principal = parseFloat(document.getElementById('int-principal').value) || 0;
            var rate = parseFloat(document.getElementById('int-rate').value) || 0;
            var years = parseInt(document.getElementById('int-years').value) || 0;
            var frequency = parseInt(document.getElementById('int-frequency').value) || 4;
            
            if (principal <= 0 || rate <= 0 || years <= 0) {
                if (window.showToast) window.showToast('Enter valid values', 'error');
                return;
            }
            
            var r = rate / 100;
            var n = frequency;
            var total = principal * Math.pow(1 + r / n, n * years);
            var interest = total - principal;
            
            var intTotalEl = document.getElementById('int-total');
            var intInterestEl = document.getElementById('int-interest');
            var intBreakdownEl = document.getElementById('int-breakdown');
            var intResultEl = document.getElementById('int-result');
            
            if (intTotalEl) intTotalEl.textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (intInterestEl) intInterestEl.textContent = '$' + interest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            if (intBreakdownEl) {
                intBreakdownEl.innerHTML = '';
                for (var y = 1; y <= years; y++) {
                    var balance = principal * Math.pow(1 + r / n, n * y);
                    var yrInterest = balance - principal * Math.pow(1 + r / n, n * (y - 1));
                    var row = document.createElement('tr');
                    var cell1 = document.createElement('td');
                    cell1.style.padding = '8px';
                    cell1.textContent = y;
                    var cell2 = document.createElement('td');
                    cell2.style.textAlign = 'right';
                    cell2.style.padding = '8px';
                    cell2.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    var cell3 = document.createElement('td');
                    cell3.style.textAlign = 'right';
                    cell3.style.padding = '8px';
                    cell3.textContent = '$' + yrInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    row.appendChild(cell1);
                    row.appendChild(cell2);
                    row.appendChild(cell3);
                    intBreakdownEl.appendChild(row);
                }
            }
            
            if (intResultEl) intResultEl.style.display = 'block';
        });
    }

    // ============ GPA CALCULATOR ============
    var gpaCourses = [];
    var MAX_GPA_COURSES = 50;

    async function loadGpaCourses() {
        try {
            var saved = await window.db.getItem('gpaCourses');
            if (saved) gpaCourses = JSON.parse(saved);
        } catch (e) {
            try { var ls = localStorage.getItem('gpaCourses'); if (ls) gpaCourses = JSON.parse(ls); } catch (_) {}
        }
        renderGpaList();
        calculateGpa();
    }

    async function saveGpaCourses() {
        try {
            await window.db.setItem('gpaCourses', JSON.stringify(gpaCourses));
        } catch (e) {
            try { localStorage.setItem('gpaCourses', JSON.stringify(gpaCourses)); } catch (_) {}
        }
    }

    function renderGpaList() {
        var list = document.getElementById('gpa-list');
        if (!list) return;
        list.innerHTML = '';
        if (gpaCourses.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 24px;">No courses added yet. Add your first course above!</div>';
            return;
        }
        gpaCourses.forEach(function(c, i) {
            var item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 10px;';

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = c.name || '';
            nameInput.placeholder = 'Subject name';
            nameInput.style.cssText = 'border: none; background: transparent; width: 100%; padding: 0; flex: 2; min-width: 120px;';
            nameInput.addEventListener('change', function() { updateGpaCourse(i, 'name', this.value); });

            var creditsInput = document.createElement('input');
            creditsInput.type = 'number';
            creditsInput.value = c.credits || 3;
            creditsInput.style.cssText = 'width: 70px; text-align: center; padding: 8px;';
            creditsInput.min = '1';
            creditsInput.max = '10';
            creditsInput.addEventListener('change', function() { updateGpaCourse(i, 'credits', this.value); });

            var gradeSelect = document.createElement('select');
            gradeSelect.style.cssText = 'width: 90px; padding: 8px;';
            var gradeOptions = [
                { value: '4.0', label: 'A' },
                { value: '3.7', label: 'A-' },
                { value: '3.3', label: 'B+' },
                { value: '3.0', label: 'B' },
                { value: '2.7', label: 'B-' },
                { value: '2.3', label: 'C+' },
                { value: '2.0', label: 'C' },
                { value: '1.7', label: 'C-' },
                { value: '1.3', label: 'D+' },
                { value: '1.0', label: 'D' },
                { value: '0.0', label: 'F' }
            ];
            gradeOptions.forEach(function(g) {
                var opt = document.createElement('option');
                opt.value = g.value;
                opt.textContent = g.label;
                if (String(c.grade) === g.value) opt.selected = true;
                gradeSelect.appendChild(opt);
            });
            gradeSelect.addEventListener('change', function() { updateGpaCourse(i, 'grade', this.value); });

            var removeBtn = document.createElement('button');
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = 'background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; font-size: 1.25rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px;';
            removeBtn.addEventListener('click', function() { removeGpaCourse(i); });

            item.appendChild(nameInput);
            item.appendChild(creditsInput);
            item.appendChild(gradeSelect);
            item.appendChild(removeBtn);
            list.appendChild(item);
        });
    }

    function updateGpaCourse(index, field, value) {
        if (gpaCourses[index]) {
            gpaCourses[index][field] = field === 'credits' || field === 'grade' ? parseFloat(value) : value;
            calculateGpa();
            saveGpaCourses();
        }
    }

    function removeGpaCourse(index) {
        gpaCourses.splice(index, 1);
        calculateGpa();
        renderGpaList();
        saveGpaCourses();
    }

    function calculateGpa() {
        var display = document.getElementById('gpa-display');
        if (!display) return;
        if (gpaCourses.length === 0) {
            display.textContent = '0.00';
            return;
        }
        var totalPoints = 0;
        var totalCredits = 0;
        gpaCourses.forEach(function(c) {
            var grade = parseFloat(c.grade) || 0;
            var credits = parseInt(c.credits) || 3;
            totalPoints += grade * credits;
            totalCredits += credits;
        });
        display.textContent = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    }

    var gpaAddBtn = document.getElementById('gpa-add-btn');
    if (gpaAddBtn) gpaAddBtn.addEventListener('click', function() {
        var courseInput = document.getElementById('gpa-course');
        var creditsInput = document.getElementById('gpa-credits');
        var gradeSelect = document.getElementById('gpa-grade');
        var course = courseInput ? courseInput.value.trim() : '';
        var credits = creditsInput ? (parseInt(creditsInput.value) || 3) : 3;
        var grade = gradeSelect ? parseFloat(gradeSelect.value) : 4.0;
        
        if (gpaCourses.length >= MAX_GPA_COURSES) {
            if (window.showToast) window.showToast('Maximum ' + MAX_GPA_COURSES + ' courses allowed', 'error');
            return;
        }
        
        gpaCourses.push({ name: course, credits: credits, grade: grade });
        if (courseInput) courseInput.value = '';
        renderGpaList();
        calculateGpa();
        saveGpaCourses();
    });

    var gpaClearBtn = document.getElementById('gpa-clear');
    if (gpaClearBtn) gpaClearBtn.addEventListener('click', function() {
        gpaCourses = [];
        renderGpaList();
        calculateGpa();
        saveGpaCourses();
    });

    var gpaSaveBtn = document.getElementById('gpa-save');
    if (gpaSaveBtn) gpaSaveBtn.addEventListener('click', function() {
        saveGpaCourses();
        if (window.showToast) window.showToast('GPA saved!', 'success');
    });

    loadGpaCourses();

    // ============ LOAN CALCULATOR ============
    var loanBtn = document.getElementById('loan-btn');
    if (loanBtn) {
        loanBtn.addEventListener('click', function() {
            var principal = parseFloat(document.getElementById('loan-amount').value) || 0;
            var down = parseFloat(document.getElementById('loan-down').value) || 0;
            var rate = parseFloat(document.getElementById('loan-rate').value) || 0;
            var years = parseFloat(document.getElementById('loan-term').value) || 0;
            
            var loanAmount = principal - down;
            var monthlyRate = rate / 100 / 12;
            var numPayments = years * 12;
            
            if (loanAmount <= 0 || monthlyRate <= 0 || numPayments <= 0) {
                if (window.showToast) window.showToast('Enter valid loan details', 'error');
                return;
            }
            
            var monthly = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments) / (Math.pow(1 + monthlyRate, numPayments) - 1);
            var totalPaid = monthly * numPayments;
            var totalInterest = totalPaid - loanAmount;
            
            var loanMonthlyEl = document.getElementById('loan-monthly');
            var loanTotalEl = document.getElementById('loan-total');
            var loanInterestEl = document.getElementById('loan-interest');
            var loanResultEl = document.getElementById('loan-result');
            
            if (loanMonthlyEl) loanMonthlyEl.textContent = '$' + monthly.toFixed(2);
            if (loanTotalEl) loanTotalEl.textContent = '$' + totalPaid.toFixed(2);
            if (loanInterestEl) loanInterestEl.textContent = '$' + totalInterest.toFixed(2);
            if (loanResultEl) loanResultEl.style.display = 'block';
        });
    }

    // ============ TIP CALCULATOR ============
    var tipPresetBtns = document.querySelectorAll('.tip-preset');
    if (tipPresetBtns.length > 0) {
        tipPresetBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.getElementById('tip-percent').value = this.dataset.tip;
            });
        });
    }

    var tipBtn = document.getElementById('tip-btn');
    if (tipBtn) {
        tipBtn.addEventListener('click', function() {
            var amount = parseFloat(document.getElementById('tip-amount').value) || 0;
            var percent = parseFloat(document.getElementById('tip-percent').value) || 0;
            var people = parseInt(document.getElementById('tip-people').value) || 1;
            
            if (amount <= 0) {
                if (window.showToast) window.showToast('Enter bill amount', 'error');
                return;
            }
            
            var tipAmount = amount * percent / 100;
            var total = amount + tipAmount;
            var perPerson = total / people;
            
            var tipTipAmountEl = document.getElementById('tip-tip-amount');
            var tipTotalEl = document.getElementById('tip-total');
            var tipPerPersonEl = document.getElementById('tip-per-person');
            var tipResultEl = document.getElementById('tip-result');
            
            if (tipTipAmountEl) tipTipAmountEl.textContent = '$' + tipAmount.toFixed(2);
            if (tipTotalEl) tipTotalEl.textContent = '$' + total.toFixed(2);
            if (tipPerPersonEl) tipPerPersonEl.textContent = '$' + perPerson.toFixed(2);
            if (tipResultEl) tipResultEl.style.display = 'block';
        });
    }

    // ============ PASSWORD GENERATOR ============
    var passLength = document.getElementById('pass-length');
    if (passLength) {
        passLength.addEventListener('input', function() {
            var lengthVal = document.getElementById('pass-length-val');
            if (lengthVal) lengthVal.textContent = this.value;
        });
    }

    var passBtn = document.getElementById('pass-btn');
    if (passBtn) {
        passBtn.addEventListener('click', function() {
            var length = parseInt(document.getElementById('pass-length').value) || 16;
            var upper = document.getElementById('pass-upper').checked;
            var lower = document.getElementById('pass-lower').checked;
            var nums = document.getElementById('pass-nums').checked;
            var syms = document.getElementById('pass-syms').checked;
            
            var chars = '';
            if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (nums) chars += '0123456789';
            if (syms) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            if (!chars) {
                if (window.showToast) window.showToast('Select at least one character type', 'error');
                return;
            }
            
            var password = '';
            for (var i = 0; i < length; i++) {
                var randomBytes = new Uint32Array(1);
                crypto.getRandomValues(randomBytes);
                password += chars.charAt(randomBytes[0] % chars.length);
            }
            
            var strength = 'weak';
            var strengthColor = 'var(--accent-error)';
            var symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            var charsetSize = (upper ? 26 : 0) + (lower ? 26 : 0) + (nums ? 10 : 0) + (syms ? symbolChars.length : 0);
            var entropy = length * Math.log2(charsetSize || 1);
            if (entropy >= 60 && length >= 14) { strength = 'strong'; strengthColor = 'var(--accent-success)'; }
            else if (entropy >= 40 && length >= 10) { strength = 'medium'; strengthColor = 'var(--accent-warning)'; }
            
            var passOutputEl = document.getElementById('pass-output');
            var passResultEl = document.getElementById('pass-result');
            var passStrengthEl = document.getElementById('pass-strength');
            if (passOutputEl) passOutputEl.textContent = password;
            if (passResultEl) { passResultEl.style.display = 'block'; passResultEl.classList.add('fade-in'); }
            if (passStrengthEl) { passStrengthEl.textContent = 'Strength: ' + strength; passStrengthEl.style.color = strengthColor; }
        });
    }

    // ============ DATE DURATION CALCULATOR ============
    var dateBtn = document.getElementById('date-btn');
    if (dateBtn) {
        dateBtn.addEventListener('click', function() {
            var start = new Date(document.getElementById('date-start').value);
            var end = new Date(document.getElementById('date-end').value);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                if (window.showToast) window.showToast('Select both dates', 'error');
                return;
            }
            
            var diffTime = end - start;
            var days = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
            var weeks = (days / 7).toFixed(1);
            var months = (days / 30.44).toFixed(1);
            var direction = diffTime >= 0 ? 'after' : 'before';
            
            var dateDaysEl = document.getElementById('date-days');
            var dateWeeksEl = document.getElementById('date-weeks');
            var dateMonthsEl = document.getElementById('date-months');
            var dateResultEl = document.getElementById('date-result');
            
            if (dateDaysEl) dateDaysEl.textContent = days;
            if (dateWeeksEl) dateWeeksEl.textContent = weeks + (direction === 'before' ? ' (before)' : '');
            if (dateMonthsEl) dateMonthsEl.textContent = months + (direction === 'before' ? ' (before)' : '');
            if (dateResultEl) dateResultEl.style.display = 'block';
        });
    }

    // ============ SPEED CALCULATOR ============
    var speedCalc = document.getElementById('speed-calc');
    var speedDistLabel = document.querySelector('label[for="speed-dist"]');
    var speedDistInput = document.getElementById('speed-dist');
    var speedTimeLabel = document.querySelector('#speed-inputs > div:first-child > label');
    var speedTimeInput = document.getElementById('speed-time');
    
    function updateSpeedLabels() {
        var calc = document.getElementById('speed-calc').value;
        var labels = {
            speed: { dist: 'Distance', time: 'Time (hours)', unitLabel: 'Unit' },
            distance: { dist: 'Speed', time: 'Time (hours)', unitLabel: 'Unit' },
            time: { dist: 'Distance', time: 'Time', unitLabel: 'Unit' }
        };
        var l = labels[calc] || labels.speed;
        var distParent = speedDistInput ? speedDistInput.closest('div') : null;
        var timeParent = speedTimeInput ? speedTimeInput.closest('div') : null;
        if (distParent && distParent.querySelector('label')) distParent.querySelector('label').textContent = l.dist;
        if (timeParent && timeParent.querySelector('label')) timeParent.querySelector('label').textContent = l.time;
        var unitLabelEl = document.querySelector('#speed-inputs + div label');
        if (unitLabelEl) unitLabelEl.textContent = l.unitLabel;
    }
    
    if (speedCalc) speedCalc.addEventListener('change', updateSpeedLabels);
    
    var speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
        speedBtn.addEventListener('click', function() {
            var btn = this;
            btn.textContent = 'Calculating...';
            btn.disabled = true;
            
            var calc = document.getElementById('speed-calc').value;
            var dist = parseFloat(document.getElementById('speed-dist').value) || 0;
            var time = parseFloat(document.getElementById('speed-time').value) || 0;
            var unit = document.getElementById('speed-unit').value;
            
            var result = 0;
            var unitText = '';
            
            if (calc === 'speed') {
                if (time <= 0) { if (window.showToast) window.showToast('Enter time', 'error'); btn.textContent = 'Calculate'; btn.disabled = false; return; }
                result = dist / time;
                unitText = unit;
            } else if (calc === 'distance') {
                if (time <= 0) { if (window.showToast) window.showToast('Enter time', 'error'); btn.textContent = 'Calculate'; btn.disabled = false; return; }
                var speedKmh = dist;
                if (unit === 'mph') speedKmh = dist * 1.60934;
                else if (unit === 'ms') speedKmh = dist * 3.6;
                else if (unit === 'knots') speedKmh = dist * 1.852;
                result = speedKmh * time;
                unitText = 'km';
            } else {
                if (dist <= 0) { if (window.showToast) window.showToast('Enter speed', 'error'); btn.textContent = 'Calculate'; btn.disabled = false; return; }
                var speedKmh = dist;
                if (unit === 'mph') speedKmh = dist * 1.60934;
                else if (unit === 'ms') speedKmh = dist * 3.6;
                else if (unit === 'knots') speedKmh = dist * 1.852;
                result = dist / speedKmh;
                unitText = 'hours';
            }
            
            var speedAnswerEl = document.getElementById('speed-answer');
            var speedAnswerUnitEl = document.getElementById('speed-answer-unit');
            var speedResultEl = document.getElementById('speed-result');
            
            if (speedAnswerEl) speedAnswerEl.textContent = result.toFixed(2);
            if (speedAnswerUnitEl) speedAnswerUnitEl.textContent = unitText;
            if (speedResultEl) showResult(speedResultEl);
            btn.textContent = 'Calculate';
            btn.disabled = false;
        });
    }

    // ============ SUBNET CALCULATOR ============
    var subnetBtn = document.getElementById('subnet-btn');
    if (subnetBtn) {
        subnetBtn.addEventListener('click', function() {
            var ip = document.getElementById('subnet-ip').value;
            var mask = document.getElementById('subnet-mask').value;
            
            var ipParts = ip.split('.').map(Number);
            if (ipParts.length !== 4 || ipParts.some(function(p) { return isNaN(p) || p < 0 || p > 255; })) {
                if (window.showToast) window.showToast('Enter a valid IPv4 address', 'error');
                return;
            }
            
            var cidr;
            if (mask.startsWith('/')) {
                cidr = parseInt(mask.slice(1));
            } else if (mask.includes('.')) {
                var parts = mask.split('.').map(Number);
                cidr = parts.reduce(function(acc, octet) { return acc + (octet >>> 0).toString(2).replace(/0/g, '').length; }, 0);
            } else {
                cidr = parseInt(mask) || 24;
            }
            
            if (cidr < 0 || cidr > 32) { if (window.showToast) window.showToast('Enter valid CIDR (0-32)', 'error'); return; }
            
            var ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
            var maskNum = ~((1 << (32 - cidr)) - 1);
            var networkNum = ipNum & maskNum;
            var broadcastNum = networkNum | ~maskNum;
            var firstIp = networkNum + 1;
            var lastIp = broadcastNum - 1;
            var hosts;
            if (cidr === 32) {
                hosts = 1;
            } else if (cidr === 31) {
                hosts = 2;
            } else {
                hosts = Math.pow(2, 32 - cidr) - 2;
            }
            if (hosts < 0) hosts = 0;
            
            function numToIp(n) {
                return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
            }
            
            var subnetNetworkEl = document.getElementById('subnet-network');
            var subnetBroadcastEl = document.getElementById('subnet-broadcast');
            var subnetFirstEl = document.getElementById('subnet-first');
            var subnetLastEl = document.getElementById('subnet-last');
            var subnetHostsEl = document.getElementById('subnet-hosts');
            var subnetCidrEl = document.getElementById('subnet-cidr');
            var subnetResultEl = document.getElementById('subnet-result');
            
            if (subnetNetworkEl) subnetNetworkEl.textContent = numToIp(networkNum) + '/' + cidr;
            if (subnetBroadcastEl) subnetBroadcastEl.textContent = numToIp(broadcastNum);
            if (subnetFirstEl) subnetFirstEl.textContent = numToIp(firstIp);
            if (subnetLastEl) subnetLastEl.textContent = numToIp(lastIp);
            if (subnetHostsEl) subnetHostsEl.textContent = hosts > 0 ? hosts.toLocaleString() : '0';
            if (subnetCidrEl) subnetCidrEl.textContent = '/' + cidr;
            if (subnetResultEl) { subnetResultEl.style.display = 'block'; subnetResultEl.classList.add('fade-in'); }
        });
    }

    // ============ INFLATION CALCULATOR ============
    var infBtn = document.getElementById('inf-btn');
    if (infBtn) {
        infBtn.addEventListener('click', function() {
            var amount = parseFloat(document.getElementById('inf-amount').value) || 0;
            var rate = parseFloat(document.getElementById('inf-rate').value) || 0;
            var years = parseInt(document.getElementById('inf-years').value) || 0;
            
            if (amount <= 0 || rate < 0 || years <= 0) {
                if (window.showToast) window.showToast('Enter valid values', 'error');
                return;
            }
            
            var r = rate / 100;
            var futureValue = amount * Math.pow(1 + r, years);
            var loss = futureValue - amount;
            
            var infFutureEl = document.getElementById('inf-future');
            var infLossEl = document.getElementById('inf-loss');
            var infResultEl = document.getElementById('inf-result');
            
            if (infFutureEl) infFutureEl.textContent = '$' + futureValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (infLossEl) infLossEl.textContent = '$' + loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (infResultEl) infResultEl.style.display = 'block';
        });
    }

    // ============ UNIT CONVERTER ============
    var convUnits = {
        length: { 'Meter': 1, 'Kilometer': 1000, 'Centimeter': 0.01, 'Millimeter': 0.001, 'Mile': 1609.344, 'Yard': 0.9144, 'Foot': 0.3048, 'Inch': 0.0254 },
        weight: { 'Kilogram': 1, 'Gram': 0.001, 'Milligram': 0.000001, 'Pound': 0.453592, 'Ounce': 0.0283495, 'Ton': 1000 },
        area: { 'Square Meter': 1, 'Square Kilometer': 1000000, 'Hectare': 10000, 'Acre': 4046.8564224, 'Square Foot': 0.092903, 'Square Mile': 2589988.110336 },
        volume: { 'Liter': 1, 'Milliliter': 0.001, 'Gallon': 3.78541, 'Cup': 0.236588, 'Fluid Ounce': 0.0295735 },
        time: { 'Second': 1, 'Minute': 60, 'Hour': 3600, 'Day': 86400, 'Week': 604800, 'Month': 2592000, 'Year': 31536000 },
        speed: { 'm/s': 1, 'kmh': 0.277778, 'km/h': 0.277778, 'mph': 0.44704, 'knots': 0.514444 }
    };

    var convCategory = document.getElementById('conv-category');
    var convFrom = document.getElementById('conv-from');
    var convTo = document.getElementById('conv-to');

    if (convCategory && convFrom && convTo) {
        function updateConvOptions() {
            var category = convCategory.value;
            var units = {
                length: ['Meter', 'Kilometer', 'Centimeter', 'Millimeter', 'Mile', 'Yard', 'Foot', 'Inch'],
                weight: ['Kilogram', 'Gram', 'Milligram', 'Pound', 'Ounce', 'Ton'],
                temperature: ['Celsius', 'Fahrenheit', 'Kelvin'],
                area: ['Square Meter', 'Square Kilometer', 'Hectare', 'Acre', 'Square Foot', 'Square Mile'],
                volume: ['Liter', 'Milliliter', 'Gallon', 'Cup', 'Fluid Ounce'],
                time: ['Second', 'Minute', 'Hour', 'Day', 'Week', 'Month', 'Year'],
                speed: ['m/s', 'km/h', 'mph', 'knots']
            };
            
            convFrom.textContent = '';
            convTo.textContent = '';
            
            (units[category] || []).forEach(function(unit) {
                var opt1 = document.createElement('option');
                opt1.value = unit;
                opt1.textContent = unit;
                convFrom.appendChild(opt1);
                var opt2 = document.createElement('option');
                opt2.value = unit;
                opt2.textContent = unit;
                convTo.appendChild(opt2);
            });
            
            convTo.selectedIndex = 1;
        }

        function convertTemp(value, from, to) {
            if (from === to) return value;
            var celsius;
            if (from === 'Celsius') celsius = value;
            else if (from === 'Fahrenheit') celsius = (value - 32) * 5 / 9;
            else celsius = value - 273.15;
            
            if (to === 'Celsius') return celsius;
            if (to === 'Fahrenheit') return celsius * 9 / 5 + 32;
            return celsius + 273.15;
        }

        convCategory.addEventListener('change', updateConvOptions);

        var convBtn = document.getElementById('conv-btn');
        if (convBtn) {
            convBtn.addEventListener('click', function() {
                var value = parseFloat(document.getElementById('conv-value').value);
                var from = convFrom.value;
                var to = convTo.value;
                var category = convCategory.value;
                
                if (isNaN(value)) {
                    if (window.showToast) window.showToast('Enter a value', 'error');
                    return;
                }
                
                var result;
                if (category === 'temperature') {
                    result = convertTemp(value, from, to);
                } else {
                    var factors = convUnits[category];
                    result = value * factors[from] / factors[to];
                }
                
                var convResultEl = document.getElementById('conv-result');
                if (convResultEl) convResultEl.textContent = result.toLocaleString('en-US', { maximumFractionDigits: 6 });
            });
        }

        updateConvOptions();
    }

    // ============ SAFE MATH PARSER ============
    var MathParser = (function() {
        function Tokenizer(expr) {
            this.expr = expr.replace(/\s+/g, '');
            this.pos = 0;
            this.len = expr.length;
        }
        
        Tokenizer.prototype.current = function() {
            return this.expr.charAt(this.pos);
        };
        
        Tokenizer.prototype.peek = function() {
            return this.expr.charAt(this.pos + 1);
        };
        
        Tokenizer.prototype.advance = function() {
            return this.expr.charAt(this.pos++);
        };
        
        Tokenizer.prototype.isDigit = function(c) {
            return c >= '0' && c <= '9';
        };
        
        Tokenizer.prototype.isAlpha = function(c) {
            return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
        };
        
        Tokenizer.prototype.readNumber = function() {
            var num = '';
            var hasDot = false;
            while (this.pos < this.len) {
                var c = this.current();
                if (c === '.') {
                    if (hasDot) break;
                    hasDot = true;
                } else if (this.isDigit(c)) {
                    // continue
                } else {
                    break;
                }
                num += this.advance();
            }
            return parseFloat(num);
        };
        
        Tokenizer.prototype.readIdentifier = function() {
            var id = '';
            while (this.pos < this.len && (this.isAlpha(this.current()) || this.isDigit(this.current()) || this.current() === '_')) {
                id += this.advance();
            }
            return id;
        };
        
        return Tokenizer;
    })();
    
    function parseMath(expr) {
        var tokens = new MathParser(expr);
        var pos = 0;
        
        function peek() {
            return tokens.expr.charAt(pos);
        }
        
        function consume() {
            return tokens.expr.charAt(pos++);
        }
        
        function isDigit(c) {
            return c >= '0' && c <= '9' || c === '.';
        }
        
        function parseExpr() {
            return parseAddSub();
        }
        
        function parseAddSub() {
            var left = parseMulDiv();
            while (pos < tokens.len) {
                var op = peek();
                if (op === '+' || op === '-') {
                    consume();
                    var right = parseMulDiv();
                    left = op === '+' ? left + right : left - right;
                } else {
                    break;
                }
            }
            return left;
        }
        
        function parseMulDiv() {
            var left = parsePower();
            while (pos < tokens.len) {
                var op = peek();
                if (op === '*' || op === '/') {
                    consume();
                    var right = parsePower();
                    if (op === '*') left = left * right;
                    else left = left / right;
                } else {
                    break;
                }
            }
            return left;
        }
        
        function parsePower() {
            var left = parseUnary();
            while (pos < tokens.len && peek() === '^') {
                consume();
                var right = parseUnary();
                left = Math.pow(left, right);
            }
            return left;
        }
        
        function parseUnary() {
            if (peek() === '-') {
                consume();
                return -parsePrimary();
            }
            return parsePrimary();
        }
        
        function parsePrimary() {
            var c = peek();
            
            if (c === '(') {
                consume();
                var val = parseExpr();
                if (peek() === ')') consume();
                return val;
            }
            
            if (c === 'p' && tokens.expr.substring(pos, pos + 3) === 'pi') {
                pos += 3;
                return Math.PI;
            }
            
            if (tokens.expr.substring(pos, pos + 4) === 'Math') {
                if (tokens.expr.substring(pos, pos + 8) === 'Math.PI') {
                    pos += 8;
                    return Math.PI;
                }
            }
            
            if (tokens.expr.substring(pos, pos + 4) === 'sqrt') {
                pos += 4;
                if (peek() === '(') {
                    consume();
                    var val = parseExpr();
                    if (peek() === ')') consume();
                    return Math.sqrt(val);
                }
                return Math.sqrt(parsePrimary());
            }
            
            if (tokens.expr.substring(pos, pos + 3) === 'abs') {
                pos += 3;
                if (peek() === '(') {
                    consume();
                    var val = parseExpr();
                    if (peek() === ')') consume();
                    return Math.abs(val);
                }
                return Math.abs(parsePrimary());
            }
            
            if (tokens.expr.substring(pos, pos + 2) === 'pi') {
                pos += 2;
                return Math.PI;
            }
            
            var funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'log10', 'exp', 'floor', 'ceil', 'round'];
            for (var i = 0; i < funcs.length; i++) {
                var fn = funcs[i];
                if (tokens.expr.substring(pos, pos + fn.length) === fn && peek() === '(') {
                    pos += fn.length;
                    consume();
                    var val = parseExpr();
                    if (peek() === ')') consume();
                    switch(fn) {
                        case 'sin': return Math.sin(val);
                        case 'cos': return Math.cos(val);
                        case 'tan': return Math.tan(val);
                        case 'asin': return Math.asin(val);
                        case 'acos': return Math.acos(val);
                        case 'atan': return Math.atan(val);
                        case 'log': case 'log10': return Math.log10(val);
                        case 'ln': return Math.log(val);
                        case 'exp': return Math.exp(val);
                        case 'floor': return Math.floor(val);
                        case 'ceil': return Math.ceil(val);
                        case 'round': return Math.round(val);
                    }
                }
            }
            
            var num = '';
            if (isDigit(c) || c === '.') {
                while (pos < tokens.len && (isDigit(peek()) || peek() === '.')) {
                    num += consume();
                }
                return parseFloat(num) || 0;
            }
            
            throw new Error('Invalid expression');
        }
        
        return parseExpr();
    }
    
    function safeMathEvaluate(expr, angleMode) {
        if (!expr || expr.trim() === '') return NaN;
        
        var processed = expr;
        var funcMap = {
            'sin(': 'sin_d(',
            'cos(': 'cos_d(',
            'tan(': 'tan_d('
        };
        
        if (angleMode === 'deg') {
            processed = processed.replace(/sin\(/g, 'sin_d(');
            processed = processed.replace(/cos\(/g, 'cos_d(');
            processed = processed.replace(/tan\(/g, 'tan_d(');
            
            processed = 'var sin_d=function(x){return Math.sin(x*Math.PI/180)};' +
                       'var cos_d=function(x){return Math.cos(x*Math.PI/180)};' +
                       'var tan_d=function(x){return Math.tan(x*Math.PI/180)};' +
                       processed;
        }
        
        processed = processed.replace(/\^/g, '**');
        processed = processed.replace(/π/g, 'Math.PI');
        
        processed = processed.replace(/Math\.PI/g, 'Math.PI');
        
        var sanitized = processed.replace(/[^0-9+\-*/().,\s[a-zA-Z_]/g, '');
        
        if (/[^0-9+\-*/().,\s]/.test(sanitized.replace(/var\s+\w+=function[^}]+}[^;]+;/g, ''))) {
            var idCheck = sanitized.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
            var allowedIds = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'exp', 'floor', 'ceil', 'round', 'asin', 'acos', 'atan', 'pi', 'Math', 'PI'];
            for (var i = 0; i < idCheck.length; i++) {
                if (allowedIds.indexOf(idCheck[i]) === -1 && !idCheck[i].match(/^sin_d$|^cos_d$|^tan_d$/)) {
                    throw new Error('Invalid identifier');
                }
            }
        }
        
        return parseMath(sanitized);
    }
    
    // ============ SCIENTIFIC CALCULATOR ============
    var sciDisplay = '';
    var sciAngleMode = 'rad';
    var sciHistory = [];
    var sciHistoryIndex = -1;
    
    window.sciSetAngleMode = function(mode) {
        sciAngleMode = mode;
        var degBtn = document.getElementById('sci-deg-btn');
        var radBtn = document.getElementById('sci-rad-btn');
        var label = document.getElementById('sci-angle-label');
        if (degBtn) degBtn.classList.toggle('active', mode === 'deg');
        if (radBtn) radBtn.classList.toggle('active', mode === 'rad');
        if (label) label.textContent = mode.toUpperCase();
    };
    
    window.sciInput = function(val) {
        var display = document.getElementById('sci-display');
        if (val === 'sin' || val === 'cos' || val === 'tan' || val === 'log' || val === 'ln') {
            sciDisplay += val + '(';
        } else if (val === '√') {
            sciDisplay += 'sqrt(';
        } else if (val === '^') {
            sciDisplay += '^';
        } else if (val === 'π') {
            sciDisplay += 'π';
        } else {
            sciDisplay += val;
        }
        if (display) display.value = sciDisplay;
        sciHistoryIndex = -1;
    };
    
    window.sciClear = function() {
        sciDisplay = '';
        var display = document.getElementById('sci-display');
        var resultEl = document.getElementById('sci-result');
        if (display) display.value = '';
        if (resultEl) resultEl.textContent = '';
    };
    
    window.sciBackspace = function() {
        sciDisplay = sciDisplay.slice(0, -1);
        var display = document.getElementById('sci-display');
        if (display) display.value = sciDisplay;
    };
    
    window.sciSquare = function() {
        if (sciDisplay === '') return;
        var display = document.getElementById('sci-display');
        // Wrap expression in parentheses before squaring
        sciDisplay = '(' + sciDisplay + ')**2';
        if (display) display.value = sciDisplay;
    };
    
    window.sciCalculate = function() {
        try {
            var result = safeMathEvaluate(sciDisplay, sciAngleMode);
            var resultEl = document.getElementById('sci-result');
            if (resultEl) resultEl.textContent = typeof result === 'number' && isFinite(result) 
                ? result.toLocaleString('en-US', { maximumFractionDigits: 10 }) 
                : 'Error';
            sciDisplay = typeof result === 'number' && isFinite(result) ? String(result) : '';
            var display = document.getElementById('sci-display');
            if (display) display.value = sciDisplay;
        } catch (e) {
            var resultEl = document.getElementById('sci-result');
            if (resultEl) resultEl.textContent = 'Error';
            var display = document.getElementById('sci-display');
            if (display) display.value = '';
            sciDisplay = '';
        }
    };

    var sciDegBtn = document.getElementById('sci-deg-btn');
    var sciRadBtn = document.getElementById('sci-rad-btn');
    var sciSquareBtn = document.getElementById('sci-square-btn');
    var sciClearBtn = document.getElementById('sci-clear-btn');
    var sciBackBtn = document.getElementById('sci-backspace-btn');
    var sciCalcBtn = document.getElementById('sci-calc-btn');
    
    if (sciDegBtn) sciDegBtn.addEventListener('click', function() { sciSetAngleMode('deg'); });
    if (sciRadBtn) sciRadBtn.addEventListener('click', function() { sciSetAngleMode('rad'); });
    if (sciSquareBtn) sciSquareBtn.addEventListener('click', function() { sciSquare(); });
    if (sciClearBtn) sciClearBtn.addEventListener('click', function() { sciClear(); });
    if (sciBackBtn) sciBackBtn.addEventListener('click', function() { sciBackspace(); });
    if (sciCalcBtn) sciCalcBtn.addEventListener('click', function() { sciCalculate(); });
    
    document.querySelectorAll('[data-sci-input]').forEach(function(btn) {
        btn.addEventListener('click', function() { sciInput(this.dataset.sciInput); });
    });

    // ============ FRACTION CALCULATOR ============
    var fracOpBtns = document.querySelectorAll('.frac-op');
    if (fracOpBtns.length > 0) {
        fracOpBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                fracOpBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var op = btn.dataset.op;
                var opSymbols = { add: '+', sub: '−', mul: '×', div: '÷' };
                var opDisplay = document.getElementById('frac-op-display');
                if (opDisplay) opDisplay.textContent = opSymbols[op] || '+';
                
                var c1El = document.getElementById('frac-c1');
                var c2El = document.getElementById('frac-c2');
                var decimalEl = document.getElementById('frac-decimal');
                var fracResultEl = document.getElementById('frac-result');
                if (c1El) c1El.value = '';
                if (c2El) c2El.value = '';
                if (decimalEl) decimalEl.textContent = '';
                if (fracResultEl) fracResultEl.style.display = 'none';
            });
        });
    }

    var fracBtn = document.getElementById('frac-btn');
    if (fracBtn) {
        fracBtn.addEventListener('click', function() {
            var a1 = parseInt(document.getElementById('frac-a1').value) || 0;
            var a2 = parseInt(document.getElementById('frac-a2').value) || 1;
            var b1 = parseInt(document.getElementById('frac-b1').value) || 0;
            var b2 = parseInt(document.getElementById('frac-b2').value) || 1;

            if (a2 === 0 || b2 === 0) { if (window.showToast) window.showToast('Denominator cannot be 0', 'error'); return; }

            var activeOp = document.querySelector('.frac-op.active');
            var op = activeOp ? activeOp.dataset.op : 'add';
            var c1, c2;

            if (op === 'add') { c1 = a1 * b2 + b1 * a2; c2 = a2 * b2; }
            else if (op === 'sub') { c1 = a1 * b2 - b1 * a2; c2 = a2 * b2; }
            else if (op === 'mul') { c1 = a1 * b1; c2 = a2 * b2; }
            else { c1 = a1 * b2; c2 = a2 * b1; }

            if (c2 === 0) { if (window.showToast) window.showToast('Cannot divide by zero', 'error'); return; }

            var g = gcd(Math.abs(c1), Math.abs(c2));
            c1 /= g; c2 /= g;
            if (c2 < 0) { c1 *= -1; c2 *= -1; }

            var c1El = document.getElementById('frac-c1');
            var c2El = document.getElementById('frac-c2');
            var decimalEl = document.getElementById('frac-decimal');

            if (c1El) c1El.value = c1;
            if (c2El) c2El.value = c2;
            if (decimalEl) decimalEl.textContent = 'Decimal: ' + (c1 / c2).toFixed(6);
            
            var fracResultEl = document.getElementById('frac-result');
            if (fracResultEl) showResult(fracResultEl);
        });
    }

    // ============ RANDOM NUMBER GENERATOR ============
    var randBtn = document.getElementById('rand-btn');
    if (randBtn) {
        randBtn.addEventListener('click', function() {
            var min = parseInt(document.getElementById('rand-min').value) || 1;
            var max = parseInt(document.getElementById('rand-max').value) || 100;
            var count = parseInt(document.getElementById('rand-count').value) || 1;
            var unique = document.getElementById('rand-unique').checked;

            if (count < 1 || count > 100) count = 1;
            if (min > max) { var t = min; min = max; max = t; }

            var numbers = [];
            if (unique && count > max - min + 1) count = max - min + 1;

            var range = max - min + 1;
            var needed = count;
            var buf = new Uint32Array(Math.max(needed, range));
            while (numbers.length < count) {
                crypto.getRandomValues(buf);
                for (var ri = 0; ri < buf.length && numbers.length < count; ri++) {
                    var n = min + (buf[ri] % range);
                    if (!unique || numbers.indexOf(n) === -1) numbers.push(n);
                }
            }

            var randNumbersEl = document.getElementById('rand-numbers');
            var randResultEl = document.getElementById('rand-result');
            if (randNumbersEl) randNumbersEl.textContent = numbers.join(', ');
            if (randResultEl) randResultEl.style.display = 'block';
        });
    }

    // ============ TRIANGLE CALCULATOR ============
    var triModeBtns = document.querySelectorAll('.tri-mode');
    if (triModeBtns.length > 0) {
        triModeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                triModeBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var mode = btn.dataset.mode;
                var sidesDiv = document.getElementById('tri-sides');
                var baseDiv = document.getElementById('tri-base');
                if (sidesDiv) sidesDiv.style.display = mode === 'sides' ? 'block' : 'none';
                if (baseDiv) baseDiv.style.display = mode === 'base' ? 'block' : 'none';
            });
        });
    }

    var triBtn = document.getElementById('tri-btn');
    if (triBtn) {
        triBtn.addEventListener('click', function() {
            var mode = document.querySelector('.tri-mode.active');
            if (!mode) return;

            var area, perim, angA, angB, angC;

            if (mode.dataset.mode === 'sides') {
                var a = parseFloat(document.getElementById('tri-a').value) || 0;
                var b = parseFloat(document.getElementById('tri-b').value) || 0;
                var c = parseFloat(document.getElementById('tri-c').value) || 0;

                if (a <= 0 || b <= 0 || c <= 0) { if (window.showToast) window.showToast('Enter valid sides', 'error'); return; }
                if (a + b <= c || b + c <= a || a + c <= b) { if (window.showToast) window.showToast('Invalid triangle', 'error'); return; }

                var s = (a + b + c) / 2;
                area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
                perim = a + b + c;

                angA = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180 / Math.PI;
                angB = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180 / Math.PI;
                angC = 180 - angA - angB;
            } else {
                var base = parseFloat(document.getElementById('tri-base-val').value) || 0;
                var height = parseFloat(document.getElementById('tri-height').value) || 0;

                if (base <= 0 || height <= 0) { if (window.showToast) window.showToast('Enter valid base and height', 'error'); return; }

                area = (base * height) / 2;
                var hyp = Math.sqrt((base / 2) * (base / 2) + height * height);
                perim = base + 2 * hyp;
                angA = Math.atan(height / (base / 2)) * 180 / Math.PI;
                angB = 180 - angA;
                angC = 90;
            }

            var triAreaEl = document.getElementById('tri-area');
            var triPerimEl = document.getElementById('tri-perim');
            var triAngAEl = document.getElementById('tri-ang-a');
            var triAngBEl = document.getElementById('tri-ang-b');
            var triAngCEl = document.getElementById('tri-ang-c');
            var triResultEl = document.getElementById('tri-result');

            if (triAreaEl) triAreaEl.textContent = area.toFixed(2);
            if (triPerimEl) triPerimEl.textContent = perim.toFixed(2);
            if (triAngAEl) triAngAEl.textContent = mode.dataset.mode === 'base' ? 'N/A' : angA.toFixed(1);
            if (triAngBEl) triAngBEl.textContent = mode.dataset.mode === 'base' ? 'N/A' : angB.toFixed(1);
            if (triAngCEl) triAngCEl.textContent = mode.dataset.mode === 'base' ? 'N/A' : angC.toFixed(1);
            if (triResultEl) { triResultEl.style.display = 'block'; triResultEl.classList.add('fade-in'); }
        });
    }

    // ============ STANDARD DEVIATION ============
    var stdBtn = document.getElementById('std-btn');
    if (stdBtn) {
        stdBtn.addEventListener('click', function() {
            var input = document.getElementById('std-input').value;
            var numbers = input.split(/[\s,\n]+/).map(function(n) { return parseFloat(n.trim()); }).filter(function(n) { return !isNaN(n); });

            if (numbers.length < 2) { if (window.showToast) window.showToast('Enter at least 2 numbers', 'error'); return; }

            var mean = numbers.reduce(function(a, b) { return a + b; }, 0) / numbers.length;
            var variance = numbers.reduce(function(a, b) { return a + Math.pow(b - mean, 2); }, 0) / numbers.length;
            var std = Math.sqrt(variance);
            var sum = numbers.reduce(function(a, b) { return a + b; }, 0);

            var stdMeanEl = document.getElementById('std-mean');
            var stdStdEl = document.getElementById('std-std');
            var stdVarEl = document.getElementById('std-var');
            var stdSumEl = document.getElementById('std-sum');
            var stdCountEl = document.getElementById('std-count');
            var stdResultEl = document.getElementById('std-result');

            if (stdMeanEl) stdMeanEl.textContent = mean.toFixed(4);
            if (stdStdEl) stdStdEl.textContent = std.toFixed(4);
            if (stdVarEl) stdVarEl.textContent = variance.toFixed(4);
            if (stdSumEl) stdSumEl.textContent = sum.toFixed(2);
            if (stdCountEl) stdCountEl.textContent = numbers.length;
            if (stdResultEl) stdResultEl.style.display = 'block';
        });
    }

    // ============ TIME & DATE CALCULATOR ============
    var dtModeBtns = document.querySelectorAll('.dt-mode');
    if (dtModeBtns.length > 0) {
        dtModeBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                dtModeBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var mode = btn.dataset.mode;
                var addDiv = document.getElementById('dt-add');
                var diffDiv = document.getElementById('dt-diff');
                if (addDiv) addDiv.style.display = mode === 'add' ? 'block' : 'none';
                if (diffDiv) diffDiv.style.display = mode === 'diff' ? 'block' : 'none';
            });
        });
    }

    var dtBtn = document.getElementById('dt-btn');
    if (dtBtn) {
        dtBtn.addEventListener('click', function() {
            var mode = document.querySelector('.dt-mode.active');
            var dtOutputEl = document.getElementById('dt-output');
            if (!dtOutputEl) return;

            if (!mode || mode.dataset.mode === 'add') {
                var start = document.getElementById('dt-start').value;
                if (!start) { if (window.showToast) window.showToast('Select start date/time', 'error'); return; }

                var days = parseInt(document.getElementById('dt-days').value) || 0;
                var hours = parseInt(document.getElementById('dt-hours').value) || 0;
                var mins = parseInt(document.getElementById('dt-mins').value) || 0;

                var date = new Date(start);
                date.setDate(date.getDate() + days);
                date.setHours(date.getHours() + hours);
                date.setMinutes(date.getMinutes() + mins);

                dtOutputEl.textContent = date.toLocaleString();
            } else {
                var date1 = document.getElementById('dt-date1').value;
                var date2 = document.getElementById('dt-date2').value;

                if (!date1 || !date2) { if (window.showToast) window.showToast('Select both dates', 'error'); return; }

                var d1 = new Date(date1);
                var d2 = new Date(date2);
                var diff = Math.abs(d2 - d1);
                var days = Math.floor(diff / (1000 * 60 * 60 * 24));
                var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                dtOutputEl.textContent = days + ' days, ' + hours + ' hours, ' + mins + ' minutes';
            }

            var dtResultEl = document.getElementById('dt-result');
            if (dtResultEl) dtResultEl.style.display = 'block';
        });
    }

    // ============ INTEGRATION CALCULATOR ============
    var integBtn = document.getElementById('integ-btn');
    if (integBtn) {
        integBtn.addEventListener('click', function() {
            var btn = this;
            btn.textContent = 'Calculating...';
            btn.disabled = true;
            
            var funcStr = document.getElementById('integ-func').value;
            var a = parseFloat(document.getElementById('integ-a').value);
            var b = parseFloat(document.getElementById('integ-b').value);
            var n = parseInt(document.getElementById('integ-n').value) || 1000;

            if (isNaN(a) || isNaN(b) || !funcStr) { if (window.showToast) window.showToast('Enter function and bounds', 'error'); btn.textContent = 'Calculate'; btn.disabled = false; return; }
            if (n < 10 || n > 100000) n = 1000;
            if (n % 2 === 1) n++; // Simpson's requires even number of intervals
            
            var safeFunc = function(x) {
                var expr = funcStr.replace(/\^/g, '**').replace(/\bx\b/g, '(' + x + ')').replace(/π/g, 'Math.PI');
                try {
                    return parseMath(expr);
                } catch(e) {
                    return NaN;
                }
            };

            var h = (b - a) / n;
            var result = 0;

            for (var i = 0; i <= n; i++) {
                var x = a + i * h;
                var y = safeFunc(x);
                if (isNaN(y) || !isFinite(y)) { if (window.showToast) window.showToast('Invalid function value', 'error'); btn.textContent = 'Calculate'; btn.disabled = false; return; }
                if (i === 0 || i === n) result += y;
                else result += y * (i % 2 === 0 ? 2 : 4);
            }
            result *= h / 3;

            var integResultValEl = document.getElementById('integ-result-val');
            var integADisplayEl = document.getElementById('integ-a-display');
            var integBDisplayEl = document.getElementById('integ-b-display');
            var integNDisplayEl = document.getElementById('integ-n-display');
            var integResultEl = document.getElementById('integ-result');

            if (integResultValEl) integResultValEl.textContent = result.toFixed(6);
            if (integADisplayEl) integADisplayEl.textContent = a;
            if (integBDisplayEl) integBDisplayEl.textContent = b;
            if (integNDisplayEl) integNDisplayEl.textContent = n.toLocaleString();
            if (integResultEl) showResult(integResultEl);
            btn.textContent = 'Calculate';
            btn.disabled = false;
        });
    }

    // ============ DISCOUNT CALCULATOR ============
    var discBtn = document.getElementById('disc-btn');
    if (discBtn) {
        discBtn.addEventListener('click', function() {
            var original = parseFloat(document.getElementById('disc-original').value) || 0;
            var percent = parseFloat(document.getElementById('disc-percent').value) || 0;

            if (original <= 0) { if (window.showToast) window.showToast('Enter valid price', 'error'); return; }

            var sale = original * (1 - percent / 100);
            var save = original - sale;
            var pay = 100 - percent;

            var discSaleEl = document.getElementById('disc-sale');
            var discSaveEl = document.getElementById('disc-save');
            var discPayEl = document.getElementById('disc-pay');
            var discResultEl = document.getElementById('disc-result');

            if (discSaleEl) discSaleEl.textContent = '$' + sale.toFixed(2);
            if (discSaveEl) discSaveEl.textContent = '$' + save.toFixed(2);
            if (discPayEl) discPayEl.textContent = pay + '%';
            if (discResultEl) discResultEl.style.display = 'block';
        });
    }

    // ============ PROFIT MARGIN ============
    var margBtn = document.getElementById('marg-btn');
    if (margBtn) {
        margBtn.addEventListener('click', function() {
            var revenue = parseFloat(document.getElementById('marg-revenue').value) || 0;
            var cost = parseFloat(document.getElementById('marg-cost').value) || 0;

            if (revenue <= 0 || cost <= 0) { if (window.showToast) window.showToast('Enter valid values', 'error'); return; }

            var profit = revenue - cost;
            var margin = (profit / revenue) * 100;
            var markup = (profit / cost) * 100;

            var margProfitEl = document.getElementById('marg-profit');
            var margMarginEl = document.getElementById('marg-margin');
            var margMarkupEl = document.getElementById('marg-markup');
            var margResultEl = document.getElementById('marg-result');

            if (margProfitEl) margProfitEl.textContent = '$' + profit.toFixed(2);
            if (margMarginEl) margMarginEl.textContent = margin.toFixed(1) + '%';
            if (margMarkupEl) margMarkupEl.textContent = markup.toFixed(1) + '%';
            if (margResultEl) margResultEl.style.display = 'block';
        });
    }

    // ============ NUMBER BASE CONVERTER ============
    var baseBtn = document.getElementById('base-btn');
    if (baseBtn) {
        baseBtn.addEventListener('click', function() {
            var input = document.getElementById('base-input').value.trim();
            var from = parseInt(document.getElementById('base-from').value) || 10;
            var to = parseInt(document.getElementById('base-to').value) || 16;

            if (!input) { if (window.showToast) window.showToast('Enter a number', 'error'); return; }

            try {
                var decimal = parseInt(input, from);
                if (isNaN(decimal)) { if (window.showToast) window.showToast('Invalid number for base ' + from, 'error'); return; }

                var result = decimal.toString(to).toUpperCase();
                var baseOutputEl = document.getElementById('base-output');
                var baseResultEl = document.getElementById('base-result');

                if (baseOutputEl) baseOutputEl.textContent = result;
                if (baseResultEl) baseResultEl.style.display = 'block';
            } catch (e) { if (window.showToast) window.showToast('Conversion error', 'error'); }
        });
    }

    // ============ BMR CALCULATOR ============
    var bmrBtn = document.getElementById('bmr-btn');
    if (bmrBtn) {
        bmrBtn.addEventListener('click', function() {
            var age = parseInt(document.getElementById('bmr-age').value) || 0;
            var gender = document.getElementById('bmr-gender').value;
            var height = parseFloat(document.getElementById('bmr-height').value) || 0;
            var weight = parseFloat(document.getElementById('bmr-weight').value) || 0;
            var formula = document.getElementById('bmr-formula').value;

            if (age <= 0 || height <= 0 || weight <= 0) { if (window.showToast) window.showToast('Enter valid values', 'error'); return; }

            var bmr;
            if (formula === 'mifflin') {
                bmr = gender === 'male' ? (10 * weight + 6.25 * height - 5 * age + 5) : (10 * weight + 6.25 * height - 5 * age - 161);
            } else if (formula === 'harris') {
                bmr = gender === 'male' ? (88.362 + 13.397 * weight + 4.799 * height - 5.677 * age) : (447.593 + 9.247 * weight + 3.098 * height - 4.330 * age);
            } else {
                // WHO/Schofield equations with age adjustment
                if (gender === 'male') {
                    bmr = age < 30 ? (15.057 * weight + 692.2) : (11.472 * weight + 873.1);
                } else {
                    bmr = age < 30 ? (14.535 * weight + 496.6) : (8.404 * weight + 845.6);
                }
            }

            var bmrValueEl = document.getElementById('bmr-value');
            var bmrResultEl = document.getElementById('bmr-result');

            if (bmrValueEl) bmrValueEl.textContent = Math.round(bmr);
            if (bmrResultEl) { bmrResultEl.style.display = 'block'; bmrResultEl.classList.add('fade-in'); }
        });
    }

    // ============ TANK VOLUME ============
    var tankBtn = document.getElementById('tank-btn');
    if (tankBtn) {
        tankBtn.addEventListener('click', function() {
            var shape = document.getElementById('tank-shape').value;
            var dim = parseFloat(document.getElementById('tank-diam').value) || 0;
            var depth = parseFloat(document.getElementById('tank-depth').value) || 0;
            var height = parseFloat(document.getElementById('tank-height').value) || 0;
            var fill = parseFloat(document.getElementById('tank-fill').value) || 100;

            if (dim <= 0 || depth <= 0 || height <= 0) { if (window.showToast) window.showToast('Enter valid dimensions', 'error'); return; }

            var radius = dim / 2;
            var totalGal;

            if (shape === 'cylinder') {
                totalGal = Math.PI * radius * radius * height / 231;
            } else if (shape === 'rectangle') {
                totalGal = dim * depth * height / 231;
            } else {
                totalGal = (4 / 3) * Math.PI * Math.pow(radius, 3) / 231;
            }

            var filled = totalGal * fill / 100;

            var tankVolumeEl = document.getElementById('tank-volume');
            var tankTotalEl = document.getElementById('tank-total');
            var tankResultEl = document.getElementById('tank-result');

            if (tankVolumeEl) tankVolumeEl.textContent = filled.toFixed(1);
            if (tankTotalEl) tankTotalEl.textContent = totalGal.toFixed(1);
            if (tankResultEl) { tankResultEl.style.display = 'block'; tankResultEl.classList.add('fade-in'); }
        });
    }

    // ============ CONCRETE CALCULATOR ============
    var concBtn = document.getElementById('conc-btn');
    if (concBtn) {
        concBtn.addEventListener('click', function() {
            var length = parseFloat(document.getElementById('conc-length').value) || 0;
            var width = parseFloat(document.getElementById('conc-width').value) || 0;
            var depth = parseFloat(document.getElementById('conc-depth').value) || 0;

            if (length <= 0 || width <= 0 || depth <= 0) { if (window.showToast) window.showToast('Enter valid dimensions', 'error'); return; }

            var cubicFeet = length * width * (depth / 12);
            var cubicYards = cubicFeet / 27;
            var tons = cubicYards * 2.025; // 4050 lbs per cubic yard
            var bags = Math.ceil(cubicFeet / 0.45); // 60lb bags

            var concBagsEl = document.getElementById('conc-bags');
            var concYardsEl = document.getElementById('conc-yards');
            var concTonsEl = document.getElementById('conc-tons');
            var concResultEl = document.getElementById('conc-result');

            if (concBagsEl) concBagsEl.textContent = bags;
            if (concYardsEl) concYardsEl.textContent = cubicYards.toFixed(2);
            if (concTonsEl) concTonsEl.textContent = tons.toFixed(2);
            if (concResultEl) concResultEl.style.display = 'block';
        });
    }

    // ============ PAINT CALCULATOR ============
    var paintBtn = document.getElementById('paint-btn');
    if (paintBtn) {
        paintBtn.addEventListener('click', function() {
            var height = parseFloat(document.getElementById('paint-height').value) || 0;
            var width = parseFloat(document.getElementById('paint-width').value) || 0;
            var walls = parseInt(document.getElementById('paint-walls').value) || 1;
            var coats = parseInt(document.getElementById('paint-coats').value) || 1;

            if (height <= 0 || width <= 0) { if (window.showToast) window.showToast('Enter valid dimensions', 'error'); return; }

            var sqft = height * width * walls * coats;
            var gallons = Math.ceil(sqft / 350);

            var paintGallonsEl = document.getElementById('paint-gallons');
            var paintResultEl = document.getElementById('paint-result');

            if (paintGallonsEl) paintGallonsEl.textContent = gallons;
            if (paintResultEl) paintResultEl.style.display = 'block';
        });
    }

    // ============ UUID GENERATOR ============
    function generateUUID() {
        var b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var hex = function(n) { return n.toString(16).padStart(2, '0'); };
        return [
            hex(b[0]) + hex(b[1]) + hex(b[2]) + hex(b[3]),
            hex(b[4]) + hex(b[5]),
            hex(b[6]) + hex(b[7]),
            hex(b[8]) + hex(b[9]),
            hex(b[10]) + hex(b[11]) + hex(b[12]) + hex(b[13]) + hex(b[14]) + hex(b[15])
        ].join('-');
    }

    var uuidBtn = document.getElementById('uuid-btn');
    if (uuidBtn) {
        uuidBtn.addEventListener('click', function() {
            var count = parseInt(document.getElementById('uuid-count').value) || 1;
            if (count < 1) count = 1;
            if (count > 100) count = 100;

            var uuids = [];
            for (var i = 0; i < count; i++) uuids.push(generateUUID());

            var uuidOutputEl = document.getElementById('uuid-output');
            var uuidResultEl = document.getElementById('uuid-result');

            if (uuidOutputEl) uuidOutputEl.textContent = uuids.join('\n');
            if (uuidResultEl) uuidResultEl.style.display = 'block';
        });
    }

    var passCopyBtn = document.getElementById('pass-copy');
    if (passCopyBtn) {
        passCopyBtn.addEventListener('click', function() {
            var output = document.getElementById('pass-output');
            if (output && output.textContent) {
                navigator.clipboard.writeText(output.textContent).then(function() {
                    if (window.showToast) window.showToast('Password copied!', 'success');
                }).catch(function() {
                    if (window.showToast) window.showToast('Failed to copy', 'error');
                });
            }
        });
    }

    var uuidCopyBtn = document.getElementById('uuid-copy');
    if (uuidCopyBtn) {
        uuidCopyBtn.addEventListener('click', function() {
            var output = document.getElementById('uuid-output');
            if (output && output.textContent) {
                navigator.clipboard.writeText(output.textContent).then(function() {
                    if (window.showToast) window.showToast('Copied!', 'success');
                }).catch(function() {
                    if (window.showToast) window.showToast('Failed to copy', 'error');
                });
            }
        });
    }

    // ============ TILE CALCULATOR ============
    var tileBtn = document.getElementById('tile-btn');
    if (tileBtn) {
        tileBtn.addEventListener('click', function() {
            var length = parseFloat(document.getElementById('tile-length').value) || 0;
            var width = parseFloat(document.getElementById('tile-width').value) || 0;
            var size = parseFloat(document.getElementById('tile-size').value) || 12;
            var waste = parseFloat(document.getElementById('tile-waste').value) || 10;

            if (length <= 0 || width <= 0 || size <= 0) { if (window.showToast) window.showToast('Enter valid values', 'error'); return; }

            var area = length * width;
            var tileSqFt = (size * size) / 144;
            var tiles = area / tileSqFt;
            var withWaste = Math.ceil(tiles * (1 + waste / 100));

            var tileCountEl = document.getElementById('tile-count');
            var tileResultEl = document.getElementById('tile-result');

            if (tileCountEl) tileCountEl.textContent = withWaste;
            if (tileResultEl) {
                tileResultEl.style.display = 'block';
                tileResultEl.classList.add('fade-in');
            }
        });
    }

    // ============ COPY BUTTONS ============
    document.querySelectorAll('[data-copy]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var target = document.getElementById(btn.dataset.copy);
            if (target) window.copyToClipboard(target.textContent || target.value, 'Copied!');
        });
    });

});
})();