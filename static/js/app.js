// Global chart variables
let categoryChart, trendsChart, locationsChart, severityChart;

// API base URL
const API_BASE = '/api';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ App loaded');
    loadAllData();
    
    // Auto-refresh every 30 seconds
    setInterval(loadAllData, 30000);
});

// MAIN FUNCTION - Load all data
async function loadAllData() {
    try {
        await Promise.all([
            loadOverviewStats(),
            loadCategoryStats(),
            loadTrendStats(),
            loadLocationStats(),
            loadRecentReports(),
            loadMilestones()
        ]);
        console.log('✅ All data loaded');
    } catch (error) {
        console.error('❌ Error loading data:', error);
    }
}

// Load overview statistics
async function loadOverviewStats() {
    const response = await fetch(`${API_BASE}/stats/overview`);
    const data = await response.json();
    
    // Update summary cards
    document.getElementById('totalReports').textContent = data.total_reports;
    
    // Count by status
    let pending = 0, resolved = 0, critical = 0;
    
    data.by_status.forEach(item => {
        if (item.status === 'pending') pending = item.count;
        if (item.status === 'resolved') resolved = item.count;
    });
    
    data.by_severity.forEach(item => {
        if (item.severity === 'critical') critical = item.count;
    });
    
    document.getElementById('pendingReports').textContent = pending;
    document.getElementById('resolvedReports').textContent = resolved;
    document.getElementById('criticalReports').textContent = critical;
    
    // Create severity chart
    createSeverityChart(data.by_severity);
}

// Load category statistics
async function loadCategoryStats() {
    const response = await fetch(`${API_BASE}/stats/categories`);
    const data = await response.json();
    createCategoryChart(data);
}

// Load trend statistics
async function loadTrendStats() {
    const response = await fetch(`${API_BASE}/stats/trends`);
    const data = await response.json();
    createTrendsChart(data);
}

// Load location statistics
async function loadLocationStats() {
    const response = await fetch(`${API_BASE}/stats/locations`);
    const data = await response.json();
    createLocationsChart(data);
}

// Load recent reports
async function loadRecentReports() {
    const response = await fetch(`${API_BASE}/stats/recent?limit=10`);
    const data = await response.json();
    
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';
    
    data.forEach(report => {
        const row = document.createElement('tr');
        
        const categoryClass = getCategoryClass(report.category_name);
        const statusClass = `status-${report.status}`;
        const severityClass = `severity-${report.severity}`;
        
        row.innerHTML = `
            <td>#${report.id}</td>
            <td><strong>${report.title}</strong></td>
            <td><span class="badge ${categoryClass}">${report.category_icon} ${report.category_name}</span></td>
            <td>${report.location_name || 'N/A'}</td>
            <td><span class="badge ${severityClass}">${report.severity}</span></td>
            <td><span class="badge ${statusClass}">${report.status}</span></td>
            <td>${formatDate(report.created_at)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load milestones
async function loadMilestones() {
    const response = await fetch(`${API_BASE}/stats/milestones`);
    const data = await response.json();
    
    const container = document.getElementById('milestonesContainer');
    container.innerHTML = '';
    
    data.forEach(milestone => {
        const card = document.createElement('div');
        card.className = 'milestone-card';
        
        const progress = Math.min(milestone.progress_percentage, 100);
        
        card.innerHTML = `
            <h3>${milestone.title} ${milestone.achieved ? '🏆' : ''}</h3>
            <p>${milestone.description}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%">
                    ${progress.toFixed(0)}%
                </div>
            </div>
            <div class="milestone-stats">
                <span><strong>${milestone.current_count}</strong> / ${milestone.target_count}</span>
                <span>${milestone.achieved ? '✅ Achieved!' : '🎯 In Progress'}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// CREATE CHART FUNCTIONS

function createCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => `${item.icon} ${item.name}`),
            datasets: [{
                data: data.map(item => item.count),
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#ec4899'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createTrendsChart(data) {
    const ctx = document.getElementById('trendsChart');
    
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.month),
            datasets: [{
                label: 'Reports',
                data: data.map(item => item.count),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createLocationsChart(data) {
    const ctx = document.getElementById('locationsChart');
    
    if (locationsChart) {
        locationsChart.destroy();
    }
    
    locationsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.name),
            datasets: [{
                label: 'Reports',
                data: data.map(item => item.count),
                backgroundColor: '#3b82f6',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createSeverityChart(data) {
    const ctx = document.getElementById('severityChart');
    
    if (severityChart) {
        severityChart.destroy();
    }
    
    const colors = {
        'low': '#3b82f6',
        'medium': '#f59e0b',
        'high': '#fb923c',
        'critical': '#ef4444'
    };
    
    severityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.severity.toUpperCase()),
            datasets: [{
                label: 'Reports',
                data: data.map(item => item.count),
                backgroundColor: data.map(item => colors[item.severity]),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// HELPER FUNCTIONS

function getCategoryClass(categoryName) {
    const mapping = {
        'Pollution': 'badge-pollution',
        'Wildlife': 'badge-wildlife',
        'Waste Management': 'badge-waste',
        'Deforestation': 'badge-deforestation',
        'Water Bodies': 'badge-water',
        'Climate Action': 'badge-climate'
    };
    return mapping[categoryName] || 'badge-pollution';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

console.log('✅ app.js loaded successfully');