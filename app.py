

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import os

# Database file
DATABASE = 'environmental_tracker.db'

# Create Flask app
app = Flask(__name__)
CORS(app)

# Auto-create the database if not found
if not os.path.exists(DATABASE):
    print("📝 Database not found, creating...")
    import database
    database.main()

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return dict(zip(row.keys(), row))

# ============================================
# ROUTES
# ============================================

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

@app.route('/api/stats/overview')
def get_overview_stats():
    """Get overall statistics"""
    conn = get_db_connection()
    
    # Total reports
    total = conn.execute('SELECT COUNT(*) as count FROM reports').fetchone()
    
    # Reports by status
    status_counts = conn.execute('''
        SELECT status, COUNT(*) as count 
        FROM reports 
        GROUP BY status
    ''').fetchall()
    
    # Reports by severity
    severity_counts = conn.execute('''
        SELECT severity, COUNT(*) as count 
        FROM reports 
        GROUP BY severity
        ORDER BY CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END
    ''').fetchall()
    
    conn.close()
    
    return jsonify({
        'total_reports': total['count'],
        'by_status': [dict_from_row(row) for row in status_counts],
        'by_severity': [dict_from_row(row) for row in severity_counts]
    })

@app.route('/api/stats/categories')
def get_category_stats():
    """Get reports by category"""
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT c.name, c.icon, COUNT(r.id) as count
        FROM categories c
        LEFT JOIN reports r ON c.id = r.category_id
        GROUP BY c.id, c.name, c.icon
        ORDER BY count DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

@app.route('/api/stats/trends')
def get_trend_stats():
    """Get monthly trends for the last 12 months"""
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT 
            strftime('%Y-%m', created_at) as month,
            COUNT(*) as count
        FROM reports
        WHERE created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

@app.route('/api/stats/locations')
def get_location_stats():
    """Get top reported locations"""
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT l.name, l.city, l.region, COUNT(r.id) as count
        FROM locations l
        LEFT JOIN reports r ON l.id = r.location_id
        GROUP BY l.id
        HAVING count > 0
        ORDER BY count DESC
        LIMIT 10
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

@app.route('/api/stats/recent')
def get_recent_reports():
    """Get recent reports"""
    limit = request.args.get('limit', 10, type=int)
    
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT 
            r.id, r.title, r.description, r.severity, r.status,
            r.created_at,
            c.name as category_name, c.icon as category_icon,
            l.name as location_name, l.city
        FROM reports r
        JOIN categories c ON r.category_id = c.id
        LEFT JOIN locations l ON r.location_id = l.id
        ORDER BY r.created_at DESC
        LIMIT ?
    ''', (limit,)).fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

@app.route('/api/stats/milestones')
def get_milestones():
    """Get progress milestones"""
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT 
            title, description, target_count, current_count,
            milestone_type, achieved,
            ROUND((CAST(current_count AS FLOAT) / target_count) * 100, 2) as progress_percentage
        FROM milestones
        ORDER BY progress_percentage DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

@app.route('/api/species')
def get_species_stats():
    """Get species sighting statistics"""
    conn = get_db_connection()
    
    results = conn.execute('''
        SELECT 
            s.common_name, s.scientific_name, s.conservation_status,
            COUNT(ws.id) as sighting_count
        FROM species s
        LEFT JOIN wildlife_sightings ws ON s.id = ws.species_id
        GROUP BY s.id
        ORDER BY sighting_count DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict_from_row(row) for row in results])

# ============================================
# CRUD OPERATIONS (Optional - for adding reports)
# ============================================

@app.route('/api/reports', methods=['POST'])
def create_report():
    """Create a new report"""
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO reports (category_id, location_id, title, description, severity, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['category_id'],
        data.get('location_id'),
        data['title'],
        data.get('description', ''),
        data.get('severity', 'medium'),
        data.get('status', 'pending')
    ))
    
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'report_id': report_id}), 201

@app.route('/api/reports/<int:report_id>', methods=['PUT'])
def update_report(report_id):
    """Update an existing report"""
    data = request.json
    
    conn = get_db_connection()
    
    conn.execute('''
        UPDATE reports
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (data['status'], report_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# RUN APPLICATION
# ============================================

if __name__ == '__main__':
    # Check if database exists
    if not os.path.exists(DATABASE):
        print("❌ ERROR: Database not found!")
        print("📝 Please run: python database.py")
        print("   This will create and populate the database.")
        exit(1)
    
    # Get port from environment (for Railway) or use 5000
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'False') == 'True'
    
    print("=" * 60)
    print("🚀 Environmental Tracker - Starting Server")
    print("=" * 60)
    print(f"📊 Database: {DATABASE}")
    print(f"🌐 URL: http://localhost:{port}")
    print(f"🔧 Debug mode: {debug}")
    print("=" * 60)
    print()
    print("Press CTRL+C to stop the server")
    print()
    
    app.run(host=host, port=port, debug=debug)