import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    
    # 29 is the unroll output entry
    entry_29 = data[29]
    print("Entry 29 keys:", list(entry_29.keys()) if isinstance(entry_29, dict) else entry_29)
    if isinstance(entry_29, dict) and 'data' in entry_29:
        data_idx = entry_29['data']
        print("Data idx:", data_idx, "val:", data[int(data_idx)])
        main_idx = data[int(data_idx)].get('main')
        if main_idx:
            print("Main idx:", main_idx, "val:", data[int(main_idx)])

conn.close()
