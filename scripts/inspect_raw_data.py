import sqlite3, os, json, zlib

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    try:
        data = json.loads(raw)
    except Exception:
        data = json.loads(zlib.decompress(raw))

    print("Type of data:", type(data))
    if isinstance(data, list):
        print("List length:", len(data))
        print("First item:", data[0])
        print("Second item:", data[1] if len(data) > 1 else "None")

conn.close()
