import sqlite3, os, json, urllib.request

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT data FROM credentials_entity WHERE id = 'kCwnWgNcq5lsTVNX'")
row = cur.fetchone()
print("Found credential row:", bool(row))

# Let's inspect decrypted or structure of data
if row:
    print("Data length:", len(row[0]))

conn.close()
