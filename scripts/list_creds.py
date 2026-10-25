import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, name, type FROM credentials_entity")
for r in cur.fetchall():
    print('Credential:', r[0], r[1], r[2])

conn.close()
