import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT executionId, data FROM execution_data WHERE executionId = 3629")
row = cur.fetchone()
if row:
    raw = row[1]
    data = json.loads(raw)
    val_79 = data[79]
    print("val 79:", val_79)
    if isinstance(val_79, list):
        for item_idx in val_79:
            item = data[int(item_idx)]
            print("Output item:", item)
            if isinstance(item, dict) and 'json' in item:
                print("JSON content:", data[int(item['json'])])

conn.close()
