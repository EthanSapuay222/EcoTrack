import sqlite3

def main():
    connection = sqlite3.connect('environmental_tracker.db')
    cursor = connection.cursor()

    # Example table for reports
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            description TEXT,
            location TEXT,
            date_submitted TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    connection.commit()
    connection.close()
    print("✅ Database and tables created successfully!")

if __name__ == "__main__":
    main()
