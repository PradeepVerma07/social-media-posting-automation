import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3673")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    loop_runs = data[int(data[2]['runData'])].get('Loop Over Posts (Batch 1)')
    for rid in loop_runs:
        print("Loop run obj:", data[int(rid)])

conn.close()
