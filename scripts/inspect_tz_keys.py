import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    tz_runs = data[int(data[2]['runData'])].get('Timezone Converter & Due Filter')
    tz_run_idx = data[int(tz_runs)] if isinstance(tz_runs, str) else tz_runs
    print("tz_runs:", tz_runs, "tz_run_idx:", tz_run_idx)
    for rid in tz_run_idx:
        print("tz run obj:", data[int(rid)])

conn.close()
