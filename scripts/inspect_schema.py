import sqlite3, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("PRAGMA table_info(execution_entity)")
print("Columns in execution_entity:", [r[1] for r in cur.fetchall()])

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables in sqlite:", [r[0] for r in cur.fetchall()])

conn.close()
