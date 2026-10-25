import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    posts_idx = data[int(data[2]['runData'])].get('Sheet - Read Posts')
    print("posts_idx:", posts_idx)
    posts_runs = data[int(posts_idx)] if isinstance(posts_idx, str) else posts_idx
    print("posts_runs:", posts_runs)
    if isinstance(posts_runs, list):
        for run_id in posts_runs:
            print("run_id obj:", data[int(run_id)])

conn.close()
