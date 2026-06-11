const STORAGE_KEY = 'mood_diary_entries_v1';

let entries = loadEntries();
let filterMode = 'all';

const moodLabels = {
    1: 'Очень плохо',
    2: 'Плохо',
    3: 'Нормально',
    4: 'Хорошо',
    5: 'Отлично'
};

const moodColors = {
    1: '#dc2626',
    2: '#f97316',
    3: '#64748b',
    4: '#22c55e',
    5: '#2563eb'
};

const moodEmojis = {
    1: '😞',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '😄'
};

const form = document.getElementById('moodForm');
const dateInput = document.getElementById('dateInput');
const moodInput = document.getElementById('moodInput');
const noteInput = document.getElementById('noteInput');
const clearFormBtn = document.getElementById('clearFormBtn');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const showStatsBtn = document.getElementById('showStatsBtn');
const showAllBtn = document.getElementById('showAllBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const entriesList = document.getElementById('entriesList');
const avgMood = document.getElementById('avgMood');
const maxMood = document.getElementById('maxMood');
const minMood = document.getElementById('minMood');
const recordsCount = document.getElementById('recordsCount');
const chartCanvas = document.getElementById('moodChart');
const chartContainer = document.getElementById('chartContainer');

let chartInstance = null;

function loadEntries() {
    try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
    } catch {
    return [];
    }
}

function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
    }).format(date);
}

function escapeHtml(text) {
    return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getFilteredEntries() {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    if (filterMode === 'all') return sorted;

    const start = startDateInput.value;
    const end = endDateInput.value;

    return sorted.filter(item => {
    const afterStart = !start || item.date >= start;
    const beforeEnd = !end || item.date <= end;
    return afterStart && beforeEnd;
    });
}

function renderEntries() {
    const data = getFilteredEntries();

    if (data.length === 0) {
    entriesList.innerHTML = '<div class="empty-message">Пока нет записей за выбранный период.</div>';
    return;
    }

    entriesList.innerHTML = data
    .slice()
    .reverse()
    .map(item => {
        const moodNumber = Number(item.mood);
        const color = moodColors[moodNumber] || '#64748b';
        const label = moodLabels[moodNumber] || 'Неизвестно';
        const emoji = moodEmojis[moodNumber] || '•';

        return `
        <article class="entry-item" style="border-left-color: ${color};">
            <div class="entry-header">
            <div class="entry-date">${formatDate(item.date)}</div>
            <div class="entry-mood">${emoji} ${moodNumber} — ${label}</div>
            </div>
            <div class="entry-note">${escapeHtml(item.note || 'Без заметки')}</div>
            <div class="entry-actions">
            <button class="delete-entry" data-id="${item.id}" type="button">Удалить</button>
            </div>
        </article>
        `;
    })
    .join('');

    document.querySelectorAll('.delete-entry').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        deleteEntry(id);
    });
    });
}

function calculateStats(data) {
    if (!data.length) {
    return { avg: '—', max: '—', min: '—', count: 0 };
    }

    const moods = data.map(item => Number(item.mood));
    const sum = moods.reduce((acc, value) => acc + value, 0);
    const avg = (sum / moods.length).toFixed(1);
    const max = Math.max(...moods);
    const min = Math.min(...moods);

    return { avg, max, min, count: moods.length };
}

function renderStats() {
    const data = getFilteredEntries();
    const stats = calculateStats(data);

    avgMood.textContent = stats.avg;
    maxMood.textContent = stats.max === '—' ? '—' : `${stats.max}`;
    minMood.textContent = stats.min === '—' ? '—' : `${stats.min}`;
    recordsCount.textContent = stats.count;
}

function renderChart() {
    const data = getFilteredEntries();
    const ctx = chartCanvas.getContext('2d');

    if (chartInstance) {
    chartInstance.destroy();
    }

    if (!data.length) {
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Нет данных для графика', 20, 40);
    return;
    }

    if (typeof Chart === 'undefined') {
    chartContainer.innerHTML = '<div class="empty-message">Для отображения графика подключите Chart.js.</div>';
    return;
    }

    chartContainer.innerHTML = '<canvas id="moodChart"></canvas>';
    const freshCanvas = document.getElementById('moodChart');
    const freshCtx = freshCanvas.getContext('2d');

    chartInstance = new Chart(freshCtx, {
    type: 'line',
    data: {
        labels: data.map(item => item.date),
        datasets: [{
        label: 'Настроение',
        data: data.map(item => Number(item.mood)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: '#2563eb'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
        y: {
            min: 1,
            max: 5,
            ticks: { stepSize: 1 }
        }
        }
    }
    });
}

function updateView() {
    renderEntries();
    renderStats();
    renderChart();
}

function addEntry(date, mood, note) {
    const existingIndex = entries.findIndex(item => item.date === date);
    const record = {
    id: existingIndex >= 0 ? entries[existingIndex].id : Date.now(),
    date,
    mood: Number(mood),
    note: note.trim()
    };

    if (existingIndex >= 0) {
    entries[existingIndex] = record;
    } else {
    entries.push(record);
    }

    saveEntries();
}

function deleteEntry(id) {
    const index = entries.findIndex(item => item.id === id);
    if (index !== -1) {
    entries.splice(index, 1);
    saveEntries();
    updateView();
    }
}

function clearForm() {
    form.reset();
    noteInput.value = '';
    moodInput.value = '';
}

function setTodayIfEmpty() {
    if (!dateInput.value) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    }
}

form.addEventListener('submit', event => {
    event.preventDefault();

    const date = dateInput.value;
    const mood = moodInput.value;
    const note = noteInput.value;

    if (!date) {
    alert('Выберите дату.');
    return;
    }

    if (!mood || Number(mood) < 1 || Number(mood) > 5) {
    alert('Оценка настроения должна быть от 1 до 5.');
    return;
    }

    if (note.length > 200) {
    alert('Заметка не должна превышать 200 символов.');
    return;
    }

    addEntry(date, mood, note);
    clearForm();
    setTodayIfEmpty();
    updateView();
});

clearFormBtn.addEventListener('click', () => {
    clearForm();
    setTodayIfEmpty();
});

showStatsBtn.addEventListener('click', () => {
    filterMode = 'period';
    updateView();
});

showAllBtn.addEventListener('click', () => {
    filterMode = 'all';
    startDateInput.value = '';
    endDateInput.value = '';
    updateView();
});

deleteAllBtn.addEventListener('click', () => {
    if (!entries.length) return;
    if (confirm('Очистить все записи?')) {
    entries.length = 0;
    saveEntries();
    updateView();
    }
});

startDateInput.addEventListener('change', () => {
    filterMode = 'period';
    updateView();
});

endDateInput.addEventListener('change', () => {
    filterMode = 'period';
    updateView();
});

setTodayIfEmpty();
updateView();