// Global chart variables
let categoryChart, trendsChart, locationsChart, severityChart;

// API base URL
const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ App loaded');

    // Load all dashboard data
    loadAllData();
    setInterval(loadAllData, 30000);

    // Form submission handler
    const form = document.getElementById('reportForm');
    if (form) {
        form.addEventListener('submit', handleReportSubmit);
    }
});

// MAIN FUNCTION
async function loadAllData() {
    try {
        await Promise.all([
            loadOverviewStats(),
            loadCategoryStats(),
            loadTrendStats(),
            loadLocationStats(),
            loadSeverityStats(),
            loadMilestones(),
            loadRecentReports()
        ]);
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// ==========================
// FETCHING FUNCTIONS
// ==========================
async function loadOverviewStats() {
    // Replace with your API call
    const data = await fetch(`${API_BASE}/overview`).then(res => res.json());

    document.getElementById('totalReports').textContent = data.total_reports;
    document.getElementById('pendingReports').textContent = data.pending_reports;
    document.getElementById('resolvedReports').textContent = data.resolved_reports;
    document.getElementById('criticalReports').textContent = data.critical_reports;
}

async function loadCategoryStats() {
    const data = await fetch(`${API_BASE}/categories`).then(res => res.json());
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{ data: data.map(d => d.count), backgroundColor: ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#f97316','#6366f1'] }]
        },
        options: { responsive: true }
    });
}

async function loadTrendStats() {
    const data = await fetch(`${API_BASE}/trends`).then(res => res.json());
    const ctx = document.getElementById('trendsChart').getContext('2d');
    if (trendsChart) trendsChart.destroy();

    trendsChart = new Chart(ctx, {
        type: 'line',
        data: { labels: data.map(d=>d.month), datasets:[{label:'Reports', data:data.map(d=>d.count), borderColor:'#10b981', fill:false, tension:0.3}]},
        options: { responsive:true }
    });
}

async function loadLocationStats() {
    const data = await fetch(`${API_BASE}/locations`).then(res => res.json());
    const ctx = document.getElementById('locationsChart').getContext('2d');
    if (locationsChart) locationsChart.destroy();

    locationsChart = new Chart(ctx, {
        type: 'bar',
        data: { labels:data.map(d=>d.name), datasets:[{label:'Reports', data:data.map(d=>d.count), backgroundColor:'#3b82f6'}]},
        options: { responsive:true }
    });
}

async function loadSeverityStats() {
    const data = await fetch(`${API_BASE}/severity`).then(res => res.json());
    const ctx = document.getElementById('severityChart').getContext('2d');
    if (severityChart) severityChart.destroy();

    severityChart = new Chart(ctx, {
        type: 'pie',
        data: { labels:data.map(d=>d.severity), datasets:[{data:data.map(d=>d.count), backgroundColor:['#3b82f6','#fbbf24','#fb923c','#ef4444']}] },
        options: { responsive:true }
    });
}

async function loadMilestones() {
    const data = await fetch(`${API_BASE}/milestones`).then(res=>res.json());
    const container = document.getElementById('milestonesContainer');
    container.innerHTML = '';
    data.forEach(m => {
        const percent = Math.min(100, (m.current_count/m.target_count)*100);
        const card = document.createElement('div');
        card.className = 'milestone-card';
        card.innerHTML = `
            <h3>${m.title}</h3>
            <p>${m.description || ''}</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${percent}%">${percent.toFixed(0)}%</div></div>
            <div class="milestone-stats">
                <span>${m.current_count} completed</span>
                <span>${m.target_count} target</span>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadRecentReports() {
    const data = await fetch(`${API_BASE}/reports`).then(res=>res.json());
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';
    data.forEach(r=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.id}</td>
            <td>${r.title}</td>
            <td>${r.category}</td>
            <td>${r.location || '-'}</td>
            <td>${r.severity}</td>
            <td>${r.status}</td>
            <td>${r.created_at}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================
// FORM SUBMISSION
// ==========================
async function handleReportSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        title: form.title.value,
        description: form.description.value,
        category_id: form.category_id.value,
        location_id: form.location_id.value || null,
        severity: form.severity.value
    };

    try {
        const res = await fetch(`${API_BASE}/reports`, {
            method:'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        const result = await res.json();
        const msgEl = document.getElementById('formMessage');
        if (res.ok) {
            msgEl.className='form-message success';
            msgEl.textContent='✅ Report submitted successfully!';
            msgEl.style.display='block';
            form.reset();
            loadAllData();
        } else {
            msgEl.className='form-message error';
            msgEl.textContent='❌ Error: '+result.error;
            msgEl.style.display='block';
        }
    } catch(err) {
        const msgEl = document.getElementById('formMessage');
        msgEl.className='form-message error';
        msgEl.textContent='❌ Network error';
        msgEl.style.display='block';
    }
}
