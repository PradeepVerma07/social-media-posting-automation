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
    print("Loop Over Posts runs in 3673:", len(loop_runs))
    for r_idx in loop_runs:
        r_obj = data[int(r_idx)]
        d_idx = r_obj.get('data')
        if d_idx:
            print("Loop run output:", data[int(d_idx)])

conn.close()
