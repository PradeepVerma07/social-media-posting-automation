import sqlite3, os

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT data FROM credentials_entity WHERE id = 'kCwnWgNcq5lsTVNX'")
raw = cur.fetchone()[0]
print(repr(raw[:80]))
conn.close()
