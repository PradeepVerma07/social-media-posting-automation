import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    unroll_idx = data[int(data[2]['runData'])]['Unroll Due Posts']
    unroll_entry = data[int(unroll_idx)]
    print("Unroll Due Posts entry in 3629:", unroll_entry)
    
    # Check if there are executionData items
    exec_data_idx = data[0].get('executionData')
    if exec_data_idx:
        print("executionData info:", data[int(exec_data_idx)])

conn.close()
